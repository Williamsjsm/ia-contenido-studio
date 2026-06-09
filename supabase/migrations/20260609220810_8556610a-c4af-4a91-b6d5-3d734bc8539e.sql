
-- TODO(auth): restore FK to auth.users on user_id and add per-user RLS policies
-- when real Supabase Auth is enabled. Currently single-owner via OWNER_USER_ID.

-- ============================================================
-- creation_projects
-- ============================================================
CREATE TABLE public.creation_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Proyecto sin título',
  prompt_id uuid NULL REFERENCES public.prompts(id) ON DELETE SET NULL,
  character_id uuid NULL REFERENCES public.virtual_characters(id) ON DELETE SET NULL,
  cover_image_id uuid NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX creation_projects_user_idx ON public.creation_projects (user_id, created_at DESC);
CREATE INDEX creation_projects_prompt_idx ON public.creation_projects (prompt_id);

GRANT ALL ON public.creation_projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creation_projects TO authenticated;

ALTER TABLE public.creation_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creation_projects_service_only_select"
  ON public.creation_projects FOR SELECT TO authenticated USING (false);
CREATE POLICY "creation_projects_service_only_modify"
  ON public.creation_projects FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER creation_projects_set_updated_at
  BEFORE UPDATE ON public.creation_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

-- ============================================================
-- creation_project_assets
-- ============================================================
CREATE TABLE public.creation_project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.creation_projects(id) ON DELETE CASCADE,
  kind text NOT NULL,                -- 'image' | 'flow_job' | 'publication'
  ref_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, kind, ref_id)
);

CREATE INDEX creation_project_assets_project_idx ON public.creation_project_assets (project_id);

GRANT ALL ON public.creation_project_assets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creation_project_assets TO authenticated;

ALTER TABLE public.creation_project_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creation_project_assets_service_only_select"
  ON public.creation_project_assets FOR SELECT TO authenticated USING (false);
CREATE POLICY "creation_project_assets_service_only_modify"
  ON public.creation_project_assets FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ============================================================
-- character_reference_images
-- ============================================================
CREATE TABLE public.character_reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.virtual_characters(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX character_reference_images_char_idx ON public.character_reference_images (character_id, sort_order);

GRANT ALL ON public.character_reference_images TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.character_reference_images TO authenticated;

ALTER TABLE public.character_reference_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_reference_images_service_only_select"
  ON public.character_reference_images FOR SELECT TO authenticated USING (false);
CREATE POLICY "character_reference_images_service_only_modify"
  ON public.character_reference_images FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ============================================================
-- image_generations.is_favorite
-- ============================================================
ALTER TABLE public.image_generations
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- ============================================================
-- flow_jobs.project_id
-- ============================================================
ALTER TABLE public.flow_jobs
  ADD COLUMN IF NOT EXISTS project_id uuid NULL REFERENCES public.creation_projects(id) ON DELETE SET NULL;
