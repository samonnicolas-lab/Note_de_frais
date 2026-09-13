import { json, error, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { runExtractionPipeline } from "./lib/pipeline/index.js";
import { recordUsage } from "./lib/usage/index.js";
import { construireSignature, signatureExploitable } from "./lib/ocr/signature.js";
import { normaliserFournisseur, fournisseurSimilaire } from "./lib/ocr/normaliser.js";
import { listerSignatures, upsertSignature } from "./lib/supabase/client.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
// Limite conservatrice : les Netlify Functions synchrones plafonnent le corps de
// requête à 6 Mo (payload base64 inclus). On demande une image déjà compressée côté client.
const MAX_BASE64_LENGTH = Math.floor(6 * 1024 * 1024 * 0.95);

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return error(405, "Méthode non autorisée.");
    }
    const { drive } = requireDriveClient(request);

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

    const { extraction, usage, ocrText } = await runExtractionPipeline({ base64Data: fileBase64, mimeType });

    if (usage) {
      // Le compteur d'usage ne doit jamais faire échouer la réponse à l'utilisateur :
      // s'il échoue (Drive indisponible, etc.), on log et on répond quand même.
      try {
        await recordUsage(drive, usage);
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
          } else {
            // Diagnostic temporaire : aide à ajuster la logique de repérage
            // des ancres face à de vraies factures (mise en page, OCR imparfait).
            console.error(
              "Signature non exploitable (ancre montant TTC introuvable), apprentissage ignoré.",
              "extraction:", JSON.stringify(extraction),
              "structure:", JSON.stringify(structure),
              "texteOcr:", ocrText.slice(0, 1000)
            );
          }
        } catch (err) {
          console.error("Échec de l'apprentissage de la signature fournisseur :", err.message);
        }
      }
    }

    return json(200, extraction);
  });
};
