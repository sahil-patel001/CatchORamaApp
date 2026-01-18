import React, { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Package,
  ShoppingCart,
  Settings,
  CreditCard,
  ExternalLink,
  Filter,
  SortAsc,
  SortDesc,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from "@/types";
import {
  notificationService,
  NotificationQuery,
  NotificationResponse,
} from "@/services/notificationService";
import { useNotifications } from "@/contexts/NotificationContext";

// Icon mapping for different notification types
const getNotificationIcon = (type: NotificationType) => {
  const iconMap = {
    low_stock: Package,
    new_order: ShoppingCart,
    order_status_update: ShoppingCart,
    product_approved: Package,
    product_rejected: Package,
    commission_payment: CreditCard,
    system_maintenance: Settings,
    account_update: Settings,
    cubic_volume_alert: AlertCircle,
    general: Bell,
  };

  return iconMap[type] || Bell;
};

// Priority color mapping
const getPriorityColor = (priority: NotificationPriority = "medium") => {
  const colorMap = {
    low: "text-gray-500",
    medium: "text-blue-500",
    high: "text-orange-500",
    urgent: "text-red-500",
  };

  return colorMap[priority];
};

// Priority badge variant mapping
const getPriorityBadgeVariant = (priority: NotificationPriority = "medium") => {
  const variantMap = {
    low: "secondary" as const,
    medium: "default" as const,
    high: "outline" as const,
    urgent: "destructive" as const,
  };

  return variantMap[priority];
};

// Category color mapping
const getCategoryColor = (category: NotificationCategory) => {
  const colorMap = {
    product:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    order: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    system:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    account:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    commission:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  };

  return colorMap[category] || colorMap.system;
};

type SortOption = "createdAt" | "updatedAt" | "title" | "priority" | "type";
type SortOrder = "asc" | "desc";

interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  sortBy: SortOption;
  sortOrder: SortOrder;
}

