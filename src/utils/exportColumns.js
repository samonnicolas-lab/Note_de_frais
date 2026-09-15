// Champs disponibles pour le mapping d'un modèle Excel personnalisé (voir
// ModeleExcel.jsx) — à garder synchronisé avec
// netlify/functions/lib/export/fixedColumnsExporter.js si l'un des deux change.
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
