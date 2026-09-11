import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { listDepensesForMonth } from "./lib/registre/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "GET") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpError(400, "Le paramètre 'month' (YYYY-MM) est requis.");
    }

    const depenses = await listDepensesForMonth(drive, month);
    const total_ttc = depenses.reduce((sum, d) => sum + (Number(d.montant_ttc) || 0), 0);
    const total_ht = depenses.reduce((sum, d) => sum + (Number(d.montant_ht) || 0), 0);

    return json(200, { month, depenses, total_ttc, total_ht });
  });
};
