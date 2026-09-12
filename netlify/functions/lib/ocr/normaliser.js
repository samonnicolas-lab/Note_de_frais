// Normalisation de texte partagée par la reconnaissance de signature (matching
// insensible aux accents/majuscules entre l'OCR et le nom stocké en base).
export function normaliserTexte(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

export function normaliserFournisseur(str) {
  return normaliserTexte(str).replace(/\s+/g, " ").trim();
}
