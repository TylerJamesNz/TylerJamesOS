-- Tyler James OS, Finance T1b storage
-- Private bucket bank-statements with user-scoped RLS.
-- Path convention: bank-statements/{userId}/{accountId}/{YYYY-MM}.pdf
-- where {userId} is auth.uid() so RLS can key off the first path segment.

INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-statements', 'bank-statements', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "bank-statements: users select own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bank-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "bank-statements: users insert own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bank-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "bank-statements: users update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'bank-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "bank-statements: users delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bank-statements'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
