// Réduction de la résolution avant OCR. Une photo de facture prise au
// téléphone fait couramment 3000-4000px de large : Tesseract n'a pas besoin
// de cette résolution pour lire du texte, et le temps de traitement croît
// avec le nombre de pixels — ramener à une largeur raisonnable est le levier
// le plus direct pour tenir dans le budget de temps d'une fonction Netlify.
import { createCanvas, loadImage } from "@napi-rs/canvas";

// Constaté en prod (logs [OCR]) : une vraie photo de facture déjà sous 1800px
// (compression côté client) prend quand même plus de 6s à reconnaître sur le
// CPU alloué par Netlify — 1800px est encore trop pour ce budget. Le temps de
// traitement de Tesseract croît avec le nombre de pixels (environ au carré de
// la largeur) : redescendre à 1400px devrait réduire la charge d'environ 40%.
const LARGEUR_MAX = 1400;

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
  // JPEG et non PNG : constaté en prod, ré-encoder une photo en PNG (sans
  // perte) est à la fois plus lent à produire et donne un fichier plus gros
  // qu'en JPEG (1,24 Mo d'origine -> 4,15 Mo en PNG après redimensionnement),
  // ce qui a fait passer le redimensionnement de ~0,2s à ~1,9s.
  return canvas.toBuffer("image/jpeg", 0.85);
}
