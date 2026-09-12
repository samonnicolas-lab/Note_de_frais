// Reconnaissance par "signature fournisseur" (cahier des charges Phase 3) :
// au lieu de stocker les valeurs d'une facture, on stocke pour chaque
// fournisseur connu l'"étiquette" (le texte qui précède la valeur sur la
// même ligne, ex. "MONTANT TTC") trouvée à côté de chaque champ lors d'une
// précédente extraction Claude. Sur une nouvelle facture du même fournisseur,
// on retrouve la ligne portant cette étiquette et on en extrait le nombre/la
// date — sans appel payant à Claude.
import { normaliserTexte } from "./normaliser.js";

const REGEX_NOMBRE = /-?\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,2})?/;
const REGEX_DATE = /\d{4}-\d{2}-\d{2}|\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/;

function decouperLignes(texte) {
  return (texte || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseNombre(brut) {
  if (!brut) return null;
  let s = brut.trim();
  const virgule = s.lastIndexOf(",");
  const point = s.lastIndexOf(".");
  if (virgule >= 0 && point >= 0) {
    s = virgule > point ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (virgule >= 0) {
    s = s.replace(/\s/g, "").replace(",", ".");
  } else {
    s = s.replace(/\s/g, "");
  }
  const val = Number(s);
  return Number.isFinite(val) ? val : null;
}

function parseDate(brut) {
  if (!brut) return null;
  const iso = brut.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = brut.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) return null;
  let [, j, mo, a] = m;
  if (a.length === 2) a = `20${a}`;
  return `${a}-${mo.padStart(2, "0")}-${j.padStart(2, "0")}`;
}

/** Étiquette = le texte (lettres uniquement) précédant la valeur sur la ligne. */
function extraireEtiquette(ligne, valeurBrute) {
  const idx = ligne.indexOf(valeurBrute);
  const avant = idx >= 0 ? ligne.slice(0, idx) : ligne;
  const etiquette = normaliserTexte(avant)
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return etiquette || null;
}

// Bornée par des frontières "non-chiffre" : sans ça, chercher la valeur "100"
// matcherait à tort à l'intérieur d'un numéro de facture ("1001") ou d'une
// année ("2026").
function construireRegexValeur(valeur) {
  const formats = [valeur.toFixed(2).replace(".", ","), valeur.toFixed(2), String(valeur)];
  const alternatives = [...new Set(formats)].map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<!\\d)(?:${alternatives.join("|")})(?!\\d)`);
}

function trouverAncrePourNombre(lignes, valeur) {
  if (valeur === null || valeur === undefined) return null;
  const regex = construireRegexValeur(valeur);
  for (const ligne of lignes) {
    const m = ligne.match(regex);
    if (m) return extraireEtiquette(ligne, m[0]);
  }
  return null;
}

/** Construit la signature d'un fournisseur à partir du texte OCR et d'une extraction Claude validée. */
export function construireSignature(texteOcr, extraction) {
  const lignes = decouperLignes(texteOcr);

  let ancreDate = null;
  for (const ligne of lignes) {
    const m = ligne.match(REGEX_DATE);
    if (m && parseDate(m[0]) === extraction.date) {
      ancreDate = extraireEtiquette(ligne, m[0]);
      break;
    }
  }

  const structure = {
    version: 1,
    categorie_defaut: extraction.categorie,
    ancre_date: ancreDate,
    ancre_montant_ttc: trouverAncrePourNombre(lignes, extraction.montant_ttc),
    ancre_montant_ht: trouverAncrePourNombre(lignes, extraction.montant_ht),
  };

  if (Array.isArray(extraction.tva) && extraction.tva.length === 1) {
    structure.ancre_tva_montant = trouverAncrePourNombre(lignes, extraction.tva[0].montant);
    structure.taux_tva_habituel = extraction.tva[0].taux;
  }

  return structure;
}

/** La signature est-elle assez complète pour être utile (au moins le montant TTC) ? */
export function signatureExploitable(structure) {
  return Boolean(structure && structure.ancre_montant_ttc);
}

function extraireValeurParEtiquette(lignes, etiquette, regex) {
  if (!etiquette) return null;
  const regexGlobale = new RegExp(regex.source, "g");
  for (const ligne of lignes) {
    if (normaliserTexte(ligne).includes(etiquette)) {
      for (const m of ligne.matchAll(regexGlobale)) {
        // Un nombre suivi de "%" est un taux (ex: "TVA 20% : 50,00 EUR"), pas
        // le montant recherché : on l'ignore et on prend le nombre suivant.
        const suite = ligne.slice(m.index + m[0].length, m.index + m[0].length + 1);
        if (suite === "%") continue;
        return m[0];
      }
    }
  }
  return null;
}

/**
 * Applique une signature connue au texte OCR d'une nouvelle facture.
 * Retourne `null` si le champ indispensable (montant TTC ou date) est introuvable —
 * dans ce cas l'appelant doit se replier sur Claude.
 */
export function appliquerSignature(texteOcr, structure) {
  const lignes = decouperLignes(texteOcr);
  let confianceDegradee = false;

  const montantTtcBrut = extraireValeurParEtiquette(lignes, structure.ancre_montant_ttc, REGEX_NOMBRE);
  const montantTtc = parseNombre(montantTtcBrut);
  if (montantTtc === null) return null;

  let date = parseDate(extraireValeurParEtiquette(lignes, structure.ancre_date, REGEX_DATE));
  if (!date) {
    for (const ligne of lignes) {
      const m = ligne.match(REGEX_DATE);
      if (m) {
        date = parseDate(m[0]);
        break;
      }
    }
    confianceDegradee = true;
  }
  if (!date) return null;

  let montantHt = parseNombre(extraireValeurParEtiquette(lignes, structure.ancre_montant_ht, REGEX_NOMBRE));

  let tva = [];
  if (structure.ancre_tva_montant) {
    const montantTva = parseNombre(extraireValeurParEtiquette(lignes, structure.ancre_tva_montant, REGEX_NOMBRE));
    if (montantTva !== null) {
      let taux = structure.taux_tva_habituel;
      if (!Number.isFinite(taux) && montantHt) {
        taux = Math.round((montantTva / montantHt) * 100);
      }
      if (Number.isFinite(taux) && taux > 0 && taux <= 100) {
        tva = [{ taux, montant: montantTva }];
      }
      if (montantHt === null) {
        montantHt = Math.round((montantTtc - montantTva) * 100) / 100;
      }
    }
  }

  if (montantHt === null) {
    montantHt = montantTtc;
    confianceDegradee = true;
  }

  return {
    date,
    categorie: structure.categorie_defaut || "Autre",
    montant_ht: montantHt,
    montant_ttc: montantTtc,
    tva,
    confiance: confianceDegradee ? "faible" : "moyenne",
  };
}
