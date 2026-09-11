// cookie@2.x a renommé son API : parse -> parseCookie, serialize -> stringifySetCookie
// (qui prend désormais un objet unique { name, value, ...options } au lieu de
// serialize(name, value, options)).
import { parseCookie, stringifySetCookie } from "cookie";
import { encryptSession, decryptSession } from "./crypto.js";
import { isLocalDev } from "../http.js";

export const SESSION_COOKIE = "nf_session";
export const OAUTH_STATE_COOKIE = "nf_oauth_state";

const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 jours : "pas besoin de se reconnecter à chaque ouverture"

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const all = parseCookie(header);
  return all[name];
}

export function getSession(request) {
  const raw = readCookie(request, SESSION_COOKIE);
  return decryptSession(raw);
}

export function buildSessionCookie(sessionPayload) {
  const value = encryptSession(sessionPayload);
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function buildClearSessionCookie() {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function buildOAuthStateCookie(state) {
  return stringifySetCookie({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function buildClearOAuthStateCookie() {
  return stringifySetCookie({
    name: OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: !isLocalDev(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
