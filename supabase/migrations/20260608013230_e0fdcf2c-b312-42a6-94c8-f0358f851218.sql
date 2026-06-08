
ALTER TABLE public.viral_trends
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS views bigint,
  ADD COLUMN IF NOT EXISTS likes bigint,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS viral_trends_user_external_id_key
  ON public.viral_trends (user_id, source, external_id)
  WHERE external_id IS NOT NULL;
