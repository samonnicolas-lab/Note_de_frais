import { formatAmount, formatDateFr, monthLabel } from "./format";

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

export const CHAMPS_EXPORT_STANDARD = CHAMPS_MODELE;

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

/** Champs mappés d'un modèle personnalisé, triés dans leur ordre réel dans le fichier. */
export function champsModelePersonnalise(mapping) {
  return CHAMPS_MODELE.filter((c) => mapping?.[c.cle]).sort(
    (a, b) => colonneVersIndex(mapping[a.cle]) - colonneVersIndex(mapping[b.cle])
  );
}

// Même format que côté serveur (fixedColumnsExporter.js / customTemplateExporter.js) :
// détail par taux, ex. "20% (4,00 €)", pas un total brut.
export function formatTva(tva) {
  if (!Array.isArray(tva) || tva.length === 0) return "";
  return tva.map((t) => `${t.taux}% (${Number(t.montant).toFixed(2)} €)`).join(" ; ");
}

/** Valeur affichable d'une dépense pour la colonne `cle`, formatée comme dans un vrai export. */
export function valeurColonne(depense, cle) {
  switch (cle) {
    case "date":
      return formatDateFr(depense.date);
    case "fournisseur":
      return depense.fournisseur || "";
    case "categorie":
      return depense.categorie || "";
    case "description":
      return depense.description || "";
    case "montant_ht":
      return formatAmount(depense.montant_ht);
    case "tva":
      return formatTva(depense.tva);
    case "montant_ttc":
      return formatAmount(depense.montant_ttc);
    case "invites":
      return depense.invites || "";
    case "lien_justificatif":
      return depense.justificatif_drive_url || "";
    default:
      return "";
  }
}

/** Jour du mois "YYYY-MM" -> date "YYYY-MM-DD" (borne au dernier jour du mois si besoin). */
function dateDuMois(month, jour) {
  const [annee, mois] = month.split("-").map(Number);
  const dernierJour = new Date(annee, mois, 0).getDate();
  return `${month}-${String(Math.min(jour, dernierJour)).padStart(2, "0")}`;
}

/** Trois dépenses d'exemple (illustratives, pas les vraies données de l'utilisateur) pour l'aperçu d'export. */
export function depensesExemple(month) {
  return [
    {
      date: dateDuMois(month, 3),
      fournisseur: "SNCF Connect",
      categorie: "Transport",
      description: "Billet de train Paris–Lyon",
      montant_ht: 37.5,
      montant_ttc: 41.25,
      tva: [{ taux: 10, montant: 3.75 }],
      invites: "",
      justificatif_drive_url: "Justificatif_1.pdf",
    },
    {
      date: dateDuMois(month, 12),
      fournisseur: "Restaurant Le Central",
      categorie: "Invitation client",
      description: "Déjeuner de présentation",
      montant_ht: 66.67,
      montant_ttc: 80.0,
      tva: [{ taux: 20, montant: 13.33 }],
      invites: "M. Dupont (client)",
      justificatif_drive_url: "Justificatif_2.pdf",
    },
    {
      date: dateDuMois(month, 24),
      fournisseur: "Hôtel Bellevue",
      categorie: "Hébergement",
      description: "Nuit d'hôtel, déplacement client",
      montant_ht: 90.91,
      montant_ttc: 100.0,
      tva: [{ taux: 10, montant: 9.09 }],
      invites: "",
      justificatif_drive_url: "Justificatif_3.pdf",
    },
  ];
}

/** Informations d'en-tête (Nom/Fonction/Mois/IBAN) réellement configurées pour un modèle personnalisé. */
export const CHAMPS_ENTETE = [
  { cle: "nom", label: "Nom" },
  { cle: "fonction", label: "Fonction" },
  { cle: "mois", label: "Mois" },
  { cle: "iban", label: "IBAN" },
];

export function valeurEntete(cle, month, profil) {
  if (cle === "mois") return monthLabel(month);
  return profil?.[cle] || "";
}
