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

/**
 * Compare deux ensembles de mots significatifs déjà calculés (cf. motsSignificatifs).
 * Un seul mot commun ne suffit à conclure une correspondance que si le nom le
 * plus court n'a lui-même qu'un seul mot significatif (ex: "EDF" vs "EDF
 * Particuliers") : sinon, un mot isolé mais courant (ex: "SNCF") rapprocherait
 * à tort deux commerces sans rapport (constaté en prod : la signature d'un
 * restaurant "PRET (FRANCE) - Gare SNCF Rennes" a été écrasée par celle de
 * "SNCF Voyageurs", les deux ne partageant que le mot "SNCF").
 */
export function correspondanceMots(motsA, motsB) {
  if (motsA.size === 0 || motsB.size === 0) return { match: false, communs: 0, ratio: 0 };
  let communs = 0;
  for (const mot of motsA) {
    if (motsB.has(mot)) communs += 1;
  }
  const plusPetit = Math.min(motsA.size, motsB.size);
  const ratio = communs / plusPetit;
  const match = plusPetit === 1 ? communs === 1 : communs >= 2 && ratio >= 0.5;
  return { match, communs, ratio };
}

/** Fournisseurs jugés identiques d'après leurs mots significatifs communs (cf. correspondanceMots). */
export function fournisseurSimilaire(a, b) {
  return correspondanceMots(motsSignificatifs(a), motsSignificatifs(b)).match;
}
