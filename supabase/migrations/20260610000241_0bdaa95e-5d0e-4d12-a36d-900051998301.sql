ALTER TABLE public.creation_projects
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS creation_projects_user_archived_idx
  ON public.creation_projects (user_id, is_archived, updated_at DESC);