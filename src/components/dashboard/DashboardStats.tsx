import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle, Clock, XCircle, TrendingUp, Users } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
}

const StatsCard = ({ title, value, description, icon, trend, loading }: StatsCardProps) => (
  <Card className="hover:shadow-desmon-hover transition-all duration-200 cursor-pointer hover:scale-105">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-desmon-secondary">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">
        {loading ? (
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        ) : (
          value
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{description}</span>
        {trend && !loading && (
          <div className={`flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`h-3 w-3 ${!trend.isPositive && 'rotate-180'}`} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

interface DashboardStatsProps {
  userRole: 'admin' | 'sbu';
  userId?: string;
}

const DashboardStats = ({ userRole, userId }: DashboardStatsProps) => {
  const { stats, loading, error } = useDashboardStats(userRole, userId);

  if (error) {
    console.error('Dashboard stats error:', error);
    // Fallback to empty stats on error
  }

  const adminStats = [
    {
      title: "Total Laporan",
      value: stats?.totalReports || 0,
      description: "Laporan bulan ini",
      icon: <FileText className="h-4 w-4" />,
      trend: { value: 12, isPositive: true }
    },
    {
      title: "Menunggu Approval",
      value: stats?.pendingApproval || 0,
      description: "Menunggu persetujuan admin",
      icon: <Clock className="h-4 w-4" />,
      trend: { value: 8, isPositive: false }
    },
    {
      title: "Selesai Diproses",
      value: stats?.processed || 0,
      description: "Laporan dengan skor final",
      icon: <CheckCircle className="h-4 w-4" />,
      trend: { value: 15, isPositive: true }
    },
    {
      title: "Ditolak",
      value: stats?.rejected || 0,
      description: "Ditolak admin/sistem",
      icon: <XCircle className="h-4 w-4" />,
      trend: { value: 5, isPositive: false }
    },
    {
      title: "SBU Aktif",
      value: stats?.activeSBUs || 0,
      description: "Unit bisnis terdaftar",
      icon: <Users className="h-4 w-4" />
    },
    {
      title: "Skor Rata-rata",
      value: stats?.averageScore || 0,
      description: "Performa nasional",
      icon: <TrendingUp className="h-4 w-4" />,
      trend: { value: 3, isPositive: true }
    }
  ];

  const sbuStats = [
    {
      title: "Laporan Saya",
      value: stats?.myReports || 0,
      description: "Total laporan yang dikirim",
      icon: <FileText className="h-4 w-4" />,
      trend: { value: 20, isPositive: true }
    },
    {
      title: "Disetujui",
      value: stats?.approved || 0,
      description: "Laporan valid",
      icon: <CheckCircle className="h-4 w-4" />,
      trend: { value: 18, isPositive: true }
    },
    {
      title: "Dalam Proses",
      value: stats?.inProcess || 0,
      description: "Sedang divalidasi",
      icon: <Clock className="h-4 w-4" />
    },
    {
      title: "Skor KPI",
      value: stats?.kpiScore || 0,
      description: "Peringkat nasional",
      icon: <TrendingUp className="h-4 w-4" />,
      trend: { value: 5, isPositive: true }
    }
  ];

  const displayStats = userRole === 'admin' ? adminStats : sbuStats;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {displayStats.map((stat, index) => (
        <StatsCard key={index} {...stat} loading={loading} />
      ))}
    </div>
  );
};

export default DashboardStats;