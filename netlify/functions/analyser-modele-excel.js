import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { analyserModele } from "./lib/export/templateDetection.js";

const MAX_BASE64_LENGTH = Math.floor(6 * 1024 * 1024 * 0.95);

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    requireDriveClient(request); // vérifie juste l'authentification, aucun accès Drive nécessaire ici

    const body = await request.json();
    const { fileBase64 } = body || {};
    if (!fileBase64 || typeof fileBase64 !== "string") {
      throw new HttpError(400, "Le champ 'fileBase64' est requis.");
    }
    if (fileBase64.length > MAX_BASE64_LENGTH) {
      throw new HttpError(413, "Fichier trop volumineux (> ~4 Mo).");
    }

    const buffer = Buffer.from(fileBase64, "base64");
    let analyse;
    try {
      analyse = await analyserModele(buffer);
    } catch {
      throw new HttpError(400, "Fichier Excel invalide ou illisible. Vérifiez qu'il s'agit bien d'un .xlsx.");
    }
    return json(200, analyse);
  });
};
