// Génère un aperçu visuel (image PNG) du fichier d'export : l'en-tête réel
// du fichier (standard ou modèle personnalisé) suivi de quelques lignes
// d'exemple, rendu à partir du vrai classeur ExcelJS qui serait produit par
// un export réel (cf. lib/export/index.js) — pas une reconstitution HTML
// approximative. Voir lib/export/renderPreviewImage.js pour le rendu.
import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { getModeleConfig, downloadModeleTemplate } from "./lib/modele/index.js";
import { getProfil } from "./lib/profil/index.js";
import { generateFixedColumnsWorkbook, LIGNE_ENTETE, NB_COLONNES } from "./lib/export/fixedColumnsExporter.js";
import { generateFromTemplate } from "./lib/export/customTemplateExporter.js";
import { depensesExemple } from "./lib/export/depensesExemple.js";
import { renderWorksheetToPng, construirePaletteTheme } from "./lib/export/renderPreviewImage.js";

const NB_LIGNES_EXEMPLE = 3;
const MAX_COLONNES = 20; // garde-fou si un modèle personnalisé définit énormément de colonnes

function lettreVersIndex(lettre) {
  let n = 0;
  for (const c of String(lettre || "").toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n || 1;
}

/** Extrait la partie lettres d'une référence de cellule ("B2" -> "B"). */
function colonneDeReference(ref) {
  const m = String(ref || "").match(/^[A-Za-z]+/);
  return m ? m[0] : "";
}

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "GET") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpError(400, "Le paramètre 'month' (YYYY-MM) est requis.");
    }

    const [config, profil] = await Promise.all([getModeleConfig(drive), getProfil(drive)]);
    const exemples = depensesExemple(month);

    let workbook;
    let plage;
    if (config) {
      const templateBuffer = await downloadModeleTemplate(drive, config.templateFileId);
      workbook = await generateFromTemplate(
        templateBuffer,
        config.mapping,
        config.ligneEntete,
        exemples,
        month,
        config.cellules,
        profil
      );
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new HttpError(500, "Impossible de générer l'aperçu : classeur vide.");
      }

      // Bornes minimales : colonnes du mapping + des informations d'en-tête
      // (nom/fonction/mois/iban), et les lignes d'exemple qu'on vient d'insérer.
      const colonnesReferencees = [
        ...Object.values(config.mapping || {}),
        ...Object.values(config.cellules || {}),
      ]
        .filter(Boolean)
        .map(colonneDeReference)
        .map(lettreVersIndex);
      const colonneMin = Math.max(1, ...colonnesReferencees);
      const ligneMin = config.ligneEntete + NB_LIGNES_EXEMPLE;

      // Étendues aux cellules déjà remplies dans le modèle de l'utilisateur
      // (logo, intitulés, encarts...) qui ne font pas partie du mapping mais
      // doivent quand même apparaître dans l'aperçu — bornées pour ne pas
      // afficher un modèle immense au-delà de ce qui est réellement utile.
      const etendue = worksheet.dimensions || { bottom: ligneMin, right: colonneMin };
      plage = {
        ligneDebut: 1,
        ligneFin: Math.min(Math.max(ligneMin, etendue.bottom), ligneMin + 10),
        colonneDebut: 1,
        colonneFin: Math.min(Math.max(colonneMin, etendue.right), MAX_COLONNES),
      };
    } else {
      workbook = await generateFixedColumnsWorkbook(exemples, month, profil);
      plage = {
        ligneDebut: 1,
        ligneFin: LIGNE_ENTETE + NB_LIGNES_EXEMPLE,
        colonneDebut: 1,
        colonneFin: NB_COLONNES,
      };
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new HttpError(500, "Impossible de générer l'aperçu : classeur vide.");
    }

    // Diagnostic temporaire : aide à comprendre pourquoi l'aperçu d'un modèle
    // personnalisé peut sortir sans aucune donnée dans les cellules. À retirer
    // une fois le problème identifié.
    console.log(
      "[apercu-export] config présent=", !!config,
      "ligneEntete=", config && config.ligneEntete,
      "mapping=", JSON.stringify(config && config.mapping),
      "cellules=", JSON.stringify(config && config.cellules)
    );
    console.log("[apercu-export] plage calculée=", JSON.stringify(plage));
    const contenu = [];
    for (let l = plage.ligneDebut; l <= plage.ligneFin; l++) {
      for (let c = plage.colonneDebut; c <= plage.colonneFin; c++) {
        const cell = worksheet.getCell(l, c);
        if (cell.value !== null && cell.value !== undefined && cell.value !== "") {
          contenu.push(`${cell.address}=${JSON.stringify(cell.value)}`);
        }
      }
    }
    console.log("[apercu-export] cellules non vides dans la plage :", contenu.join(" | ") || "(aucune)");

    const png = renderWorksheetToPng(worksheet, plage, construirePaletteTheme(workbook));
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    return json(200, { image: dataUrl });
  });
};
