import { extraireTexteNatifPdf, rasterizerPremierePage } from "./pdf.js";
import { reconnaitreTexte } from "./tesseract.js";
import { redimensionnerSiBesoin } from "./redimensionner.js";

// Le HEIC (photos iPhone) n'est pas décodé de façon fiable par le pipeline
// canvas utilisé pour la rastérisation PDF : on saute directement l'OCR pour
// ce format et on part sur Claude, plutôt que de risquer un échec silencieux.
const TYPES_NON_SUPPORTES = new Set(["image/heic"]);

// Seuil pour juger qu'un texte extrait nativement d'un PDF est un vrai calque
// de texte exploitable (facture générée numériquement, ou photo scannée par
// une appli qui embarque son propre OCR) et non un PDF composé d'une simple
// image scannée sans texte (juste un artefact/watermark isolé, par exemple).
function texteEstSubstantiel(texte) {
  if (!texte) return false;
  const mots = texte.trim().split(/\s+/).filter((m) => m.length >= 2);
  return texte.trim().length >= 50 && mots.length >= 8;
}

/** @returns {Promise<string|null>} texte OCR brut, ou `null` si le format n'est pas géré. */
export async function extraireTexteOcr(base64Data, mimeType) {
  if (TYPES_NON_SUPPORTES.has(mimeType)) return null;
  const t0 = Date.now();
  const buffer = Buffer.from(base64Data, "base64");

  console.log(`[OCR] début, mimeType=${mimeType}, taille=${buffer.length} octets`);

  if (mimeType === "application/pdf") {
    const texteNatif = await extraireTexteNatifPdf(buffer);
    if (texteEstSubstantiel(texteNatif)) {
      console.log(
        `[OCR] texte natif du PDF utilisé directement (${texteNatif.length} caractères, ${Date.now() - t0} ms) : OCR non nécessaire.`
      );
      return texteNatif;
    }
    console.log(`[OCR] pas de texte natif exploitable dans le PDF, rastérisation puis OCR (${Date.now() - t0} ms).`);
  }

  const image = mimeType === "application/pdf" ? await rasterizerPremierePage(buffer) : buffer;
  if (mimeType === "application/pdf") {
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
