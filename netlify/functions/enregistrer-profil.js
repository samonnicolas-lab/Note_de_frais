import { json, withErrorHandling } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { saveProfil } from "./lib/profil/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const profil = await saveProfil(drive, {
      nom: body?.nom,
      fonction: body?.fonction,
      iban: body?.iban,
    });

    return json(200, { profil });
  });
};
