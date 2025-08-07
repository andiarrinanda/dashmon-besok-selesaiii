import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KPIDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  calculation_type: string;
  target_value: number;
  unit: string | null;
  weight_percentage: number;
  is_active: boolean;
}

export const useKPIDefinitions = () => {
  const [kpiDefinitions, setKpiDefinitions] = useState<KPIDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIDefinitions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('kpi_definitions')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setKpiDefinitions(data || []);
    } catch (err) {
      console.error('Error fetching KPI definitions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch KPI definitions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIDefinitions();
  }, []);

  return {
    kpiDefinitions,
    loading,
    error,
    refetch: fetchKPIDefinitions
  };
};