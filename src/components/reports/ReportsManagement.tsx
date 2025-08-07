import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit,
  Trash2,
  Calendar,
  FileText,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  RefreshCw,
  Settings,
  Check,
  X,
  Activity
} from "lucide-react";
import ReportDetailModal from "./ReportDetailModal";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useReports, useReportActions, Report, ReportFilter } from "@/hooks/useReports";
import { supabase } from "@/integrations/supabase/client";
import { exportReport, generateReportFileName, formatReportData } from '@/lib/report-export';
import { createApprovalNotification } from '@/hooks/useNotifications';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ReportsManagementProps {
  userRole: 'admin' | 'sbu';
  currentSBU?: string;
  userId?: string;
}

const ReportsManagement = ({ userRole, currentSBU, userId: propUserId }: ReportsManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [indicatorFilter, setIndicatorFilter] = useState("all");
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [indicatorTypes, setIndicatorTypes] = useState<string[]>([]);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [processingBulk, setProcessingBulk] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableSBUs, setAvailableSBUs] = useState<string[]>([]);
  const [availableIndicatorTypes, setAvailableIndicatorTypes] = useState<string[]>([]);

  // Get current user ID
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);
  
  const { 
    reports, 
    loading, 
    error, 
    totalCount,
    periods,
    getAvailableYears,
    getAvailableSBUs,
    getAvailableIndicatorTypes,
    canModifyReport,
    refetch 
  } = useReports(userRole, userId || undefined, filters);

  const { approveReport, rejectReport, loading: actionLoading } = useReportActions();

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const years = await getAvailableYears();
      const sbus = await getAvailableSBUs();
      const types = await getAvailableIndicatorTypes();
      setAvailableYears(years);
      setAvailableSBUs(sbus);
      setAvailableIndicatorTypes(types);
    };

    fetchFilterOptions();
  }, [getAvailableYears, getAvailableSBUs, getAvailableIndicatorTypes]);

  const handleFilterChange = (key: keyof ReportFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(r => r.id));
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedReports.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu laporan untuk diproses.",
        variant: "destructive"
      });
      return;
    }

    setBulkAction(action);
    setBulkActionModalOpen(true);
    setBulkNotes("");
    setBulkReason("");
  };

  const handleExecuteBulkAction = async () => {
    if (!bulkAction || selectedReports.length === 0 || !userId) return;

    if (bulkAction === 'reject' && !bulkReason.trim()) {
      toast({
        title: "Error",
        description: "Alasan penolakan harus diisi.",
        variant: "destructive"
      });
      return;
    }

    setProcessingBulk(true);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const reportId of selectedReports) {
        try {
          let result;
          if (bulkAction === 'approve') {
            result = await approveReport(reportId, userId, bulkNotes || undefined);
          } else {
            result = await rejectReport(reportId, userId, bulkReason);
          }

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`Report ${reportId}: ${result.error}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`Report ${reportId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Show results
      if (successCount > 0) {
        toast({
          title: "Bulk Action Berhasil",
          description: `${successCount} laporan berhasil ${bulkAction === 'approve' ? 'disetujui' : 'ditolak'}.${errorCount > 0 ? ` ${errorCount} laporan gagal diproses.` : ''}`,
        });
      }

      if (errorCount > 0) {
        console.error('Bulk action errors:', errors);
        toast({
          title: "Beberapa Laporan Gagal Diproses",
          description: `${errorCount} laporan gagal diproses. Periksa console untuk detail.`,
          variant: "destructive"
        });
      }

      // Reset state and refresh data
      setSelectedReports([]);
      setBulkActionModalOpen(false);
      setBulkAction(null);
      setBulkNotes("");
      setBulkReason("");
      refetch();

    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memproses bulk action.",
        variant: "destructive"
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleViewDetail = (report: Report) => {
    setSelectedReport(report);
    setDetailModalOpen(true);
  };

  const handleGenerateReport = () => {
    toast({
      title: "Generate Report",
      description: "Laporan sedang dibuat. Anda akan menerima notifikasi setelah selesai.",
    });
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedReport(null);
  };

  const handleApproveReport = async (reportId: string, notes?: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User tidak teridentifikasi. Silakan login ulang.",
        variant: "destructive"
      });
      return;
    }

    const result = await approveReport(reportId, userId, notes);
    
    if (result.success) {
      toast({
        title: "Laporan Disetujui",
        description: `Laporan telah disetujui${notes ? ' dengan catatan' : ''}.`,
      });
      refetch(); // Refresh data
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menyetujui laporan.",
        variant: "destructive"
      });
    }
  };

  const handleRejectReport = async (reportId: string, reason: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User tidak teridentifikasi. Silakan login ulang.",
        variant: "destructive"
      });
      return;
    }

    const result = await rejectReport(reportId, userId, reason);
    
    if (result.success) {
      toast({
        title: "Laporan Ditolak",
        description: "Laporan telah ditolak dengan alasan yang diberikan.",
      });
      refetch(); // Refresh data
    } else {
      toast({
        title: "Error",
        description: result.error || "Gagal menolak laporan.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadReport = async (report: Report) => {
    if (!report.filePath) {
      toast({
        title: "Error",
        description: "File tidak tersedia untuk diunduh.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(report.filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Berhasil",
        description: `File ${report.fileName} berhasil diunduh.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Gagal mengunduh file.",
        variant: "destructive"
      });
    }
  };

  const handleUploadNew = () => {
    const basePath = userRole === 'admin' ? '/admin' : '/sbu';
    navigate(`${basePath}/upload`);
  };

  const handleExportReports = () => {
    toast({
      title: "Export Data",
      description: "Data laporan sedang diekspor ke Excel.",
    });
  };

  const handleRefreshData = () => {
    refetch();
    toast({
      title: "Data Diperbarui",
      description: "Data laporan telah diperbarui dari database.",
    });
  };

  const handleExportReport = async (report: any, format: 'pdf' | 'excel' | 'csv') => {
    try {
      const reportData = {
        title: `Laporan ${report.indicator_type}`,
        period: new Date(report.created_at).toLocaleDateString('id-ID'),
        generatedAt: new Date().toLocaleString('id-ID'),
        data: formatReportData([report]),
        summary: {
          'Total Reports': 1,
          'Status': report.status,
          'Submitted By': report.submitted_by,
          'Submitted At': new Date(report.created_at).toLocaleString('id-ID')
        }
      };

      const options = {
        format,
        includeSummary: true,
        fileName: generateReportFileName(`report-${report.indicator_type}`, format)
      };

      await exportReport(reportData.data, options, reportData);
      
      toast({
        title: "Export Berhasil",
        description: `Laporan berhasil diexport ke format ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Gagal",
        description: error instanceof Error ? error.message : 'Gagal export laporan',
        variant: "destructive"
      });
    }
  };

  const handleBulkExport = async (reports: any[], format: 'pdf' | 'excel' | 'csv') => {
    try {
      const reportData = {
        title: `Bulk Report Export - ${reports.length} Reports`,
        period: `${new Date(Math.min(...reports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString('id-ID')} - ${new Date(Math.max(...reports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString('id-ID')}`,
        generatedAt: new Date().toLocaleString('id-ID'),
        data: formatReportData(reports),
        summary: {
          'Total Reports': reports.length,
          'Status Distribution': reports.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {} as any),
          'Indicators': [...new Set(reports.map(r => r.indicator_type))]
        }
      };

      const options = {
        format,
        includeSummary: true,
        fileName: generateReportFileName(`bulk-reports-${reports.length}`, format)
      };

      await exportReport(reportData.data, options, reportData);
      
      toast({
        title: "Bulk Export Berhasil",
        description: `${reports.length} laporan berhasil diexport ke format ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Bulk export error:', error);
      toast({
        title: "Bulk Export Gagal",
        description: error instanceof Error ? error.message : 'Gagal export laporan',
        variant: "destructive"
      });
    }
  };

  const { toast } = useToast();
  const navigate = useNavigate();

  // Use propUserId if provided, otherwise get from auth
  // const userId = propUserId || null; // This line is now handled by the useEffect hook

  // Fetch data using hooks
  // const { reports, loading, error, refetch } = useReports(userRole, userId || undefined, currentSBU); // This line is now handled by the useReports hook
  // const { approveReport, rejectReport, loading: actionLoading } = useReportActions(); // This line is now handled by the useReportActions hook

  // Get unique indicator types from reports
  useEffect(() => {
    const types = Array.from(new Set(reports.map(report => report.indicatorType).filter(Boolean)));
    setIndicatorTypes(types);
  }, [reports]);

  // Filter reports based on search and filters
  const filteredReports = reports.filter(report => {
    // Apply search filter
    if (searchTerm && !report.fileName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !report.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    // Apply status filter
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    
    // Apply indicator type filter
    if (indicatorFilter !== "all" && report.indicatorType !== indicatorFilter) return false;
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="mr-1 h-3 w-3" />Selesai</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Disetujui Admin</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />Ditolak Admin</Badge>;
      case 'system_rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ditolak Sistem</Badge>;
      case 'pending':
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><TrendingUp className="mr-1 h-3 w-3" />Diproses</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Gagal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'approved': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'pending_approval': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-purple-100 text-purple-800',
      'rejected': 'bg-red-100 text-red-800',
      'failed': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Activity className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 mb-4 opacity-50 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Error Memuat Data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {userRole === 'admin' ? 'Manajemen Laporan' : 'Laporan Saya'}
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'admin' 
              ? 'Kelola dan review semua laporan yang masuk' 
              : `Laporan yang telah disubmit${currentSBU ? ` oleh ${currentSBU}` : ''}`
            }
          </p>
        </div>
        <div className="flex gap-2">
          {userRole === 'sbu' && (
            <Button variant="hero" onClick={handleUploadNew}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Laporan Baru
            </Button>
          )}
          <Button variant="outline" onClick={handleExportReports}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {userRole === 'admin' && selectedReports.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkActionModalOpen(true)}
                disabled={selectedReports.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Bulk Approve ({selectedReports.length})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkActionModalOpen(true)}
                disabled={selectedReports.length === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Bulk Reject ({selectedReports.length})
              </Button>
              
              {/* Bulk Export Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={selectedReports.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Bulk Export ({selectedReports.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkExport(selectedReports, 'excel')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkExport(selectedReports, 'csv')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export to CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkExport(selectedReports, 'pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari laporan atau pengirim..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                  <SelectItem value="system_rejected">Ditolak Sistem</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={indicatorFilter} onValueChange={setIndicatorFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipe Indikator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Indikator</SelectItem>
                  {indicatorTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Selection Controls */}
            {userRole === 'admin' && filteredReports.some(r => r.status === 'pending_approval') && (
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all"
                    checked={selectedReports.length > 0 && selectedReports.length === filteredReports.filter(r => r.status === 'pending_approval').length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Pilih Semua Pending ({filteredReports.filter(r => r.status === 'pending_approval').length})
                  </Label>
                </div>
                {selectedReports.length > 0 && (
                  <Badge variant="secondary">{selectedReports.length} dipilih</Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                  <div className="w-20 h-6 bg-muted animate-pulse rounded" />
                  <div className="w-24 h-8 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Tidak ada laporan yang ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const canSelect = userRole === 'admin' && report.status === 'pending_approval';
                const isSelected = selectedReports.includes(report.id);
                
                return (
                  <div key={report.id} className={`flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : ''}`}>
                    {canSelect && (
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectReport(report.id)}
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{report.fileName}</h3>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {report.submittedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {report.submittedAt}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {report.indicatorType}
                              </span>
                            </div>
                            {report.calculatedScore !== null && (
                              <div className="flex items-center gap-1 text-blue-600 font-medium">
                                <TrendingUp className="h-3 w-3" />
                                Skor: {report.calculatedScore}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(report.status)}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExportReport(report, 'excel')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Export to Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportReport(report, 'csv')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Export to CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportReport(report, 'pdf')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Export to PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Modal */}
      <Dialog open={bulkActionModalOpen} onOpenChange={setBulkActionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'approve' ? 'Setujui Laporan' : 'Tolak Laporan'}
            </DialogTitle>
            <DialogDescription>
              Anda akan {bulkAction === 'approve' ? 'menyetujui' : 'menolak'} {selectedReports.length} laporan.
              {bulkAction === 'reject' && ' Alasan penolakan harus diisi.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {bulkAction === 'approve' ? (
              <div className="space-y-2">
                <Label htmlFor="bulk-notes">Catatan (Opsional)</Label>
                <Textarea
                  id="bulk-notes"
                  placeholder="Tambahkan catatan untuk persetujuan..."
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="bulk-reason">Alasan Penolakan *</Label>
                <Textarea
                  id="bulk-reason"
                  placeholder="Berikan alasan mengapa laporan ditolak..."
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setBulkActionModalOpen(false)} disabled={processingBulk}>
              Batal
            </Button>
            <Button 
              onClick={handleExecuteBulkAction} 
              disabled={processingBulk || (bulkAction === 'reject' && !bulkReason.trim())}
              variant={bulkAction === 'approve' ? 'default' : 'destructive'}
            >
              {processingBulk ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  {bulkAction === 'approve' ? <Check className="mr-2 h-4 w-4" /> : <X className="mr-2 h-4 w-4" />}
                  {bulkAction === 'approve' ? 'Setujui' : 'Tolak'} ({selectedReports.length})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        onApprove={userRole === 'admin' ? handleApproveReport : undefined}
        onReject={userRole === 'admin' ? handleRejectReport : undefined}
        loading={actionLoading}
      />
    </div>
  );
};

export default ReportsManagement;