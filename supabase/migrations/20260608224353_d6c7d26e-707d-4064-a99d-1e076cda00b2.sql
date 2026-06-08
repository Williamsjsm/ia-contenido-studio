
ALTER TABLE public.image_generations
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES public.virtual_characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS character_name TEXT;
