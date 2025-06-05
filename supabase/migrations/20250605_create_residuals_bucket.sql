-- Create residuals storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('residuals', 'residuals', false, false, 50000000, '{"application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for residuals bucket
-- Allow authenticated users to insert objects
CREATE POLICY "Allow authenticated users to upload to residuals"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'residuals' AND (storage.foldername(name))[1] = 'residuals');

-- Allow authenticated users to select objects from residuals
CREATE POLICY "Allow authenticated users to download from residuals"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'residuals' AND auth.role() = 'authenticated');
