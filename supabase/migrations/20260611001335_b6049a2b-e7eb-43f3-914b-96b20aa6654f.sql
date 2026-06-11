-- 1) Tabla generated_videos
CREATE TABLE public.generated_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NULL REFERENCES public.creation_projects(id) ON DELETE SET NULL,
  draft_id uuid NULL REFERENCES public.video_drafts(id) ON DELETE SET NULL,
  character_id uuid NULL REFERENCES public.virtual_characters(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Video sin título',
  provider text NULL,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('draft','prepared','queued','generating','completed','failed')),
  thumbnail_url text NULL,
  video_url text NULL,
  duration text NULL,
  is_simulated boolean NOT NULL DEFAULT false,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_videos TO authenticated;
GRANT ALL ON public.generated_videos TO service_role;

ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages generated videos"
  ON public.generated_videos
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_generated_videos_user ON public.generated_videos(user_id, created_at DESC);
CREATE INDEX idx_generated_videos_project ON public.generated_videos(project_id);
CREATE INDEX idx_generated_videos_draft ON public.generated_videos(draft_id);
CREATE INDEX idx_generated_videos_status ON public.generated_videos(user_id, status);

CREATE TRIGGER trg_generated_videos_updated_at
  BEFORE UPDATE ON public.generated_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_generic();

-- 2) Ampliar estados permitidos en video_drafts para incluir 'prepared'
ALTER TABLE public.video_drafts
  DROP CONSTRAINT IF EXISTS video_drafts_status_check;
ALTER TABLE public.video_drafts
  ADD CONSTRAINT video_drafts_status_check
  CHECK (status IN ('draft','prepared','queued','generating','completed','failed'));
