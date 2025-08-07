-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sbu')),
  sbu_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create KPI definitions table
CREATE TABLE public.kpi_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  target_value DECIMAL NOT NULL,
  weight_percentage DECIMAL NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  unit TEXT,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('count', 'sum', 'percentage')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS for KPI definitions
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view KPI definitions" 
ON public.kpi_definitions 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify KPI definitions" 
ON public.kpi_definitions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create KPI scoring ranges table
CREATE TABLE public.kpi_scoring_ranges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  min_percentage DECIMAL NOT NULL,
  max_percentage DECIMAL NOT NULL,
  score_value DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_range CHECK (min_percentage <= max_percentage)
);

-- Enable RLS for scoring ranges
ALTER TABLE public.kpi_scoring_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view scoring ranges" 
ON public.kpi_scoring_ranges 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify scoring ranges" 
ON public.kpi_scoring_ranges 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  indicator_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'processing' 
    CHECK (status IN ('processing', 'pending_approval', 'approved', 'rejected', 'system_rejected')),
  rejection_reason TEXT,
  video_links JSONB,
  video_hashes TEXT[],
  calculated_score DECIMAL,
  raw_data JSONB,
  processed_data JSONB,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports and admins can view all" 
ON public.reports 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can insert their own reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admins can update reports" 
ON public.reports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_report_id UUID REFERENCES public.reports(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, sbu_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'sbu'),
    NEW.raw_user_meta_data ->> 'sbu_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_definitions_updated_at
  BEFORE UPDATE ON public.kpi_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default KPI definitions
INSERT INTO public.kpi_definitions (name, code, description, target_value, weight_percentage, unit, calculation_type) VALUES
('Produksi Siaran Pers', 'SIARAN_PERS', 'Produksi Siaran Pers Sub Holding per semester', 600, 30, 'dokumen', 'count'),
('Produksi Konten Media Sosial', 'MEDIA_SOSIAL', 'Produksi Konten Media Sosial per semester', 600, 20, 'konten', 'count'),
('Skoring Publikasi Media Massa', 'SKORING_MEDIA', 'Skoring hasil Publikasi di Media Massa per semester', 7200000, 20, 'poin', 'sum'),
('Skoring Publikasi Media Sosial', 'SKORING_MEDSOS', 'Skoring hasil Publikasi Media Sosial per semester', 42000, 20, 'poin', 'sum'),
('Pengelolaan Kampanye Komunikasi', 'KAMPANYE_KOMUN', 'Pengelolaan Kampanye Komunikasi per semester', 1, 5, 'kampanye', 'count'),
('Tindaklanjut OFI to AFI', 'OFI_AFI', 'Tindaklanjut OFI to AFI', 100, 5, 'persen', 'percentage');

-- Insert default scoring ranges for each KPI
INSERT INTO public.kpi_scoring_ranges (kpi_id, min_percentage, max_percentage, score_value) 
SELECT 
  id,
  CASE WHEN range_level = 1 THEN 75 WHEN range_level = 2 THEN 50 WHEN range_level = 3 THEN 25 ELSE 0 END,
  CASE WHEN range_level = 1 THEN 999 WHEN range_level = 2 THEN 74.99 WHEN range_level = 3 THEN 49.99 ELSE 24.99 END,
  CASE 
    WHEN code = 'SIARAN_PERS' AND range_level = 1 THEN 30
    WHEN code = 'SIARAN_PERS' AND range_level = 2 THEN 15
    WHEN code = 'SIARAN_PERS' AND range_level = 3 THEN 10
    WHEN code = 'SIARAN_PERS' AND range_level = 4 THEN 8
    WHEN code = 'MEDIA_SOSIAL' AND range_level = 1 THEN 20
    WHEN code = 'MEDIA_SOSIAL' AND range_level = 2 THEN 10
    WHEN code = 'MEDIA_SOSIAL' AND range_level = 3 THEN 7
    WHEN code = 'MEDIA_SOSIAL' AND range_level = 4 THEN 5
    ELSE 0
  END
FROM public.kpi_definitions,
     (SELECT generate_series(1, 4) as range_level) ranges;