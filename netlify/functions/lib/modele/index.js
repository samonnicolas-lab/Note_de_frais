// Configuration du modèle Excel personnalisé (Phase 2). Module isolé : l'export
// (lib/export/index.js) l'interroge pour savoir s'il doit utiliser le modèle
// entreprise de l'utilisateur ou retomber sur l'export à colonnes fixes.
import {
  readJsonFile,
  writeJsonFile,
  readJsonFileIfExists,
  downloadBinaryFile,
  uploadOrReplaceFileInRoot,
  trashFileInRootIfExists,
} from "../drive/driveClient.js";

const MODELE_TEMPLATE_FILENAME = "modele-excel.xlsx";
const MODELE_MAPPING_FILENAME = "modele-excel-mapping.json";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Retourne la configuration active du modèle (ligneEntete, mapping...) ou `null`. */
export async function getModeleConfig(drive) {
  const found = await readJsonFileIfExists(drive, MODELE_MAPPING_FILENAME);
  return found ? found.data : null;
}

/** Enregistre (ou remplace) le modèle Excel et son mapping de colonnes validé par l'utilisateur. */
export async function saveModele(drive, { buffer, fileName, ligneEntete, mapping }) {
  const templateFileId = await uploadOrReplaceFileInRoot(drive, {
    filename: MODELE_TEMPLATE_FILENAME,
    mimeType: XLSX_MIME,
    buffer,
  });
  const config = {
    templateFileId,
    fileName,
    ligneEntete,
    mapping,
    enregistre_le: new Date().toISOString(),
  };
  const { fileId } = await readJsonFile(drive, MODELE_MAPPING_FILENAME, config);
  await writeJsonFile(drive, fileId, config);
  return config;
}

/** Supprime le modèle personnalisé : les exports suivants repassent en colonnes fixes. */
export async function deleteModele(drive) {
  await trashFileInRootIfExists(drive, MODELE_TEMPLATE_FILENAME);
  await trashFileInRootIfExists(drive, MODELE_MAPPING_FILENAME);
}

export async function downloadModeleTemplate(drive, templateFileId) {
  return downloadBinaryFile(drive, templateFileId);
}
