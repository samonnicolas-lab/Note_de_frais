import { rasterizerPremierePage } from "./rasterizePdf.js";
import { reconnaitreTexte } from "./tesseract.js";

// Le HEIC (photos iPhone) n'est pas décodé de façon fiable par le pipeline
// canvas utilisé pour la rastérisation PDF : on saute directement l'OCR pour
// ce format et on part sur Claude, plutôt que de risquer un échec silencieux.
const TYPES_NON_SUPPORTES = new Set(["image/heic"]);

/** @returns {Promise<string|null>} texte OCR brut, ou `null` si le format n'est pas géré. */
export async function extraireTexteOcr(base64Data, mimeType) {
  if (TYPES_NON_SUPPORTES.has(mimeType)) return null;
  const buffer = Buffer.from(base64Data, "base64");
  const image = mimeType === "application/pdf" ? await rasterizerPremierePage(buffer) : buffer;
  return reconnaitreTexte(image);
}
