ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS original_prompt text,
  ADD COLUMN IF NOT EXISTS flow_prompt text,
  ADD COLUMN IF NOT EXISTS youtube_prompt text,
  ADD COLUMN IF NOT EXISTS veo_prompt text,
  ADD COLUMN IF NOT EXISTS kling_prompt text;

ALTER TABLE public.prompts ALTER COLUMN content DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS prompts_owner_title_original_unique
  ON public.prompts (user_id, title, md5(coalesce(original_prompt, '')));

CREATE INDEX IF NOT EXISTS prompts_user_created_idx
  ON public.prompts (user_id, created_at DESC);