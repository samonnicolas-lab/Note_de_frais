// Champs disponibles pour le mapping d'un modèle Excel personnalisé (voir
// ModeleExcel.jsx), et l'ordre des colonnes de l'export standard de l'app
// quand aucun modèle personnalisé n'est configuré (voir
// netlify/functions/lib/export/fixedColumnsExporter.js — à garder synchronisé
// avec ce fichier si l'un des deux change).
export const CHAMPS_MODELE = [
  { cle: "date", label: "Date" },
  { cle: "fournisseur", label: "Fournisseur" },
  { cle: "categorie", label: "Catégorie" },
  { cle: "description", label: "Description" },
  { cle: "montant_ht", label: "Montant HT" },
  { cle: "tva", label: "TVA" },
  { cle: "montant_ttc", label: "Montant TTC" },
  { cle: "invites", label: "Personnes invitées" },
  { cle: "lien_justificatif", label: "Lien justificatif Drive" },
];

export const COLONNES_EXPORT_STANDARD = CHAMPS_MODELE.map((c) => c.label);

/** Convertit une référence de colonne Excel ("A", "B", ... "AA") en index numérique pour le tri. */
export function colonneVersIndex(lettre) {
  let n = 0;
  for (const c of String(lettre || "").toUpperCase()) {
    const code = c.charCodeAt(0) - 64;
    if (code < 1 || code > 26) return Number.MAX_SAFE_INTEGER;
    n = n * 26 + code;
  }
  return n || Number.MAX_SAFE_INTEGER;
}

/** Colonnes mappées d'un modèle personnalisé, triées dans leur ordre réel dans le fichier. */
export function colonnesModelePersonnalise(mapping) {
  return CHAMPS_MODELE.filter((c) => mapping?.[c.cle])
    .sort((a, b) => colonneVersIndex(mapping[a.cle]) - colonneVersIndex(mapping[b.cle]))
    .map((c) => c.label);
}
