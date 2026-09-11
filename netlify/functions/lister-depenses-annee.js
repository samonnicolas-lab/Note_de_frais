import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { listAllDepenses } from "./lib/registre/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "GET") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    if (!year || !/^\d{4}$/.test(year)) {
      throw new HttpError(400, "Le paramètre 'year' (YYYY) est requis.");
    }

    const depenses = await listAllDepenses(drive);
    const parAnnee = depenses.filter((d) => typeof d.date === "string" && d.date.startsWith(year));

    const mois = Array.from({ length: 12 }, (_, i) => {
      const cle = `${year}-${String(i + 1).padStart(2, "0")}`;
      const duMois = parAnnee.filter((d) => d.date.startsWith(cle));
      return {
        month: cle,
        nombre_depenses: duMois.length,
        total_ttc: duMois.reduce((sum, d) => sum + (Number(d.montant_ttc) || 0), 0),
        total_ht: duMois.reduce((sum, d) => sum + (Number(d.montant_ht) || 0), 0),
      };
    });

    const total_ttc = mois.reduce((sum, m) => sum + m.total_ttc, 0);
    const total_ht = mois.reduce((sum, m) => sum + m.total_ht, 0);
    const nombre_depenses = mois.reduce((sum, m) => sum + m.nombre_depenses, 0);

    return json(200, { year, mois, total_ttc, total_ht, nombre_depenses });
  });
};
