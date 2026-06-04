-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============== PROJECTS ==============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects all" ON public.projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== PROMPTS ==============
CREATE TABLE public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text,
  platform text,
  style text,
  language text,
  duration text,
  content text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompts TO authenticated;
GRANT ALL ON public.prompts TO service_role;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prompts all" ON public.prompts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== IMAGES ==============
CREATE TABLE public.images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  prompt_id uuid REFERENCES public.prompts(id) ON DELETE SET NULL,
  title text,
  url text NOT NULL,
  model text,
  resolution text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.images TO authenticated;
GRANT ALL ON public.images TO service_role;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own images all" ON public.images FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== VIDEOS ==============
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  prompt_id uuid REFERENCES public.prompts(id) ON DELETE SET NULL,
  title text,
  url text NOT NULL,
  thumbnail_url text,
  model text,
  resolution text,
  duration_seconds integer,
  aspect_ratio text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own videos all" ON public.videos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== TRENDS ==============
CREATE TABLE public.trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  platform text,
  country text,
  language text,
  category text,
  period text,
  views bigint DEFAULT 0,
  ranking integer,
  thumbnail_url text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trends TO authenticated;
GRANT ALL ON public.trends TO service_role;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trends all" ON public.trends FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== INSPIRATIONS ==============
CREATE TABLE public.inspirations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text,
  title text NOT NULL,
  description text,
  reference_url text,
  thumbnail_url text,
  is_saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspirations TO authenticated;
GRANT ALL ON public.inspirations TO service_role;
ALTER TABLE public.inspirations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inspirations all" ON public.inspirations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== ANALYTICS ==============
CREATE TABLE public.analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  category text,
  platform text,
  value numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics TO authenticated;
GRANT ALL ON public.analytics TO service_role;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analytics all" ON public.analytics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== INTEGRATIONS ==============
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_label text,
  status text NOT NULL DEFAULT 'disconnected',
  metadata jsonb DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own integrations all" ON public.integrations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX ON public.projects(user_id, created_at DESC);
CREATE INDEX ON public.prompts(user_id, created_at DESC);
CREATE INDEX ON public.images(user_id, created_at DESC);
CREATE INDEX ON public.videos(user_id, created_at DESC);
CREATE INDEX ON public.trends(user_id, created_at DESC);
CREATE INDEX ON public.inspirations(user_id, created_at DESC);