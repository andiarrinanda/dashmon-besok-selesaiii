import { supabase } from '@/integrations/supabase/client';

/**
 * Clean up dummy/test data from the reports system
 * This should be run after implementing the new ETL system
 */
export const cleanupDummyData = async () => {
  try {
    console.log('🧹 Starting cleanup of dummy data...');

    // Remove dummy reports (reports without proper raw_data structure)
    const { data: dummyReports, error: fetchError } = await supabase
      .from('reports')
      .select('id, raw_data')
      .or('raw_data.is_null,raw_data->data.is_null');

    if (fetchError) {
      console.error('Error fetching dummy reports:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (dummyReports && dummyReports.length > 0) {
      console.log(`Found ${dummyReports.length} dummy reports to clean up`);

      // Delete dummy reports (this will cascade to related tables)
      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .in('id', dummyReports.map(r => r.id));

      if (deleteError) {
        console.error('Error deleting dummy reports:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log(`✅ Cleaned up ${dummyReports.length} dummy reports`);
    } else {
      console.log('No dummy reports found to clean up');
    }

    // Clean up orphaned processed_media_items
    const { error: orphanError } = await supabase
      .from('processed_media_items')
      .delete()
      .not('report_id', 'in', `(SELECT id FROM reports)`);

    if (orphanError) {
      console.error('Error cleaning orphaned media items:', orphanError);
    } else {
      console.log('✅ Cleaned up orphaned media items');
    }

    // Clean up orphaned scoring details
    const { error: scoringOrphanError } = await supabase
      .from('report_scoring_details')
      .delete()
      .not('report_id', 'in', `(SELECT id FROM reports)`);

    if (scoringOrphanError) {
      console.error('Error cleaning orphaned scoring details:', scoringOrphanError);
    } else {
      console.log('✅ Cleaned up orphaned scoring details');
    }

    console.log('🎉 Cleanup completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('Cleanup failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Initialize the system with proper KPI definitions
 */
export const initializeKPISystem = async () => {
  try {
    console.log('🚀 Initializing KPI system...');

    // Check if KPI already exists
    const { data: existingKPI, error: checkError } = await supabase
      .from('kpi_definitions')
      .select('id')
      .eq('code', 'SKORING_PUBLIKASI_MEDIA')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing KPI:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingKPI) {
      console.log('✅ KPI already exists, skipping initialization');
      return { success: true };
    }

    // Create the KPI definition
    const { data: kpiData, error: kpiError } = await supabase
      .from('kpi_definitions')
      .insert({
        name: 'Skoring Publikasi Media Massa',
        code: 'SKORING_PUBLIKASI_MEDIA',
        description: 'Penilaian kualitas dan kuantitas publikasi di berbagai platform media massa termasuk media sosial, media online, radio, media cetak, running text, dan siaran TV',
        target_value: 100,
        weight_percentage: 20.0,
        unit: 'poin',
        calculation_type: 'sum',
        is_active: true
      })
      .select()
      .single();

    if (kpiError) {
      console.error('Error creating KPI definition:', kpiError);
      return { success: false, error: kpiError.message };
    }

    // Create scoring ranges
    const scoringRanges = [
      { min_percentage: 0, max_percentage: 25, score_value: 1 },
      { min_percentage: 26, max_percentage: 50, score_value: 2 },
      { min_percentage: 51, max_percentage: 75, score_value: 3 },
      { min_percentage: 76, max_percentage: 90, score_value: 4 },
      { min_percentage: 91, max_percentage: 100, score_value: 5 }
    ];

    const { error: rangesError } = await supabase
      .from('kpi_scoring_ranges')
      .insert(
        scoringRanges.map(range => ({
          kpi_id: kpiData.id,
          ...range
        }))
      );

    if (rangesError) {
      console.error('Error creating scoring ranges:', rangesError);
      return { success: false, error: rangesError.message };
    }

    console.log('✅ KPI system initialized successfully');
    return { success: true };

  } catch (error) {
    console.error('KPI initialization failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Complete system setup
 */
export const setupSystem = async () => {
  console.log('🔧 Setting up KPI Management System...');
  
  const cleanupResult = await cleanupDummyData();
  if (!cleanupResult.success) {
    return cleanupResult;
  }

  const initResult = await initializeKPISystem();
  if (!initResult.success) {
    return initResult;
  }

  console.log('🎉 System setup completed successfully!');
  return { success: true };
};