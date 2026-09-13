import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { getUsageForMonth } from "./lib/usage/index.js";
import { facturesRestantesEstimees, plafondMensuelAtteint } from "./lib/usage/pricing.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "GET") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpError(400, "Le paramètre 'month' doit être au format YYYY-MM.");
    }

    const usage = month ? await getUsageForMonth(drive, month) : await getUsageForMonth(drive);
    return json(200, {
      ...usage,
      factures_restantes_estimees: facturesRestantesEstimees(usage.cout_estime_usd),
      plafond_atteint: plafondMensuelAtteint(usage.cout_estime_usd),
    });
  });
};
