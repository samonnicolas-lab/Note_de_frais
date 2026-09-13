// Tarifs Anthropic officiels, en USD pour 1 million de tokens (source : console
// Anthropic, tarifs API au 2026). Le coût est une ESTIMATION affichée à l'utilisateur
// à titre indicatif : la facturation réelle se fait sur la console Anthropic.
const PRICING_PER_MILLION_TOKENS_USD = {
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

// Repli si un modèle inconnu (non listé ci-dessus) a été utilisé : on prend le
// tarif Sonnet 5, modèle par défaut du pipeline d'extraction.
const DEFAULT_PRICING = PRICING_PER_MILLION_TOKENS_USD["claude-sonnet-5"];

export function estimateCostUSD({ model, inputTokens, outputTokens }) {
  const pricing = PRICING_PER_MILLION_TOKENS_USD[model] || DEFAULT_PRICING;
  return (
    (Number(inputTokens) || 0) * (pricing.input / 1_000_000) +
    (Number(outputTokens) || 0) * (pricing.output / 1_000_000)
  );
}

// Plafond de dépense mensuelle appliqué à l'ensemble des utilisateurs de
// l'application (une seule clé API Anthropic, partagée) — au-delà, l'analyse
// par IA est suspendue jusqu'au mois suivant. Les fournisseurs déjà appris
// via signature (Phase 3) continuent de fonctionner normalement, sans passer
// par l'IA : seul le repli Claude est concerné par ce plafond.
export const PLAFOND_MENSUEL_USD = Number(process.env.PLAFOND_MENSUEL_USD) || 5;

// Coût moyen observé par facture analysée par l'IA, utilisé uniquement pour
// traduire le plafond en un nombre de factures compréhensible à l'affichage
// (jamais montré en dollars à l'utilisateur). Le blocage réel se base sur le
// coût précis déjà consommé (suivi au token près), pas sur cette moyenne.
export const COUT_MOYEN_PAR_FACTURE_USD = 0.0113;

/** Nombre de factures qu'il reste probablement possible d'analyser par IA ce mois-ci. */
export function facturesRestantesEstimees(coutDejaConsommeUsd) {
  const budgetRestant = PLAFOND_MENSUEL_USD - (Number(coutDejaConsommeUsd) || 0);
  return Math.max(0, Math.floor(budgetRestant / COUT_MOYEN_PAR_FACTURE_USD));
}

/** Le plafond mensuel de dépense IA est-il déjà atteint ? */
export function plafondMensuelAtteint(coutDejaConsommeUsd) {
  return (Number(coutDejaConsommeUsd) || 0) >= PLAFOND_MENSUEL_USD;
}
