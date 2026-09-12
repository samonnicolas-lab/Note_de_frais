// Registre des dépenses : module isolé et remplaçable (cf. cahier des charges §0).
// En Phase 1, le registre est un unique fichier JSON sur le Drive de l'utilisateur.
// Les phases suivantes pourront changer ce mécanisme de stockage sans toucher
// aux fonctions serverless qui consomment cette API (addDepense/listDepenses...).
import { v4 as uuidv4 } from "uuid";
import { readRegistre, writeRegistre } from "../drive/driveClient.js";

export const STATUT_VALIDEE = "validee";
export const STATUT_EXPORTEE = "exportee";

/**
 * Construit un objet dépense conforme au modèle de données du cahier des charges §5.
 * Le champ `statut` passe à "exportee" (verrouillée) dès que la dépense est incluse
 * dans un export mensuel généré ; un déverrouillage manuel la ramène à "validee".
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
  justificatif_hash,
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
    justificatif_hash: justificatif_hash || null,
    cree_le: new Date().toISOString(),
    modifie_le: null,
    statut_sync: "synchronise",
    statut: STATUT_VALIDEE,
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

export async function getDepenseById(drive, id) {
  const depenses = await listAllDepenses(drive);
  return depenses.find((d) => d.id === id) || null;
}

/** Fusionne `patch` dans la dépense `id` et persiste. Retourne la dépense mise à jour. */
export async function updateDepense(drive, id, patch) {
  const { fileId, depenses } = await readRegistre(drive);
  let updatedDepense = null;
  const updated = depenses.map((d) => {
    if (d.id !== id) return d;
    updatedDepense = { ...d, ...patch, id: d.id };
    return updatedDepense;
  });
  if (!updatedDepense) return null;
  await writeRegistre(drive, fileId, updated);
  return updatedDepense;
}

/** Déverrouille une dépense exportée pour permettre de la corriger a posteriori. */
export async function unlockDepense(drive, id) {
  return updateDepense(drive, id, { statut: STATUT_VALIDEE });
}

/**
 * Supprime une ou plusieurs dépenses du registre (par id) en une seule lecture/
 * écriture. Retourne les dépenses effectivement supprimées, pour permettre à
 * l'appelant de mettre à la corbeille leurs justificatifs sur Drive.
 */
export async function deleteDepenses(drive, ids) {
  const idSet = new Set(ids);
  const { fileId, depenses } = await readRegistre(drive);
  const supprimees = depenses.filter((d) => idSet.has(d.id));
  const restantes = depenses.filter((d) => !idSet.has(d.id));
  await writeRegistre(drive, fileId, restantes);
  return supprimees;
}

/** Verrouille toutes les dépenses d'un mois donné après génération de l'export. */
export async function markMonthAsExported(drive, month) {
  const { fileId, depenses } = await readRegistre(drive);
  const updated = depenses.map((d) =>
    typeof d.date === "string" && d.date.startsWith(month) ? { ...d, statut: STATUT_EXPORTEE } : d
  );
  await writeRegistre(drive, fileId, updated);
}

/**
 * Recherche une dépense déjà enregistrée qui semble être un doublon du justificatif
 * en cours de saisie : soit le fichier importé est strictement identique (empreinte),
 * soit fournisseur + date + montant TTC correspondent déjà à une dépense existante.
 * `excludeId` permet d'ignorer la dépense elle-même lors d'une modification.
 */
export async function findDuplicate(drive, { date, fournisseur, montant_ttc, justificatif_hash }, excludeId = null) {
  const depenses = await listAllDepenses(drive);
  const fournisseurNorm = (fournisseur || "").trim().toLowerCase();

  return (
    depenses.find((d) => {
      if (excludeId && d.id === excludeId) return false;
      if (justificatif_hash && d.justificatif_hash && d.justificatif_hash === justificatif_hash) {
        return true;
      }
      const memeFournisseur = (d.fournisseur || "").trim().toLowerCase() === fournisseurNorm;
      const memeDate = d.date === date;
      const memeMontant = Math.abs(Number(d.montant_ttc) - Number(montant_ttc)) < 0.01;
      return fournisseurNorm && memeFournisseur && memeDate && memeMontant;
    }) || null
  );
}
