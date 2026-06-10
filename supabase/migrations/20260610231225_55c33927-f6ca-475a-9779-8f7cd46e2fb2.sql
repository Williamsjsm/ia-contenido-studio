-- Video drafts: new entity for the Video Hub
CREATE TABLE public.video_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.creation_projects(id) ON DELETE SET NULL,
  character_id uuid,
  source_image_id uuid,
  parent_draft_id uuid REFERENCES public.video_drafts(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Video sin título',
  prompt text NOT NULL DEFAULT '',
  preset text,
  status text NOT NULL DEFAULT 'draft',
  provider text,
  duration text,
  aspect_ratio text,
  camera_motion text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_drafts TO authenticated;
GRANT ALL ON public.video_drafts TO service_role;

ALTER TABLE public.video_drafts ENABLE ROW LEVEL SECURITY;

-- Single-owner pattern (matches creation_projects / flow_jobs): locked to authenticated;
-- service_role bypasses RLS and is the only writer via supabaseAdmin.
CREATE POLICY "video_drafts no auth access" ON public.video_drafts
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX video_drafts_user_updated_idx ON public.video_drafts(user_id, updated_at DESC);
CREATE INDEX video_drafts_project_idx ON public.video_drafts(project_id);
CREATE INDEX video_drafts_source_image_idx ON public.video_drafts(source_image_id);

CREATE TRIGGER video_drafts_set_updated_at
  BEFORE UPDATE ON public.video_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();