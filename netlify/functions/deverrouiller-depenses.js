import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { unlockDepenses } from "./lib/registre/index.js";

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

    const deverrouillees = await unlockDepenses(drive, ids);
    return json(200, { deverrouillees });
  });
};
