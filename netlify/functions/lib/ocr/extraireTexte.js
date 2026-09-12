import { rasterizerPremierePage } from "./rasterizePdf.js";
import { reconnaitreTexte } from "./tesseract.js";
import { redimensionnerSiBesoin } from "./redimensionner.js";

// Le HEIC (photos iPhone) n'est pas décodé de façon fiable par le pipeline
// canvas utilisé pour la rastérisation PDF : on saute directement l'OCR pour
// ce format et on part sur Claude, plutôt que de risquer un échec silencieux.
const TYPES_NON_SUPPORTES = new Set(["image/heic"]);

/** @returns {Promise<string|null>} texte OCR brut, ou `null` si le format n'est pas géré. */
export async function extraireTexteOcr(base64Data, mimeType) {
  if (TYPES_NON_SUPPORTES.has(mimeType)) return null;
  const t0 = Date.now();
  const buffer = Buffer.from(base64Data, "base64");

  console.log(`[OCR] début, mimeType=${mimeType}, taille=${buffer.length} octets`);

  let image = buffer;
  if (mimeType === "application/pdf") {
    image = await rasterizerPremierePage(buffer);
    console.log(`[OCR] rastérisation PDF terminée en ${Date.now() - t0} ms`);
  }

  // Une photo prise au téléphone dépasse largement la résolution utile à
  // l'OCR : la réduire est le principal levier pour tenir dans le budget de
  // temps (constaté en production : l'OCR sur une vraie photo dépassait
  // systématiquement 8s à pleine résolution).
  const t1 = Date.now();
  const imageRedimensionnee = await redimensionnerSiBesoin(image);
  console.log(`[OCR] redimensionnement terminé en ${Date.now() - t1} ms`);

  const t2 = Date.now();
  const texte = await reconnaitreTexte(imageRedimensionnee);
  console.log(`[OCR] reconnaissance de texte terminée en ${Date.now() - t2} ms (total ${Date.now() - t0} ms)`);
  return texte;
}
