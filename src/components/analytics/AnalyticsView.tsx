/**
 * Enhanced Analytics View with Period-based Filtering and Advanced Visualizations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  Calendar,
  Target,
  Award,
  Activity
} from 'lucide-react';
import { 
  useAnalyticsMetrics, 
  useLeaderboard, 
  useTrendData, 
  useCompositionData,
  usePerformanceComparison,
  type AnalyticsFilter 
} from '@/hooks/useAnalytics';
import { useReports, type ReportPeriod } from '@/hooks/useReports';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsViewProps {
  userRole: 'admin' | 'sbu';
  userId?: string;
}

const AnalyticsView = ({ userRole, userId }: AnalyticsViewProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<AnalyticsFilter>({});
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableSBUs, setAvailableSBUs] = useState<string[]>([]);

  // Enhanced analytics hooks with filters
  const { metrics, loading: metricsLoading, error: metricsError } = useAnalyticsMetrics(userRole, userId, filters);
  const { leaderboard, loading: leaderboardLoading, error: leaderboardError } = useLeaderboard(filters);
  const { trendData, loading: trendLoading, error: trendError } = useTrendData(userRole, userId, filters);
  const { compositionData, loading: compositionLoading, error: compositionError } = useCompositionData(userRole, userId, filters);
  const { performanceData, loading: performanceLoading, error: performanceError } = usePerformanceComparison(filters);

  // Get available filter options
  const { getAvailableYears, getAvailableSBUs } = useReports(userRole, userId);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      const years = await getAvailableYears();
      const sbus = await getAvailableSBUs();
      setAvailableYears(years);
      setAvailableSBUs(sbus);
    };

    fetchFilterOptions();
  }, [getAvailableYears, getAvailableSBUs]);

  const handleFilterChange = (key: keyof AnalyticsFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'approved': '#10B981',
      'completed': '#059669',
      'pending_approval': '#F59E0B',
      'processing': '#3B82F6',
      'rejected': '#EF4444',
      'failed': '#DC2626'
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  };

  const getKPIColor = (kpi: string) => {
    const colors = {
      'PUBLIKASI_SIARAN_PERS': '#3B82F6',
      'PRODUKSI_KONTEN_MEDSOS': '#10B981',
      'SKORING_PUBLIKASI_MEDIA': '#F59E0B',
      'KAMPANYE_KOMUNIKASI': '#EF4444',
      'OFI_TO_AFI': '#8B5CF6'
    };
    return colors[kpi as keyof typeof colors] || '#6B7280';
  };

  if (metricsLoading || leaderboardLoading || trendLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            {filters.periodName ? `Data for ${filters.periodName}` : 'Real-time analytics and insights'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Period Type</label>
              <Select value={filters.periodType} onValueChange={(value) => handleFilterChange('periodType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Year</label>
              <Select value={filters.year?.toString()} onValueChange={(value) => handleFilterChange('year', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Month</label>
              <Select value={filters.month?.toString()} onValueChange={(value) => handleFilterChange('month', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(12)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2024, i).toLocaleDateString('id-ID', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Semester</label>
              <Select value={filters.semester?.toString()} onValueChange={(value) => handleFilterChange('semester', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground">
              {filters.periodName ? `in ${filters.periodName}` : 'all time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.approvalRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalReports || 0} reports processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.averageScore?.toFixed(1) || 0}</div>
            <p className="text-xs text-muted-foreground">
              out of 100 points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SBUs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeSBU || 0}</div>
            <p className="text-xs text-muted-foreground">
              actively reporting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="composition">Composition</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Report Trends</CardTitle>
                <CardDescription>Monthly report submission trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="total_laporan" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="approved" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="rejected" stackId="1" stroke="#ffc658" fill="#ffc658" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Leaderboard Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>SBU leaderboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((item, index) => (
                    <div key={item.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={index < 3 ? "default" : "secondary"} className="w-6 h-6 p-0 flex items-center justify-center">
                          {item.rank}
                        </Badge>
                        <span className="font-medium">{item.sbu}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{item.score.toFixed(1)}</div>
                        <div className={`text-xs ${item.improvement && item.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Line Chart for Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Report Volume Trends</CardTitle>
                <CardDescription>Report submission over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total_laporan" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="approved" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="rejected" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Score Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Average Score Trends</CardTitle>
                <CardDescription>Performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="averageScore" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SBU Leaderboard</CardTitle>
              <CardDescription>Performance ranking by SBU</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((item, index) => (
                  <div key={item.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 h-8 p-0 flex items-center justify-center">
                        {item.rank}
                      </Badge>
                      <div>
                        <div className="font-semibold">{item.sbu}</div>
                        <div className="text-sm text-muted-foreground">
                          Period: {item.periodName || 'Current'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{item.score.toFixed(1)}</div>
                      <div className={`text-sm ${item.improvement && item.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change} from previous period
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>KPI Performance</CardTitle>
              <CardDescription>Target vs Achievement comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="indicator" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="target" fill="#8884d8" name="Target" />
                  <Bar dataKey="achievement" fill="#82ca9d" name="Achievement" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Composition Tab */}
        <TabsContent value="composition" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>KPI Distribution</CardTitle>
                <CardDescription>Report composition by KPI type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={compositionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>KPI Performance</CardTitle>
                <CardDescription>Achievement percentages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={compositionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsView;