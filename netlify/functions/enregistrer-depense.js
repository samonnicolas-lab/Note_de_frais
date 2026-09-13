import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { ensureMonthFolder, uploadFile } from "./lib/drive/driveClient.js";
import { addDepense, findDuplicate } from "./lib/registre/index.js";
import { sha256Hex } from "./lib/util/hash.js";

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
    const { depense, fileBase64, mimeType, fileName, forcer } = body || {};

    if (!depense || typeof depense !== "object") {
      throw new HttpError(400, "Le champ 'depense' est requis.");
    }
    validateDepenseInput(depense);

    const month = monthFromDate(depense.date);
    let buffer = null;
    let justificatifHash = null;

    if (fileBase64 && mimeType) {
      if (fileBase64.length > MAX_BASE64_LENGTH) {
        throw new HttpError(413, "Justificatif trop volumineux (> ~4 Mo une fois compressé).");
      }
      buffer = Buffer.from(fileBase64, "base64");
      justificatifHash = sha256Hex(buffer);
    }

    if (!forcer) {
      const doublon = await findDuplicate(drive, {
        date: depense.date,
        fournisseur: depense.fournisseur,
        montant_ttc: Number(depense.montant_ttc),
        justificatif_hash: justificatifHash,
      });
      if (doublon) {
        return json(409, {
          error: "Un justificatif très similaire est déjà enregistré.",
          doublon: {
            id: doublon.id,
            date: doublon.date,
            fournisseur: doublon.fournisseur,
            montant_ttc: doublon.montant_ttc,
          },
        });
      }
    }

    let justificatif = { id: null, webViewLink: null };
    if (buffer) {
      const { monthFolderId } = await ensureMonthFolder(drive, month);
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
      description: depense.description || "",
      invites: depense.invites || "",
      montant_ht: Number(depense.montant_ht),
      montant_ttc: Number(depense.montant_ttc),
      tva: Array.isArray(depense.tva) ? depense.tva : [],
      justificatif_drive_id: justificatif.id,
      justificatif_drive_url: justificatif.webViewLink,
      justificatif_hash: justificatifHash,
    });

    return json(200, { depense: saved });
  });
};
