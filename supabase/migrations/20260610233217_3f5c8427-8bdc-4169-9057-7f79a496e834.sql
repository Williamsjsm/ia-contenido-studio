CREATE TABLE public.winning_video_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draft_id UUID REFERENCES public.video_drafts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.creation_projects(id) ON DELETE SET NULL,
  subject_type TEXT,
  provider TEXT,
  variant TEXT NOT NULL,
  prompt TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winning_video_prompts TO authenticated;
GRANT ALL ON public.winning_video_prompts TO service_role;
ALTER TABLE public.winning_video_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages winning prompts" ON public.winning_video_prompts
  FOR ALL USING (user_id = COALESCE(auth.uid(), user_id)) WITH CHECK (true);
CREATE INDEX winning_video_prompts_user_idx ON public.winning_video_prompts(user_id, created_at DESC);
CREATE INDEX winning_video_prompts_project_idx ON public.winning_video_prompts(project_id);
CREATE TRIGGER set_winning_video_prompts_updated_at BEFORE UPDATE ON public.winning_video_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();