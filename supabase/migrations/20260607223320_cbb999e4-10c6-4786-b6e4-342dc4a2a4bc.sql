CREATE TABLE public.flow_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  source_variant text,
  platform text,
  category text,
  duration text,
  resolution text,
  aspect_ratio text,
  model text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_jobs TO authenticated;
GRANT ALL ON public.flow_jobs TO service_role;

ALTER TABLE public.flow_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own flow_jobs all" ON public.flow_jobs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX flow_jobs_user_created_idx ON public.flow_jobs (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_flow_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER flow_jobs_updated_at
  BEFORE UPDATE ON public.flow_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_flow_jobs_updated_at();