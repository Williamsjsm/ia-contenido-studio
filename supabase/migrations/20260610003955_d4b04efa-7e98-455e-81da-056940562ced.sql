ALTER TABLE public.virtual_characters ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS virtual_characters_user_favorite_idx ON public.virtual_characters (user_id, is_favorite);
CREATE INDEX IF NOT EXISTS creation_projects_user_status_idx ON public.creation_projects (user_id, status, updated_at DESC);