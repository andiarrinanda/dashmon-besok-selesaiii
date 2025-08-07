
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { useKPIDefinitions } from "@/hooks/useKPIDefinitions";
import ETLProcessor from "@/lib/etl-processor";
import * as XLSX from 'xlsx';
import { EXCEL_TEMPLATES, getTemplateByCode, validateExcelData, downloadTemplate, readExcelFile } from '@/lib/excel-templates';
import { createUploadNotification } from '@/hooks/useNotifications';

const UploadInterface = () => {
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [availableTemplates, setAvailableTemplates] = useState(EXCEL_TEMPLATES);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState<string>("");
  const { toast } = useToast();

  // Fetch KPI definitions from Supabase
  const { kpiDefinitions, loading: kpiLoading, error: kpiError } = useKPIDefinitions();

  // Create template data for different indicator types based on image 2 requirements
  const createExcelTemplate = (indicatorType: string, indicatorName: string) => {
    // Template structure based on the actual report format from image 2
    const templates: { [key: string]: any } = {
      'SKORING_PUBLIKASI_MEDIA': [
        ['Link Berita Media Online', 'Link Media Sosial', 'Monitoring Radio', 'Monitoring Media cetak', 'Monitoring Running Text', 'Monitoring Siaran TV'],
        ['https://pelayananpublik.id/2025/05/23/tingkatkan-layanan-internet-pln-icon-plus-sumbagut-komitmen-lakukan-perbaikan-dan-peningkatan-jaringan-fiber-optic/', 'https://www.instagram.com/p/DKSAWthwXZ/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', 'https://drive.google.com/file/d/1PzHzxRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link', 'https://drive.google.com/file/d/1Qz4F5xRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link', 'https://drive.google.com/file/d/1Rz6G7xRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link', 'https://drive.google.com/file/d/1Sz8H9xRbcUlR2Y67AkgRcnguJutmtZMar/view?usp=drive_link'],
        ['https://indiespost.id/2025/06/23/promosi-produk-ke-masyarakat-iconnet-bareng-con-terjun-ke-salon-pelanggan-bagi-bagi-hadiah/', 'https://www.instagram.com/p/DKgSmSthqvA/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', '', '', '', ''],
        ['https://www.realitynews.id/2025/05/tingkatkan-layanan-internet-pln-icon.html', 'https://www.instagram.com/p/DKZJKuBRJ7/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', '', '', '', '']
      ],
      'default': [
        ['Link Berita Media Online', 'Link Media Sosial', 'Monitoring Radio', 'Monitoring Media cetak', 'Monitoring Running Text', 'Monitoring Siaran TV'],
        ['https://example.com/news1', 'https://instagram.com/p/example1', 'https://drive.google.com/file/d/audio1', 'https://drive.google.com/file/d/print1', 'https://drive.google.com/file/d/runtext1', 'https://drive.google.com/file/d/tv1'],
        ['https://example.com/news2', 'https://instagram.com/p/example2', '', '', '', ''],
        ['https://example.com/news3', 'https://instagram.com/p/example3', '', '', '', '']
      ]
    };

    return templates[indicatorType] || templates['default'];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Format File Tidak Valid",
          description: "Silakan pilih file Excel (.xlsx atau .xls)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Terlalu Besar",
          description: "Ukuran file maksimal 10MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  // const handleDownloadTemplate = async (indicatorCode: string) => {
  //   try {
  //     const selectedKPI = kpiDefinitions.find(kpi => kpi.code === indicatorCode);
  //     if (!selectedKPI) {
  //       toast({
  //         title: "Error",
  //         description: "Indikator tidak ditemukan",
  //         variant: "destructive"
  //       });
  //       return;
  //     }

  //     // Create Excel-like CSV content
  //     const templateData = createExcelTemplate(indicatorCode, selectedKPI.name);
      
  //     // Convert to CSV format
  //     const csvContent = templateData
  //       .map(row => row.map((cell: any) => `"${cell}"`).join(','))
  //       .join('\n');

  //     // Create and download file
  //     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  //     const link = document.createElement('a');
  //     const url = URL.createObjectURL(blob);
      
  //     link.setAttribute('href', url);
  //     link.setAttribute('download', `Template_${selectedKPI.name.replace(/\s+/g, '_')}.csv`);
  //     link.style.visibility = 'hidden';
      
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
      
  //     URL.revokeObjectURL(url);

  //     toast({
  //       title: "Template Berhasil Diunduh",
  //       description: `Template untuk ${selectedKPI.name} telah diunduh sebagai file CSV. Anda dapat membukanya dengan Excel dan menyimpan sebagai .xlsx`,
  //     });
  //   } catch (error) {
  //     console.error('Error downloading template:', error);
  //     toast({
  //       title: "Error",
  //       description: "Gagal mengunduh template. Silakan coba lagi.",
  //       variant: "destructive"
  //     });
  //   }
  // };

  const handleTemplateDownload = async (templateCode: string) => {
    try {
      await downloadTemplate(templateCode);
      toast({
        title: "Template Downloaded",
        description: "Template Excel berhasil didownload",
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        title: "Error",
        description: "Gagal download template: " + (error instanceof Error ? error.message : 'Unknown error'),
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setProcessStatus("Menyiapkan upload...");
      setUploadProgress(0);

      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('File harus berformat Excel (.xlsx atau .xls)');
      }

      // Validate indicator selection
      if (!selectedIndicator) {
        throw new Error('Pilih indikator terlebih dahulu');
      }

      const template = getTemplateByCode(selectedIndicator);
      if (!template) {
        throw new Error('Template tidak ditemukan untuk indikator yang dipilih');
      }

      // Read Excel file
      const data = await readExcelFile(file);
      
      // Validate data against template
      const validation = validateExcelData(data, template);
      if (!validation.isValid) {
        throw new Error(`Validasi data gagal:\n${validation.errors.join('\n')}`);
      }

      // Get current user
      console.log('🔐 Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User tidak terautentikasi");
      }
      console.log('✅ User authenticated:', user.id);
      const userId = user.id;

      // Create notification for successful upload
      if (userId) {
        await createUploadNotification(userId, file.name, 'success');
      }

      // Continue with existing upload logic...
      const formData = new FormData();
      formData.append('file', file);
      formData.append('indicator', selectedIndicator);
      formData.append('user_id', userId);

      setProcessStatus("Mengunggah file...");
      setUploadProgress(25);

      // Read and process Excel file directly
      console.log('📊 Reading Excel file...');
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const excelData = XLSX.utils.sheet_to_json(worksheet);

      if (!excelData || excelData.length === 0) {
        throw new Error("File Excel kosong atau tidak valid");
      }

      console.log('📋 Excel data loaded:', {
        rows: excelData.length,
        columns: Object.keys(excelData[0] || {})
      });

      setProcessStatus("Menyimpan laporan...");
      setUploadProgress(50);

      // Create report record
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: userId,
          indicator_type: selectedIndicator,
          file_name: file.name,
          status: 'processing',
          raw_data: { 
            fileName: file.name, 
            fileSize: file.size,
            rowCount: excelData.length,
            columns: Object.keys(excelData[0] || {}),
            data: excelData
          }
        })
        .select()
        .single();

      if (reportError) {
        console.error('❌ Report creation error:', reportError);
        throw new Error('Gagal menyimpan laporan');
      }

      setProcessStatus("Memproses dan memvalidasi konten media...");
      setUploadProgress(75);

      // Process with ETL
      console.log('🔧 Starting ETL processing...');
      const etlResult = await ETLProcessor.processMediaMassaReport(reportData.id, excelData);
      
      if (!etlResult.success) {
        console.error('❌ ETL processing failed:', etlResult.error);
        throw new Error(etlResult.error || "Gagal memproses konten media");
      }

      console.log('✅ ETL processing completed:', etlResult.summary);

      setProcessStatus("Selesai!");
      setUploadProgress(100);

      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🎉 Upload and processing completed successfully!', {
        reportId: reportData.id,
        summary: etlResult.summary
      });

      toast({
        title: "Laporan Berhasil Diproses!",
        description: `Laporan berhasil diupload dan diproses. Ditemukan ${etlResult.summary.valid_items} item valid dari ${etlResult.summary.total_items} total item. Menunggu persetujuan admin.`,
      });

      // Reset form
      setSelectedFile(null);
      setSelectedIndicator('');
      setUploadProgress(0);
      setProcessStatus("");
      
    } catch (error: any) {
      console.error('💥 Upload error:', error);
      
      let errorMessage = "Terjadi kesalahan saat mengunggah file.";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Gagal",
        description: errorMessage,
        variant: "destructive"
      });
      
      setUploadProgress(0);
      setProcessStatus("");
    } finally {
      setIsUploading(false);
    }
  };

  // Show loading or error states
  if (kpiError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive">Error Memuat Data</h3>
            <p className="text-muted-foreground text-center">{kpiError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card className="border-desmon-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-desmon-secondary/10 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-desmon-secondary" />
            </div>
            Panduan Upload Laporan
          </CardTitle>
          <CardDescription>
            Ikuti langkah-langkah berikut untuk mengunggah laporan Excel Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-desmon-primary rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
            <div>
              <p className="font-medium">Pilih Jenis Indikator</p>
              <p className="text-sm text-muted-foreground">Tentukan kategori laporan yang akan Anda unggah</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-desmon-primary rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
            <div>
              <p className="font-medium">Unduh Template Excel</p>
              <p className="text-sm text-muted-foreground">Gunakan template yang sesuai dengan indikator yang dipilih</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-desmon-primary rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
            <div>
              <p className="font-medium">Isi Data & Upload</p>
              <p className="text-sm text-muted-foreground">Lengkapi template dengan data Anda dan unggah ke sistem</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Laporan Excel</CardTitle>
          <CardDescription>
            Unggah file laporan Excel sesuai dengan indikator yang dipilih
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="indicator">Pilih Indikator</Label>
              <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih indikator..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIndicator && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Template Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const template = getTemplateByCode(selectedIndicator);
                    return template ? (
                      <>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <div className="text-sm">
                          <strong>Kolom yang diperlukan:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {template.requiredColumns.map((col) => (
                              <li key={col}>{col}</li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateDownload(selectedIndicator)}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">File Excel</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="flex-1"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Format yang didukung: .xlsx, .xls (Maksimal 10MB)
            </p>
          </div>

          {/* Progress Indicator */}
          {isUploading && (
            <div className="space-y-3 p-4 bg-desmon-background/30 rounded-lg border border-desmon-secondary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress Upload</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              {processStatus && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-desmon-primary" />
                  <span className="text-sm text-muted-foreground">{processStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end">
            <Button 
              onClick={() => handleFileUpload(selectedFile!)}
              disabled={!selectedIndicator || !selectedFile || isUploading || kpiLoading}
              className="min-w-32"
              variant="hero"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim ke Antrian...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Unggah Laporan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadInterface;
