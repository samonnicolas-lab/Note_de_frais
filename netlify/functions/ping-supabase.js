// Tâche planifiée (pas d'utilisateur, pas de session) : effectue une requête
// légère vers Supabase à intervalle régulier pour éviter la mise en pause
// automatique du projet en cas d'inactivité (limite du plan gratuit :
// suspension après 7 jours sans activité). Réutilise listerSignatures, déjà
// une requête bon marché (quelques dizaines/centaines de lignes attendues).
import { json, withErrorHandling } from "./lib/http.js";
import { listerSignatures } from "./lib/supabase/client.js";

export default async () => {
  return withErrorHandling(async () => {
    const signatures = await listerSignatures();
    console.log(`[ping-supabase] Ping effectué (${signatures.length} signature(s) en base).`);
    return json(200, { ok: true });
  });
};

export const config = { schedule: "@daily" };
