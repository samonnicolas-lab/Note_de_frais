import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { listDepensesForMonth, markMonthAsExported, STATUT_VALIDEE } from "./lib/registre/index.js";
import { ensureMonthFolder, uploadFile } from "./lib/drive/driveClient.js";
import { generateMonthlyExport } from "./lib/export/index.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const month = body && body.month;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpError(400, "Le champ 'month' (YYYY-MM) est requis.");
    }

    const toutesLesDepensesDuMois = await listDepensesForMonth(drive, month);
    if (toutesLesDepensesDuMois.length === 0) {
      throw new HttpError(404, `Aucune dépense trouvée pour ${month}.`);
    }

    // Une note de frais intermédiaire (envoyée en cours de mois) verrouille les
    // dépenses qu'elle contient (cf. markMonthAsExported) : un export suivant pour
    // le même mois ne doit reprendre que les dépenses encore "validee", jamais
    // réinclure celles déjà réclamées. Pour forcer leur réinclusion, l'utilisateur
    // doit d'abord les déverrouiller manuellement (page Dépenses).
    const depenses = toutesLesDepensesDuMois.filter((d) => d.statut === STATUT_VALIDEE);
    const nombreDejaExportees = toutesLesDepensesDuMois.length - depenses.length;
    if (depenses.length === 0) {
      throw new HttpError(
        409,
        `Toutes les dépenses de ${month} ont déjà été exportées. Déverrouillez-en depuis la page Dépenses pour les réexporter.`
      );
    }

    const { buffer, filename, mimeType } = await generateMonthlyExport(drive, depenses, month);
    // Évite d'écraser visuellement le nom du précédent export du même mois dans
    // Drive (Google Drive autorise deux fichiers homonymes dans un même dossier,
    // ce qui prêterait à confusion) dès qu'il s'agit d'un export partiel.
    const nomFichier =
      nombreDejaExportees > 0
        ? filename.replace(/\.xlsx$/, `-${new Date().toISOString().slice(0, 10)}.xlsx`)
        : filename;
    const { monthFolderId } = await ensureMonthFolder(drive, month);
    const uploaded = await uploadFile(drive, { parentId: monthFolderId, name: nomFichier, mimeType, buffer });
    await markMonthAsExported(drive, month);

    return json(200, {
      fichier: { id: uploaded.id, url: uploaded.webViewLink, nom: nomFichier },
      nombre_depenses: depenses.length,
      nombre_deja_exportees: nombreDejaExportees,
    });
  });
};
