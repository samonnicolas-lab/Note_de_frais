import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { getDepenseById } from "./lib/registre/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "GET") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      throw new HttpError(400, "Le paramètre 'id' est requis.");
    }

    const depense = await getDepenseById(drive, id);
    if (!depense) {
      throw new HttpError(404, "Dépense introuvable.");
    }

    return json(200, { depense });
  });
};
