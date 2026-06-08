
-- visual_references
CREATE TABLE public.visual_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_path TEXT,
  type TEXT NOT NULL DEFAULT 'reference',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visual_references TO authenticated;
GRANT ALL ON public.visual_references TO service_role;
ALTER TABLE public.visual_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own visual_references" ON public.visual_references
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- virtual_characters
CREATE TABLE public.virtual_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reference_image_url TEXT,
  reference_image_path TEXT,
  master_prompt TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_characters TO authenticated;
GRANT ALL ON public.virtual_characters TO service_role;
ALTER TABLE public.virtual_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own virtual_characters" ON public.virtual_characters
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_visual_references_updated
  BEFORE UPDATE ON public.visual_references
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

CREATE TRIGGER trg_virtual_characters_updated
  BEFORE UPDATE ON public.virtual_characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();
