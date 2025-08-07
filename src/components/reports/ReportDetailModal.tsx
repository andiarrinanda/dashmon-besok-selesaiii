import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Link2,
  Hash,
  Target,
  Award
} from "lucide-react";
import { Report } from "@/hooks/useReports";
import { supabase } from "@/integrations/supabase/client";

interface ProcessedMediaItem {
  id: string;
  original_url: string;
  final_url?: string;
  media_type: string;
  content_hash?: string;
  is_valid: boolean;
  is_duplicate: boolean;
  validation_error?: string;
  metadata?: any;
}

interface ScoringDetail {
  id: string;
  media_type: string;
  target_count: number;
  actual_count: number;
  achievement_percentage: number;
  score_value: number;
  weight_percentage: number;
  weighted_score: number;
}

interface ReportDetailModalProps {
  report: Report | null;
  open: boolean;
  onClose: () => void;
  onApprove?: (reportId: string, notes?: string) => Promise<void>;
  onReject?: (reportId: string, reason: string) => Promise<void>;
  loading?: boolean;
}

const ReportDetailModal = ({ 
  report, 
  open, 
  onClose, 
  onApprove, 
  onReject, 
  loading: isProcessing = false
}: ReportDetailModalProps) => {
  const [processedItems, setProcessedItems] = useState<ProcessedMediaItem[]>([]);
  const [scoringDetails, setScoringDetails] = useState<ScoringDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (report && open) {
      fetchReportDetails();
    }
  }, [report, open]);

  const fetchReportDetails = async () => {
    if (!report) return;
    
    setLoading(true);
    try {
      // Fetch processed media items
      const { data: mediaItems, error: mediaError } = await supabase
        .from('processed_media_items')
        .select('*')
        .eq('report_id', report.id)
        .order('media_type, original_url');

      if (mediaError) {
        console.error('Error fetching media items:', mediaError);
      } else {
        setProcessedItems(mediaItems || []);
      }

      // Fetch scoring details
      const { data: scoring, error: scoringError } = await supabase
        .from('report_scoring_details')
        .select('*')
        .eq('report_id', report.id)
        .order('media_type');

      if (scoringError) {
        console.error('Error fetching scoring details:', scoringError);
      } else {
        setScoringDetails(scoring || []);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!report) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="mr-1 h-3 w-3" />Selesai</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Disetujui</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />Ditolak</Badge>;
      case 'system_rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Ditolak Sistem</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Menunggu Persetujuan</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><TrendingUp className="mr-1 h-3 w-3" />Diproses</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMediaTypeName = (type: string) => {
    const names: Record<string, string> = {
      'online_news': 'Media Online',
      'social_media': 'Media Sosial',
      'radio': 'Radio',
      'print_media': 'Media Cetak',
      'running_text': 'Running Text',
      'tv': 'Siaran TV'
    };
    return names[type] || type;
  };

  const handleApprove = async () => {
    if (onApprove && report) {
      await onApprove(report.id, "Approved via detail modal");
      onClose();
    }
  };

  const handleReject = async () => {
    if (onReject && report && rejectionReason.trim()) {
      await onReject(report.id, rejectionReason);
      onClose();
      setRejectionReason("");
    }
  };

  // Group processed items by media type
  const itemsByMediaType = processedItems.reduce((acc, item) => {
    if (!acc[item.media_type]) {
      acc[item.media_type] = [];
    }
    acc[item.media_type].push(item);
    return acc;
  }, {} as Record<string, ProcessedMediaItem[]>);

  // Calculate summary statistics
  const totalItems = processedItems.length;
  const validItems = processedItems.filter(item => item.is_valid && !item.is_duplicate).length;
  const duplicateItems = processedItems.filter(item => item.is_duplicate).length;
  const invalidItems = processedItems.filter(item => !item.is_valid).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detail Laporan: {report.fileName}
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap dan hasil pemrosesan laporan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan Laporan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pengirim</p>
                    <p className="font-medium">{report.submittedBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal Upload</p>
                    <p className="font-medium">{new Date(report.createdAt).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Indikator</p>
                    <p className="font-medium">{report.indicatorType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(report.status)}
                  </div>
                </div>
              </div>
              
              {report.calculatedScore !== undefined && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Award className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Skor Total</p>
                    <p className="text-2xl font-bold text-yellow-600">{report.calculatedScore.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Ringkasan</TabsTrigger>
              <TabsTrigger value="data">Data Terproses</TabsTrigger>
              <TabsTrigger value="scoring">Penilaian</TabsTrigger>
              <TabsTrigger value="raw">Data Mentah</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Statistik Pemrosesan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                      <div className="text-sm text-muted-foreground">Total Item</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{validItems}</div>
                      <div className="text-sm text-muted-foreground">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{duplicateItems}</div>
                      <div className="text-sm text-muted-foreground">Duplikat</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{invalidItems}</div>
                      <div className="text-sm text-muted-foreground">Invalid</div>
                    </div>
                  </div>

                  {/* Media Type Breakdown */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Breakdown per Jenis Media</h4>
                    <div className="space-y-2">
                      {Object.entries(itemsByMediaType).map(([mediaType, items]) => {
                        const validCount = items.filter(item => item.is_valid && !item.is_duplicate).length;
                        const totalCount = items.length;
                        const percentage = totalCount > 0 ? (validCount / totalCount) * 100 : 0;
                        
                        return (
                          <div key={mediaType} className="flex items-center justify-between">
                            <span className="text-sm">{getMediaTypeName(mediaType)}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {validCount}/{totalCount}
                              </span>
                              <Progress value={percentage} className="w-20" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              {Object.entries(itemsByMediaType).map(([mediaType, items]) => (
                <Card key={mediaType}>
                  <CardHeader>
                    <CardTitle className="text-lg">{getMediaTypeName(mediaType)}</CardTitle>
                    <CardDescription>
                      {items.filter(item => item.is_valid && !item.is_duplicate).length} valid dari {items.length} total item
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Validasi</TableHead>
                          <TableHead>Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={item.original_url}>
                                <Link2 className="inline h-3 w-3 mr-1" />
                                {item.original_url}
                              </div>
                              {item.final_url && item.final_url !== item.original_url && (
                                <div className="text-xs text-muted-foreground truncate" title={item.final_url}>
                                  → {item.final_url}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.is_valid ? (
                                <Badge variant="success" className="bg-green-100 text-green-800">
                                  <CheckCircle className="mr-1 h-3 w-3" />Valid
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="mr-1 h-3 w-3" />Invalid
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {item.is_duplicate && (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    <AlertTriangle className="mr-1 h-3 w-3" />Duplikat
                                  </Badge>
                                )}
                                {item.validation_error && (
                                  <div className="text-xs text-red-600">{item.validation_error}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.content_hash && (
                                <div className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  <span className="text-xs font-mono">
                                    {item.content_hash.substring(0, 8)}...
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="scoring" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Detail Penilaian</CardTitle>
                  <CardDescription>
                    Breakdown skor berdasarkan pencapaian target per jenis media
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scoringDetails.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jenis Media</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Aktual</TableHead>
                          <TableHead>Pencapaian</TableHead>
                          <TableHead>Skor</TableHead>
                          <TableHead>Bobot (%)</TableHead>
                          <TableHead>Skor Berbobot</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scoringDetails.map((detail) => (
                          <TableRow key={detail.id}>
                            <TableCell className="font-medium">
                              {getMediaTypeName(detail.media_type)}
                            </TableCell>
                            <TableCell>{detail.target_count.toLocaleString()}</TableCell>
                            <TableCell>{detail.actual_count.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={Math.min(detail.achievement_percentage, 100)} className="w-16" />
                                <span className="text-sm">
                                  {detail.achievement_percentage.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                detail.score_value >= 4 ? "border-green-500 text-green-700" :
                                detail.score_value >= 3 ? "border-yellow-500 text-yellow-700" :
                                "border-red-500 text-red-700"
                              }>
                                {detail.score_value}/5
                              </Badge>
                            </TableCell>
                            <TableCell>{detail.weight_percentage.toFixed(1)}%</TableCell>
                            <TableCell className="font-medium">
                              {detail.weighted_score.toFixed(3)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell colSpan={6}>Total Skor</TableCell>
                          <TableCell>
                            {scoringDetails.reduce((sum, detail) => sum + detail.weighted_score, 0).toFixed(3)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Belum ada data penilaian tersedia
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="raw" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Data Mentah</CardTitle>
                  <CardDescription>
                    Data asli dari file Excel yang diupload
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.rawData ? (
                    <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(report.rawData, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Data mentah tidak tersedia
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Admin Actions */}
                      {onApprove && onReject && report.status === 'pending_approval' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Tindakan Admin
                </CardTitle>
                <CardDescription>
                  Laporan ini memerlukan persetujuan admin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleApprove} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isProcessing}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Setujui
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || isProcessing}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Tolak
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alasan Penolakan (jika ditolak):</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                    rows={3}
                    placeholder="Masukkan alasan penolakan..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason Display */}
          {report.rejectionReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  Alasan Penolakan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{report.rejectionReason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDetailModal;