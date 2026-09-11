// Génère l'export mensuel en remplissant le modèle Excel entreprise de
// l'utilisateur (Phase 2), à la place des colonnes fixes de la Phase 1.
// Remplaçable/interchangeable avec fixedColumnsExporter.js via lib/export/index.js.
import ExcelJS from "exceljs";

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

function lettreVersNumero(lettre) {
  let n = 0;
  for (const c of lettre.toUpperCase()) {
    n = n * 26 + (c.charCodeAt(0) - 64);
  }
  return n;
}

/** Choisit la colonne où écrire le libellé "Total" : une colonne texte, pas une colonne de montant. */
function trouverColonneLabelTotal(mapping) {
  for (const champ of ["fournisseur", "categorie", "date"]) {
    if (mapping[champ]) return mapping[champ];
  }
  const candidates = Object.entries(mapping)
    .filter(([champ, col]) => col && champ !== "montant_ht" && champ !== "montant_ttc")
    .map(([, col]) => col);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => lettreVersNumero(a) - lettreVersNumero(b))[0];
}

/**
 * @param {Buffer} templateBuffer Le modèle .xlsx vierge de l'entreprise.
 * @param {Record<string, string|null>} mapping Champ interne -> lettre de colonne (ou null), répété par ligne.
 * @param {number} ligneEntete Numéro de la ligne d'en-tête détectée/validée.
 * @param {Array} depenses Les dépenses du mois à insérer, une ligne par dépense.
 * @param {string} month Mois de l'export, format "YYYY-MM".
 * @param {Record<string, string|null>} cellules Champ d'en-tête -> référence de cellule unique (ex. { nom: "B2" }).
 * @param {{ nom?: string, fonction?: string, iban?: string }} profil Informations personnelles de l'utilisateur.
 */
export async function generateFromTemplate(templateBuffer, mapping, ligneEntete, depenses, month, cellules = {}, profil = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Le modèle Excel enregistré ne contient aucune feuille exploitable.");
  }

  // ExcelJS ne recalcule pas les formules déjà présentes dans le modèle (ex. un
  // total en bas de tableau) : sans ceci, Excel afficherait la valeur figée
  // enregistrée dans le modèle vierge (souvent 0) au lieu de recalculer une fois
  // les dépenses insérées. On force le recalcul complet à l'ouverture du fichier.
  workbook.calcProperties.fullCalcOnLoad = true;

  const sorted = [...depenses].sort((a, b) => (a.date > b.date ? 1 : -1));
  const premiereLigneDonnees = ligneEntete + 1;

  sorted.forEach((d, i) => {
    const row = worksheet.getRow(premiereLigneDonnees + i);

    if (mapping.date) row.getCell(mapping.date).value = d.date;
    if (mapping.fournisseur) row.getCell(mapping.fournisseur).value = d.fournisseur;
    if (mapping.categorie) row.getCell(mapping.categorie).value = d.categorie;
    if (mapping.montant_ht) {
      const cell = row.getCell(mapping.montant_ht);
      cell.value = Number(d.montant_ht) || 0;
      cell.numFmt = "#,##0.00 €";
    }
    if (mapping.tva) row.getCell(mapping.tva).value = formatTva(d.tva);
    if (mapping.montant_ttc) {
      const cell = row.getCell(mapping.montant_ttc);
      cell.value = Number(d.montant_ttc) || 0;
      cell.numFmt = "#,##0.00 €";
    }
    if (mapping.lien_justificatif && d.justificatif_drive_url) {
      row.getCell(mapping.lien_justificatif).value = {
        text: d.justificatif_drive_url,
        hyperlink: d.justificatif_drive_url,
      };
    }
  });

  // Le modèle ne contient pas nécessairement de ligne de total : on en ajoute
  // toujours une juste après la dernière dépense insérée, comme le fait l'export
  // à colonnes fixes, avec une somme sur les colonnes de montants mappées.
  const derniereLigneDonnees = premiereLigneDonnees + sorted.length - 1;
  const ligneTotal = derniereLigneDonnees + 1;
  const totalRow = worksheet.getRow(ligneTotal);

  const colonneLabel = trouverColonneLabelTotal(mapping);
  if (colonneLabel) totalRow.getCell(colonneLabel).value = "Total";

  for (const champMontant of ["montant_ht", "montant_ttc"]) {
    const colonne = mapping[champMontant];
    if (!colonne) continue;
    const cell = totalRow.getCell(colonne);
    cell.value = { formula: `SUM(${colonne}${premiereLigneDonnees}:${colonne}${derniereLigneDonnees})` };
    cell.numFmt = "#,##0.00 €";
  }
  totalRow.font = { bold: true };

  // Informations d'en-tête ponctuelles (une seule cellule chacune, indépendantes
  // du tableau de dépenses) : identité, mois de référence, IBAN et total TVA.
  if (cellules.nom && profil.nom) worksheet.getCell(cellules.nom).value = profil.nom;
  if (cellules.fonction && profil.fonction) worksheet.getCell(cellules.fonction).value = profil.fonction;
  if (cellules.iban && profil.iban) worksheet.getCell(cellules.iban).value = profil.iban;
  if (cellules.mois && month) worksheet.getCell(cellules.mois).value = formatMoisLabel(month);
  if (cellules.total_tva) {
    const cell = worksheet.getCell(cellules.total_tva);
    cell.value = totalTvaMontant(sorted);
    cell.numFmt = "#,##0.00 €";
  }

  return workbook;
}
