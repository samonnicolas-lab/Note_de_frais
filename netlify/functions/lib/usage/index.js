// Compteur d'usage de l'API Claude. Stocké dans Supabase (table `usage_mensuel`,
// cf. supabase/migrations/0001_usage_mensuel_partage.sql), PAS dans le Drive de
// l'utilisateur : le plafond de dépense IA est partagé par tous les
// utilisateurs de l'app (une seule clé Anthropic) et doit donc vivre dans un
// espace commun plutôt que dans le Drive de chacun. N'affecte jamais le
// résultat d'une analyse de facture si son écriture échoue : voir l'appel
// dans analyser-facture.js.
import { obtenirUsageMensuel, incrementerUsageMensuel } from "../supabase/client.js";
import { estimateCostUSD } from "./pricing.js";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function emptyMonthEntry() {
  return { factures: 0, input_tokens: 0, output_tokens: 0, cout_estime_usd: 0 };
}

/** Enregistre un appel à l'API Claude et incrémente le compteur du mois en cours. */
export async function recordUsage({ model, inputTokens, outputTokens }) {
  const month = currentMonthKey();
  const cost = estimateCostUSD({ model, inputTokens, outputTokens });
  const updated = await incrementerUsageMensuel({
    mois: month,
    inputTokens,
    outputTokens,
    coutUsd: cost,
  });
  return { month, ...updated };
}

/** month au format "YYYY-MM" ; par défaut le mois en cours. */
export async function getUsageForMonth(month = currentMonthKey()) {
  const data = await obtenirUsageMensuel(month);
  return { month, ...(data || emptyMonthEntry()) };
}
