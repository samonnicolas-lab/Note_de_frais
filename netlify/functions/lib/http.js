// Utilitaires communs pour les réponses HTTP des fonctions Netlify (format v2 Request/Response).

export function json(status, data, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}

export function error(status, message, extra = {}) {
  return json(status, { error: message, ...extra });
}

export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export async function withErrorHandling(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return error(err.status, err.message, err.extra);
    }
    console.error(err);
    return error(500, "Erreur interne du serveur.");
  }
}

export function isLocalDev() {
  const base = process.env.APP_BASE_URL || "";
  return base.startsWith("http://localhost") || base.startsWith("http://127.0.0.1");
}
