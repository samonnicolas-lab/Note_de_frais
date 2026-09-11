// Détection automatique de la structure d'un modèle Excel entreprise (Phase 2) :
// on ne devine que la ligne d'en-tête et un aperçu des colonnes — la correspondance
// avec nos champs internes est ensuite VALIDÉE par l'utilisateur côté frontend
// (cf. cahier des charges §0), jamais appliquée automatiquement sans confirmation.
import ExcelJS from "exceljs";

const LIGNES_ANALYSEES = 15;

function cellToText(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((rt) => rt.text).join("");
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return String(v.result);
    return "";
  }
  return String(v);
}

function numeroVersLettre(n) {
  let s = "";
  let reste = n;
  while (reste > 0) {
    const mod = (reste - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    reste = Math.floor((reste - 1) / 26);
  }
  return s;
}

function ressembleAUnEntete(texte) {
  const t = texte.trim();
  if (!t || t.length > 40) return false;
  if (/^-?\d+([.,]\d+)?$/.test(t)) return false;
  return true;
}

/**
 * Charge un classeur Excel et renvoie un aperçu des premières lignes (colonne +
 * texte de chaque cellule non vide), ainsi qu'une suggestion de ligne d'en-tête.
 */
export async function analyserModele(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Le classeur ne contient aucune feuille exploitable.");
  }

  const limite = Math.min(worksheet.rowCount || 0, LIGNES_ANALYSEES);
  const apercu = [];
  let ligneEnteteSuggeree = 1;
  let meilleurScore = -1;

  for (let r = 1; r <= limite; r++) {
    const row = worksheet.getRow(r);
    const cellules = [];
    // Une cellule fusionnée (ex. titre sur toute la largeur) répète la même valeur
    // sur chaque colonne de la fusion : on compte les textes DISTINCTS pour ne pas
    // laisser un titre fusionné l'emporter artificiellement sur la vraie ligne d'en-tête.
    const textesDistincts = new Set();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const valeur = cellToText(cell);
      if (!valeur) return;
      cellules.push({ colonne: numeroVersLettre(colNumber), valeur });
      if (ressembleAUnEntete(valeur)) textesDistincts.add(valeur);
    });
    apercu.push({ numero: r, cellules });
    if (cellules.length > 0 && textesDistincts.size > meilleurScore) {
      meilleurScore = textesDistincts.size;
      ligneEnteteSuggeree = r;
    }
  }

  return { ligneEnteteSuggeree, apercu };
}
