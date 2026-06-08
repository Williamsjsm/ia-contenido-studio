CREATE TABLE public.trend_recreation_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  trend_id uuid,
  platform text,
  title text NOT NULL,
  idea_base text,
  prompt_image text,
  prompt_video text,
  hook text,
  short_script text,
  video_structure text,
  visual_style text,
  alternative_title text,
  publication_description text,
  hashtags text,
  recommended_platforms text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trend_recreation_prompts TO authenticated;
GRANT ALL ON public.trend_recreation_prompts TO service_role;

ALTER TABLE public.trend_recreation_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own trend_recreation_prompts all"
  ON public.trend_recreation_prompts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX trend_recreation_prompts_user_created_idx
  ON public.trend_recreation_prompts (user_id, created_at DESC);

CREATE TRIGGER set_trend_recreation_prompts_updated_at
  BEFORE UPDATE ON public.trend_recreation_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_flow_jobs_updated_at();