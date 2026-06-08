-- RLS policies for storage.objects on bucket 'visual-references'
-- Restrict authenticated users to their own folder (path prefix = auth.uid())
-- supabaseAdmin (service_role) bypasses RLS and remains the canonical access path from server fns.

DROP POLICY IF EXISTS "vr_select_own" ON storage.objects;
DROP POLICY IF EXISTS "vr_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "vr_update_own" ON storage.objects;
DROP POLICY IF EXISTS "vr_delete_own" ON storage.objects;

CREATE POLICY "vr_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'visual-references'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "vr_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'visual-references'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "vr_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'visual-references'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'visual-references'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "vr_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'visual-references'
  AND (storage.foldername(name))[1] = auth.uid()::text
);