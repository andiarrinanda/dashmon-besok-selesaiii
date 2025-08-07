/*
  # Enhanced ETL Schema for Media Massa Processing
  
  1. Updates to reports table for better ETL tracking
  2. New tables for media validation and duplicate detection
  3. Support for various media types (not just videos)
  4. Link validation and content hashing
*/

-- Add new columns to reports table for enhanced ETL
ALTER TABLE reports ADD COLUMN IF NOT EXISTS validation_results JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS valid_links_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS total_links_count INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS media_breakdown JSONB;

-- Create table for tracking processed media items
CREATE TABLE IF NOT EXISTS processed_media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  final_url TEXT,
  media_type TEXT NOT NULL, -- 'online_news', 'social_media', 'radio', 'print_media', 'running_text', 'tv'
  content_hash TEXT,
  is_valid BOOLEAN DEFAULT false,
  is_duplicate BOOLEAN DEFAULT false,
  validation_error TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_media_items_report_id ON processed_media_items(report_id);
CREATE INDEX IF NOT EXISTS idx_processed_media_items_content_hash ON processed_media_items(content_hash);
CREATE INDEX IF NOT EXISTS idx_processed_media_items_media_type ON processed_media_items(media_type);

-- Create table for storing scoring calculations
CREATE TABLE IF NOT EXISTS report_scoring_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  target_count INTEGER,
  actual_count INTEGER,
  achievement_percentage DECIMAL,
  score_value INTEGER,
  weight_percentage DECIMAL,
  weighted_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for scoring details
CREATE INDEX IF NOT EXISTS idx_report_scoring_details_report_id ON report_scoring_details(report_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_scoring_details_unique ON report_scoring_details(report_id, media_type);

-- Enable RLS for new tables
ALTER TABLE processed_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_scoring_details ENABLE ROW LEVEL SECURITY;

-- RLS policies for processed_media_items
DROP POLICY IF EXISTS "Users can view media items for their own reports" ON processed_media_items;
CREATE POLICY "Users can view media items for their own reports" 
ON processed_media_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM reports 
    WHERE reports.id = processed_media_items.report_id 
    AND (reports.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);

DROP POLICY IF EXISTS "System can insert media items" ON processed_media_items;
CREATE POLICY "System can insert media items" 
ON processed_media_items 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update media items" ON processed_media_items;
CREATE POLICY "System can update media items" 
ON processed_media_items 
FOR UPDATE 
USING (true);

-- RLS policies for report_scoring_details
DROP POLICY IF EXISTS "Users can view scoring details for their own reports" ON report_scoring_details;
CREATE POLICY "Users can view scoring details for their own reports" 
ON report_scoring_details 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM reports 
    WHERE reports.id = report_scoring_details.report_id 
    AND (reports.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  )
);

DROP POLICY IF EXISTS "System can insert scoring details" ON report_scoring_details;
CREATE POLICY "System can insert scoring details" 
ON report_scoring_details 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "System can update scoring details" ON report_scoring_details;
CREATE POLICY "System can update scoring details" 
ON report_scoring_details 
FOR UPDATE 
USING (true);

-- Function to calculate media massa scoring
CREATE OR REPLACE FUNCTION calculate_media_massa_scoring(report_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  media_counts JSONB;
  scoring_result JSONB;
  total_score DECIMAL := 0;
  media_type TEXT;
  count_val INTEGER;
  target_val INTEGER;
  achievement_pct DECIMAL;
  score_val INTEGER;
  weight_pct DECIMAL;
  weighted_score DECIMAL;
BEGIN
  -- Get media counts from processed_media_items
  SELECT jsonb_object_agg(media_type, count) INTO media_counts
  FROM (
    SELECT media_type, COUNT(*) as count
    FROM processed_media_items 
    WHERE report_id = report_id_param AND is_valid = true AND is_duplicate = false
    GROUP BY media_type
  ) counts;

  -- Initialize scoring_result
  scoring_result := jsonb_build_object();

  -- Define targets based on the requirements (from image 1)
  -- These values should match the KPI targets from the Excel
  FOR media_type, count_val IN 
    SELECT * FROM jsonb_each_text(COALESCE(media_counts, '{}'::jsonb))
  LOOP
    -- Set targets based on media type (from image 3 - Grand Total row)
    CASE media_type
      WHEN 'online_news' THEN target_val := 720000; -- Media Online target (720.000)
      WHEN 'social_media' THEN target_val := 10; -- Konten Media Sosial target  
      WHEN 'radio' THEN target_val := 1; -- Radio target
      WHEN 'print_media' THEN target_val := 120000; -- Media Cetak target (120.000)
      WHEN 'running_text' THEN target_val := 1; -- Running Text target
      WHEN 'tv' THEN target_val := 4200; -- Siaran TV target (4.200)
      ELSE target_val := 100; -- Default target
    END CASE;

    -- Calculate achievement percentage
    achievement_pct := (count_val::DECIMAL / target_val::DECIMAL) * 100;
    
    -- Determine score based on achievement percentage ranges
    IF achievement_pct >= 91 THEN score_val := 5;
    ELSIF achievement_pct >= 76 THEN score_val := 4;
    ELSIF achievement_pct >= 51 THEN score_val := 3;
    ELSIF achievement_pct >= 26 THEN score_val := 2;
    ELSE score_val := 1;
    END IF;

    -- Set weight percentage (from requirements - 20% total for media massa)
    weight_pct := 20.0 / 6; -- Distribute 20% across 6 media types
    weighted_score := score_val * (weight_pct / 100);
    
    total_score := total_score + weighted_score;

    -- Store in scoring_result
    scoring_result := scoring_result || jsonb_build_object(
      media_type, jsonb_build_object(
        'target', target_val,
        'actual', count_val,
        'achievement_percentage', achievement_pct,
        'score', score_val,
        'weight_percentage', weight_pct,
        'weighted_score', weighted_score
      )
    );

    -- Insert or update scoring details
    INSERT INTO report_scoring_details (
      report_id, media_type, target_count, actual_count, 
      achievement_percentage, score_value, weight_percentage, weighted_score
    ) VALUES (
      report_id_param, media_type, target_val, count_val::INTEGER,
      achievement_pct, score_val, weight_pct, weighted_score
    ) ON CONFLICT (report_id, media_type) DO UPDATE SET
      target_count = EXCLUDED.target_count,
      actual_count = EXCLUDED.actual_count,
      achievement_percentage = EXCLUDED.achievement_percentage,
      score_value = EXCLUDED.score_value,
      weight_percentage = EXCLUDED.weight_percentage,
      weighted_score = EXCLUDED.weighted_score;
  END LOOP;

  -- Add total score to result
  scoring_result := scoring_result || jsonb_build_object('total_score', total_score);

  RETURN scoring_result;
END;
$$;