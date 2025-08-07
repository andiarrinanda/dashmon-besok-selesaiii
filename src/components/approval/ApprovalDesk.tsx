import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X, 
  Clock, 
  FileText, 
  Download,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createApprovalNotification } from '@/hooks/useNotifications';
import ReportDetailModal from '@/components/reports/ReportDetailModal';
import { Report } from '@/hooks/useReports';

const ApprovalDesk = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sbuFilter, setSbuFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch reports from Supabase
  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey(full_name, sbu_name)
        `)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReports: Report[] = (data || []).map(report => ({
        id: report.id,
        fileName: report.file_name,
        submittedBy: report.profiles?.full_name || 'Unknown',
        sbu: report.profiles?.sbu_name || 'Unknown',
        submittedAt: new Date(report.created_at).toLocaleDateString('id-ID'),
        status: report.status,
        indicatorType: report.indicator_type,
        rawData: report.raw_data,
        processedData: report.processed_data,
        calculatedScore: report.calculated_score,
        fileSize: report.raw_data?.fileSize ? `${Math.round(report.raw_data.fileSize / 1024)} KB` : 'Unknown',
        rejectionReason: report.rejection_reason,
        user_id: report.user_id,
        created_at: report.created_at,
        updated_at: report.updated_at,
        duplicate_count: report.duplicate_count,
        valid_links_count: report.valid_links_count,
        total_links_count: report.total_links_count,
        media_breakdown: report.media_breakdown,
        validation_results: report.validation_results
      }));

      setReports(formattedReports);
      setFilteredReports(formattedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data laporan",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtering logic
  useEffect(() => {
    let filtered = reports.filter(report => {
      // Search filter
      if (searchQuery && !report.fileName.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !report.submittedBy.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // SBU filter
      if (sbuFilter !== "all" && report.sbu !== sbuFilter) return false;
      
      return true;
    });
    
    setFilteredReports(filtered);
  }, [reports, searchQuery, sbuFilter]);

  const handleViewDetail = (report: Report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedReport(null);
    setIsDetailModalOpen(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(filteredReports.map(report => report.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedReports([...selectedReports, reportId]);
    } else {
      setSelectedReports(selectedReports.filter(id => id !== reportId));
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

    // For now, just show a simple confirmation
    if (action === 'approve') {
      handleBulkApprove();
    } else {
      handleBulkReject();
    }
  };

  const handleBulkApprove = async () => {
    setProcessingBulk(true);
    try {
      let successCount = 0;
      for (const reportId of selectedReports) {
        try {
          await handleApprove(reportId);
          successCount++;
        } catch (error) {
          console.error(`Failed to approve report ${reportId}:`, error);
        }
      }
      
      toast({
        title: "Bulk Approval Berhasil",
        description: `${successCount} laporan berhasil disetujui.`,
      });
      
      setSelectedReports([]);
    } catch (error) {
      console.error('Bulk approve error:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memproses bulk approval.",
        variant: "destructive"
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkReject = async () => {
    setProcessingBulk(true);
    try {
      let successCount = 0;
      for (const reportId of selectedReports) {
        try {
          await handleReject(reportId, "Bulk rejection");
          successCount++;
        } catch (error) {
          console.error(`Failed to reject report ${reportId}:`, error);
        }
      }
      
      toast({
        title: "Bulk Rejection Berhasil",
        description: `${successCount} laporan berhasil ditolak.`,
      });
      
      setSelectedReports([]);
    } catch (error) {
      console.error('Bulk reject error:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memproses bulk rejection.",
        variant: "destructive"
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleApprove = async (reportId: string, notes?: string) => {
    try {
      setProcessingBulk(true);
      
      // Get current user for notification
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update report status to approved
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          approval_notes: notes
        })
        .eq('id', reportId);

      if (error) throw error;

      // Get report details for notification
      const report = reports.find(r => r.id === reportId);
      if (report && report.user_id) {
        await createApprovalNotification(
          report.user_id,
          report.fileName,
          'approved'
        );
      }

      toast({
        title: "Laporan Disetujui",
        description: "Laporan berhasil disetujui dan notifikasi telah dikirim",
      });

      // Refresh data
      await fetchReports();
    } catch (error) {
      console.error('Error approving report:', error);
      toast({
        title: "Error",
        description: "Gagal menyetujui laporan",
        variant: "destructive"
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleReject = async (reportId: string, reason: string) => {
    try {
      setProcessingBulk(true);
      
      // Get current user for notification
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update report status to rejected
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user?.id,
          rejection_reason: reason
        })
        .eq('id', reportId);

      if (error) throw error;

      // Get report details for notification
      const report = reports.find(r => r.id === reportId);
      if (report && report.user_id) {
        await createApprovalNotification(
          report.user_id,
          report.fileName,
          'rejected',
          reason
        );
      }

      toast({
        title: "Laporan Ditolak",
        description: "Laporan berhasil ditolak dan notifikasi telah dikirim",
      });

      // Refresh data
      await fetchReports();
    } catch (error) {
      console.error('Error rejecting report:', error);
      toast({
        title: "Error",
        description: "Gagal menolak laporan",
        variant: "destructive"
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  const sbuOptions = ["SBU Jawa Barat", "SBU Jawa Tengah", "SBU Jawa Timur", "SBU DKI Jakarta"];
  const indicatorTypes = ["Media Sosial", "Digital Marketing", "Website"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Laporan</h1>
          <p className="text-muted-foreground">Tinjau dan setujui laporan yang masuk</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            toast({
              title: "Export Data",
              description: "Data laporan sedang diekspor ke Excel.",
            });
          }}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {selectedReports.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBulkAction('approve')} 
                disabled={processingBulk}
              >
                <Check className="mr-1 h-4 w-4" />
                Setujui ({selectedReports.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleBulkAction('reject')} 
                disabled={processingBulk}
              >
                <X className="mr-1 h-4 w-4" />
                Tolak ({selectedReports.length})
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchReports} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan nama file atau pembuat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={sbuFilter} onValueChange={setSbuFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pilih SBU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua SBU</SelectItem>
                {sbuOptions.map(sbu => (
                  <SelectItem key={sbu} value={sbu}>{sbu}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={indicatorFilter} onValueChange={setIndicatorFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Jenis Indikator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Indikator</SelectItem>
                {indicatorTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              toast({
                title: "Filter Aktif",
                description: "Filter laporan telah diterapkan.",
              });
            }}>
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Reports List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Laporan Menunggu Approval</CardTitle>
              <CardDescription>
                {isLoading ? 'Memuat...' : `${filteredReports.length} laporan memerlukan persetujuan`}
              </CardDescription>
            </div>
            {filteredReports.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={filteredReports.length > 0 && selectedReports.length === filteredReports.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Pilih Semua ({filteredReports.length})
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
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
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
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const isSelected = selectedReports.includes(report.id);
                
                return (
                  <div key={report.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectReport(report.id, checked as boolean)}
                      />
                      
                      <div className="space-y-1">
                        <p className="font-medium">{report.fileName}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {report.submittedBy}
                          </div>
                          <div className="flex items-center gap-1">
                            <span>•</span>
                            <span>{report.sbu}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {report.submittedAt}
                          </div>
                          <div className="flex items-center gap-1">
                            <span>•</span>
                            <span>{report.indicatorType}</span>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="mr-1 h-3 w-3" />
                          Menunggu Approval
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetail(report)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Review
                      </Button>
                      
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleApprove(report.id)}
                        disabled={processingBulk}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Setujui
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleReject(report.id, "Ditolak melalui quick action")}
                        disabled={processingBulk}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredReports.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Tidak ada laporan pending</h3>
                  <p className="text-muted-foreground">Semua laporan telah diproses</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Buttons */}
      {selectedReports.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="px-3 py-1">
                  {selectedReports.length} laporan dipilih
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReports([])}
                >
                  Batalkan Pilihan
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                  disabled={processingBulk}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {processingBulk ? 'Memproses...' : `Setujui Semua (${selectedReports.length})`}
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('reject')}
                  disabled={processingBulk}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  {processingBulk ? 'Memproses...' : `Tolak Semua (${selectedReports.length})`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        open={isDetailModalOpen}
        onClose={handleCloseDetail}
        onApprove={async (reportId: string, notes?: string) => {
          await handleApprove(reportId, notes);
          handleCloseDetail();
        }}
        onReject={async (reportId: string, reason: string) => {
          await handleReject(reportId, reason);
          handleCloseDetail();
        }}
      />
    </div>
  );
};

export default ApprovalDesk;