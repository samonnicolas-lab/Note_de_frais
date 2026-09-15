// Rend une plage de cellules d'une feuille ExcelJS en image PNG, pour donner
// à l'utilisateur un vrai "aperçu avant impression" du fichier qui sera
// généré (en-tête + quelques lignes), plutôt qu'une reconstitution HTML
// approximative. Dessine au mieux les styles réels de la feuille (police,
// remplissage, bordures, fusions, largeurs/hauteurs) avec @napi-rs/canvas,
// déjà utilisé dans le pipeline OCR — pas de dépendance supplémentaire, et
// pas de conversion .xlsx -> image via un outil externe (LibreOffice etc.)
// indisponible dans une fonction Netlify.
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { join } from "node:path";

// Contrairement à un poste de développement, l'environnement d'exécution des
// Netlify Functions n'a AUCUNE police système installée : sans enregistrement
// explicite, @napi-rs/canvas ne trouve aucune police, et `ctx.fillText` ne
// dessine rien de visible (aucune erreur levée — constaté en production avec
// un modèle personnalisé : bordures et remplissages corrects, tout le texte
// invisible). On enregistre Liberation Sans (métriquement compatible Arial),
// déjà présente comme police standard de pdfjs-dist, sous le nom "Arial" pour
// que les `ctx.font = "...Arial..."` du reste de ce fichier la trouvent.
const DOSSIER_POLICES = join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts");
let policesEnregistrees = false;
function garantirPolices() {
  if (policesEnregistrees) return;
  policesEnregistrees = true;
  for (const fichier of [
    "LiberationSans-Regular.ttf",
    "LiberationSans-Bold.ttf",
    "LiberationSans-Italic.ttf",
    "LiberationSans-BoldItalic.ttf",
  ]) {
    try {
      GlobalFonts.registerFromPath(join(DOSSIER_POLICES, fichier), "Arial");
    } catch (err) {
      console.error(`Impossible d'enregistrer la police ${fichier} :`, err.message);
    }
  }
}

const PX_PAR_POINT = 96 / 72; // conversion points Excel -> pixels écran (96 DPI)
const LARGEUR_COLONNE_DEFAUT_UNITES = 8.43; // largeur de colonne par défaut d'Excel
const HAUTEUR_LIGNE_DEFAUT_POINTS = 15;
const MARGE = 10;
const COULEUR_GRILLE_DEFAUT = "#d9d9d9";
const EPAISSEUR_BORDURE = { thin: 1, hair: 1, medium: 2, thick: 3, double: 2 };

// Ordre des 12 couleurs de base d'un thème Office/Google Sheets, tel que
// référencé par l'attribut "theme" d'une couleur de style (0-11). Attention :
// cet ordre n'est PAS celui de déclaration dans le XML du thème (dk1, lt1,
// dk2, lt2, ...) — c'est un décalage documenté du format OOXML (bg1/tx1
// pointent par défaut vers lt1/dk1, pas dk1/lt1).
const ORDRE_THEME = ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];

function extraireCouleurTheme(xml, nomBalise) {
  const bloc = xml.match(new RegExp(`<a:${nomBalise}>([\\s\\S]*?)</a:${nomBalise}>`));
  if (!bloc) return null;
  const m = bloc[1].match(/lastClr="([0-9A-Fa-f]{6})"/) || bloc[1].match(/val="([0-9A-Fa-f]{6})"/);
  return m ? m[1].toUpperCase() : null;
}

/** Palette des 12 couleurs de thème du classeur (index -> "RRGGBB"), ou null si indisponible. */
export function construirePaletteTheme(workbook) {
  const xml = workbook && workbook.model && workbook.model.themes && workbook.model.themes.theme1;
  if (!xml) return null;
  return ORDRE_THEME.map((nom) => extraireCouleurTheme(xml, nom) || "000000");
}

// Algorithme de teinte OOXML (approximation linéaire usuelle) : assombrit si
// tint < 0, éclaircit vers le blanc si tint > 0.
function appliquerTeinte(hex, tint) {
  if (!tint) return hex;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const ajuster = (c) => (tint < 0 ? c * (1 + tint) : c * (1 - tint) + 255 * tint);
  const enHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `${enHex(ajuster(r))}${enHex(ajuster(g))}${enHex(ajuster(b))}`.toUpperCase();
}

/** Résout une couleur ExcelJS ({argb} ou {theme, tint}) en couleur CSS. */
function resoudreCouleur(couleur, paletteTheme, defaut) {
  if (!couleur) return defaut;
  if (couleur.argb) return `#${String(couleur.argb).slice(-6)}`;
  if (couleur.theme !== undefined && paletteTheme && paletteTheme[couleur.theme]) {
    return `#${appliquerTeinte(paletteTheme[couleur.theme], couleur.tint || 0)}`;
  }
  return defaut;
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

// Le texte affichable d'une cellule est délégué à ExcelJS (`cellule.text`,
// qui gère déjà texte simple, texte enrichi, hyperliens et formules avec
// résultat mis en cache) sauf pour les nombres et les dates, où l'on veut un
// format français explicite plutôt que la valeur brute non formatée par ExcelJS.
function formaterValeur(cellule) {
  const valeur = cellule.value;
  if (valeur === null || valeur === undefined || valeur === "") return "";
  if (valeur instanceof Date) return valeur.toLocaleDateString("fr-FR");
  if (typeof valeur === "number") {
    const fmt = cellule.numFmt || "";
    if (fmt.includes("€")) {
      return `${valeur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
    if (fmt.includes("%")) return `${Math.round(valeur * 100)}%`;
    return String(valeur);
  }
  return String(cellule.text ?? valeur);
}

/**
 * @param {import('exceljs').Worksheet} worksheet
 * @param {{ligneDebut:number, ligneFin:number, colonneDebut:number, colonneFin:number}} plage
 * @param {Array<string>|null} [paletteTheme] Palette de thème du classeur (cf. construirePaletteTheme).
 * @returns {Buffer} image PNG.
 */
export function renderWorksheetToPng(worksheet, { ligneDebut, ligneFin, colonneDebut, colonneFin }, paletteTheme = null) {
  garantirPolices();

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
        ctx.fillStyle = resoudreCouleur(remplissage.fgColor, paletteTheme, "#ffffff");
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
        ctx.strokeStyle = resoudreCouleur(bordure.color, paletteTheme, "#000000");
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
        ctx.fillStyle = resoudreCouleur(police.color, paletteTheme, "#000000");
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
