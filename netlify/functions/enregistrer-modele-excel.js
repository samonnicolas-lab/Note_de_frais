import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { saveModele } from "./lib/modele/index.js";

const MAX_BASE64_LENGTH = Math.floor(6 * 1024 * 1024 * 0.95);
const CHAMPS_VALIDES = ["date", "fournisseur", "categorie", "montant_ht", "tva", "montant_ttc", "lien_justificatif"];
const CHAMPS_CELLULES_VALIDES = ["nom", "fonction", "mois", "iban", "total_tva"];
const REFERENCE_CELLULE = /^[A-Za-z]{1,3}\d+$/;

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const { fileBase64, fileName, ligneEntete, mapping, cellules } = body || {};

    if (!fileBase64 || typeof fileBase64 !== "string") {
      throw new HttpError(400, "Le champ 'fileBase64' est requis.");
    }
    if (fileBase64.length > MAX_BASE64_LENGTH) {
      throw new HttpError(413, "Fichier trop volumineux (> ~4 Mo).");
    }
    if (!Number.isInteger(ligneEntete) || ligneEntete < 1) {
      throw new HttpError(400, "Le champ 'ligneEntete' doit être un entier positif.");
    }
    if (!mapping || typeof mapping !== "object") {
      throw new HttpError(400, "Le champ 'mapping' est requis.");
    }

    const mappingNettoye = {};
    for (const champ of CHAMPS_VALIDES) {
      const valeur = mapping[champ];
      mappingNettoye[champ] = typeof valeur === "string" && valeur.trim() ? valeur.trim().toUpperCase() : null;
    }
    if (Object.values(mappingNettoye).every((v) => !v)) {
      throw new HttpError(400, "Associez au moins une colonne à un champ.");
    }

    const cellulesNettoyees = {};
    for (const champ of CHAMPS_CELLULES_VALIDES) {
      const valeur = cellules && cellules[champ];
      if (typeof valeur === "string" && valeur.trim()) {
        const nettoyee = valeur.trim().toUpperCase();
        if (!REFERENCE_CELLULE.test(nettoyee)) {
          throw new HttpError(400, `Référence de cellule invalide pour '${champ}' : ${valeur} (attendu ex. B2).`);
        }
        cellulesNettoyees[champ] = nettoyee;
      } else {
        cellulesNettoyees[champ] = null;
      }
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const config = await saveModele(drive, {
      buffer,
      fileName: fileName || "modele.xlsx",
      ligneEntete,
      mapping: mappingNettoye,
      cellules: cellulesNettoyees,
    });

    return json(200, { config });
  });
};
