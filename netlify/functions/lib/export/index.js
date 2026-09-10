// Point d'entrée du module d'export, isolé et remplaçable (cf. cahier des charges §0).
// La Phase 2 branchera ici la génération basée sur un modèle Excel entreprise +
// mapping de colonnes, en conservant cette même signature `generateMonthlyExport`.
import { generateFixedColumnsWorkbook } from "./fixedColumnsExporter.js";

export async function generateMonthlyExport(depenses, month) {
  const workbook = await generateFixedColumnsWorkbook(depenses, month);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: `notes-de-frais-${month}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
