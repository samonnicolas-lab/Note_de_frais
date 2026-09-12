// Étape de reconnaissance par "signature fournisseur" (Phase 3) : tente de
// retrouver le fournisseur dans le texte OCR déjà extrait (cf. pipeline/index.js)
// parmi les signatures connues en base Supabase partagée, et d'en déduire les
// champs de la facture sans appel payant à Claude.
//
// Choix produit assumé : on utilise le résultat même en cas de doute partiel
// (confiance "moyenne"/"faible") plutôt que de retomber sur Claude par prudence
// — l'utilisateur relit de toute façon chaque champ avant d'enregistrer.
import { listerSignatures, majUtilisationSignature } from "../../supabase/client.js";
import { appliquerSignature } from "../../ocr/signature.js";
import { normaliserTexte } from "../../ocr/normaliser.js";

export async function signatureOcrStep({ ocrText }) {
  if (!ocrText) return null;

  let signatures;
  try {
    signatures = await listerSignatures();
  } catch (err) {
    console.error("Supabase indisponible pour la reconnaissance de signature, repli sur Claude :", err.message);
    return null;
  }
  if (!signatures || signatures.length === 0) return null;

  const texteNorm = normaliserTexte(ocrText);
  let meilleure = null;
  for (const sig of signatures) {
    if (sig.fournisseur_normalise && texteNorm.includes(sig.fournisseur_normalise)) {
      if (!meilleure || sig.fournisseur_normalise.length > meilleure.fournisseur_normalise.length) {
        meilleure = sig;
      }
    }
  }
  if (!meilleure) return null;

  const extraitPartiel = appliquerSignature(ocrText, meilleure.structure);
  if (!extraitPartiel) {
    console.error(
      `Signature trouvée pour "${meilleure.fournisseur_affiche}" mais inapplicable (ancre introuvable dans ce texte OCR), repli sur Claude.`,
      "structure:", JSON.stringify(meilleure.structure),
      "texteOcr:", ocrText.slice(0, 1000)
    );
    return null;
  }

  majUtilisationSignature(meilleure.id, meilleure.nb_utilisations).catch((err) =>
    console.error("Échec de la mise à jour du compteur de signature :", err.message)
  );

  return {
    extraction: { fournisseur: meilleure.fournisseur_affiche, ...extraitPartiel },
    usage: null,
  };
}
