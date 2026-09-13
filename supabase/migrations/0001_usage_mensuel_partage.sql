-- Compteur d'usage IA mensuel, PARTAGÉ par tous les utilisateurs de l'app
-- (une seule clé API Anthropic). Remplace l'ancien stockage dans le Drive de
-- chaque utilisateur (qui donnait à chacun son propre plafond de 5$/mois au
-- lieu d'un pot commun) — voir netlify/functions/lib/usage/index.js.
--
-- À exécuter une fois dans l'éditeur SQL du dashboard Supabase.

create table if not exists usage_mensuel (
  mois text primary key,
  factures integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cout_estime_usd numeric not null default 0
);

-- RLS activée sans aucune policy : seule la clé service_role (qui bypasse RLS)
-- peut lire/écrire cette table. La clé anon (si jamais utilisée un jour côté
-- client) n'a explicitement aucun accès.
alter table usage_mensuel enable row level security;

-- Incrémente atomiquement le compteur du mois (évite une race condition
-- lecture-puis-écriture si deux analyses se terminent en même temps).
create or replace function incrementer_usage_mensuel(
  p_mois text,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_cout_usd numeric
) returns usage_mensuel
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat usage_mensuel;
begin
  insert into usage_mensuel (mois, factures, input_tokens, output_tokens, cout_estime_usd)
  values (p_mois, 1, p_input_tokens, p_output_tokens, p_cout_usd)
  on conflict (mois) do update set
    factures = usage_mensuel.factures + 1,
    input_tokens = usage_mensuel.input_tokens + excluded.input_tokens,
    output_tokens = usage_mensuel.output_tokens + excluded.output_tokens,
    cout_estime_usd = usage_mensuel.cout_estime_usd + excluded.cout_estime_usd
  returning * into resultat;
  return resultat;
end;
$$;
