import { json, error, withErrorHandling, HttpError } from "./lib/http.js";
import { requireDriveClient } from "./lib/auth/session.js";
import { runExtractionPipeline } from "./lib/pipeline/index.js";
import { recordUsage } from "./lib/usage/index.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
// Limite conservatrice : les Netlify Functions synchrones plafonnent le corps de
// requête à 6 Mo (payload base64 inclus). On demande une image déjà compressée côté client.
const MAX_BASE64_LENGTH = Math.floor(6 * 1024 * 1024 * 0.95);

export default async (request) => {
  return withErrorHandling(async () => {
    if (request.method !== "POST") {
      return error(405, "Méthode non autorisée.");
    }
    const { drive } = requireDriveClient(request);

    const body = await request.json();
    const { fileBase64, mimeType } = body || {};

    if (!fileBase64 || typeof fileBase64 !== "string") {
      throw new HttpError(400, "Le champ 'fileBase64' est requis.");
    }
    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new HttpError(400, "Type de fichier non supporté. Formats acceptés : JPEG, PNG, WebP, HEIC, PDF.");
    }
    if (fileBase64.length > MAX_BASE64_LENGTH) {
      throw new HttpError(413, "Fichier trop volumineux. Merci de réessayer avec une photo compressée (< 4 Mo).");
    }

    const { extraction, usage } = await runExtractionPipeline({ base64Data: fileBase64, mimeType });

    if (usage) {
      // Le compteur d'usage ne doit jamais faire échouer la réponse à l'utilisateur :
      // s'il échoue (Drive indisponible, etc.), on log et on répond quand même.
      try {
        await recordUsage(drive, usage);
      } catch (err) {
        console.error("Échec de l'enregistrement du compteur d'usage IA :", err);
      }
    }

    return json(200, extraction);
  });
};

export const config = { path: "/api/analyser-facture" };
