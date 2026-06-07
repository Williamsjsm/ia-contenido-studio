CREATE TABLE public.publication_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  hashtags text,
  platform text,
  category text,
  source_prompt_id uuid,
  source_flow_job_id uuid,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_projects TO authenticated;
GRANT ALL ON public.publication_projects TO service_role;

ALTER TABLE public.publication_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own publication_projects all"
  ON public.publication_projects
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_publication_projects_updated_at
  BEFORE UPDATE ON public.publication_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_flow_jobs_updated_at();

CREATE INDEX idx_publication_projects_user_created ON public.publication_projects (user_id, created_at DESC);