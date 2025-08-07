-- Create storage bucket for report uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-uploads', 'report-uploads', false);

-- Create RLS policies for report uploads bucket
CREATE POLICY "Users can upload their own reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'report-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-uploads' AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));