
CREATE TABLE public.image_generations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  provider text NOT NULL,
  model text,
  resolution text,
  image_url text,
  image_base64 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_generations TO authenticated;
GRANT ALL ON public.image_generations TO service_role;
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own image_generations all" ON public.image_generations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX image_generations_user_created_idx ON public.image_generations (user_id, created_at DESC);
