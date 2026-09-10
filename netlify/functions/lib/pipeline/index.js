// Pipeline d'extraction d'une facture. Conçu comme une suite d'étapes plutôt
// qu'un appel figé et unique à Claude (cf. cahier des charges §0) : la Phase 3
// pourra insérer ici une étape de vérification préalable dans Supabase
// (reconnaissance par "signature fournisseur") avant de retomber sur Claude.
import { claudeVisionStep } from "./steps/claudeVisionStep.js";

// Ordre d'exécution : chaque étape peut renvoyer un résultat structuré (auquel
// cas le pipeline s'arrête là) ou `null` pour laisser la main à l'étape suivante.
const PIPELINE_STEPS = [claudeVisionStep];

export async function runExtractionPipeline(input) {
  let lastError = null;
  for (const step of PIPELINE_STEPS) {
    try {
      const result = await step(input);
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Aucune étape du pipeline n'a pu extraire les données de la facture.");
}
