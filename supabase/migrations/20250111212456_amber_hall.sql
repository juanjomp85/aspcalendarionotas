/*
  # Storage policies for audio files

  1. Security
    - Enable storage policies for audio-files bucket
    - Add policies for authenticated users to:
      - Upload their own audio files
      - Read any audio file
*/

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files' AND
  auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to read files
CREATE POLICY "Allow authenticated users to read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio-files');

-- Policy to allow users to update their own files
CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio-files' AND owner = auth.uid())
WITH CHECK (bucket_id = 'audio-files' AND owner = auth.uid());

-- Policy to allow users to delete their own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-files' AND owner = auth.uid());