// Génération de l'export Excel "structure fixe" de la Phase 1.
// La Phase 2 lira un modèle Excel entreprise et un mapping de colonnes validé
// par l'utilisateur : elle remplacera ce fichier par un autre générateur, sans
// toucher à l'API exposée par ../export/index.js (generateMonthlyExport).
import ExcelJS from "exceljs";

const COLUMNS = [
  { header: "Date", key: "date", width: 14 },
  { header: "Fournisseur", key: "fournisseur", width: 28 },
  { header: "Catégorie", key: "categorie", width: 16 },
  { header: "Montant HT", key: "montant_ht", width: 14 },
  { header: "TVA", key: "tva", width: 22 },
  { header: "Montant TTC", key: "montant_ttc", width: 14 },
  { header: "Lien justificatif Drive", key: "lien", width: 40 },
];

function formatTva(tva) {
  if (!Array.isArray(tva) || tva.length === 0) return "";
  return tva.map((t) => `${t.taux}% (${Number(t.montant).toFixed(2)} €)`).join(" ; ");
}

export async function generateFixedColumnsWorkbook(depenses, month) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Notes de frais";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Dépenses ${month}`, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  const sorted = [...depenses].sort((a, b) => (a.date > b.date ? 1 : -1));
  for (const d of sorted) {
    const row = sheet.addRow({
      date: d.date,
      fournisseur: d.fournisseur,
      categorie: d.categorie,
      montant_ht: Number(d.montant_ht) || 0,
      tva: formatTva(d.tva),
      montant_ttc: Number(d.montant_ttc) || 0,
      lien: d.justificatif_drive_url || "",
    });
    row.getCell("montant_ht").numFmt = "#,##0.00 €";
    row.getCell("montant_ttc").numFmt = "#,##0.00 €";
    if (d.justificatif_drive_url) {
      row.getCell("lien").value = {
        text: d.justificatif_drive_url,
        hyperlink: d.justificatif_drive_url,
      };
    }
  }

  const totalRow = sheet.addRow({
    date: "",
    fournisseur: "",
    categorie: "Total",
    montant_ht: { formula: `SUM(D2:D${sorted.length + 1})` },
    tva: "",
    montant_ttc: { formula: `SUM(F2:F${sorted.length + 1})` },
    lien: "",
  });
  totalRow.font = { bold: true };
  totalRow.getCell("montant_ht").numFmt = "#,##0.00 €";
  totalRow.getCell("montant_ttc").numFmt = "#,##0.00 €";

  return workbook;
}
