import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, Building2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'admin' | 'sbu'>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Login Berhasil",
      description: `Selamat datang di DASHMON+, ${userRole === 'admin' ? 'Admin Central' : 'SBU Jawa Barat'}!`,
    });
    
    // Navigate to appropriate dashboard
    const targetPath = userRole === 'admin' ? '/admin/dashboard' : '/sbu/dashboard';
    navigate(targetPath);
    
    setIsLoading(false);
  };

  // Show login page
  return (
    <div className="min-h-screen bg-gradient-to-br from-desmon-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-desmon-primary to-desmon-secondary rounded-2xl flex items-center justify-center shadow-desmon-card">
            <span className="text-2xl font-bold text-white">D+</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">DASHMON+</h1>
            <p className="text-muted-foreground">Dashboard for Enhancing Heartfelt Social and Communication Outreach from icoN+</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-desmon-card border-desmon-neutral/30">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Masuk ke Sistem</CardTitle>
            <CardDescription className="text-center">
              Masukkan kredensial Anda untuk mengakses DASHMON+
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Jenis Akun</Label>
                <Select value={userRole} onValueChange={(value: 'admin' | 'sbu') => setUserRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-desmon-primary" />
                        <span>Admin Pusat</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sbu">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-desmon-secondary" />
                        <span>User SBU</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username Anda"
                  required
                  className="focus:ring-desmon-primary focus:border-desmon-primary"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password Anda"
                  required
                  className="focus:ring-desmon-primary focus:border-desmon-primary"
                />
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full" 
                variant="hero"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Masuk
                  </>
                )}
              </Button>
            </form>

            {/* Demo Info */}
            <div className="mt-6 p-4 bg-desmon-background/50 rounded-lg border border-desmon-secondary/20">
              <p className="text-sm text-center text-muted-foreground mb-2">
                <strong>Demo Mode:</strong> Pilih jenis akun untuk melihat tampilan yang berbeda
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <Shield className="h-4 w-4 mx-auto mb-1 text-desmon-primary" />
                  <p className="font-medium">Admin Pusat</p>
                  <p className="text-muted-foreground">Full access control</p>
                </div>
                <div className="text-center">
                  <Building2 className="h-4 w-4 mx-auto mb-1 text-desmon-secondary" />
                  <p className="font-medium">User SBU</p>
                  <p className="text-muted-foreground">Report & dashboard</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          © 2025 DASHMON+.
        </p>
      </div>
    </div>
  );
};

export default Index;
