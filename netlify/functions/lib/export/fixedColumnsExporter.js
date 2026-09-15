// Génération de l'export Excel "structure fixe" de la Phase 1.
// La Phase 2 lit un modèle Excel entreprise et un mapping de colonnes validé
// par l'utilisateur (cf. customTemplateExporter.js) ; ce fichier reste le
// générateur par défaut quand aucun modèle personnalisé n'est configuré.
import ExcelJS from "exceljs";

const COLUMNS = [
  { header: "Date", width: 14 },
  { header: "Fournisseur", width: 28 },
  { header: "Catégorie", width: 16 },
  { header: "Description", width: 32 },
  { header: "Montant HT", width: 14 },
  { header: "TVA", width: 22 },
  { header: "Montant TTC", width: 14 },
  { header: "Personnes invitées", width: 28 },
  { header: "Lien justificatif Drive", width: 40 },
];
export const NB_COLONNES = COLUMNS.length;
export const LIGNE_ENTETE = 5; // 1: titre, 2-3: identité/mois/IBAN, 4: espacement, 5: en-têtes

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatMoisLabel(month) {
  const [annee, mois] = month.split("-").map(Number);
  return `${MOIS_LABELS[mois - 1]} ${annee}`;
}

function formatTva(tva) {
  if (!Array.isArray(tva) || tva.length === 0) return "";
  return tva.map((t) => `${t.taux}% (${Number(t.montant).toFixed(2)} €)`).join(" ; ");
}

function totalTvaMontant(depenses) {
  return depenses.reduce((sommeDepense, d) => {
    if (!Array.isArray(d.tva)) return sommeDepense;
    return sommeDepense + d.tva.reduce((sommeTva, t) => sommeTva + (Number(t.montant) || 0), 0);
  }, 0);
}

function ecrireChampIdentite(sheet, ligne, libelleCol, valeurColDebut, valeurColFin, libelle, valeur) {
  sheet.getCell(ligne, libelleCol).value = libelle;
  sheet.getCell(ligne, libelleCol).font = { bold: true };
  if (valeurColFin > valeurColDebut) sheet.mergeCells(ligne, valeurColDebut, ligne, valeurColFin);
  sheet.getCell(ligne, valeurColDebut).value = valeur;
}

/**
 * @param {Array} depenses Les dépenses du mois.
 * @param {string} month Format "YYYY-MM".
 * @param {{ nom?: string, fonction?: string, iban?: string }} profil Informations personnelles de l'utilisateur.
 */
export async function generateFixedColumnsWorkbook(depenses, month, profil = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Notes de frais";
  workbook.created = new Date();
  // Force le recalcul des formules (ligne Total) à l'ouverture, par sécurité
  // sur les tableurs qui se fient à une valeur mise en cache plutôt que de
  // recalculer une formule qui n'en a pas encore une.
  workbook.calcProperties.fullCalcOnLoad = true;

  const sheet = workbook.addWorksheet(`Dépenses ${month}`);

  // Ligne 1 : titre de la note de frais.
  sheet.mergeCells(1, 1, 1, NB_COLONNES);
  const titreCell = sheet.getCell(1, 1);
  titreCell.value = "NOTE DE FRAIS";
  titreCell.font = { bold: true, size: 16 };
  titreCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  // Lignes 2-3 : identité, fonction, mois de référence et IBAN.
  ecrireChampIdentite(sheet, 2, 1, 2, 3, "Nom :", profil.nom || "");
  ecrireChampIdentite(sheet, 2, 4, 5, NB_COLONNES, "Fonction :", profil.fonction || "");
  ecrireChampIdentite(sheet, 3, 1, 2, 3, "Mois :", formatMoisLabel(month));
  ecrireChampIdentite(sheet, 3, 4, 5, NB_COLONNES, "IBAN :", profil.iban || "");

  // Ligne 4 laissée vide (espacement avant le tableau).

  // Ligne 5 : en-têtes de colonnes.
  const enteteRow = sheet.getRow(LIGNE_ENTETE);
  COLUMNS.forEach((col, i) => {
    enteteRow.getCell(i + 1).value = col.header;
    sheet.getColumn(i + 1).width = col.width;
  });
  enteteRow.font = { bold: true };
  enteteRow.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: LIGNE_ENTETE }];

  const sorted = [...depenses].sort((a, b) => (a.date > b.date ? 1 : -1));
  const premiereLigneDonnees = LIGNE_ENTETE + 1;

  sorted.forEach((d, i) => {
    const row = sheet.getRow(premiereLigneDonnees + i);
    row.getCell(1).value = d.date;
    row.getCell(2).value = d.fournisseur;
    row.getCell(3).value = d.categorie;
    row.getCell(4).value = d.description || "";
    row.getCell(5).value = Number(d.montant_ht) || 0;
    row.getCell(5).numFmt = "#,##0.00 €";
    row.getCell(6).value = formatTva(d.tva);
    row.getCell(7).value = Number(d.montant_ttc) || 0;
    row.getCell(7).numFmt = "#,##0.00 €";
    row.getCell(8).value = d.invites || "";
    if (d.justificatif_drive_url) {
      row.getCell(9).value = { text: d.justificatif_drive_url, hyperlink: d.justificatif_drive_url };
    }
  });

  const derniereLigneDonnees = premiereLigneDonnees + sorted.length - 1;
  const ligneTotal = derniereLigneDonnees + 1;
  const totalRow = sheet.getRow(ligneTotal);
  totalRow.getCell(3).value = "Total";
  totalRow.getCell(5).value = { formula: `SUM(E${premiereLigneDonnees}:E${derniereLigneDonnees})` };
  totalRow.getCell(5).numFmt = "#,##0.00 €";
  // Le détail TVA par ligne est un texte formaté, non sommable par une formule
  // Excel : le total TVA est donc calculé côté serveur, sur cette même ligne.
  totalRow.getCell(6).value = totalTvaMontant(sorted);
  totalRow.getCell(6).numFmt = "#,##0.00 €";
  totalRow.getCell(7).value = { formula: `SUM(G${premiereLigneDonnees}:G${derniereLigneDonnees})` };
  totalRow.getCell(7).numFmt = "#,##0.00 €";
  totalRow.font = { bold: true };

  return workbook;
}
