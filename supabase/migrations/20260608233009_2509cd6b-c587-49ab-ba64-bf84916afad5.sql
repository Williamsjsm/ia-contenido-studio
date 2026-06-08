-- TODO(auth): Restaurar estas FKs hacia auth.users cuando se migre a Supabase Auth real.
-- Mientras tanto, la app opera en modo single-owner con OWNER_USER_ID/FALLBACK_OWNER_ID
-- que no existe en auth.users. La ownership se mantiene a nivel lógico (user_id NOT NULL),
-- por RLS, por requireAccess (cookie HMAC) y por assertOwnedPath en serverFns.

ALTER TABLE public.virtual_characters
  DROP CONSTRAINT IF EXISTS virtual_characters_user_id_fkey;

ALTER TABLE public.visual_references
  DROP CONSTRAINT IF EXISTS visual_references_user_id_fkey;