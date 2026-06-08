ALTER TABLE public.viral_trends
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS creator_name text,
  ADD COLUMN IF NOT EXISTS comment_count bigint,
  ADD COLUMN IF NOT EXISTS share_count bigint,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

-- Backfill source_type from existing source
UPDATE public.viral_trends
SET source_type = CASE
  WHEN source = 'youtube_api' THEN 'youtube_api'
  WHEN source = 'curated' THEN 'curated'
  ELSE COALESCE(source_type, source)
END
WHERE source_type IS NULL;

CREATE INDEX IF NOT EXISTS viral_trends_source_type_idx ON public.viral_trends(user_id, source_type);
CREATE UNIQUE INDEX IF NOT EXISTS viral_trends_user_source_external_uniq
  ON public.viral_trends(user_id, source_type, external_id)
  WHERE external_id IS NOT NULL;