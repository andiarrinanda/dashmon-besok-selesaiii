import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Plus, Edit, Trash2, Target, Calculator, Percent, Save, X, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KPIDefinition {
  id: string;
  name: string;
  code: string;
  description?: string;
  target_value: number;
  monthly_target?: number;
  semester_target?: number;
  weight_percentage: number;
  unit?: string;
  calculation_type: 'count' | 'sum' | 'percentage';
  scoring_period?: 'monthly' | 'semester';
  is_active: boolean;
}

interface ScoringRange {
  id: string;
  kpi_id: string;
  min_percentage: number;
  max_percentage: number;
  score_value: number;
}

const KPIManagement = () => {
  const [kpis, setKpis] = useState<KPIDefinition[]>([]);
  const [scoringRanges, setScoringRanges] = useState<ScoringRange[]>([]);
  const [selectedKPI, setSelectedKPI] = useState<KPIDefinition | null>(null);
  const [selectedKPIForRanges, setSelectedKPIForRanges] = useState<KPIDefinition | null>(null);
  const [editingRanges, setEditingRanges] = useState<ScoringRange[]>([]);
  const [isAddKPIOpen, setIsAddKPIOpen] = useState(false);
  const [isEditKPIOpen, setIsEditKPIOpen] = useState(false);
  const [isEditRangesOpen, setIsEditRangesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingRanges, setSavingRanges] = useState(false);
  const { toast } = useToast();

  const [newKPI, setNewKPI] = useState({
    name: '',
    code: '',
    description: '',
    target_value: 0,
    monthly_target: 0,
    semester_target: 0,
    weight_percentage: 0,
    unit: '',
    calculation_type: 'count' as 'count' | 'sum' | 'percentage',
    scoring_period: 'semester' as 'monthly' | 'semester'
  });

  useEffect(() => {
    fetchKPIs();
    fetchScoringRanges();
  }, []);

  const fetchKPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_definitions')
        .select('*')
        .order('name');

      if (error) throw error;
      setKpis((data || []) as KPIDefinition[]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data KPI",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchScoringRanges = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_scoring_ranges')
        .select('*')
        .order('kpi_id, min_percentage');

      if (error) throw error;
      setScoringRanges(data || []);
    } catch (error) {
      console.error('Error fetching scoring ranges:', error);
    }
  };

  const handleEditRanges = (kpi: KPIDefinition) => {
    setSelectedKPIForRanges(kpi);
    const kpiRanges = scoringRanges.filter(range => range.kpi_id === kpi.id);
    
    // If no ranges exist, create default ranges based on scoring period
    if (kpiRanges.length === 0) {
      if (kpi.scoring_period === 'semester') {
        // Use semester-based weight ranges for new semester KPIs
        setEditingRanges([
          { id: 'temp-1', kpi_id: kpi.id, min_percentage: 0, max_percentage: 25, score_value: 1 },
          { id: 'temp-2', kpi_id: kpi.id, min_percentage: 25, max_percentage: 50, score_value: 2 },
          { id: 'temp-3', kpi_id: kpi.id, min_percentage: 50, max_percentage: 75, score_value: 3 },
          { id: 'temp-4', kpi_id: kpi.id, min_percentage: 75, max_percentage: 100, score_value: 4 }
        ]);
      } else {
        // Standard monthly ranges
        setEditingRanges([
          { id: 'temp-1', kpi_id: kpi.id, min_percentage: 0, max_percentage: 25, score_value: 1 },
          { id: 'temp-2', kpi_id: kpi.id, min_percentage: 26, max_percentage: 50, score_value: 2 },
          { id: 'temp-3', kpi_id: kpi.id, min_percentage: 51, max_percentage: 75, score_value: 3 },
          { id: 'temp-4', kpi_id: kpi.id, min_percentage: 76, max_percentage: 100, score_value: 4 },
          { id: 'temp-5', kpi_id: kpi.id, min_percentage: 101, max_percentage: 999, score_value: 5 }
        ]);
      }
    } else {
      setEditingRanges([...kpiRanges]);
    }
    
    setIsEditRangesOpen(true);
  };

  const handleAddRange = () => {
    const newRange: ScoringRange = {
      id: `temp-${Date.now()}`,
      kpi_id: selectedKPIForRanges?.id || '',
      min_percentage: 0,
      max_percentage: 100,
      score_value: 1
    };
    setEditingRanges([...editingRanges, newRange]);
  };

  const handleUpdateRange = (index: number, field: keyof ScoringRange, value: number) => {
    const updatedRanges = [...editingRanges];
    updatedRanges[index] = { ...updatedRanges[index], [field]: value };
    setEditingRanges(updatedRanges);
  };

  const handleDeleteRange = (index: number) => {
    const updatedRanges = editingRanges.filter((_, i) => i !== index);
    setEditingRanges(updatedRanges);
  };

  const validateRanges = (ranges: ScoringRange[]): string | null => {
    if (ranges.length === 0) {
      return "Minimal harus ada satu rentang scoring";
    }

    // Sort ranges by min_percentage
    const sortedRanges = [...ranges].sort((a, b) => a.min_percentage - b.min_percentage);

    for (let i = 0; i < sortedRanges.length; i++) {
      const range = sortedRanges[i];
      
      // Check if min is less than max
      if (range.min_percentage >= range.max_percentage) {
        return `Rentang ${i + 1}: Nilai minimum harus lebih kecil dari nilai maksimum`;
      }

      // Check for overlaps with next range
      if (i < sortedRanges.length - 1) {
        const nextRange = sortedRanges[i + 1];
        if (range.max_percentage >= nextRange.min_percentage) {
          return `Rentang ${i + 1} dan ${i + 2}: Rentang tidak boleh tumpang tindih`;
        }
      }

      // Check for valid score values
      if (range.score_value < 1 || range.score_value > 5) {
        return `Rentang ${i + 1}: Nilai skor harus antara 1-5`;
      }
    }

    return null;
  };

  const handleSaveRanges = async () => {
    if (!selectedKPIForRanges) return;

    // Validate ranges
    const validationError = validateRanges(editingRanges);
    if (validationError) {
      toast({
        title: "Validasi Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setSavingRanges(true);
    
    try {
      // First, delete existing ranges for this KPI
      const { error: deleteError } = await supabase
        .from('kpi_scoring_ranges')
        .delete()
        .eq('kpi_id', selectedKPIForRanges.id);

      if (deleteError) throw deleteError;

      // Then insert new ranges
      const rangesToInsert = editingRanges.map(range => ({
        kpi_id: selectedKPIForRanges.id,
        min_percentage: range.min_percentage,
        max_percentage: range.max_percentage,
        score_value: range.score_value
      }));

      const { error: insertError } = await supabase
        .from('kpi_scoring_ranges')
        .insert(rangesToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Berhasil",
        description: "Rentang scoring berhasil diperbarui",
      });

      // Refresh data
      await fetchScoringRanges();
      setIsEditRangesOpen(false);
      setEditingRanges([]);
      setSelectedKPIForRanges(null);

    } catch (error: any) {
      console.error('Error saving ranges:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan rentang scoring",
        variant: "destructive"
      });
    } finally {
      setSavingRanges(false);
    }
  };

  const handleAddKPI = async () => {
    try {
      // Validate that total weights don't exceed 100%
      const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight_percentage, 0) + newKPI.weight_percentage;
      if (totalWeight > 100) {
        toast({
          title: "Error",
          description: `Total bobot KPI akan melebihi 100% (${totalWeight}%). Silakan sesuaikan bobot.`,
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('kpi_definitions')
        .insert([{
          ...newKPI,
          target_value: newKPI.scoring_period === 'semester' ? newKPI.semester_target : newKPI.monthly_target
        }]);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "KPI baru berhasil ditambahkan",
      });

      setNewKPI({
        name: '',
        code: '',
        description: '',
        target_value: 0,
        monthly_target: 0,
        semester_target: 0,
        weight_percentage: 0,
        unit: '',
        calculation_type: 'count',
        scoring_period: 'semester'
      });
      
      setIsAddKPIOpen(false);
      fetchKPIs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan KPI",
        variant: "destructive",
      });
    }
  };

  const handleUpdateKPI = async () => {
    if (!selectedKPI) return;

    try {
      const { error } = await supabase
        .from('kpi_definitions')
        .update({
          name: selectedKPI.name,
          description: selectedKPI.description,
          target_value: selectedKPI.scoring_period === 'semester' ? selectedKPI.semester_target : selectedKPI.monthly_target,
          monthly_target: selectedKPI.monthly_target,
          semester_target: selectedKPI.semester_target,
          weight_percentage: selectedKPI.weight_percentage,
          unit: selectedKPI.unit,
          calculation_type: selectedKPI.calculation_type,
          scoring_period: selectedKPI.scoring_period
        })
        .eq('id', selectedKPI.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "KPI berhasil diperbarui",
      });

      setIsEditKPIOpen(false);
      fetchKPIs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui KPI",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKPI = async (id: string) => {
    try {
      // First delete associated scoring ranges
      await supabase
        .from('kpi_scoring_ranges')
        .delete()
        .eq('kpi_id', id);

      // Then delete the KPI
      const { error } = await supabase
        .from('kpi_definitions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "KPI berhasil dihapus",
      });

      fetchKPIs();
      fetchScoringRanges();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus KPI",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen KPI</h1>
          <p className="text-muted-foreground">
            Kelola definisi KPI dan aturan scoring sistem (berbasis semester)
          </p>
        </div>
        
        <Dialog open={isAddKPIOpen} onOpenChange={setIsAddKPIOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah KPI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah KPI Baru</DialogTitle>
              <DialogDescription>
                Buat definisi KPI baru untuk sistem penilaian berbasis semester
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama KPI</Label>
                <Input
                  id="name"
                  value={newKPI.name}
                  onChange={(e) => setNewKPI({...newKPI, name: e.target.value})}
                  placeholder="Contoh: Publikasi Media Sosial"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Kode KPI</Label>
                <Input
                  id="code"
                  value={newKPI.code}
                  onChange={(e) => setNewKPI({...newKPI, code: e.target.value})}
                  placeholder="Contoh: PUBLIKASI_MEDSOS"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={newKPI.description}
                  onChange={(e) => setNewKPI({...newKPI, description: e.target.value})}
                  placeholder="Deskripsi detail tentang KPI ini..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scoring_period">Periode Penilaian</Label>
                <Select 
                  value={newKPI.scoring_period} 
                  onValueChange={(value: any) => setNewKPI({...newKPI, scoring_period: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semester">Semester (6 bulan)</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_target">Target Bulanan</Label>
                  <Input
                    id="monthly_target"
                    type="number"
                    value={newKPI.monthly_target}
                    onChange={(e) => setNewKPI({...newKPI, monthly_target: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="semester_target">Target Semester</Label>
                  <Input
                    id="semester_target"
                    type="number"
                    value={newKPI.semester_target}
                    onChange={(e) => setNewKPI({...newKPI, semester_target: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Bobot (%)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    max="100"
                    value={newKPI.weight_percentage}
                    onChange={(e) => setNewKPI({...newKPI, weight_percentage: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit">Satuan</Label>
                  <Input
                    id="unit"
                    value={newKPI.unit}
                    onChange={(e) => setNewKPI({...newKPI, unit: e.target.value})}
                    placeholder="posts, artikel, dll"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="calculation">Tipe Kalkulasi</Label>
                <Select 
                  value={newKPI.calculation_type} 
                  onValueChange={(value: any) => setNewKPI({...newKPI, calculation_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Hitung (Count)</SelectItem>
                    <SelectItem value="sum">Jumlah (Sum)</SelectItem>
                    <SelectItem value="percentage">Persentase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddKPIOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddKPI}>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="definitions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="definitions">Definisi KPI</TabsTrigger>
          <TabsTrigger value="scoring">Aturan Scoring</TabsTrigger>
        </TabsList>

        {/* KPI Definitions Tab */}
        <TabsContent value="definitions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Daftar KPI
              </CardTitle>
              <CardDescription>
                Kelola definisi dan konfigurasi Key Performance Indicators (Berbasis Semester)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpis.map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{kpi.name}</h3>
                        <Badge variant={kpi.is_active ? "default" : "secondary"}>
                          {kpi.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {kpi.scoring_period === 'semester' ? (
                            <><Calendar className="w-3 h-3 mr-1" />Semester</>
                          ) : (
                            <><TrendingUp className="w-3 h-3 mr-1" />Bulanan</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {kpi.description || 'Tidak ada deskripsi'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {kpi.monthly_target && (
                          <span>Target Bulanan: {kpi.monthly_target.toLocaleString()} {kpi.unit}</span>
                        )}
                        {kpi.semester_target && (
                          <span>Target Semester: {kpi.semester_target.toLocaleString()} {kpi.unit}</span>
                        )}
                        <span>Bobot: {kpi.weight_percentage}%</span>
                        <span>Tipe: {kpi.calculation_type}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedKPI(kpi);
                          setIsEditKPIOpen(true);
                        }}
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="mr-2 h-3 w-3" />
                            Hapus
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus KPI "{kpi.name}"? 
                              Tindakan ini akan menghapus semua aturan scoring terkait dan tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteKPI(kpi.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                
                {kpis.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada KPI yang didefinisikan</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Rules Tab */}
        <TabsContent value="scoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Aturan Scoring
              </CardTitle>
              <CardDescription>
                Konfigurasi rentang pencapaian dan nilai skor untuk setiap KPI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {kpis.map((kpi) => {
                const ranges = scoringRanges.filter(range => range.kpi_id === kpi.id);
                const displayTarget = kpi.scoring_period === 'semester' ? kpi.semester_target : kpi.target_value;
                
                return (
                  <div key={kpi.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{kpi.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Target {kpi.scoring_period === 'semester' ? 'Semester' : 'Bulanan'}: {displayTarget?.toLocaleString()} {kpi.unit} | Bobot: {kpi.weight_percentage}%
                        </p>
                        {kpi.scoring_period === 'semester' && kpi.monthly_target && (
                          <p className="text-xs text-muted-foreground">
                            Target Bulanan: {kpi.monthly_target.toLocaleString()} {kpi.unit}
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditRanges(kpi)}
                      >
                        <Settings className="mr-2 h-3 w-3" />
                        Edit Rentang
                      </Button>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rentang Pencapaian</TableHead>
                          <TableHead>Nilai Skor/Bobot</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranges.map((range) => (
                          <TableRow key={range.id}>
                            <TableCell>
                              {range.min_percentage}% - {range.max_percentage > 100 ? '≥100%' : `${range.max_percentage}%`}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{range.score_value}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {ranges.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">
                              Belum ada aturan scoring
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit KPI Dialog */}
      <Dialog open={isEditKPIOpen} onOpenChange={setIsEditKPIOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit KPI</DialogTitle>
            <DialogDescription>
              Perbarui konfigurasi KPI yang dipilih
            </DialogDescription>
          </DialogHeader>
          
          {selectedKPI && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nama KPI</Label>
                <Input
                  id="edit-name"
                  value={selectedKPI.name}
                  onChange={(e) => setSelectedKPI({...selectedKPI, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Deskripsi</Label>
                <Textarea
                  id="edit-description"
                  value={selectedKPI.description || ''}
                  onChange={(e) => setSelectedKPI({...selectedKPI, description: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-scoring_period">Periode Penilaian</Label>
                <Select 
                  value={selectedKPI.scoring_period} 
                  onValueChange={(value: any) => setSelectedKPI({...selectedKPI, scoring_period: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semester">Semester (6 bulan)</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-monthly_target">Target Bulanan</Label>
                  <Input
                    id="edit-monthly_target"
                    type="number"
                    value={selectedKPI.monthly_target || 0}
                    onChange={(e) => setSelectedKPI({...selectedKPI, monthly_target: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-semester_target">Target Semester</Label>
                  <Input
                    id="edit-semester_target"
                    type="number"
                    value={selectedKPI.semester_target || 0}
                    onChange={(e) => setSelectedKPI({...selectedKPI, semester_target: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Bobot (%)</Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    min="0"
                    max="100"
                    value={selectedKPI.weight_percentage}
                    onChange={(e) => setSelectedKPI({...selectedKPI, weight_percentage: Number(e.target.value)})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-unit">Satuan</Label>
                  <Input
                    id="edit-unit"
                    value={selectedKPI.unit || ''}
                    onChange={(e) => setSelectedKPI({...selectedKPI, unit: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-calculation">Tipe Kalkulasi</Label>
                <Select 
                  value={selectedKPI.calculation_type} 
                  onValueChange={(value: any) => setSelectedKPI({...selectedKPI, calculation_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Hitung (Count)</SelectItem>
                    <SelectItem value="sum">Jumlah (Sum)</SelectItem>
                    <SelectItem value="percentage">Persentase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditKPIOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateKPI}>
              <Save className="mr-2 h-4 w-4" />
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Ranges Dialog */}
      <Dialog open={isEditRangesOpen} onOpenChange={setIsEditRangesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Rentang Scoring</DialogTitle>
            <DialogDescription>
              Atur rentang pencapaian dan nilai skor untuk KPI: {selectedKPIForRanges?.name}
              {selectedKPIForRanges?.scoring_period === 'semester' && (
                <span className="block text-sm text-blue-600 mt-1">
                  ⓘ KPI berbasis semester - nilai skor akan digunakan sebagai bobot final
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {editingRanges.map((range, index) => (
              <div key={range.id} className="flex items-center gap-2 p-3 border rounded-lg">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Min %</Label>
                    <Input
                      type="number"
                      value={range.min_percentage}
                      onChange={(e) => handleUpdateRange(index, 'min_percentage', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max %</Label>
                    <Input
                      type="number"
                      value={range.max_percentage}
                      onChange={(e) => handleUpdateRange(index, 'max_percentage', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {selectedKPIForRanges?.scoring_period === 'semester' ? 'Bobot' : 'Skor'}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedKPIForRanges?.scoring_period === 'semester' ? "50" : "5"}
                      value={range.score_value}
                      onChange={(e) => handleUpdateRange(index, 'score_value', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteRange(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={handleAddRange}
              className="w-full"
              disabled={editingRanges.length >= 10}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Rentang
            </Button>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditRangesOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveRanges} disabled={savingRanges}>
              <Save className="mr-2 h-4 w-4" />
              {savingRanges ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KPIManagement;