// Rend une plage de cellules d'une feuille ExcelJS en image PNG, pour donner
// à l'utilisateur un vrai "aperçu avant impression" du fichier qui sera
// généré (en-tête + quelques lignes), plutôt qu'une reconstitution HTML
// approximative. Dessine au mieux les styles réels de la feuille (police,
// remplissage, bordures, fusions, largeurs/hauteurs) avec @napi-rs/canvas,
// déjà utilisé dans le pipeline OCR — pas de dépendance supplémentaire, et
// pas de conversion .xlsx -> image via un outil externe (LibreOffice etc.)
// indisponible dans une fonction Netlify.
import { createCanvas } from "@napi-rs/canvas";

const PX_PAR_POINT = 96 / 72; // conversion points Excel -> pixels écran (96 DPI)
const LARGEUR_COLONNE_DEFAUT_UNITES = 8.43; // largeur de colonne par défaut d'Excel
const HAUTEUR_LIGNE_DEFAUT_POINTS = 15;
const MARGE = 10;
const COULEUR_GRILLE_DEFAUT = "#d9d9d9";
const EPAISSEUR_BORDURE = { thin: 1, hair: 1, medium: 2, thick: 3, double: 2 };

function argbVersCss(argb, defaut) {
  if (!argb || argb.length < 6) return defaut;
  return `#${argb.slice(-6)}`;
}

function largeurColonnePx(worksheet, index) {
  const col = worksheet.getColumn(index);
  const unites = (col && col.width) || LARGEUR_COLONNE_DEFAUT_UNITES;
  return Math.round(unites * 7 + 5);
}

function hauteurLignePx(worksheet, numero) {
  const row = worksheet.getRow(numero);
  const points = (row && row.height) || HAUTEUR_LIGNE_DEFAUT_POINTS;
  return Math.round(points * PX_PAR_POINT);
}

function listeFusions(worksheet) {
  const modeles = worksheet.model && worksheet.model.merges;
  if (!Array.isArray(modeles)) return [];
  return modeles.map((ref) => {
    const [debut, fin] = ref.split(":");
    const c1 = worksheet.getCell(debut);
    const c2 = worksheet.getCell(fin || debut);
    return { top: c1.row, left: c1.col, bottom: c2.row, right: c2.col };
  });
}

function trouverFusion(fusions, ligne, colonne) {
  return fusions.find((f) => ligne >= f.top && ligne <= f.bottom && colonne >= f.left && colonne <= f.right);
}

