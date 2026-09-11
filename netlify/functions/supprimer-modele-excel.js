import { json, withErrorHandling } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { deleteModele } from "./lib/modele/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    await deleteModele(drive);
    return json(200, { ok: true });
  });
};
