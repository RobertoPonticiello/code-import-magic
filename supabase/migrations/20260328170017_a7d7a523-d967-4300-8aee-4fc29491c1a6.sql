
-- Add columns for user notes, rating, and image to completed_actions
ALTER TABLE public.completed_actions 
  ADD COLUMN IF NOT EXISTS user_note text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Create storage bucket for action images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('action-images', 'action-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to action-images bucket
CREATE POLICY "Users can upload action images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'action-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public can view action images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'action-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own action images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'action-images' AND (storage.foldername(name))[1] = auth.uid()::text);
