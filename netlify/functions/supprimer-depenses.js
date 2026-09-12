import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { listAllDepenses, deleteDepenses, STATUT_EXPORTEE } from "./lib/registre/index.js";
import { trashFileById } from "./lib/drive/driveClient.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === "string" && id) : [];
    if (ids.length === 0) {
      throw new HttpError(400, "Le champ 'ids' (tableau non vide) est requis.");
    }

    const toutes = await listAllDepenses(drive);
    const cibles = toutes.filter((d) => ids.includes(d.id));
    const verrouillees = cibles.filter((d) => d.statut === STATUT_EXPORTEE);
    if (verrouillees.length > 0) {
      throw new HttpError(
        409,
        `${verrouillees.length} dépense(s) sélectionnée(s) sont verrouillées (exportées) : déverrouillez-les avant de les supprimer.`,
        { verrouillees: verrouillees.map((d) => d.id) }
      );
    }

    const supprimees = await deleteDepenses(drive, ids);
    await Promise.all(supprimees.map((d) => trashFileById(drive, d.justificatif_drive_id)));

    return json(200, { supprimees: supprimees.length });
  });
};
