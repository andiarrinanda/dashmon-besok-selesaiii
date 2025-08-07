/*
  # Setup KPI Data for Skoring Publikasi Media Massa

  1. New Data
    - Insert KPI definition for "Skoring Publikasi Media Massa"
    - Insert scoring ranges based on brainstorm.xlsx guidelines
  
  2. Configuration
    - Set up proper target values and weights
    - Define scoring ranges for different achievement levels
*/

-- Insert KPI definition for Skoring Publikasi Media Massa
INSERT INTO kpi_definitions (
  name,
  code,
  description,
  target_value,
  weight_percentage,
  unit,
  calculation_type,
  is_active
) VALUES (
  'Skoring Publikasi Media Massa',
  'SKORING_PUBLIKASI_MEDIA',
  'Penilaian kualitas dan kuantitas publikasi di berbagai platform media massa termasuk media sosial, media online, radio, media cetak, running text, dan siaran TV',
  100,
  25.0,
  'poin',
  'sum',
  true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  target_value = EXCLUDED.target_value,
  weight_percentage = EXCLUDED.weight_percentage,
  unit = EXCLUDED.unit,
  calculation_type = EXCLUDED.calculation_type,
  is_active = EXCLUDED.is_active;

-- Get the KPI ID for scoring ranges
DO $$
DECLARE
  kpi_uuid uuid;
BEGIN
  SELECT id INTO kpi_uuid FROM kpi_definitions WHERE code = 'SKORING_PUBLIKASI_MEDIA';
  
  -- Delete existing scoring ranges for this KPI
  DELETE FROM kpi_scoring_ranges WHERE kpi_id = kpi_uuid;
  
  -- Insert scoring ranges based on brainstorm.xlsx guidelines
  INSERT INTO kpi_scoring_ranges (kpi_id, min_percentage, max_percentage, score_value) VALUES
  (kpi_uuid, 0, 25, 1),     -- 0-25% achievement = 1 point
  (kpi_uuid, 26, 50, 2),    -- 26-50% achievement = 2 points
  (kpi_uuid, 51, 75, 3),    -- 51-75% achievement = 3 points
  (kpi_uuid, 76, 90, 4),    -- 76-90% achievement = 4 points
  (kpi_uuid, 91, 100, 5);   -- 91-100% achievement = 5 points
END $$;