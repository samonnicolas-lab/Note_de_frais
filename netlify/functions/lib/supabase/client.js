// Client minimal pour les tables Supabase partagées (signatures fournisseurs,
// compteur d'usage IA mensuel, limitation de débit). Appelé uniquement côté
// serveur avec la clé service_role (jamais exposée au navigateur) — pas de
// dépendance au SDK @supabase/supabase-js, un simple appel REST/PostgREST
// suffit ici. Schéma et fonctions SQL à exécuter dans Supabase : voir
// supabase/migrations/.
const TABLE = "signatures_fournisseurs";
const TABLE_USAGE = "usage_mensuel";

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
  const texte = await res.text();
  if (!res.ok) {
    throw new Error(`Erreur Supabase (${res.status}) : ${texte.slice(0, 300)}`);
  }
  // PostgREST renvoie un corps vide par défaut sur POST/PATCH/DELETE (sauf
  // "Prefer: return=representation") : res.json() plantait alors avec
  // "Unexpected end of JSON input".
  return texte ? JSON.parse(texte) : null;
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

/**
 * Lit le compteur d'usage IA du mois donné ("YYYY-MM"). Compteur unique,
 * partagé par tous les utilisateurs de l'app (une seule clé Anthropic) — voir
 * supabase/migrations/0001_usage_mensuel_partage.sql pour le schéma.
 */
export async function obtenirUsageMensuel(mois) {
  const lignes = await requeteSupabase(
    `${TABLE_USAGE}?mois=eq.${encodeURIComponent(mois)}&select=factures,input_tokens,output_tokens,cout_estime_usd`
  );
  return lignes && lignes[0] ? lignes[0] : null;
}

/**
 * Incrémente atomiquement le compteur d'usage du mois donné (une facture, N
 * tokens, un coût estimé) via la fonction SQL `incrementer_usage_mensuel`
 * (évite une race condition lecture-puis-écriture entre requêtes concurrentes).
 */
export async function incrementerUsageMensuel({ mois, inputTokens, outputTokens, coutUsd }) {
  return requeteSupabase(`rpc/incrementer_usage_mensuel`, {
    method: "POST",
    body: JSON.stringify({
      p_mois: mois,
      p_input_tokens: Number(inputTokens) || 0,
      p_output_tokens: Number(outputTokens) || 0,
      p_cout_usd: Number(coutUsd) || 0,
    }),
  });
}

/**
 * Vérifie et enregistre atomiquement une tentative de scan pour `utilisateur`
 * (son email) via la fonction SQL `verifier_limite_scans` : renvoie `true` si
 * l'appel est autorisé (et l'enregistre), `false` si la limite de `limite`
 * scans sur `fenetreSecondes` secondes est déjà atteinte pour cet utilisateur.
 */
export async function verifierLimiteScans(utilisateur, limite, fenetreSecondes) {
  return requeteSupabase(`rpc/verifier_limite_scans`, {
    method: "POST",
    body: JSON.stringify({
      p_utilisateur: utilisateur,
      p_limite: limite,
      p_fenetre_secondes: fenetreSecondes,
    }),
  });
}
