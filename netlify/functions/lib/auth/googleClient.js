import { google } from "googleapis";

// Scope volontairement restreint : l'appli ne doit accéder qu'aux fichiers
// qu'elle crée elle-même sur le Drive de l'utilisateur (cf. cahier des charges §2).
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const OAUTH_SCOPES = ["openid", "email", DRIVE_SCOPE];

export function getRedirectUri() {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL n'est pas configuré côté serveur.");
  return `${base.replace(/\/$/, "")}/api/auth-google?action=callback`;
}

export function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ne sont pas configurés côté serveur.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function buildAuthUrl(state) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // garantit la présence d'un refresh_token même en reconnexion
    scope: OAUTH_SCOPES,
    state,
  });
}

/**
 * Crée un client OAuth2 authentifié à partir d'un refresh_token stocké en session,
 * en rafraîchissant automatiquement l'access token si besoin.
 */
export function createAuthenticatedClient(refreshToken) {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
