import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { listDepensesForMonth } from "./lib/registre/index.js";
import { ensureMonthFolder, uploadFile } from "./lib/drive/driveClient.js";
import { generateMonthlyExport } from "./lib/export/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const month = body && body.month;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpError(400, "Le champ 'month' (YYYY-MM) est requis.");
    }

    const depenses = await listDepensesForMonth(drive, month);
    if (depenses.length === 0) {
      throw new HttpError(404, `Aucune dépense trouvée pour ${month}.`);
    }

    const { buffer, filename, mimeType } = await generateMonthlyExport(depenses, month);
    const { monthFolderId } = await ensureMonthFolder(drive, month);
    const uploaded = await uploadFile(drive, { parentId: monthFolderId, name: filename, mimeType, buffer });

    return json(200, {
      fichier: { id: uploaded.id, url: uploaded.webViewLink, nom: filename },
      nombre_depenses: depenses.length,
    });
  });
};
