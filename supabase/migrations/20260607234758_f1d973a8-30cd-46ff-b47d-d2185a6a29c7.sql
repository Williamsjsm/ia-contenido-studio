CREATE TABLE public.viral_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  platform text NOT NULL,
  country text NOT NULL,
  category text NOT NULL,
  viral_score integer NOT NULL DEFAULT 0,
  keywords text,
  source text,
  favorite boolean NOT NULL DEFAULT false,
  saved boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.viral_trends TO authenticated;
GRANT ALL ON public.viral_trends TO service_role;

ALTER TABLE public.viral_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own viral_trends all"
  ON public.viral_trends
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX viral_trends_user_created_idx ON public.viral_trends (user_id, created_at DESC);
CREATE INDEX viral_trends_filters_idx ON public.viral_trends (user_id, platform, country, category);

CREATE TRIGGER set_viral_trends_updated_at
  BEFORE UPDATE ON public.viral_trends
  FOR EACH ROW EXECUTE FUNCTION public.set_flow_jobs_updated_at();