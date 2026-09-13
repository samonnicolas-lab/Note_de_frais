// Traitement des PDF pour l'extraction de texte : soit on lit directement le
// texte déjà intégré au PDF (facture générée numériquement, ou photo scannée
// par une appli qui embarque son propre calque de texte OCR — souvent bien
// plus fiable que notre Tesseract), soit, s'il n'y en a pas (PDF = simple
// image scannée), on rastérise la première page pour la traiter comme une
// photo (cf. extraireTexte.js).
import { createCanvas } from "@napi-rs/canvas";

let pdfjsLibPromise = null;
function chargerPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLibPromise;
}

async function avecPremierePage(bufferPdf, fn) {
  const pdfjsLib = await chargerPdfjs();
  const tache = pdfjsLib.getDocument({ data: new Uint8Array(bufferPdf) });
  try {
    const document = await tache.promise;
    const page = await document.getPage(1);
    return await fn(page);
  } finally {
    await tache.destroy();
  }
}

/**
 * Texte déjà présent dans le PDF (calque numérique), reconstitué ligne par
 * ligne à partir de la position verticale de chaque fragment — pour rester
 * exploitable par la même logique d'ancres que le texte OCR (cf. signature.js).
 * @returns {Promise<string>} chaîne vide si le PDF n'a pas de texte exploitable.
 */
export async function extraireTexteNatifPdf(bufferPdf) {
  return avecPremierePage(bufferPdf, async (page) => {
    const contenu = await page.getTextContent();
    if (!contenu.items || contenu.items.length === 0) return "";

    const TOLERANCE_Y = 2;
    const lignes = [];
    for (const item of contenu.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = item.transform[5];
      const x = item.transform[4];
      let ligne = lignes.find((l) => Math.abs(l.y - y) <= TOLERANCE_Y);
      if (!ligne) {
        ligne = { y, morceaux: [] };
        lignes.push(ligne);
      }
      ligne.morceaux.push({ x, texte: item.str });
    }
    lignes.sort((a, b) => b.y - a.y);
    return lignes
      .map((l) =>
        l.morceaux
          .sort((a, b) => a.x - b.x)
          .map((m) => m.texte)
          .join(" ")
      )
      .join("\n");
  });
}

/** @returns {Promise<Buffer>} PNG de la première page, pour un PDF sans texte exploitable (scan image). */
export async function rasterizerPremierePage(bufferPdf, echelle = 2) {
  return avecPremierePage(bufferPdf, async (page) => {
    const viewport = page.getViewport({ scale: echelle });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    return canvas.toBuffer("image/png");
  });
}
