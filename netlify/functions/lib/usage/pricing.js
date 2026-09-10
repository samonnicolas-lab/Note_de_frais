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
