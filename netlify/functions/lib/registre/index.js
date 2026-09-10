// Registre des dépenses : module isolé et remplaçable (cf. cahier des charges §0).
// En Phase 1, le registre est un unique fichier JSON sur le Drive de l'utilisateur.
// Les phases suivantes pourront changer ce mécanisme de stockage sans toucher
// aux fonctions serverless qui consomment cette API (addDepense/listDepenses...).
import { v4 as uuidv4 } from "uuid";
import { readRegistre, writeRegistre } from "../drive/driveClient.js";

/**
 * Construit un objet dépense conforme au modèle de données du cahier des charges §5,
 * en incluant un champ `statut` prévu pour la Phase 4 (modification a posteriori),
 * même si aucune UI ne l'exploite encore.
 */
export function buildDepense({
  date,
  fournisseur,
  categorie,
  montant_ht,
  montant_ttc,
  tva,
  justificatif_drive_id,
  justificatif_drive_url,
}) {
  return {
    id: uuidv4(),
    date,
    fournisseur,
    categorie,
    montant_ht,
    montant_ttc,
    tva: tva || [],
    justificatif_drive_id: justificatif_drive_id || null,
    justificatif_drive_url: justificatif_drive_url || null,
    cree_le: new Date().toISOString(),
    statut_sync: "synchronise",
    // Champ prévu pour la Phase 4 : permettra de rouvrir/corriger une dépense
    // et de marquer les exports déjà générés comme "à régénérer".
    statut: "validee",
  };
}

export async function addDepense(drive, depenseData) {
  const { fileId, depenses } = await readRegistre(drive);
  const depense = buildDepense(depenseData);
  const updated = [...depenses, depense];
  await writeRegistre(drive, fileId, updated);
  return depense;
}

export async function listAllDepenses(drive) {
  const { depenses } = await readRegistre(drive);
  return depenses;
}

/** month au format "YYYY-MM" */
export async function listDepensesForMonth(drive, month) {
  const depenses = await listAllDepenses(drive);
  return depenses.filter((d) => typeof d.date === "string" && d.date.startsWith(month));
}
