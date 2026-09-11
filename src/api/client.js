const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Erreur inattendue (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request("/auth-google?action=me"),
  logout: () => request("/auth-google?action=logout", { method: "POST" }),
  loginUrl: "/api/auth-google?action=login",

  analyserFacture: (fileBase64, mimeType) =>
    request("/analyser-facture", {
      method: "POST",
      body: JSON.stringify({ fileBase64, mimeType }),
    }),

  enregistrerDepense: (payload) =>
    request("/enregistrer-depense", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listerDepenses: (month) => request(`/lister-depenses?month=${encodeURIComponent(month)}`),

  obtenirDepense: (id) => request(`/obtenir-depense?id=${encodeURIComponent(id)}`),

  modifierDepense: (id, payload) =>
    request("/modifier-depense", {
      method: "POST",
      body: JSON.stringify({ id, ...payload }),
    }),

  deverrouillerDepense: (id) =>
    request("/deverrouiller-depense", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),

  exporterMensuel: (month) =>
    request("/exporter-mensuel", {
      method: "POST",
      body: JSON.stringify({ month }),
    }),

  usageMensuel: (month) =>
    request(`/usage-mensuel${month ? `?month=${encodeURIComponent(month)}` : ""}`),
};
