import { parse, serialize } from "cookie";
import { encryptSession, decryptSession } from "./crypto.js";
import { isLocalDev } from "../http.js";

export const SESSION_COOKIE = "nf_session";
export const OAUTH_STATE_COOKIE = "nf_oauth_state";

const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 jours : "pas besoin de se reconnecter à chaque ouverture"

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const all = parse(header);
  return all[name];
}

export function getSession(request) {
  const raw = readCookie(request, SESSION_COOKIE);
  return decryptSession(raw);
}

export function buildSessionCookie(sessionPayload) {
  const value = encryptSession(sessionPayload);
  return serialize(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function buildClearSessionCookie() {
  return serialize(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function buildOAuthStateCookie(state) {
  return serialize(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function buildClearOAuthStateCookie() {
  return serialize(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
