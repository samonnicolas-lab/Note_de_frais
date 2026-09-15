// Dépenses d'exemple (illustratives, pas les vraies données de l'utilisateur)
// utilisées uniquement pour générer l'aperçu visuel du format d'export
// (cf. apercu-export.js). Même contenu que src/utils/exportColumns.js côté
// frontend (dupliqué : bundles serveur/client séparés) — garder synchronisé.

function dateDuMois(month, jour) {
  const [annee, mois] = month.split("-").map(Number);
  const dernierJour = new Date(annee, mois, 0).getDate();
  return `${month}-${String(Math.min(jour, dernierJour)).padStart(2, "0")}`;
}

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
      justificatif_drive_url: "",
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
      justificatif_drive_url: "",
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
      justificatif_drive_url: "",
    },
  ];
}
