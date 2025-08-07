import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Database, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setupSystem } from "@/lib/cleanup-dummy-data";

const SystemSetup = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { toast } = useToast();

  const handleSetup = async () => {
    setIsRunning(true);
    try {
      const result = await setupSystem();
      
      if (result.success) {
        setSetupComplete(true);
        toast({
          title: "Setup Berhasil",
          description: "Sistem ETL dan KPI telah berhasil diinisialisasi",
        });
      } else {
        throw new Error(result.error || 'Setup failed');
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        title: "Setup Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat setup",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Sistem ETL
          </CardTitle>
          <CardDescription>
            Inisialisasi sistem ETL untuk pemrosesan laporan media massa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Setup ini akan membersihkan data dummy dan menginisialisasi sistem KPI baru untuk pemrosesan laporan media massa dengan validasi link, deteksi duplikasi, dan kalkulasi skor otomatis.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Pembersihan Data Dummy</h4>
                <p className="text-sm text-muted-foreground">Menghapus laporan test dan data tidak valid</p>
              </div>
              {setupComplete ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Selesai
                </Badge>
              ) : (
                <Badge variant="outline">Menunggu</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Inisialisasi KPI Media Massa</h4>
                <p className="text-sm text-muted-foreground">Setup indikator dan range penilaian</p>
              </div>
              {setupComplete ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Selesai
                </Badge>
              ) : (
                <Badge variant="outline">Menunggu</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Konfigurasi ETL Processor</h4>
                <p className="text-sm text-muted-foreground">Setup validasi link dan deteksi duplikasi</p>
              </div>
              {setupComplete ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Selesai
                </Badge>
              ) : (
                <Badge variant="outline">Menunggu</Badge>
              )}
            </div>
          </div>

          {!setupComplete && (
            <Button 
              onClick={handleSetup} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menjalankan Setup...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Jalankan Setup Sistem
                </>
              )}
            </Button>
          )}

          {setupComplete && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Setup berhasil!</strong> Sistem ETL telah siap digunakan. User SBU dapat mulai mengupload laporan dengan format Excel baru yang akan diproses secara otomatis.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fitur Baru yang Tersedia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">✅ Upload & ETL</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Validasi link otomatis (HTTP status check)</li>
                <li>• Deteksi duplikasi berdasarkan URL dan konten</li>
                <li>• Support Google Drive files</li>
                <li>• Processing 6 jenis media massa</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-blue-700">📊 Scoring & Approval</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Kalkulasi skor otomatis berdasarkan target</li>
                <li>• Range penilaian 1-5 poin</li>
                <li>• Detail breakdown per media type</li>
                <li>• Approval workflow untuk admin</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSetup;