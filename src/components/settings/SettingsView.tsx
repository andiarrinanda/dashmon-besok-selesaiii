import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Database, FileText, Mail, Shield, Save, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings, useEmailSettings, useReportSettings, useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import SystemSetup from "./SystemSetup";

const SettingsView = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState({
    upload: true,
    approval: true,
    rejection: true,
    deadline: true,
    system: true
  });

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };

    getCurrentUser();
  }, []);

  // Use settings hooks
  const { systemSettings, updateSystemSettings, loading: systemLoading, saving: systemSaving } = useSystemSettings(userId || undefined);
  const { emailSettings, updateEmailSettings, loading: emailLoading, saving: emailSaving } = useEmailSettings(userId || undefined);
  const { reportSettings, updateReportSettings, loading: reportLoading, saving: reportSaving } = useReportSettings(userId || undefined);
  const { settings, saveSettings, exportSettings, importSettings, saving: generalSaving } = useSettings(userId || undefined);

  // Update notification settings from main settings
  useEffect(() => {
    if (settings.notificationTypes) {
      setNotificationSettings(settings.notificationTypes);
    }
  }, [settings]);

  const handleSaveSystemSettings = async () => {
    const result = await updateSystemSettings(systemSettings);
    
    if (result.success) {
      toast({
        title: "Berhasil",
        description: "Pengaturan sistem berhasil disimpan",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menyimpan pengaturan sistem",
        variant: "destructive"
      });
    }
  };

  const handleSaveEmailSettings = async () => {
    const result = await updateEmailSettings(emailSettings);
    
    if (result.success) {
      toast({
        title: "Berhasil",
        description: "Pengaturan email berhasil disimpan",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menyimpan pengaturan email",
        variant: "destructive"
      });
    }
  };

  const handleSaveReportSettings = async () => {
    const result = await updateReportSettings(reportSettings);
    
    if (result.success) {
      toast({
        title: "Berhasil",
        description: "Pengaturan laporan berhasil disimpan",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menyimpan pengaturan laporan",
        variant: "destructive"
      });
    }
  };

  const handleSaveNotificationSettings = async () => {
    const result = await saveSettings({ notificationTypes: notificationSettings });
    
    if (result.success) {
      toast({
        title: "Berhasil",
        description: "Pengaturan notifikasi berhasil disimpan",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menyimpan pengaturan notifikasi",
        variant: "destructive"
      });
    }
  };

  const handleBackupNow = () => {
    toast({
      title: "Backup Dimulai",
      description: "Proses backup database sedang berjalan...",
    });
  };

  const handleExportConfig = () => {
    exportSettings();
    toast({
      title: "Export Berhasil",
      description: "Konfigurasi berhasil diekspor ke file JSON",
    });
  };

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await importSettings(file);
    
    if (result.success) {
      toast({
        title: "Import Berhasil",
        description: "Konfigurasi berhasil diimport",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal mengimport konfigurasi",
        variant: "destructive"
      });
    }

    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Pengaturan Sistem</h1>
        <p className="text-muted-foreground">
          Konfigurasi dan preferensi sistem DASHMON+
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="system">Sistem</TabsTrigger>
          <TabsTrigger value="etl">Setup ETL</TabsTrigger>
          <TabsTrigger value="notifications">Notifikasi</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="reports">Laporan</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        {/* ETL Setup */}
        <TabsContent value="etl" className="space-y-4">
          <SystemSetup />
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Pengaturan Sistem Umum
              </CardTitle>
              <CardDescription>
                Konfigurasi dasar sistem dan batasan file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {systemLoading ? (
                <div className="space-y-4">
                  <div className="h-10 bg-muted animate-pulse rounded" />
                  <div className="h-10 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxFileSize">Ukuran File Maksimal (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        value={systemSettings.maxFileSize}
                        onChange={(e) => updateSystemSettings({ maxFileSize: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Batas ukuran file yang dapat diunggah
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retentionPeriod">Periode Retensi Data (hari)</Label>
                      <Input
                        id="retentionPeriod"
                        type="number"
                        value={systemSettings.retentionPeriod}
                        onChange={(e) => updateSystemSettings({ retentionPeriod: e.target.value })}
                      />
                      <p className="text-sm text-muted-foreground">
                        Berapa lama data disimpan dalam sistem
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Approval</Label>
                        <p className="text-sm text-muted-foreground">
                          Setujui laporan secara otomatis jika lolos validasi sistem
                        </p>
                      </div>
                      <Switch
                        checked={systemSettings.autoApproval}
                        onCheckedChange={(checked) => updateSystemSettings({ autoApproval: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notifikasi Real-time</Label>
                        <p className="text-sm text-muted-foreground">
                          Aktifkan notifikasi push untuk update real-time
                        </p>
                      </div>
                      <Switch
                        checked={systemSettings.enableNotifications}
                        onCheckedChange={(checked) => updateSystemSettings({ enableNotifications: checked })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Tipe File yang Diizinkan</Label>
                    <div className="flex flex-wrap gap-2">
                      {['xlsx', 'xls', 'csv'].map((type) => (
                        <Badge 
                          key={type} 
                          variant={systemSettings.allowedFileTypes.includes(type) ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => {
                            const updatedTypes = systemSettings.allowedFileTypes.includes(type)
                              ? systemSettings.allowedFileTypes.filter(t => t !== type)
                              : [...systemSettings.allowedFileTypes, type];
                            updateSystemSettings({ allowedFileTypes: updatedTypes });
                          }}
                        >
                          .{type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSystemSettings} disabled={systemSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {systemSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Pengaturan Notifikasi
              </CardTitle>
              <CardDescription>
                Konfigurasi notifikasi untuk berbagai event sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  { key: 'upload', label: 'Upload Laporan Baru', description: 'Notifikasi saat ada laporan baru diunggah' },
                  { key: 'approval', label: 'Status Approval', description: 'Notifikasi perubahan status persetujuan' },
                  { key: 'rejection', label: 'Laporan Ditolak', description: 'Notifikasi saat laporan ditolak sistem' },
                  { key: 'deadline', label: 'Pengingat Deadline', description: 'Pengingat deadline pelaporan' },
                  { key: 'system', label: 'Notifikasi Sistem', description: 'Update sistem dan maintenance' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch 
                      checked={notificationSettings[item.key as keyof typeof notificationSettings]} 
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotificationSettings} disabled={generalSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {generalSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Konfigurasi Email
              </CardTitle>
              <CardDescription>
                Pengaturan SMTP dan template email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailLoading ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        placeholder="smtp.gmail.com"
                        value={emailSettings.smtpHost}
                        onChange={(e) => updateEmailSettings({ smtpHost: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input
                        id="smtpPort"
                        placeholder="587"
                        value={emailSettings.smtpPort}
                        onChange={(e) => updateEmailSettings({ smtpPort: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP Username</Label>
                      <Input
                        id="smtpUser"
                        placeholder="your-email@example.com"
                        value={emailSettings.smtpUser}
                        onChange={(e) => updateEmailSettings({ smtpUser: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP Password</Label>
                      <Input
                        id="smtpPassword"
                        type="password"
                        placeholder="••••••••"
                        value={emailSettings.smtpPassword}
                        onChange={(e) => updateEmailSettings({ smtpPassword: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="emailTemplate">Template Email</Label>
                    <Select value={emailSettings.emailTemplate} onValueChange={(value) => updateEmailSettings({ emailTemplate: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Template Default</SelectItem>
                        <SelectItem value="corporate">Template Corporate</SelectItem>
                        <SelectItem value="minimal">Template Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Aktifkan Email Notifikasi</Label>
                      <p className="text-sm text-muted-foreground">
                        Kirim notifikasi via email untuk event penting
                      </p>
                    </div>
                    <Switch
                      checked={emailSettings.enableEmailNotifications}
                      onCheckedChange={(checked) => updateEmailSettings({ enableEmailNotifications: checked })}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveEmailSettings} disabled={emailSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {emailSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Settings */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pengaturan Laporan
              </CardTitle>
              <CardDescription>
                Konfigurasi format dan jadwal laporan otomatis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {reportLoading ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-6 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="defaultExportFormat">Format Export Default</Label>
                      <Select value={reportSettings.defaultExportFormat} onValueChange={(value) => updateReportSettings({ defaultExportFormat: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reportSchedule">Jadwal Laporan Otomatis</Label>
                      <Select value={reportSettings.reportSchedule} onValueChange={(value) => updateReportSettings({ reportSchedule: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Harian</SelectItem>
                          <SelectItem value="weekly">Mingguan</SelectItem>
                          <SelectItem value="monthly">Bulanan</SelectItem>
                          <SelectItem value="quarterly">Triwulanan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Sertakan Grafik</Label>
                        <p className="text-sm text-muted-foreground">
                          Tambahkan visualisasi data dalam export laporan
                        </p>
                      </div>
                      <Switch
                        checked={reportSettings.includeCharts}
                        onCheckedChange={(checked) => updateReportSettings({ includeCharts: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Generate Laporan Otomatis</Label>
                        <p className="text-sm text-muted-foreground">
                          Buat laporan secara otomatis sesuai jadwal
                        </p>
                      </div>
                      <Switch
                        checked={reportSettings.autoGenerateReports}
                        onCheckedChange={(checked) => updateReportSettings({ autoGenerateReports: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveReportSettings} disabled={reportSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {reportSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup & Restore
              </CardTitle>
              <CardDescription>
                Pengaturan backup database dan restore sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Frekuensi Backup</Label>
                <Select value={systemSettings.backupFrequency} onValueChange={(value) => updateSystemSettings({ backupFrequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Backup Manual</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Buat backup database secara manual kapan saja dibutuhkan
                  </p>
                  <Button onClick={handleBackupNow}>
                    <Download className="mr-2 h-4 w-4" />
                    Backup Sekarang
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-2">Export/Import Konfigurasi</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Export atau import pengaturan aplikasi
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportConfig}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Config
                    </Button>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".json"
                        onChange={handleImportConfig}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Config
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Informasi Backup Terakhir</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Tanggal: 29 Juli 2024, 14:30 WIB</p>
                  <p>Ukuran: 156 MB</p>
                  <p>Status: Berhasil</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSystemSettings} disabled={systemSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {systemSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsView;