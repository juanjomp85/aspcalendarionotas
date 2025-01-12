/*
  # Update storage policies

  1. Changes
    - Updates bucket configuration
    - Simplifies storage policies
    - Enables public read access
  
  2. Security
    - Enables RLS
    - Creates unified policy for authenticated users
    - Allows public read access
*/

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;

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

-- Single policy for authenticated users to do everything
CREATE POLICY "Allow authenticated users full access"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'audio-files')
WITH CHECK (bucket_id = 'audio-files');

-- Allow public read access
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'audio-files');