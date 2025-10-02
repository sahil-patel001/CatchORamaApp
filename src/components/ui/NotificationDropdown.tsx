import React, { useState, useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  Clock,
  AlertCircle,
  Package,
  ShoppingCart,
  Settings,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Notification, NotificationType, NotificationPriority } from "@/types";
import { useNotifications } from "@/contexts/NotificationContext";

interface NotificationDropdownProps {
  children: React.ReactNode;
  onNotificationClick?: (notification: Notification) => void;
  onViewAllClick?: () => void;
  onMarkAllReadClick?: () => void;
}

// Icon mapping for different notification types
const notificationIconMap = {
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
} satisfies Record<
  NotificationType | "general",
  React.ComponentType<{ className?: string }>
>;

const getNotificationIcon = (type: NotificationType) => {
  return notificationIconMap[type] || Bell;
};

// Priority color mapping
const priorityColorMap: Record<NotificationPriority, string> = {
  low: "text-gray-500",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

const getPriorityColor = (priority: NotificationPriority = "medium") => {
  return priorityColorMap[priority];
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

export const NotificationDropdown = React.memo(
  ({
    children,
    onNotificationClick,
    onViewAllClick,
    onMarkAllReadClick,
  }: NotificationDropdownProps) => {
    const notificationContext = useNotifications();
    const {
      notifications = [],
      isLoading = false,
      fetchNotifications,
      setHasViewedNotifications,
    } = notificationContext || {};
    const [isOpen, setIsOpen] = useState(false);

    // Fetch notifications when dropdown opens
    const handleOpenChange = useCallback(
      (open: boolean) => {
        setIsOpen(open);
        if (open) {
          fetchNotifications?.();
          setHasViewedNotifications?.(true);
        }
      },
      [fetchNotifications, setHasViewedNotifications]
    );

    const handleNotificationClick = useCallback(
      async (notification: Notification) => {
        try {
          setIsOpen(false);
          await onNotificationClick?.(notification);
        } catch (error) {
          console.error("Failed to handle notification click:", error);
        }
      },
      [onNotificationClick]
    );

    const handleMarkAllAsRead = useCallback(async () => {
      try {
        await onMarkAllReadClick?.();
      } catch (error) {
        console.error("Failed to mark all as read:", error);
      }
    }, [onMarkAllReadClick]);

    const handleViewAllClick = useCallback(() => {
      setIsOpen(false);
      onViewAllClick?.();
    }, [onViewAllClick]);

    const formatNotificationTime = useCallback((createdAt: string) => {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    }, []);

    const unreadCount = useMemo(
      () => notifications.filter((n) => !n.isRead).length,
      [notifications]
    );

    return (
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end" sideOffset={8}>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </DropdownMenuLabel>

          {unreadCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="w-full justify-start text-xs"
                >
                  <Check className="h-3 w-3 mr-2" />
                  Mark all as read
                </Button>
              </div>
            </>
          )}

          <DropdownMenuSeparator />

          <ScrollArea className="max-h-80 overflow-y-auto">
            {isLoading ? (
              // Loading skeleton
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-2">
                    <Skeleton className="h-4 w-4 rounded-full mt-1" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
                <p className="text-xs text-muted-foreground">
                  You're all caught up!
                </p>
              </div>
            ) : (
              // Notifications list
              <div className="space-y-1">
                {notifications.map((notification) => {
                  const IconComponent = getNotificationIcon(notification.type);
                  const priorityColor = getPriorityColor(notification.priority);

                  return (
                    <DropdownMenuItem
                      key={notification._id}
                      className={cn(
                        "flex items-start space-x-3 p-3 cursor-pointer hover:bg-accent",
                        !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={cn("mt-0.5", priorityColor)}>
                        <IconComponent className="h-4 w-4" />
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p
                            className={cn(
                              "text-sm font-medium leading-tight",
                              !notification.isRead && "font-semibold"
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                          </div>

                          {notification.priority &&
                            notification.priority !== "medium" && (
                              <Badge
                                variant={getPriorityBadgeVariant(
                                  notification.priority
                                )}
                                className="text-xs px-1 py-0"
                              >
                                {notification.priority}
                              </Badge>
                            )}
                        </div>

                        {notification.actionUrl && (
                          <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View details
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAllClick}
                className="w-full justify-center text-xs"
              >
                View all notifications
              </Button>
            </div>
          </>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

NotificationDropdown.displayName = "NotificationDropdown";
