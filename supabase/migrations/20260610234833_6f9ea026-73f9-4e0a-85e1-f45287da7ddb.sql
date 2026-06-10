DROP POLICY IF EXISTS "Owner manages winning prompts" ON public.winning_video_prompts;
CREATE POLICY "Owner manages winning prompts" ON public.winning_video_prompts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);