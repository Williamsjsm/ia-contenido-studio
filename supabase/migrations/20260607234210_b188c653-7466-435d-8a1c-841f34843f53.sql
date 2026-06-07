ALTER TABLE public.flow_jobs
  ADD COLUMN IF NOT EXISTS flow_points_estimate integer,
  ADD COLUMN IF NOT EXISTS flow_mode text,
  ADD COLUMN IF NOT EXISTS flow_media_type text,
  ADD COLUMN IF NOT EXISTS flow_generation_mode text,
  ADD COLUMN IF NOT EXISTS variations integer;