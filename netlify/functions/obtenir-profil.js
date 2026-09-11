import { json, withErrorHandling } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { getProfil } from "./lib/profil/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "GET") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);
    const profil = await getProfil(drive);
    return json(200, { profil });
  });
};
