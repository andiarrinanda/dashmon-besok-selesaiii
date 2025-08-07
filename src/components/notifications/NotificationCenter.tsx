/**
 * Enhanced Notification Center for DASHMON
 * Features: Categories, Priority Levels, Read/Unread Status, Actions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Check, 
  X, 
  Trash2, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Filter,
  Download,
  Upload,
  FileText,
  Settings,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useNotifications, useNotificationPreferences, type Notification } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NotificationCenter = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications(userId || undefined);
  const { preferences, updatePreferences } = useNotificationPreferences(userId || undefined);
  const { toast } = useToast();

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const getNotificationIcon = (type: Notification['type'], category: Notification['category']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: Notification['category']) => {
    switch (category) {
      case 'upload':
        return <Upload className="h-3 w-3" />;
      case 'approval':
        return <Check className="h-3 w-3" />;
      case 'rejection':
        return <X className="h-3 w-3" />;
      case 'kpi':
        return <BarChart3 className="h-3 w-3" />;
      case 'report':
        return <FileText className="h-3 w-3" />;
      case 'deadline':
        return <Calendar className="h-3 w-3" />;
      case 'system':
      default:
        return <Settings className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: Notification['category']) => {
    switch (category) {
      case 'upload':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approval':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejection':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'kpi':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'report':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'deadline':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'system':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    // Filter by tab
    if (activeTab !== 'all' && notification.category !== activeTab) {
      return false;
    }
    
    // Filter by priority
    if (filterPriority !== 'all' && notification.priority !== filterPriority) {
      return false;
    }
    
    // Filter by preferences
    if (!preferences[notification.category as keyof typeof preferences]) {
      return false;
    }
    
    if (!preferences.priority_levels[notification.priority as keyof typeof preferences.priority_levels]) {
      return false;
    }
    
    return true;
  });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      toast({
        title: "Notification marked as read",
        description: "Notification has been marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      toast({
        title: "Notification deleted",
        description: "Notification has been deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      toast({
        title: "All notifications cleared",
        description: "All notifications have been cleared",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear all notifications",
        variant: "destructive"
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('id-ID');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading notifications: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Center</h1>
          <p className="text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="upload">Upload ({notifications.filter(n => n.category === 'upload').length})</TabsTrigger>
            <TabsTrigger value="approval">Approval ({notifications.filter(n => n.category === 'approval').length})</TabsTrigger>
            <TabsTrigger value="rejection">Rejection ({notifications.filter(n => n.category === 'rejection').length})</TabsTrigger>
            <TabsTrigger value="kpi">KPI ({notifications.filter(n => n.category === 'kpi').length})</TabsTrigger>
            <TabsTrigger value="system">System ({notifications.filter(n => n.category === 'system').length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2" />
                <p>No notifications found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={cn(
                "transition-all duration-200 hover:shadow-md",
                !notification.is_read && "border-l-4 border-l-blue-500 bg-blue-50/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-medium text-sm",
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPriorityColor(notification.priority))}
                        >
                          {notification.priority}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getCategoryColor(notification.category))}
                        >
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(notification.category)}
                            {notification.category}
                          </div>
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {notification.action_url && (
                          <Button variant="link" size="sm" className="h-auto p-0">
                            {notification.action_text || 'View'}
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNotification(notification.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;