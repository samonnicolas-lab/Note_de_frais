// Compteur d'usage de l'API Claude, isolé comme le registre des dépenses (cf.
// cahier des charges §0) : stocké dans "Notes de frais/usage.json" sur le Drive
// de l'utilisateur, agrégé par mois (nombre de factures analysées, tokens,
// coût estimé). N'affecte jamais le résultat d'une analyse de facture si son
// écriture échoue : voir l'appel dans analyser-facture.js.
import { readJsonFile, writeJsonFile } from "../drive/driveClient.js";
import { estimateCostUSD } from "./pricing.js";

const USAGE_FILENAME = "usage.json";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function emptyMonthEntry() {
  return { factures: 0, input_tokens: 0, output_tokens: 0, cout_estime_usd: 0 };
}

/** Enregistre un appel à l'API Claude et incrémente le compteur du mois en cours. */
export async function recordUsage(drive, { model, inputTokens, outputTokens }) {
  const { fileId, data } = await readJsonFile(drive, USAGE_FILENAME, {});
  const month = currentMonthKey();
  const previous = data[month] || emptyMonthEntry();
  const cost = estimateCostUSD({ model, inputTokens, outputTokens });

  const updatedEntry = {
    factures: previous.factures + 1,
    input_tokens: previous.input_tokens + (Number(inputTokens) || 0),
    output_tokens: previous.output_tokens + (Number(outputTokens) || 0),
    cout_estime_usd: previous.cout_estime_usd + cost,
  };

  const updated = { ...data, [month]: updatedEntry };
  await writeJsonFile(drive, fileId, updated);
  return { month, ...updatedEntry };
}

/** month au format "YYYY-MM" ; par défaut le mois en cours. */
export async function getUsageForMonth(drive, month = currentMonthKey()) {
  const { data } = await readJsonFile(drive, USAGE_FILENAME, {});
  return { month, ...(data[month] || emptyMonthEntry()) };
}
