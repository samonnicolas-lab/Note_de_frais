import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { ensureMonthFolder, uploadFile } from "./lib/drive/driveClient.js";
import { addDepense } from "./lib/registre/index.js";

const MAX_BASE64_LENGTH = Math.floor(6 * 1024 * 1024 * 0.95);

function monthFromDate(dateStr) {
  return typeof dateStr === "string" ? dateStr.slice(0, 7) : null;
}

function validateDepenseInput(depense) {
  const required = ["date", "fournisseur", "categorie", "montant_ht", "montant_ttc"];
  for (const field of required) {
    if (depense[field] === undefined || depense[field] === null || depense[field] === "") {
      throw new HttpError(400, `Le champ '${field}' est requis.`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(depense.date)) {
    throw new HttpError(400, "Le champ 'date' doit être au format YYYY-MM-DD.");
  }
}

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const { depense, fileBase64, mimeType, fileName } = body || {};

    if (!depense || typeof depense !== "object") {
      throw new HttpError(400, "Le champ 'depense' est requis.");
    }
    validateDepenseInput(depense);

    const month = monthFromDate(depense.date);
    let justificatif = { id: null, webViewLink: null };

    if (fileBase64 && mimeType) {
      if (fileBase64.length > MAX_BASE64_LENGTH) {
        throw new HttpError(413, "Justificatif trop volumineux (> ~4 Mo une fois compressé).");
      }
      const { monthFolderId } = await ensureMonthFolder(drive, month);
      const buffer = Buffer.from(fileBase64, "base64");
      const safeName = (fileName || `justificatif-${depense.date}`).replace(/[/\\]/g, "_");
      const uploaded = await uploadFile(drive, {
        parentId: monthFolderId,
        name: safeName,
        mimeType,
        buffer,
      });
      justificatif = { id: uploaded.id, webViewLink: uploaded.webViewLink };
    }

    const saved = await addDepense(drive, {
      date: depense.date,
      fournisseur: depense.fournisseur,
      categorie: depense.categorie,
      montant_ht: Number(depense.montant_ht),
      montant_ttc: Number(depense.montant_ttc),
      tva: Array.isArray(depense.tva) ? depense.tva : [],
      justificatif_drive_id: justificatif.id,
      justificatif_drive_url: justificatif.webViewLink,
    });

    return json(200, { depense: saved });
  });
};
