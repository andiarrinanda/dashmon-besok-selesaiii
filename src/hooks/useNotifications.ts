/**
 * Enhanced Notification System for DASHMON
 * Features: Categories, Priority Levels, Dashboard Integration, Read/Unread Status
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: 'upload' | 'approval' | 'rejection' | 'kpi' | 'report' | 'deadline' | 'system';
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  is_read: boolean;
  created_at: string;
  read_at?: string;
  action_url?: string;
  action_text?: string;
  related_report_id?: string;
}

export interface NotificationPreferences {
  upload: boolean;
  approval: boolean;
  rejection: boolean;
  kpi: boolean;
  report: boolean;
  deadline: boolean;
  system: boolean;
  priority_levels: {
    urgent: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
  };
}

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      // Map the database data to include default values for missing fields
      const mappedNotifications = (data || []).map(notification => ({
        ...notification,
        category: notification.category || 'system',
        priority: notification.priority || 'medium',
        read_at: notification.read_at || undefined,
        action_url: notification.action_url || undefined,
        action_text: notification.action_text || undefined
      }));

      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  };

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('New notification received:', payload);
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('Notification updated:', payload);
        const updatedNotification = payload.new as Notification;
        setNotifications(prev => 
          prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
        );
        if (updatedNotification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch: fetchNotifications
  };
};

/**
 * Notification Creation Utilities
 */
export const createNotification = async (
  userId: string,
  notification: Pick<Notification, 'title' | 'message' | 'type'> & {
    related_report_id?: string;
  }
): Promise<Notification> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      related_report_id: notification.related_report_id,
      is_read: false
    })
    .select()
    .single();

  if (error) throw error;
  
  // Return with default values for fields not in database
  return {
    ...data,
    category: 'system' as const,
    priority: 'medium' as const,
    read_at: undefined,
    action_url: undefined,
    action_text: undefined
  };
};

export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification['type'] = 'info'
): Promise<Notification> => {
  return createNotification(userId, {
    title,
    message,
    type
  });
};

export const createUploadNotification = async (
  userId: string,
  fileName: string,
  status: 'success' | 'failed'
): Promise<Notification> => {
  const isSuccess = status === 'success';
  return createNotification(userId, {
    title: isSuccess ? 'Upload Berhasil' : 'Upload Gagal',
    message: isSuccess 
      ? `File "${fileName}" berhasil diupload dan sedang diproses`
      : `File "${fileName}" gagal diupload. Silakan coba lagi.`,
    type: isSuccess ? 'success' : 'error'
  });
};

export const createApprovalNotification = async (
  userId: string,
  fileName: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<Notification> => {
  const isApproved = status === 'approved';
  return createNotification(userId, {
    title: isApproved ? 'Laporan Disetujui' : 'Laporan Ditolak',
    message: isApproved
      ? `Laporan "${fileName}" telah disetujui dan akan dilanjutkan ke proses kalkulasi skor`
      : `Laporan "${fileName}" ditolak. Alasan: ${reason || 'Tidak disebutkan'}`,
    type: isApproved ? 'success' : 'error'
  });
};

export const createKPINotification = async (
  userId: string,
  kpiName: string,
  achievement: number,
  target: number
): Promise<Notification> => {
  const percentage = Math.round((achievement / target) * 100);
  const isOnTrack = percentage >= 75;
  
  return createNotification(userId, {
    title: `Update KPI: ${kpiName}`,
    message: `Pencapaian KPI ${kpiName}: ${achievement}/${target} (${percentage}%)`,
    type: isOnTrack ? 'success' : 'warning'
  });
};

export const createDeadlineNotification = async (
  userId: string,
  taskName: string,
  deadline: string
): Promise<Notification> => {
  const daysUntilDeadline = Math.ceil(
    (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  let type: Notification['type'] = 'warning';

  if (daysUntilDeadline <= 1) {
    type = 'error';
  } else if (daysUntilDeadline <= 3) {
    type = 'warning';
  }

  return createNotification(userId, {
    title: `Deadline: ${taskName}`,
    message: `Deadline untuk "${taskName}" dalam ${daysUntilDeadline} hari (${new Date(deadline).toLocaleDateString('id-ID')})`,
    type
  });
};

/**
 * Notification Preferences Hook
 * Manages user notification preferences for categories and priority levels
 * Uses localStorage for persistence since database table is not available
 */
export const useNotificationPreferences = (userId?: string) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    upload: true,
    approval: true,
    rejection: true,
    kpi: true,
    report: true,
    deadline: true,
    system: true,
    priority_levels: {
      urgent: true,
      high: true,
      medium: true,
      low: true,
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getStorageKey = (userId: string) => `notification_preferences_${userId}`;

  const fetchPreferences = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to get preferences from localStorage
      const storageKey = getStorageKey(userId);
      const storedPreferences = localStorage.getItem(storageKey);
      
      if (storedPreferences) {
        const parsedPreferences = JSON.parse(storedPreferences);
        setPreferences(parsedPreferences);
      }
      // If no stored preferences, keep default values
      
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!userId) return;

    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      // Store in localStorage
      const storageKey = getStorageKey(userId);
      localStorage.setItem(storageKey, JSON.stringify(updatedPreferences));
      
      setPreferences(updatedPreferences);
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch: fetchPreferences
  };
};
