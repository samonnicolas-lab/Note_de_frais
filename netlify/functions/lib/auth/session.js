import { google } from "googleapis";
import { getSession } from "../session/cookies.js";
import { createAuthenticatedClient } from "./googleClient.js";
import { HttpError } from "../http.js";

/**
 * Reconstruit un client Drive authentifié à partir du cookie de session.
 * Lève une HttpError 401 si l'utilisateur n'est pas connecté.
 */
export function requireDriveClient(request) {
  const session = getSession(request);
  if (!session || !session.refreshToken) {
    throw new HttpError(401, "Non authentifié : merci de vous connecter avec Google.");
  }
  const oauthClient = createAuthenticatedClient(session.refreshToken);
  const drive = google.drive({ version: "v3", auth: oauthClient });
  return { drive, email: session.email, session };
}
