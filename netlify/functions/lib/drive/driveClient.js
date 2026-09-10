// Fonctions d'accès à Google Drive, isolées du reste de la logique métier.
// Toute l'appli passe par ce module pour parler à Drive : si Phase 3 introduit
// d'autres emplacements de stockage, seul ce fichier devrait évoluer.
import { Readable } from "node:stream";

const ROOT_FOLDER_NAME = "Notes de frais";
const REGISTRE_FILENAME = "registre.json";
const FOLDER_MIME = "application/vnd.google-apps.folder";

async function findChild(drive, name, parentId, mimeType) {
  const mimeClause = mimeType ? ` and mimeType='${mimeType}'` : "";
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = `name='${name.replace(/'/g, "\\'")}' and trashed=false${mimeClause}${parentClause}`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1,
  });
  return res.data.files && res.data.files[0];
}

async function createFolder(drive, name, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id, name",
  });
  return res.data;
}

async function ensureFolder(drive, name, parentId) {
  const existing = await findChild(drive, name, parentId, FOLDER_MIME);
  if (existing) return existing.id;
  const created = await createFolder(drive, name, parentId);
  return created.id;
}

/** Garantit l'existence de "Notes de frais" à la racine du Drive de l'app. */
export async function ensureRootFolder(drive) {
  return ensureFolder(drive, ROOT_FOLDER_NAME, null);
}

/** Garantit l'existence de "Notes de frais/AAAA-MM/". `month` au format YYYY-MM. */
export async function ensureMonthFolder(drive, month) {
  const rootId = await ensureRootFolder(drive);
  const monthFolderId = await ensureFolder(drive, month, rootId);
  return { rootId, monthFolderId };
}

async function writeNewJsonFile(drive, name, parentId, data) {
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: "application/json" },
    media: { mimeType: "application/json", body: JSON.stringify(data, null, 2) },
    fields: "id",
  });
  return res.data.id;
}

/**
 * Lit un fichier JSON à la racine de "Notes de frais" (le crée avec `defaultValue`
 * s'il n'existe pas encore). Retourne { fileId, data }. Utilisé par le registre des
 * dépenses et par le compteur d'usage IA — tout module qui a besoin d'un petit
 * fichier JSON persistant sur le Drive de l'utilisateur passe par ici.
 */
export async function readJsonFile(drive, filename, defaultValue) {
  const rootId = await ensureRootFolder(drive);
  const existing = await findChild(drive, filename, rootId, "application/json");
  if (!existing) {
    const fileId = await writeNewJsonFile(drive, filename, rootId, defaultValue);
    return { fileId, data: defaultValue };
  }
  const res = await drive.files.get({ fileId: existing.id, alt: "media" }, { responseType: "json" });
  return { fileId: existing.id, data: res.data ?? defaultValue };
}

/** Écrase le contenu d'un fichier JSON existant (obtenu via readJsonFile). */
export async function writeJsonFile(drive, fileId, data) {
  await drive.files.update({
    fileId,
    media: { mimeType: "application/json", body: JSON.stringify(data, null, 2) },
  });
}

/** Lit registre.json (le crée vide s'il n'existe pas encore). Retourne { fileId, depenses }. */
export async function readRegistre(drive) {
  const { fileId, data } = await readJsonFile(drive, REGISTRE_FILENAME, []);
  return { fileId, depenses: Array.isArray(data) ? data : [] };
}

/** Écrase le contenu de registre.json avec le tableau de dépenses fourni. */
export async function writeRegistre(drive, fileId, depenses) {
  await writeJsonFile(drive, fileId, depenses);
}

/** Upload d'un fichier binaire (justificatif ou export Excel) dans un dossier donné. */
export async function uploadFile(drive, { parentId, name, mimeType, buffer }) {
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, webViewLink, webContentLink",
  });
  // webViewLink n'est renvoyé qu'après un second appel get sur certains comptes ; on le force ici.
  if (!res.data.webViewLink) {
    const meta = await drive.files.get({ fileId: res.data.id, fields: "webViewLink, webContentLink" });
    return { id: res.data.id, webViewLink: meta.data.webViewLink, webContentLink: meta.data.webContentLink };
  }
  return { id: res.data.id, webViewLink: res.data.webViewLink, webContentLink: res.data.webContentLink };
}
