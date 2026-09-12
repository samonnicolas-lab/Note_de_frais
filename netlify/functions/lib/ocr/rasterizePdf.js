// Rastérisation de la première page d'un PDF en image, pour permettre à l'OCR
// (Tesseract.js, qui ne lit pas nativement le PDF) de la traiter comme une
// photo. On se limite à la page 1 : c'est là que figurent quasi systématiquement
// fournisseur/date/montants sur une facture ; les cas rares d'infos en page 2+
// retombent sur Claude via le mécanisme de repli existant.
import { createCanvas } from "@napi-rs/canvas";

let pdfjsLibPromise = null;
function chargerPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLibPromise;
}

/** @param {Buffer} bufferPdf @returns {Promise<Buffer>} PNG de la première page. */
export async function rasterizerPremierePage(bufferPdf, echelle = 2) {
  const t0 = Date.now();
  console.log("[OCR] chargement de pdfjs-dist...");
  const pdfjsLib = await chargerPdfjs();
  console.log(`[OCR] pdfjs-dist chargé en ${Date.now() - t0} ms`);

  const tache = pdfjsLib.getDocument({ data: new Uint8Array(bufferPdf) });
  try {
    const document = await tache.promise;
    console.log(`[OCR] document PDF chargé en ${Date.now() - t0} ms`);
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: echelle });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    console.log(`[OCR] page rendue sur le canvas en ${Date.now() - t0} ms`);
    return canvas.toBuffer("image/png");
  } finally {
    await tache.destroy();
  }
}