export function NotificationManagement() {
  const { toast } = useToast();
  const { setHasViewedNotifications } = useNotifications();

  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<NotificationFilters>({
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
  });

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    notification: Notification | null;
  }>({
    open: false,
    notification: null,
  });

  // Load notifications with pagination
  const loadNotifications = useCallback(
    async (pageNum: number = 1, reset: boolean = false) => {
      try {
        if (pageNum === 1) {
          setInitialLoading(true);
        } else {
          setLoading(true);
        }

        const query: NotificationQuery = {
          page: pageNum,
          limit: 20,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        // Add optional filters
        if (filters.isRead !== undefined) {
          query.isRead = filters.isRead;
        }
        if (filters.type) {
          query.type = filters.type;
        }
        if (filters.priority) {
          query.priority = filters.priority;
        }
        if (filters.category) {
          query.category = filters.category;
        }

        const response: NotificationResponse =
          await notificationService.getNotifications(query);

        if (reset || pageNum === 1) {
          setNotifications(response.notifications);
        } else {
          setNotifications((prev) => [...prev, ...response.notifications]);
        }

        setHasMore(response.hasMore);
        setStats({
          total: response.total,
          unread: response.notifications.filter((n) => !n.isRead).length,
        });
        setError(null);
      } catch (err) {
        console.error("Failed to load notifications:", err);
        setError("Failed to load notifications. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [filters, toast]
  );

  // Initial load and filter changes
  useEffect(() => {
    setPage(1);
    loadNotifications(1, true);
  }, [filters, loadNotifications]);

  // Mark notifications as viewed when page is visited
  useEffect(() => {
    setHasViewedNotifications(true);
  }, [setHasViewedNotifications]);

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadNotifications(nextPage, false);
    }
  }, [loading, hasMore, page, loadNotifications]);

  // Scroll event handler for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        handleLoadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleLoadMore]);

  // Mark notification as read
  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      await notificationService.markAsRead(notification._id);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, isRead: true } : n
        )
      );
      setStats((prev) => ({ ...prev, unread: prev.unread - 1 }));
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setStats((prev) => ({ ...prev, unread: 0 }));
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = (notification: Notification) => {
    setDeleteDialog({
      open: true,
      notification,
    });
  };

  // Delete notification (after confirmation)
  const handleDeleteNotification = async () => {
    const notification = deleteDialog.notification;
    if (!notification) return;

    try {
      await notificationService.deleteNotification(notification._id);
      setNotifications((prev) =>
        prev.filter((n) => n._id !== notification._id)
      );
      setStats((prev) => ({
        total: prev.total - 1,
        unread: notification.isRead ? prev.unread : prev.unread - 1,
      }));
      setDeleteDialog({ open: false, notification: null });
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  // Mark notification as unread
  const handleMarkAsUnread = async (notification: Notification) => {
    if (!notification.isRead) return;

    try {
      await notificationService.markAsUnread(notification._id);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, isRead: false } : n
        )
      );
      setStats((prev) => ({ ...prev, unread: prev.unread + 1 }));
      toast({
        title: "Success",
        description: "Notification marked as unread",
      });
    } catch (error) {
      console.error("Failed to mark notification as unread:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as unread",
        variant: "destructive",
      });
    }
  };

  // Handle notification click (only for unread notifications)
  const handleNotificationClick = async (notification: Notification) => {
    // Only handle click if notification is unread
    if (!notification.isRead) {
      await handleMarkAsRead(notification);
    }
  };

  // Format notification time
  const formatNotificationTime = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  // Update filters
  const updateFilter = useCallback(
    <K extends keyof NotificationFilters>(
      key: K,
      value: NotificationFilters[K]
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Clear filters
  const clearFilters = () => {
    setFilters({
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay updated
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {stats.unread > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read ({stats.unread})
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.unread}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Sorting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Read Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={
                  filters.isRead === undefined
                    ? "all"
                    : filters.isRead
                    ? "read"
                    : "unread"
                }
                onValueChange={(value) =>
                  updateFilter(
                    "isRead",
                    value === "all" ? undefined : value === "read"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All notifications" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All notifications</SelectItem>
                  <SelectItem value="unread">Unread only</SelectItem>
                  <SelectItem value="read">Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  updateFilter("type", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="new_order">New Order</SelectItem>
                  <SelectItem value="order_status_update">
                    Order Update
                  </SelectItem>
                  <SelectItem value="product_approved">
                    Product Approved
                  </SelectItem>
                  <SelectItem value="product_rejected">
                    Product Rejected
                  </SelectItem>
                  <SelectItem value="commission_payment">Commission</SelectItem>
                  <SelectItem value="system_maintenance">System</SelectItem>
                  <SelectItem value="account_update">Account</SelectItem>
                  <SelectItem value="cubic_volume_alert">
                    Volume Alert
                  </SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) =>
                  updateFilter("priority", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sort by</label>
              <div className="flex space-x-2">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    updateFilter("sortBy", value as SortOption)
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created At</SelectItem>
                    <SelectItem value="updatedAt">Updated At</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    updateFilter(
                      "sortOrder",
                      filters.sortOrder === "asc" ? "desc" : "asc"
                    )
                  }
                >
                  {filters.sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {initialLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-5 w-5 rounded-full mt-1" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          // Error state
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Notifications
              </h3>
              <p className="text-muted-foreground text-center mb-4">{error}</p>
              <Button onClick={() => loadNotifications(1, true)}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Notifications Found
              </h3>
              <p className="text-muted-foreground text-center">
                {Object.keys(filters).some(
                  (key) =>
                    key !== "sortBy" &&
                    key !== "sortOrder" &&
                    filters[key as keyof NotificationFilters] !== undefined
                )
                  ? "No notifications match your current filters."
                  : "You don't have any notifications yet."}
              </p>
              {Object.keys(filters).some(
                (key) =>
                  key !== "sortBy" &&
                  key !== "sortOrder" &&
                  filters[key as keyof NotificationFilters] !== undefined
              ) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          // Notifications list
          <>
            {notifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              const priorityColor = getPriorityColor(notification.priority);
              const categoryColor = getCategoryColor(
                notification.category || "system"
              );

              return (
                <Card
                  key={notification._id}
                  className={cn(
                    "transition-colors",
                    !notification.isRead && [
                      "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10",
                      "cursor-pointer hover:bg-accent/50 hover:border-l-blue-600 hover:shadow-sm",
                    ],
                    notification.isRead && "cursor-default"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className={cn("mt-1", priorityColor)}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3
                              className={cn(
                                "font-medium leading-tight",
                                !notification.isRead && "font-semibold"
                              )}
                            >
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Click to mark as read
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.isRead && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="sr-only">Open menu</span>
                                  <div className="h-1 w-1 bg-current rounded-full" />
                                  <div className="h-1 w-1 bg-current rounded-full" />
                                  <div className="h-1 w-1 bg-current rounded-full" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {!notification.isRead ? (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notification);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsUnread(notification);
                                    }}
                                  >
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Mark as unread
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showDeleteConfirmation(notification);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                            </div>

                            {notification.category && (
                              <Badge
                                className={cn(
                                  "text-xs px-2 py-0",
                                  categoryColor
                                )}
                              >
                                {notification.category}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {notification.priority &&
                              notification.priority !== "medium" && (
                                <Badge
                                  variant={getPriorityBadgeVariant(
                                    notification.priority
                                  )}
                                  className="text-xs px-2 py-0"
                                >
                                  {notification.priority}
                                </Badge>
                              )}

                            {notification.actionUrl && (
                              <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Load More Button / Loading Indicator */}
            {loading && (
              <div className="flex justify-center py-6">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">
                    Loading more notifications...
                  </span>
                </div>
              </div>
            )}

            {!loading && hasMore && (
              <div className="flex justify-center py-6">
                <Button onClick={handleLoadMore} variant="outline">
                  Load More Notifications
                </Button>
              </div>
            )}

            {!hasMore && notifications.length > 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  You've reached the end of your notifications
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, notification: deleteDialog.notification })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setDeleteDialog({ open: false, notification: null })
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNotification}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
