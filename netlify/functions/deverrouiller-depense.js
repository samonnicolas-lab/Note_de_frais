import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { getDepenseById, unlockDepense } from "./lib/registre/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const id = body && body.id;
    if (!id) {
      throw new HttpError(400, "Le champ 'id' est requis.");
    }

    const existing = await getDepenseById(drive, id);
    if (!existing) {
      throw new HttpError(404, "Dépense introuvable.");
    }

    const updated = await unlockDepense(drive, id);
    return json(200, { depense: updated });
  });
};
