import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import DashboardStats from "./dashboard/DashboardStats";
import RecentActivity from "./dashboard/RecentActivity";
import UploadInterface from "./upload/UploadInterface";
import AnalyticsView from "./analytics/AnalyticsView";
import KPIManagement from "./kpi/KPIManagement";
import UserManagement from "./user/UserManagement";
import SettingsView from "./settings/SettingsView";
import ReportsManagement from "./reports/ReportsManagement";
import ApprovalDesk from "./approval/ApprovalDesk";
import NotificationCenter from "./notifications/NotificationCenter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Clock, FileText, Filter, Upload, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

interface MainAppProps {
  userRole: 'admin' | 'sbu';
  userName: string;
  currentSBU?: string;
  onSignOut?: () => void;
}

const MainApp = ({ userRole = 'admin', userName = 'Admin Central', currentSBU, onSignOut }: MainAppProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get notification count from Supabase
  const { unreadCount } = useNotifications(userId || undefined);

  // Get current user ID from Supabase auth
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };

    getCurrentUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = () => {
    console.log("Sign out clicked");
    if (onSignOut) {
      onSignOut();
    }
    // Navigate to auth page
    navigate('/', { replace: true });
  };
  
  // Get current route from URL path
  const getCurrentRoute = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/approval')) return 'approval';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/kpi')) return 'kpi';
    if (path.includes('/users')) return 'users';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/notifications')) return 'notifications';
    return 'dashboard';
  };

  const handleRouteChange = (route: string) => {
    const basePath = userRole === 'admin' ? '/admin' : '/sbu';
    navigate(`${basePath}/${route}`);
  };

  const handleNotificationClick = () => {
    const basePath = userRole === 'admin' ? '/admin' : '/sbu';
    navigate(`${basePath}/notifications`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole={userRole}
        userName={userName}
        notificationCount={unreadCount}
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSignOut={handleSignOut}
        onNotificationClick={handleNotificationClick}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar 
          userRole={userRole}
          activeRoute={getCurrentRoute()}
          onRouteChange={handleRouteChange}
          isCollapsed={sidebarCollapsed}
        />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardView userRole={userRole} userId={userId} />} />
              <Route path="/upload" element={<UploadInterface />} />
              <Route path="/reports" element={<ReportsManagement userRole={userRole} currentSBU={currentSBU} userId={userId || undefined} />} />
              <Route path="/analytics" element={<AnalyticsView userRole={userRole} currentSBU={currentSBU} userId={userId || undefined} />} />
              <Route path="/notifications" element={<NotificationCenter userRole={userRole} />} />
              
              {/* SBU specific routes */}
              {userRole === 'sbu' && (
                <>
                  {/* SBU can access settings too */}
                  <Route path="/settings" element={<SettingsView />} />
                </>
              )}
              
              {/* Admin only routes */}
              {userRole === 'admin' && (
                <>
                  <Route path="/approval" element={<ApprovalDesk />} />
                  <Route path="/kpi" element={<KPIManagement />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/settings" element={<SettingsView />} />
                </>
              )}
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

// Dashboard View Component
const DashboardView = ({ userRole, userId }: { userRole: 'admin' | 'sbu'; userId: string | null }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleQuickAction = (action: string) => {
    const basePath = userRole === 'admin' ? '/admin' : '/sbu';
    
    switch (action) {
      case 'upload':
        navigate(`${basePath}/upload`);
        break;
      case 'reports':
        navigate(`${basePath}/reports`);
        break;
      case 'approval':
        navigate(`${basePath}/approval`);
        break;
      case 'analytics':
        navigate(`${basePath}/analytics`);
        break;
      default:
        toast({
          title: "Fitur Tersedia",
          description: "Fungsi ini akan segera tersedia.",
        });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {userRole === 'admin' 
            ? 'Selamat datang di panel admin DASHMON+, Admin Ganteng!😋' 
            : 'Selamat datang di portal pelaporan DASHMON+'
          }
        </p>
      </div>
      
      <DashboardStats userRole={userRole} userId={userId || undefined} />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity userRole={userRole} userId={userId || undefined} />
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Aksi cepat yang sering digunakan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userRole === 'sbu' ? (
              <>
                <Button 
                  variant="hero" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('upload')}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Laporan Baru
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('reports')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Lihat Status Laporan
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('analytics')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Lihat Analytics
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="hero" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('approval')}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Review Laporan Menunggu Approval
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('reports')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Kelola Laporan
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleQuickAction('analytics')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Lihat Analytics
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Removed mock components as they're now in separate files




export default MainApp;