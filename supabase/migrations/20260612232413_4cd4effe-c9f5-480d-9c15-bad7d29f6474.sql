ALTER TABLE public.generated_videos
  ADD COLUMN IF NOT EXISTS video_score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS video_score_reason text;