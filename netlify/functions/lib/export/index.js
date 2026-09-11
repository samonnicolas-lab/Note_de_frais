// Point d'entrée du module d'export, isolé et remplaçable (cf. cahier des charges §0).
// Phase 2 : si l'utilisateur a validé un modèle Excel entreprise (lib/modele),
// on remplit ce modèle plutôt que de générer des colonnes fixes.
import { generateFixedColumnsWorkbook } from "./fixedColumnsExporter.js";
import { generateFromTemplate } from "./customTemplateExporter.js";
import { getModeleConfig, downloadModeleTemplate } from "../modele/index.js";

export async function generateMonthlyExport(drive, depenses, month) {
  const config = await getModeleConfig(drive);

  const workbook = config
    ? await generateFromTemplate(
        await downloadModeleTemplate(drive, config.templateFileId),
        config.mapping,
        config.ligneEntete,
        depenses
      )
    : await generateFixedColumnsWorkbook(depenses, month);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: `notes-de-frais-${month}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
