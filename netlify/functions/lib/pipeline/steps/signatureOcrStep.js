// Étape de reconnaissance par "signature fournisseur" (Phase 3) : tente de
// retrouver le fournisseur dans le texte OCR déjà extrait (cf. pipeline/index.js)
// parmi les signatures connues en base Supabase partagée, et d'en déduire les
// champs de la facture sans appel payant à Claude.
//
// Choix produit assumé : on utilise le résultat même en cas de doute partiel
// (confiance "moyenne"/"faible") plutôt que de retomber sur Claude par prudence
// — l'utilisateur relit de toute façon chaque champ avant d'enregistrer.
//
// Repli générique (choix explicite de l'utilisateur, cf. échange sur les
// risques) : si le nom du fournisseur n'apparaît pas dans le texte OCR (donc
// pas de signature "sûre" à utiliser), on essaie quand même les modèles de
// TOUS les fournisseurs connus — utile quand plusieurs sociétés utilisent le
// même logiciel/modèle de facturation. Dans ce cas on ne devine JAMAIS le nom
// du fournisseur ni sa catégorie depuis la signature d'un tiers (ça n'a
// aucune base) : ces deux champs restent à saisir/vérifier, et la confiance
// est toujours forcée à "faible" avec un avertissement explicite.
import { listerSignatures, majUtilisationSignature } from "../../supabase/client.js";
import { appliquerSignature } from "../../ocr/signature.js";
import { normaliserTexte } from "../../ocr/normaliser.js";

function trouverParNom(signatures, texteNorm) {
  let meilleure = null;
  for (const sig of signatures) {
    if (sig.fournisseur_normalise && texteNorm.includes(sig.fournisseur_normalise)) {
      if (!meilleure || sig.fournisseur_normalise.length > meilleure.fournisseur_normalise.length) {
        meilleure = sig;
      }
    }
  }
  return meilleure;
}

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
  const parNom = trouverParNom(signatures, texteNorm);

  if (parNom) {
    const extraitPartiel = appliquerSignature(ocrText, parNom.structure);
    if (extraitPartiel) {
      majUtilisationSignature(parNom.id, parNom.nb_utilisations).catch((err) =>
        console.error("Échec de la mise à jour du compteur de signature :", err.message)
      );
      return {
        extraction: { fournisseur: parNom.fournisseur_affiche, ...extraitPartiel },
        usage: null,
      };
    }
    console.error(
      `Signature trouvée pour "${parNom.fournisseur_affiche}" mais inapplicable (ancre introuvable dans ce texte OCR), tentative générique puis repli sur Claude si besoin.`,
      "structure:", JSON.stringify(parNom.structure),
      "texteOcr:", ocrText.slice(0, 1000)
    );
  }

  // Repli générique : on essaie les modèles des autres fournisseurs, du plus
  // utilisé au moins utilisé (léger indice de fiabilité), sans jamais reprendre
  // le nom/la catégorie qui leur sont propres.
  const candidats = [...signatures]
    .filter((sig) => sig !== parNom)
    .sort((a, b) => (b.nb_utilisations || 0) - (a.nb_utilisations || 0));

  for (const sig of candidats) {
    const extraitGenerique = appliquerSignature(ocrText, sig.structure);
    if (!extraitGenerique) continue;

    console.log(
      `[OCR] correspondance générique via le modèle de "${sig.fournisseur_affiche}" (fournisseur de cette facture non confirmé).`
    );
    majUtilisationSignature(sig.id, sig.nb_utilisations).catch((err) =>
      console.error("Échec de la mise à jour du compteur de signature :", err.message)
    );
    return {
      extraction: {
        ...extraitGenerique,
        fournisseur: "",
        categorie: "Autre",
        confiance: "faible",
        avertissement:
          "Fournisseur non reconnu automatiquement : les montants ont été extraits à partir d'un modèle de facture similaire. Vérifiez attentivement chaque champ, en particulier le nom du fournisseur (à saisir) et les montants.",
      },
      usage: null,
    };
  }

  return null;
}
