import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppSettings {
  // System settings
  enableNotifications: boolean;
  autoApproval: boolean;
  maxFileSize: string;
  allowedFileTypes: string[];
  backupFrequency: string;
  retentionPeriod: string;
  
  // Email settings
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  enableEmailNotifications: boolean;
  emailTemplate: string;
  
  // Report settings
  defaultExportFormat: string;
  includeCharts: boolean;
  autoGenerateReports: boolean;
  reportSchedule: string;
  
  // Notification settings
  notificationTypes: {
    upload: boolean;
    approval: boolean;
    rejection: boolean;
    deadline: boolean;
    system: boolean;
  };
}

export const defaultSettings: AppSettings = {
  enableNotifications: true,
  autoApproval: false,
  maxFileSize: '50',
  allowedFileTypes: ['xlsx', 'xls'],
  backupFrequency: 'daily',
  retentionPeriod: '365',
  
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  enableEmailNotifications: true,
  emailTemplate: 'default',
  
  defaultExportFormat: 'xlsx',
  includeCharts: true,
  autoGenerateReports: false,
  reportSchedule: 'weekly',
  
  notificationTypes: {
    upload: true,
    approval: true,
    rejection: true,
    deadline: true,
    system: true
  }
};

export const useSettings = (userId?: string) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Since we don't have a settings table yet, we'll use a generic approach
  // that could work with either user-specific or global settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try to fetch from Supabase
      const { data, error } = await supabase
        .from('app_settings')
        .select('settings')
        .eq(userId ? 'user_id' : 'is_global', userId || true)
        .single();
      if (data && data.settings) {
        setSettings({ ...defaultSettings, ...data.settings });
      } else if (error) {
        // fallback to localStorage
        const settingsKey = userId ? `user_settings_${userId}` : 'app_settings';
        const local = localStorage.getItem(settingsKey);
        if (local) {
          setSettings({ ...defaultSettings, ...JSON.parse(local) });
        } else {
          setSettings(defaultSettings);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      setSaving(true);
      setError(null);
      const updatedSettings = { ...settings, ...newSettings };
      // Save to Supabase
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          user_id: userId,
          is_global: !userId,
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      setSettings(updatedSettings);
      // Also save to localStorage as backup
      const settingsKey = userId ? `user_settings_${userId}` : 'app_settings';
      localStorage.setItem(settingsKey, JSON.stringify(updatedSettings));
      return { success: true };
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save settings' };
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      setSaving(true);
      const result = await saveSettings(defaultSettings);
      return result;
    } catch (err) {
      console.error('Error resetting settings:', err);
      return { success: false, error: 'Failed to reset settings' };
    } finally {
      setSaving(false);
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `dashmon-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importSettings = async (file: File) => {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validate imported settings structure
      const validatedSettings = { ...defaultSettings, ...importedSettings };
      
      const result = await saveSettings(validatedSettings);
      return result;
    } catch (err) {
      console.error('Error importing settings:', err);
      return { success: false, error: 'Invalid settings file format' };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  return {
    settings,
    loading,
    error,
    saving,
    saveSettings,
    resetSettings,
    exportSettings,
    importSettings,
    refetch: fetchSettings
  };
};

// Helper functions for specific setting sections
export const useSystemSettings = (userId?: string) => {
  const { settings, saveSettings, loading, saving, error } = useSettings(userId);
  
  const updateSystemSettings = async (newSettings: Partial<Pick<AppSettings, 
    'enableNotifications' | 'autoApproval' | 'maxFileSize' | 'allowedFileTypes' | 'backupFrequency' | 'retentionPeriod'
  >>) => {
    return await saveSettings(newSettings);
  };

  return {
    systemSettings: {
      enableNotifications: settings.enableNotifications,
      autoApproval: settings.autoApproval,
      maxFileSize: settings.maxFileSize,
      allowedFileTypes: settings.allowedFileTypes,
      backupFrequency: settings.backupFrequency,
      retentionPeriod: settings.retentionPeriod
    },
    updateSystemSettings,
    loading,
    saving,
    error
  };
};

export const useEmailSettings = (userId?: string) => {
  const { settings, saveSettings, loading, saving, error } = useSettings(userId);
  
  const updateEmailSettings = async (newSettings: Partial<Pick<AppSettings,
    'smtpHost' | 'smtpPort' | 'smtpUser' | 'smtpPassword' | 'enableEmailNotifications' | 'emailTemplate'
  >>) => {
    return await saveSettings(newSettings);
  };

  return {
    emailSettings: {
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPassword: settings.smtpPassword,
      enableEmailNotifications: settings.enableEmailNotifications,
      emailTemplate: settings.emailTemplate
    },
    updateEmailSettings,
    loading,
    saving,
    error
  };
};

export const useReportSettings = (userId?: string) => {
  const { settings, saveSettings, loading, saving, error } = useSettings(userId);
  
  const updateReportSettings = async (newSettings: Partial<Pick<AppSettings,
    'defaultExportFormat' | 'includeCharts' | 'autoGenerateReports' | 'reportSchedule'
  >>) => {
    return await saveSettings(newSettings);
  };

  return {
    reportSettings: {
      defaultExportFormat: settings.defaultExportFormat,
      includeCharts: settings.includeCharts,
      autoGenerateReports: settings.autoGenerateReports,
      reportSchedule: settings.reportSchedule
    },
    updateReportSettings,
    loading,
    saving,
    error
  };
};