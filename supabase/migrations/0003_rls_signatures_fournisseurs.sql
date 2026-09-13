-- Durcissement de la table existante `signatures_fournisseurs` (cache partagé
-- des structures de facture, cf. Phase 3) : active RLS sans policy, pour que
-- seule la clé service_role (utilisée exclusivement côté serveur dans
-- netlify/functions/lib/supabase/client.js) puisse y accéder. Sans effet sur
-- les données existantes ni sur le fonctionnement de l'app tant que seule la
-- clé service_role est utilisée — c'est une protection en profondeur si un
-- jour une clé anon était introduite par erreur côté client.
--
-- À exécuter une fois dans l'éditeur SQL du dashboard Supabase.

alter table signatures_fournisseurs enable row level security;
