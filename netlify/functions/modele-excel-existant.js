// Permet de rouvrir l'écran de correspondance des colonnes (mapping) pour le
// modèle Excel déjà enregistré, sans avoir à le réimporter : télécharge le
// fichier déjà stocké sur le Drive de l'utilisateur et le réanalyse comme au
// premier import (cf. analyser-modele-excel.js), en renvoyant en plus la
// configuration déjà validée pour préremplir l'écran de mapping avec les
// vraies valeurs actuelles plutôt qu'une suggestion automatique.
import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { getModeleConfig, downloadModeleTemplate } from "./lib/modele/index.js";
import { analyserModele } from "./lib/export/templateDetection.js";

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "GET") {
      return json(405, { error: "Méthode non autorisée." });
    }
    const { drive } = requireDriveClient(request);

    const config = await getModeleConfig(drive);
    if (!config) {
      throw new HttpError(404, "Aucun modèle personnalisé n'est configuré.");
    }

    const buffer = await downloadModeleTemplate(drive, config.templateFileId);
    let analyse;
    try {
      analyse = await analyserModele(buffer);
    } catch {
      throw new HttpError(500, "Le modèle enregistré n'a pas pu être relu. Réimportez-le depuis Modèle Excel.");
    }

    return json(200, {
      fileBase64: buffer.toString("base64"),
      fileName: config.fileName,
      apercu: analyse.apercu,
      config,
    });
  });
};
