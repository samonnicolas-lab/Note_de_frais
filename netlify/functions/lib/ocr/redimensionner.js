// Réduction de la résolution avant OCR. Une photo de facture prise au
// téléphone fait couramment 3000-4000px de large : Tesseract n'a pas besoin
// de cette résolution pour lire du texte, et le temps de traitement croît
// avec le nombre de pixels — ramener à une largeur raisonnable est le levier
// le plus direct pour tenir dans le budget de temps d'une fonction Netlify.
import { createCanvas, loadImage } from "@napi-rs/canvas";

const LARGEUR_MAX = 1800;

/** @param {Buffer} image @returns {Promise<Buffer>} PNG redimensionné si besoin. */
export async function redimensionnerSiBesoin(image, largeurMax = LARGEUR_MAX) {
  const source = await loadImage(image);
  if (source.width <= largeurMax) return image;

  const ratio = largeurMax / source.width;
  const largeur = largeurMax;
  const hauteur = Math.round(source.height * ratio);

  const canvas = createCanvas(largeur, hauteur);
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0, largeur, hauteur);
  return canvas.toBuffer("image/png");
}