function formaterValeur(cellule) {
  let valeur = cellule.value;
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "object") {
    if (valeur.hyperlink !== undefined) return String(valeur.text || valeur.hyperlink || "");
    if (valeur.richText) return valeur.richText.map((r) => r.text).join("");
    if (valeur.result !== undefined) valeur = valeur.result;
    else if (valeur.formula !== undefined) return "";
    else return String(cellule.text || "");
  }
  if (typeof valeur === "number") {
    const fmt = cellule.numFmt || "";
    if (fmt.includes("€")) {
      return `${valeur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
    if (fmt.includes("%")) return `${Math.round(valeur * 100)}%`;
    return String(valeur);
  }
  if (valeur instanceof Date) return valeur.toLocaleDateString("fr-FR");
  return String(valeur);
}

/**
 * @param {import('exceljs').Worksheet} worksheet
 * @param {{ligneDebut:number, ligneFin:number, colonneDebut:number, colonneFin:number}} plage
 * @returns {Buffer} image PNG.
 */
export function renderWorksheetToPng(worksheet, { ligneDebut, ligneFin, colonneDebut, colonneFin }) {
  const largeursColonnes = [];
  for (let c = colonneDebut; c <= colonneFin; c++) largeursColonnes.push(largeurColonnePx(worksheet, c));
  const hauteursLignes = [];
  for (let l = ligneDebut; l <= ligneFin; l++) hauteursLignes.push(hauteurLignePx(worksheet, l));

  const xColonne = (c) => MARGE + largeursColonnes.slice(0, c - colonneDebut).reduce((a, b) => a + b, 0);
  const yLigne = (l) => MARGE + hauteursLignes.slice(0, l - ligneDebut).reduce((a, b) => a + b, 0);

  const largeurTotale = largeursColonnes.reduce((a, b) => a + b, 0);
  const hauteurTotale = hauteursLignes.reduce((a, b) => a + b, 0);

  const canvas = createCanvas(largeurTotale + MARGE * 2, hauteurTotale + MARGE * 2);
  const ctx = canvas.getContext("2d");

  // Fond "papier" blanc, indépendant du thème clair/sombre de l'app : c'est
  // un aperçu avant impression, la page imprimée est toujours blanche.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fusions = listeFusions(worksheet);
  const dejaDessinees = new Set();

  for (let l = ligneDebut; l <= ligneFin; l++) {
    for (let c = colonneDebut; c <= colonneFin; c++) {
      const fusion = trouverFusion(fusions, l, c);
      const cle = fusion ? `${fusion.top}:${fusion.left}` : `${l}:${c}`;
      if (dejaDessinees.has(cle)) continue;
      dejaDessinees.add(cle);

      const ligneAncre = fusion ? fusion.top : l;
      const colAncre = fusion ? fusion.left : c;
      const finLigne = fusion ? Math.min(fusion.bottom, ligneFin) : l;
      const finColonne = fusion ? Math.min(fusion.right, colonneFin) : c;
      const cellule = worksheet.getCell(ligneAncre, colAncre);

      const x = xColonne(colAncre);
      const y = yLigne(ligneAncre);
      const largeur = xColonne(finColonne + 1) - x;
      const hauteur = yLigne(finLigne + 1) - y;
      if (largeur <= 0 || hauteur <= 0) continue;

      const remplissage = cellule.fill;
      if (remplissage && remplissage.type === "pattern" && remplissage.pattern === "solid" && remplissage.fgColor) {
        ctx.fillStyle = argbVersCss(remplissage.fgColor.argb, "#ffffff");
        ctx.fillRect(x, y, largeur, hauteur);
      }

      // Grille fine par défaut (comme Excel à l'écran), puis bordures
      // explicites de la cellule par-dessus si le modèle en définit.
      ctx.strokeStyle = COULEUR_GRILLE_DEFAUT;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(largeur - 1, 0), Math.max(hauteur - 1, 0));

      for (const cote of ["top", "left", "bottom", "right"]) {
        const bordure = cellule.border && cellule.border[cote];
        if (!bordure) continue;
        ctx.strokeStyle = argbVersCss(bordure.color && bordure.color.argb, "#000000");
        ctx.lineWidth = EPAISSEUR_BORDURE[bordure.style] || 1;
        ctx.beginPath();
        if (cote === "top") { ctx.moveTo(x, y); ctx.lineTo(x + largeur, y); }
        if (cote === "bottom") { ctx.moveTo(x, y + hauteur); ctx.lineTo(x + largeur, y + hauteur); }
        if (cote === "left") { ctx.moveTo(x, y); ctx.lineTo(x, y + hauteur); }
        if (cote === "right") { ctx.moveTo(x + largeur, y); ctx.lineTo(x + largeur, y + hauteur); }
        ctx.stroke();
      }

      const texte = formaterValeur(cellule);
      if (texte) {
        const police = cellule.font || {};
        const taille = Math.round((police.size || 11) * PX_PAR_POINT);
        ctx.font = `${police.italic ? "italic " : ""}${police.bold ? "bold " : ""}${taille}px Arial, sans-serif`;
        ctx.fillStyle = argbVersCss(police.color && police.color.argb, "#000000");
        ctx.textBaseline = "middle";

        const alignement =
          (cellule.alignment && cellule.alignment.horizontal) || (typeof cellule.value === "number" ? "right" : "left");
        const paddingH = 4;
        let tx = x + paddingH;
        ctx.textAlign = "left";
        if (alignement === "center") { tx = x + largeur / 2; ctx.textAlign = "center"; }
        else if (alignement === "right") { tx = x + largeur - paddingH; ctx.textAlign = "right"; }

        let texteAffiche = texte;
        while (ctx.measureText(texteAffiche).width > largeur - paddingH * 2 && texteAffiche.length > 1) {
          texteAffiche = texteAffiche.slice(0, -2) + "…";
        }
        ctx.fillText(texteAffiche, tx, y + hauteur / 2);
      }
    }
  }

  return canvas.toBuffer("image/png");
}
