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

/** Mots significatifs (>= 3 lettres) d'un texte, pour une comparaison tolérante
 * aux variantes de formulation ou à un OCR partiellement illisible. */
export function motsSignificatifs(str) {
  return new Set(
    normaliserTexte(str)
      .replace(/[^A-Z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((mot) => mot.length >= 3)
  );
}

/** Fournisseurs jugés identiques si au moins la moitié des mots significatifs du plus court sont communs. */
export function fournisseurSimilaire(a, b) {
  const motsA = motsSignificatifs(a);
  const motsB = motsSignificatifs(b);
  if (motsA.size === 0 || motsB.size === 0) return false;
  let communs = 0;
  for (const mot of motsA) {
    if (motsB.has(mot)) communs += 1;
  }
  return communs / Math.min(motsA.size, motsB.size) >= 0.5;
}
