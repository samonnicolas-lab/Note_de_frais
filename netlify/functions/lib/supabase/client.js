// Client minimal pour la table Supabase partagée des "signatures fournisseurs"
// (cf. cahier des charges Phase 3). Appelé uniquement côté serveur avec la clé
// service_role (jamais exposée au navigateur) — pas de dépendance au SDK
// @supabase/supabase-js, un simple appel REST/PostgREST suffit ici.
const TABLE = "signatures_fournisseurs";

function configurerSupabase() {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return null;
  return { url: url.replace(/\/$/, ""), cle };
}

async function requeteSupabase(path, options = {}) {
  const config = configurerSupabase();
  if (!config) {
    throw new Error("Supabase n'est pas configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants).");
  }
  const res = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.cle,
      Authorization: `Bearer ${config.cle}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const texte = await res.text().catch(() => "");
    throw new Error(`Erreur Supabase (${res.status}) : ${texte.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Liste les signatures connues (table de petite taille : quelques dizaines/centaines de fournisseurs). */
export async function listerSignatures() {
  return requeteSupabase(
    `${TABLE}?select=id,fournisseur_normalise,fournisseur_affiche,structure,nb_utilisations`
  );
}

/** Crée ou met à jour la signature d'un fournisseur (apprentissage après une extraction Claude réussie). */
export async function upsertSignature({ fournisseurNormalise, fournisseurAffiche, structure }) {
  return requeteSupabase(`${TABLE}?on_conflict=fournisseur_normalise`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([
      {
        fournisseur_normalise: fournisseurNormalise,
        fournisseur_affiche: fournisseurAffiche,
        structure,
        derniere_utilisation: new Date().toISOString(),
      },
    ]),
  });
}

/** Met à jour le compteur d'utilisation après un match réussi (statistique, non bloquant). */
export async function majUtilisationSignature(id, nbUtilisationsPrecedent) {
  return requeteSupabase(`${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      nb_utilisations: (Number(nbUtilisationsPrecedent) || 0) + 1,
      derniere_utilisation: new Date().toISOString(),
    }),
  });
}

/** Supprime les signatures inutilisées depuis plus de `joursInactivite` jours (job planifié de purge). */
export async function purgerSignaturesInactives(joursInactivite) {
  const seuil = new Date(Date.now() - joursInactivite * 24 * 60 * 60 * 1000).toISOString();
  return requeteSupabase(`${TABLE}?derniere_utilisation=lt.${encodeURIComponent(seuil)}`, {
    method: "DELETE",
  });
}
