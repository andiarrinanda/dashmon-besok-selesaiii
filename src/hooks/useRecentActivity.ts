import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityItem {
  id: string;
  type: 'upload' | 'approve' | 'reject' | 'process';
  title: string;
  description: string;
  user: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error' | 'processing';
}

export const useRecentActivity = (userRole: 'admin' | 'sbu', userId?: string) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query based on user role
        let query = supabase
          .from('reports')
          .select(`
            id,
            file_name,
            status,
            created_at,
            updated_at,
            approved_at,
            rejection_reason,
            indicator_type,
            profiles!reports_user_id_fkey(full_name, sbu_name),
            approved_by_profile:profiles!reports_approved_by_fkey(full_name)
          `)
          .order('updated_at', { ascending: false })
          .limit(10);

        // If SBU user, only show their reports
        if (userRole === 'sbu' && userId) {
          query = query.eq('user_id', userId);
        }

        const { data: reports, error: reportsError } = await query;

        if (reportsError) throw reportsError;

        // Transform reports into activity items
        const activityItems: ActivityItem[] = [];

        reports?.forEach((report) => {
          const user = report.profiles?.sbu_name || report.profiles?.full_name || 'Unknown User';
          const approvedBy = report.approved_by_profile?.full_name || 'Admin Central';
          
          // Add upload activity
          activityItems.push({
            id: `${report.id}-upload`,
            type: 'upload',
            title: `Laporan ${report.indicator_type}`,
            description: `${user} mengunggah laporan ${report.file_name}`,
            user: user,
            timestamp: formatTimestamp(report.created_at),
            status: getStatusFromReportStatus(report.status)
          });

          // Add approval/rejection activity if applicable
          if (report.status === 'approved' && report.approved_at) {
            activityItems.push({
              id: `${report.id}-approve`,
              type: 'approve',
              title: `Laporan ${report.indicator_type}`,
              description: `${approvedBy} menyetujui laporan dan memicu kalkulasi skor`,
              user: approvedBy,
              timestamp: formatTimestamp(report.approved_at),
              status: 'success'
            });
          } else if (report.status === 'rejected' && report.rejection_reason) {
            activityItems.push({
              id: `${report.id}-reject`,
              type: 'reject',
              title: `Laporan ${report.indicator_type}`,
              description: `Ditolak: ${report.rejection_reason}`,
              user: user,
              timestamp: formatTimestamp(report.updated_at),
              status: 'error'
            });
          }
        });

        // Sort by timestamp and take only the most recent 5
        const sortedActivities = activityItems
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);

        setActivities(sortedActivities);
      } catch (err) {
        console.error('Error fetching recent activity:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch recent activity');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [userRole, userId]);

  return { activities, loading, error };
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'Baru saja';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} jam yang lalu`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} hari yang lalu`;
  }
};

const getStatusFromReportStatus = (status: string): 'success' | 'pending' | 'error' | 'processing' => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending_approval':
      return 'pending';
    case 'rejected':
      return 'error';
    case 'processing':
      return 'processing';
    default:
      return 'pending';
  }
};