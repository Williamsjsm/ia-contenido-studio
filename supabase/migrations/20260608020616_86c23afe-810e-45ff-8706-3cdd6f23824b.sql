ALTER TABLE public.image_generations
  ADD COLUMN IF NOT EXISTS generated_resolution text,
  ADD COLUMN IF NOT EXISTS final_resolution text,
  ADD COLUMN IF NOT EXISTS upscale_level text;