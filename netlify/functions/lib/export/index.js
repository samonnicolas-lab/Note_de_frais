// Point d'entrée du module d'export, isolé et remplaçable (cf. cahier des charges §0).
// Phase 2 : si l'utilisateur a validé un modèle Excel entreprise (lib/modele),
// on remplit ce modèle plutôt que de générer des colonnes fixes.
import { generateFixedColumnsWorkbook } from "./fixedColumnsExporter.js";
import { generateFromTemplate } from "./customTemplateExporter.js";
import { getModeleConfig, downloadModeleTemplate } from "../modele/index.js";
import { getProfil } from "../profil/index.js";

export async function generateMonthlyExport(drive, depenses, month) {
  const config = await getModeleConfig(drive);

  let workbook;
  if (config) {
    const [templateBuffer, profil] = await Promise.all([
      downloadModeleTemplate(drive, config.templateFileId),
      getProfil(drive),
    ]);
    workbook = await generateFromTemplate(
      templateBuffer,
      config.mapping,
      config.ligneEntete,
      depenses,
      month,
      config.cellules,
      profil
    );
  } else {
    workbook = await generateFixedColumnsWorkbook(depenses, month);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: `notes-de-frais-${month}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
