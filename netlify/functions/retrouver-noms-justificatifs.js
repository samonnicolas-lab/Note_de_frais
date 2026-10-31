// Correctif de rattrapage ponctuel : les dépenses enregistrées avant l'ajout du
// champ justificatif_nom_fichier n'ont jamais eu ce nom sauvegardé en base, mais
// le fichier existe toujours sur Drive (référencé par justificatif_drive_id) et
// Drive connaît son nom d'origine — pas besoin de faire re-scanner l'utilisateur,
// une simple lecture de métadonnées suffit à le retrouver.
import { json, withErrorHandling } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { readRegistre, writeRegistre } from "./lib/drive/driveClient.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const { fileId, depenses } = await readRegistre(drive);

    let corrigees = 0;
    let echouees = 0;
    const misesAJour = [];
    for (const d of depenses) {
      if (!d.justificatif_drive_id || d.justificatif_nom_fichier) {
        misesAJour.push(d);
        continue;
      }
      try {
        const meta = await drive.files.get({ fileId: d.justificatif_drive_id, fields: "name" });
        misesAJour.push({ ...d, justificatif_nom_fichier: meta.data.name });
        corrigees += 1;
      } catch (err) {
        // Fichier supprimé/déplacé depuis : on laisse la dépense telle quelle,
        // sans faire échouer les autres corrections.
        console.error(`Impossible de retrouver le nom du justificatif pour la dépense ${d.id} :`, err.message);
        misesAJour.push(d);
        echouees += 1;
      }
    }

    if (corrigees > 0) {
      await writeRegistre(drive, fileId, misesAJour);
    }

    return json(200, { corrigees, echouees });
  });
};
