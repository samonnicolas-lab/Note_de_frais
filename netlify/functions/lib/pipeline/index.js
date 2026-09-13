// Pipeline d'extraction d'une facture. Conçu comme une suite d'étapes plutôt
// qu'un appel figé et unique à Claude (cf. cahier des charges §0) : la Phase 3
// insère ici une étape de vérification préalable dans Supabase (reconnaissance
// par "signature fournisseur") avant de retomber sur Claude.
import { claudeVisionStep } from "./steps/claudeVisionStep.js";
import { signatureOcrStep } from "./steps/signatureOcrStep.js";
import { extraireTexteOcr } from "../ocr/extraireTexte.js";

// Ordre d'exécution : chaque étape peut renvoyer `{ extraction, usage }` (auquel
// cas le pipeline s'arrête là — `usage` vaut `null` pour une étape qui ne fait pas
// d'appel facturé, ex. la reconnaissance par signature fournisseur) ou
// `null`/`undefined` pour laisser la main à l'étape suivante.
const PIPELINE_STEPS = [signatureOcrStep, claudeVisionStep];

// Budget de temps pour l'OCR (rastérisation PDF incluse) : on le garde assez
// court pour toujours laisser de la marge à l'appel Claude de repli dans le
// délai global d'une fonction Netlify synchrone. Sur un conteneur "froid"
// (premier chargement du moteur OCR), ce budget peut ne pas suffire — c'est
// sans risque : le pipeline retombe alors simplement sur Claude. Réglable
// sans redéploiement via la variable d'environnement Netlify OCR_TIMEOUT_MS.
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS) || 11000;

function avecDelai(promesse, ms) {
  return Promise.race([
    promesse,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Délai OCR dépassé")), ms)),
  ]);
}

/** Ne doit jamais lever d'exception : un échec OCR se traduit juste par un repli sur Claude. */
async function calculerTexteOcrSansExploser({ base64Data, mimeType }) {
  try {
    return await avecDelai(extraireTexteOcr(base64Data, mimeType), OCR_TIMEOUT_MS);
  } catch (err) {
    console.error("OCR indisponible, repli sur Claude :", err.message);
    return null;
  }
}

export async function runExtractionPipeline(input) {
  input.ocrText = await calculerTexteOcrSansExploser(input);

  let lastError = null;
  for (const step of PIPELINE_STEPS) {
    try {
      const result = await step(input);
      if (result) return { ...result, ocrText: input.ocrText };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Aucune étape du pipeline n'a pu extraire les données de la facture.");
}
