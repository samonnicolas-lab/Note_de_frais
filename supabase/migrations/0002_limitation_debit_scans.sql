-- Limitation de débit par utilisateur sur l'analyse de facture : empêche
-- qu'un seul compte n'épuise à lui seul le budget IA partagé en quelques
-- minutes (script, bug côté client, usage abusif). Voir l'appel dans
-- netlify/functions/analyser-facture.js.
--
-- À exécuter une fois dans l'éditeur SQL du dashboard Supabase.

create table if not exists scans_recents (
  id bigint generated always as identity primary key,
  utilisateur text not null,
  horodatage timestamptz not null default now()
);

create index if not exists scans_recents_utilisateur_horodatage_idx
  on scans_recents (utilisateur, horodatage);

alter table scans_recents enable row level security;

-- Vérifie et enregistre atomiquement une tentative de scan : renvoie `true`
-- si l'appel est autorisé (et l'enregistre), `false` si `p_utilisateur` a déjà
-- fait `p_limite` scans ou plus sur les `p_fenetre_secondes` dernières
-- secondes. Purge au passage ses propres lignes expirées.
create or replace function verifier_limite_scans(
  p_utilisateur text,
  p_limite integer,
  p_fenetre_secondes integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  nb_recents integer;
begin
  delete from scans_recents
    where utilisateur = p_utilisateur
      and horodatage < now() - make_interval(secs => p_fenetre_secondes);

  select count(*) into nb_recents
    from scans_recents
    where utilisateur = p_utilisateur
      and horodatage >= now() - make_interval(secs => p_fenetre_secondes);

  if nb_recents >= p_limite then
    return false;
  end if;

  insert into scans_recents (utilisateur) values (p_utilisateur);
  return true;
end;
$$;
