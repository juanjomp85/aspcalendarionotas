/*
  # Update storage bucket and policies

  1. Changes
    - Updates audio-files bucket settings
    - Enables RLS on storage.objects
    - Creates policies for file access and management
  
  2. Security
    - Enables RLS
    - Sets up policies for authenticated users
    - Allows public read access
*/

-- Update bucket settings if it exists, create if it doesn't
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'audio-files') THEN
    UPDATE storage.buckets 
    SET public = true
    WHERE id = 'audio-files';
  ELSE
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('audio-files', 'audio-files', true);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files'
);

-- Policy to allow public access to read files
CREATE POLICY "Allow public access to audio files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio-files');

-- Policy to allow users to update their own files
CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audio-files');

-- Policy to allow users to delete their own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-files');