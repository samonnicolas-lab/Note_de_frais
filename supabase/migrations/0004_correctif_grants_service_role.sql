-- Correctif : les migrations 0001 et 0002 ont déjà été exécutées mais sans les
-- GRANT nécessaires (ajoutés depuis dans ces fichiers pour les futures
-- installations). Sur ce projet Supabase, une table/fonction créée via
-- l'éditeur SQL n'est pas automatiquement accessible au rôle service_role,
-- d'où l'erreur "permission denied for table usage_mensuel" observée en
-- production. Exécute ce script une fois pour corriger l'existant.

grant select on usage_mensuel to service_role;
grant execute on function incrementer_usage_mensuel(text, bigint, bigint, numeric) to service_role;

grant select, insert, delete on scans_recents to service_role;
grant execute on function verifier_limite_scans(text, integer, integer) to service_role;
