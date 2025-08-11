-- Create merchants storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('merchants', 'merchants', false, false, 50000000, '{"application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for merchants bucket
-- Allow authenticated users to insert objects
CREATE POLICY "Allow authenticated users to upload to merchants"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'merchants' AND (storage.foldername(name))[1] = 'merchants');

-- Allow authenticated users to select objects from merchants
CREATE POLICY "Allow authenticated users to download from merchants"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'merchants' AND auth.role() = 'authenticated');
