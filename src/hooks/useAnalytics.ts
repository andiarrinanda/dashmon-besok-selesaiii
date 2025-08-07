/**
 * Enhanced Analytics Hook with Period-based Analytics and Real Data Visualization
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsMetrics {
  totalReports: number;
  approvalRate: number;
  averageScore: number;
  activeSBU: number;
  // New period-based metrics
  periodType?: 'monthly' | 'semester' | 'yearly';
  periodName?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface LeaderboardItem {
  rank: number;
  sbu: string;
  score: number;
  change: string;
  userId?: string;
  // New period-based fields
  periodType?: string;
  periodName?: string;
  previousScore?: number;
  improvement?: number;
}

export interface TrendData {
  month: string;
  total_laporan: number;
  approved: number;
  rejected: number;
  // Enhanced trend data
  averageScore?: number;
  activeSBU?: number;
  periodType?: string;
  periodName?: string;
}

export interface CompositionData {
  name: string;
  value: number;
  color: string;
  // Enhanced composition data
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface PerformanceData {
  indicator: string;
  [key: string]: number | string;
  // Enhanced performance data
  target?: number;
  achievement?: number;
  percentage?: number;
  score?: number;
}

export interface AnalyticsFilter {
  periodType?: 'monthly' | 'semester' | 'yearly';
  periodName?: string;
  year?: number;
  month?: number;
  semester?: number;
  sbu?: string[];
}

// Hook for analytics metrics with period-based filtering
export const useAnalyticsMetrics = (userRole: 'admin' | 'sbu', userId?: string, filters?: AnalyticsFilter) => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('analytics_summary')
          .select('*');

        // Apply period filters
        if (filters?.periodType) {
          query = query.eq('period_type', filters.periodType);
        }

        if (filters?.periodName) {
          query = query.eq('period_name', filters.periodName);
        }

        if (filters?.year) {
          query = query.eq('period_start', `${filters.year}-01-01`);
        }

        // Get the most recent period if no specific filter
        if (!filters?.periodName && !filters?.year) {
          query = query.order('period_start', { ascending: false }).limit(1);
        } else {
          query = query.order('period_start', { ascending: false });
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          const summary = data[0];
          const totalReports = summary.total_reports || 0;
          const approvedReports = summary.approved_reports || 0;
          const rejectedReports = summary.rejected_reports || 0;

          setMetrics({
            totalReports,
            approvalRate: totalReports > 0 ? (approvedReports / totalReports) * 100 : 0,
            averageScore: summary.average_score || 0,
            activeSBU: summary.active_sbu_count || 0,
            periodType: summary.period_type,
            periodName: summary.period_name,
            periodStart: summary.period_start,
            periodEnd: summary.period_end
          });
        } else {
          // Fallback to real-time calculation if no summary data
          const { data: reports, error: reportsError } = await supabase
            .from('reports')
            .select('status, calculated_score, user_id');

          if (reportsError) throw reportsError;

          const totalReports = reports?.length || 0;
          const approvedReports = reports?.filter(r => r.status === 'approved' || r.status === 'completed').length || 0;
          const uniqueSBUs = new Set(reports?.map(r => r.user_id)).size;
          const averageScore = reports?.reduce((sum, r) => sum + (r.calculated_score || 0), 0) / (reports?.length || 1);

          setMetrics({
            totalReports,
            approvalRate: totalReports > 0 ? (approvedReports / totalReports) * 100 : 0,
            averageScore,
            activeSBU: uniqueSBUs
          });
        }

      } catch (err) {
        console.error('Error fetching analytics metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Real-time subscription for analytics summary
    const channel = supabase
      .channel('analytics_metrics')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'analytics_summary'
      }, (payload) => {
        console.log('Real-time update: analytics_summary table changed', payload);
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId, filters]);

  return { metrics, loading, error };
};

// Enhanced leaderboard with period-based data and real change calculation
export const useLeaderboard = (filters?: AnalyticsFilter) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current period leaderboard
        let query = supabase
          .from('leaderboard_history')
          .select(`
            user_id,
            sbu_name,
            score,
            period_type,
            period_name,
            period_start,
            period_end,
            profiles!leaderboard_history_user_id_fkey (full_name)
          `)
          .order('score', { ascending: false });

        // Apply period filters
        if (filters?.periodType) {
          query = query.eq('period_type', filters.periodType);
        }

        if (filters?.periodName) {
          query = query.eq('period_name', filters.periodName);
        }

        const { data: currentData, error: currentError } = await query;

        if (currentError) throw currentError;

        // Get previous period for change calculation
        const previousPeriodQuery = supabase
          .from('leaderboard_history')
          .select('user_id, score, period_name')
          .order('period_end', { ascending: false })
          .limit(100);

        if (filters?.periodType) {
          previousPeriodQuery.eq('period_type', filters.periodType);
        }

        const { data: previousData, error: previousError } = await previousPeriodQuery;

        if (previousError) throw previousError;

        // Calculate leaderboard with real changes
        const leaderboardMap = new Map();
        
        // Process current data
        currentData?.forEach((item, index) => {
          const previousScore = previousData?.find(p => p.user_id === item.user_id && p.period_name !== item.period_name)?.score || 0;
          const change = item.score - previousScore;
          
          leaderboardMap.set(item.user_id, {
            rank: index + 1,
            sbu: item.sbu_name || 'Unknown SBU',
            score: item.score,
            change: `${change >= 0 ? '+' : ''}${change.toFixed(1)}`,
            userId: item.user_id,
            periodType: item.period_type,
            periodName: item.period_name,
            previousScore,
            improvement: change
          });
        });

        const sortedLeaderboard = Array.from(leaderboardMap.values())
          .sort((a, b) => b.score - a.score)
          .map((item, index) => ({ ...item, rank: index + 1 }));

        setLeaderboard(sortedLeaderboard);

      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Real-time subscription
    const channel = supabase
      .channel('leaderboard_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'leaderboard_history'
      }, (payload) => {
        console.log('Real-time update: leaderboard_history table changed', payload);
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  return { leaderboard, loading, error };
};

// Enhanced trend data with period-based analysis
export const useTrendData = (userRole: 'admin' | 'sbu', userId?: string, filters?: AnalyticsFilter) => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get analytics summary data for trend analysis
        let query = supabase
          .from('analytics_summary')
          .select('*')
          .order('period_start', { ascending: true });

        // Apply filters
        if (filters?.periodType) {
          query = query.eq('period_type', filters.periodType);
        }

        if (filters?.year) {
          query = query.gte('period_start', `${filters.year}-01-01`)
                      .lt('period_start', `${filters.year + 1}-01-01`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Transform data for trend visualization
        const trendArray: TrendData[] = (data || []).map((summary: any) => ({
          month: summary.period_name,
          total_laporan: summary.total_reports || 0,
          approved: summary.approved_reports || 0,
          rejected: summary.rejected_reports || 0,
          averageScore: summary.average_score || 0,
          activeSBU: summary.active_sbu_count || 0,
          periodType: summary.period_type,
          periodName: summary.period_name
        }));

        setTrendData(trendArray);

      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch trend data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();

    // Real-time subscription
    const channel = supabase
      .channel('trend_data_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'analytics_summary'
      }, (payload) => {
        console.log('Real-time update: analytics_summary table changed for trend', payload);
        fetchTrendData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId, filters]);

  return { trendData, loading, error };
};

// Enhanced composition data with KPI achievements
export const useCompositionData = (userRole: 'admin' | 'sbu', userId?: string, filters?: AnalyticsFilter) => {
  const [compositionData, setCompositionData] = useState<CompositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompositionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get KPI achievements from analytics summary
        let query = supabase
          .from('analytics_summary')
          .select('kpi_achievements, period_name')
          .order('period_start', { ascending: false })
          .limit(1);

        if (filters?.periodName) {
          query = query.eq('period_name', filters.periodName);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (data && data.length > 0 && data[0].kpi_achievements) {
          const achievements = data[0].kpi_achievements;
          const composition: CompositionData[] = Object.entries(achievements).map(([kpi, data]: [string, any]) => ({
            name: kpi,
            value: data.achievement || 0,
            color: getKPIColor(kpi),
            percentage: data.percentage || 0,
            trend: data.trend || 'stable'
          }));

          setCompositionData(composition);
        } else {
          // Fallback to status-based composition
          const { data: reports, error: reportsError } = await supabase
            .from('reports')
            .select('status');

          if (reportsError) throw reportsError;

          const statusCounts = reports?.reduce((acc, report) => {
            acc[report.status] = (acc[report.status] || 0) + 1;
            return acc;
          }, {} as any) || {};

          const composition: CompositionData[] = Object.entries(statusCounts).map(([status, count]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: count as number,
            color: getStatusColor(status),
            percentage: (count as number / (reports?.length || 1)) * 100
          }));

          setCompositionData(composition);
        }

      } catch (err) {
        console.error('Error fetching composition data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch composition data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompositionData();

    // Real-time subscription
    const channel = supabase
      .channel('composition_data_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'analytics_summary'
      }, (payload) => {
        console.log('Real-time update: analytics_summary table changed for composition', payload);
        fetchCompositionData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId, filters]);

  return { compositionData, loading, error };
};

// Helper functions for colors
const getKPIColor = (kpi: string): string => {
  const colors = {
    'PUBLIKASI_SIARAN_PERS': '#3B82F6',
    'PRODUKSI_KONTEN_MEDSOS': '#10B981',
    'SKORING_PUBLIKASI_MEDIA': '#F59E0B',
    'KAMPANYE_KOMUNIKASI': '#EF4444',
    'OFI_TO_AFI': '#8B5CF6'
  };
  return colors[kpi as keyof typeof colors] || '#6B7280';
};

const getStatusColor = (status: string): string => {
  const colors = {
    'approved': '#10B981',
    'completed': '#059669',
    'pending_approval': '#F59E0B',
    'processing': '#3B82F6',
    'rejected': '#EF4444',
    'failed': '#DC2626'
  };
  return colors[status as keyof typeof colors] || '#6B7280';
};

// New hook for performance comparison
export const usePerformanceComparison = (filters?: AnalyticsFilter) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get KPI definitions and achievements
        const { data: kpiData, error: kpiError } = await supabase
          .from('kpi_definitions')
          .select('*')
          .eq('is_active', true);

        if (kpiError) throw kpiError;

        // Get analytics summary for current period
        let summaryQuery = supabase
          .from('analytics_summary')
          .select('kpi_achievements, period_name')
          .order('period_start', { ascending: false })
          .limit(1);

        if (filters?.periodName) {
          summaryQuery = summaryQuery.eq('period_name', filters.periodName);
        }

        const { data: summaryData, error: summaryError } = await summaryQuery;

        if (summaryError) throw summaryError;

        const achievements = summaryData?.[0]?.kpi_achievements || {};

        // Combine KPI definitions with achievements
        const performance: PerformanceData[] = kpiData?.map(kpi => {
          const achievement = achievements[kpi.code] || {};
          const target = kpi.scoring_period === 'semester' ? kpi.semester_target : kpi.monthly_target;
          const actual = achievement.achievement || 0;
          const percentage = target > 0 ? (actual / target) * 100 : 0;

          return {
            indicator: kpi.name,
            target: target || 0,
            achievement: actual,
            percentage: Math.round(percentage * 100) / 100,
            score: achievement.score || 0,
            unit: kpi.unit || '',
            weight: kpi.weight_percentage || 0
          };
        }) || [];

        setPerformanceData(performance);

      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();

    // Real-time subscription
    const channel = supabase
      .channel('performance_comparison_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'analytics_summary'
      }, (payload) => {
        console.log('Real-time update: analytics_summary table changed for performance', payload);
        fetchPerformanceData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  return { performanceData, loading, error };
};