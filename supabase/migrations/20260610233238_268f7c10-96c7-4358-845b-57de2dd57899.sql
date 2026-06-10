DROP POLICY IF EXISTS "Owner manages winning prompts" ON public.winning_video_prompts;
CREATE POLICY "Owner manages winning prompts" ON public.winning_video_prompts
  FOR ALL
  USING (user_id = COALESCE(auth.uid(), user_id))
  WITH CHECK (user_id = COALESCE(auth.uid(), user_id));