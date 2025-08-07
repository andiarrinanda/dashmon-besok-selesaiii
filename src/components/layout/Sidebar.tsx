import { 
  BarChart3, 
  Upload, 
  CheckSquare, 
  Settings, 
  FileText,
  TrendingUp,
  Users,
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole: 'admin' | 'sbu';
  activeRoute: string;
  onRouteChange: (route: string) => void;
  isCollapsed?: boolean;
}

const Sidebar = ({ userRole, activeRoute, onRouteChange, isCollapsed = false }: SidebarProps) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      roles: ['admin', 'sbu']
    },
    {
      id: 'upload',
      label: 'Unggah Laporan',
      icon: Upload,
      roles: ['sbu']
    },
    {
      id: 'approval',
      label: 'Approval Laporan',
      icon: CheckSquare,
      roles: ['admin']
    },
    {
      id: 'reports',
      label: 'Manajemen Laporan',
      icon: FileText,
      roles: ['admin', 'sbu']
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      roles: ['admin', 'sbu']
    },
    {
      id: 'kpi',
      label: 'Manajemen KPI',
      icon: PieChart,
      roles: ['admin']
    },
    {
      id: 'users',
      label: 'Manajemen User',
      icon: Users,
      roles: ['admin']
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: Settings,
      roles: ['admin', 'sbu']
    }
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className={cn(
      "bg-card border-r transition-all duration-300 h-full",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                isActive && "bg-desmon-secondary/10 text-desmon-primary border-r-2 border-desmon-secondary",
                isCollapsed && "px-3"
              )}
              onClick={() => onRouteChange(item.id)}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-desmon-secondary")} />
              {!isCollapsed && (
                <span className={cn("transition-opacity", isActive && "font-medium")}>
                  {item.label}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;