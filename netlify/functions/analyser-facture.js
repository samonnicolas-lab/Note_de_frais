import { json, error, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { runExtractionPipeline } from "./lib/pipeline/index.js";
import { recordUsage, getUsageForMonth } from "./lib/usage/index.js";
import {
  plafondMensuelAtteint,
  LIMITE_SCANS_PAR_FENETRE,
  FENETRE_LIMITE_SCANS_SECONDES,
} from "./lib/usage/pricing.js";
import { construireSignature, signatureExploitable } from "./lib/ocr/signature.js";
import { normaliserFournisseur, fournisseurSimilaire } from "./lib/ocr/normaliser.js";
import { listerSignatures, upsertSignature, verifierLimiteScans } from "./lib/supabase/client.js";

// Journalisation détaillée (extraction complète + extrait du texte OCR) utile
// pour déboguer l'apprentissage de signature, mais contenant potentiellement
// des données de facture d'un utilisateur (nom, adresse...) : désactivée par
// défaut pour ne pas finir dans les logs Netlify partagés. À activer
// temporairement via la variable d'environnement DEBUG_SIGNATURES=1.
const DEBUG_SIGNATURES = process.env.DEBUG_SIGNATURES === "1";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
// Limite conservatrice : les Netlify Functions synchrones plafonnent le corps de
// requête à 6 Mo (payload base64 inclus). On demande une image déjà compressée côté client.
const MAX_BASE64_LENGTH = Math.floor(6 * 1024 * 1024 * 0.95);

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return error(405, "Méthode non autorisée.");
    }
    const { email } = requireDriveClient(request);

    const body = await request.json();
    const { fileBase64, mimeType } = body || {};

    if (!fileBase64 || typeof fileBase64 !== "string") {
      throw new HttpError(400, "Le champ 'fileBase64' est requis.");
    }
    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new HttpError(400, "Type de fichier non supporté. Formats acceptés : JPEG, PNG, WebP, HEIC, PDF.");
    }
    if (fileBase64.length > MAX_BASE64_LENGTH) {
      throw new HttpError(413, "Fichier trop volumineux. Merci de réessayer avec une photo compressée (< 4 Mo).");
    }

    // Limitation de débit par utilisateur : empêche qu'un seul compte (script,
    // bug côté client, usage abusif) n'épuise à lui seul le budget IA partagé
    // en quelques minutes. Un échec de cette vérification (Supabase indisponible)
    // ne doit pas bloquer un scan légitime : on log et on laisse passer.
    const autorise = await verifierLimiteScans(email, LIMITE_SCANS_PAR_FENETRE, FENETRE_LIMITE_SCANS_SECONDES).catch(
      (err) => {
        console.error("Impossible de vérifier la limite de débit (scan autorisé par défaut) :", err.message);
        return true;
      }
    );
    if (!autorise) {
      throw new HttpError(
        429,
        `Trop de factures analysées en peu de temps (max ${LIMITE_SCANS_PAR_FENETRE} par minute). Merci de patienter un instant avant de réessayer.`
      );
    }

    // Plafond mensuel de dépense IA (partagé par tous les utilisateurs, une
    // seule clé API) : vérifié AVANT le pipeline pour ne jamais déclencher
    // l'appel Claude une fois atteint. La reconnaissance par signature (gratuite)
    // n'est pas concernée et continue de fonctionner normalement au-delà.
    const usageActuel = await getUsageForMonth().catch((err) => {
      console.error("Impossible de lire le compteur d'usage IA (plafond non vérifié) :", err.message);
      return null;
    });
    const plafondAtteint = usageActuel ? plafondMensuelAtteint(usageActuel.cout_estime_usd) : false;

    const { extraction, usage, ocrText } = await runExtractionPipeline({
      base64Data: fileBase64,
      mimeType,
      plafondAtteint,
    });

    if (usage) {
      // Le compteur d'usage ne doit jamais faire échouer la réponse à l'utilisateur :
      // s'il échoue (Supabase indisponible, etc.), on log et on répond quand même.
      try {
        await recordUsage(usage);
      } catch (err) {
        console.error("Échec de l'enregistrement du compteur d'usage IA :", err);
      }

      // Claude a été sollicité (la reconnaissance par signature n'a pas suffi) :
      // on apprend la structure de ce fournisseur pour économiser l'appel la
      // prochaine fois, pour tous les utilisateurs (base Supabase partagée).
      if (ocrText) {
        try {
          const structure = construireSignature(ocrText, extraction);
          if (signatureExploitable(structure)) {
            // Le nom du fournisseur peut légèrement varier d'un scan à l'autre
            // (même souci que pour la détection de doublon) : on cherche une
            // signature déjà connue et suffisamment proche avant d'écrire, pour
            // fusionner dessus plutôt que de créer une ligne en double.
            const signaturesExistantes = await listerSignatures().catch((err) => {
              console.error("Impossible de lister les signatures existantes avant apprentissage :", err.message);
              return [];
            });
            const correspondance = (signaturesExistantes || []).find((sig) =>
              fournisseurSimilaire(sig.fournisseur_normalise, extraction.fournisseur)
            );

            await upsertSignature({
              fournisseurNormalise: correspondance
                ? correspondance.fournisseur_normalise
                : normaliserFournisseur(extraction.fournisseur),
              fournisseurAffiche: correspondance ? correspondance.fournisseur_affiche : extraction.fournisseur,
              structure,
            });
            console.log(
              correspondance
                ? `Signature mise à jour pour "${correspondance.fournisseur_affiche}" (nom rapproché de "${extraction.fournisseur}").`
                : `Signature apprise pour "${extraction.fournisseur}".`
            );
          } else if (DEBUG_SIGNATURES) {
            // Diagnostic détaillé (contenu de facture d'un utilisateur) : voir
            // la constante DEBUG_SIGNATURES en tête de fichier.
            console.error(
              "Signature non exploitable (ancre montant TTC introuvable), apprentissage ignoré.",
              "extraction:", JSON.stringify(extraction),
              "structure:", JSON.stringify(structure),
              "texteOcr:", ocrText.slice(0, 1000)
            );
          } else {
            console.error("Signature non exploitable (ancre montant TTC introuvable), apprentissage ignoré.");
          }
        } catch (err) {
          console.error("Échec de l'apprentissage de la signature fournisseur :", err.message);
        }
      }
    }

    return json(200, extraction);
  });
};
