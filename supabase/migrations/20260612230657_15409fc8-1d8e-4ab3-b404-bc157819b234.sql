ALTER TABLE public.generated_videos
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_video_id uuid NULL REFERENCES public.generated_videos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS video_score integer NULL;

ALTER TABLE public.generated_videos
  DROP CONSTRAINT IF EXISTS generated_videos_score_range;
ALTER TABLE public.generated_videos
  ADD CONSTRAINT generated_videos_score_range CHECK (video_score IS NULL OR (video_score >= 0 AND video_score <= 100));

CREATE INDEX IF NOT EXISTS idx_generated_videos_parent ON public.generated_videos(parent_video_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_favorite ON public.generated_videos(user_id, is_favorite) WHERE is_favorite = true;