/**
 * Enhanced Reports Hook with Period-based Filtering and Data Immutability
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Report {
  id: string;
  fileName: string;
  submittedBy: string;
  sbu: string;
  submittedAt: string;
  status: string;
  indicatorType: string;
  rawData: any;
  processedData: any;
  calculatedScore: number | null;
  fileSize: string;
  videoLinks: string[];
  rejectionReason?: string;
  filePath?: string;
  approvedAt?: string | null;
  user_id?: string;
  // New fields for period tracking
  reportPeriodId?: string;
  reportingMonth?: number;
  reportingYear?: number;
  reportingSemester?: number;
  kpiVersionId?: string;
  isImmutable?: boolean;
  // Period information
  periodName?: string;
  periodType?: string;
}

export interface ReportFilter {
  periodType?: 'monthly' | 'semester' | 'yearly';
  periodStart?: string;
  periodEnd?: string;
  status?: string[];
  indicatorType?: string[];
  sbu?: string[];
  year?: number;
  month?: number;
  semester?: number;
}

export interface ReportPeriod {
  id: string;
  periodType: 'monthly' | 'semester' | 'yearly';
  periodStart: string;
  periodEnd: string;
  periodName: string;
  isActive: boolean;
}

export const useReports = (userRole: 'admin' | 'sbu', userId?: string, filters?: ReportFilter) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('reports')
        .select(`
          id,
          file_name,
          status,
          indicator_type,
          raw_data,
          processed_data,
          calculated_score,
          file_size,
          video_links,
          rejection_reason,
          created_at,
          updated_at,
          approved_at,
          report_period_id,
          reporting_month,
          reporting_year,
          reporting_semester,
          kpi_version_id,
          is_immutable,
          user_id,
          file_path,
          profiles!reports_user_id_fkey (
            full_name,
            sbu_name
          )
        `)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (userRole === 'sbu' && userId) {
        query = query.eq('user_id', userId);
      }

      // Apply period filters (simplified)
      // Note: period filters temporarily disabled due to missing report_periods table

      if (filters?.year) {
        query = query.eq('reporting_year', filters.year);
      }

      if (filters?.month) {
        query = query.eq('reporting_month', filters.month);
      }

      if (filters?.semester) {
        query = query.eq('reporting_semester', filters.semester);
      }

      // Apply status filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Apply indicator type filters
      if (filters?.indicatorType && filters.indicatorType.length > 0) {
        query = query.in('indicator_type', filters.indicatorType);
      }

      // Apply SBU filters
      // Note: SBU filters temporarily disabled due to join complexity
      // if (filters?.sbu && filters.sbu.length > 0) {
      //   query = query.in('profiles.sbu_name', filters.sbu);
      // }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Transform data to match interface
      const transformedReports: Report[] = (data || []).map((report: any) => ({
        id: report.id,
        fileName: report.file_name,
        submittedBy: report.profiles?.full_name || 'Unknown',
        sbu: report.profiles?.sbu_name || 'Unknown SBU',
        submittedAt: formatDate(report.created_at),
        status: report.status,
        indicatorType: report.indicator_type,
        rawData: report.raw_data,
        processedData: report.processed_data,
        calculatedScore: report.calculated_score,
        fileSize: formatFileSize(report.file_size || 0),
        videoLinks: report.video_links || [],
        rejectionReason: report.rejection_reason,
        filePath: report.file_path,
        approvedAt: report.approved_at ? formatDate(report.approved_at) : null,
        user_id: report.user_id,
        // New fields
        reportPeriodId: report.report_period_id,
        reportingMonth: report.reporting_month,
        reportingYear: report.reporting_year,
        reportingSemester: report.reporting_semester,
        kpiVersionId: report.kpi_version_id,
        isImmutable: report.is_immutable,
        periodName: null,
        periodType: null
      }));

      setReports(transformedReports);
      setTotalCount(count || 0);

    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('report_periods')
        .select('*')
        .eq('is_active', true)
        .order('period_start', { ascending: false });

      if (error) throw error;
      setPeriods(data || []);
    } catch (err) {
      console.error('Error fetching periods:', err);
    }
  };

  // Check if report can be modified
  const canModifyReport = (report: Report): boolean => {
    if (userRole === 'admin') {
      return !report.isImmutable && report.status !== 'approved' && report.status !== 'completed';
    }
    return !report.isImmutable && report.status === 'pending_approval' && report.user_id === userId;
  };

  // Get reports by period
  const getReportsByPeriod = async (periodType: 'monthly' | 'semester' | 'yearly', periodName: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey (full_name, sbu_name),
          report_periods!reports_report_period_id_fkey (period_name, period_type)
        `)
        .eq('report_periods.period_type', periodType)
        .eq('report_periods.period_name', periodName);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching reports by period:', err);
      return [];
    }
  };

  // Get period statistics
  const getPeriodStats = async (periodType: 'monthly' | 'semester' | 'yearly', periodName: string) => {
    try {
      const { data, error } = await supabase
        .from('analytics_summary')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_name', periodName)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching period stats:', err);
      return null;
    }
  };

  // Get available years
  const getAvailableYears = async (): Promise<number[]> => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('reporting_year')
        .not('reporting_year', 'is', null);

      if (error) throw error;
      
      const years = [...new Set(data?.map(r => r.reporting_year))].sort((a, b) => b - a);
      return years;
    } catch (err) {
      console.error('Error fetching available years:', err);
      return [];
    }
  };

  // Get available SBUs
  const getAvailableSBUs = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sbu_name')
        .eq('role', 'sbu')
        .not('sbu_name', 'is', null);

      if (error) throw error;
      
      const sbus = [...new Set(data?.map(p => p.sbu_name))].sort();
      return sbus;
    } catch (err) {
      console.error('Error fetching available SBUs:', err);
      return [];
    }
  };

  // Get available indicator types
  const getAvailableIndicatorTypes = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('indicator_type')
        .not('indicator_type', 'is', null);

      if (error) throw error;
      
      const types = [...new Set(data?.map(r => r.indicator_type))].sort();
      return types;
    } catch (err) {
      console.error('Error fetching available indicator types:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchReports();
    fetchPeriods();
  }, [userRole, userId, filters]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('reports_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports'
      }, (payload) => {
        console.log('Real-time update: reports table changed', payload);
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId, filters]);

  return {
    reports,
    loading,
    error,
    totalCount,
    periods,
    canModifyReport,
    getReportsByPeriod,
    getPeriodStats,
    getAvailableYears,
    getAvailableSBUs,
    getAvailableIndicatorTypes,
    refetch: fetchReports
  };
};

// Helper function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Report actions with immutability checks
export const useReportActions = () => {
  const [loading, setLoading] = useState(false);
  const approveReport = async (reportId: string, adminId: string, notes?: string) => {
    try {
      setLoading(true);
      // Check if report can be modified
      const { data: report } = await supabase
        .from('reports')
        .select('is_immutable, status')
        .eq('id', reportId)
        .single();

      if (report?.is_immutable) {
        throw new Error('Report cannot be modified as it is immutable');
      }

      if (report?.status === 'approved' || report?.status === 'completed') {
        throw new Error('Report is already approved or completed');
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', reportId);

      if (updateError) throw updateError;
      return { success: true };
    } catch (error) {
      console.error('Error approving report:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  };

  const rejectReport = async (reportId: string, adminId: string, reason: string) => {
    try {
      setLoading(true);
      // Check if report can be modified
      const { data: report } = await supabase
        .from('reports')
        .select('is_immutable, status')
        .eq('id', reportId)
        .single();

      if (report?.is_immutable) {
        throw new Error('Report cannot be modified as it is immutable');
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          rejected_by: adminId,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', reportId);

      if (updateError) throw updateError;
      return { success: true };
    } catch (error) {
      console.error('Error rejecting report:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  };

  return {
    approveReport,
    rejectReport,
    loading
  };
};