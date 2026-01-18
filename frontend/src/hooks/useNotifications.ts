import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "./useWebSocket";
import {
  notificationService,
  NotificationQuery,
  NotificationResponse,
} from "@/services/notificationService";
import { Notification } from "@/types";
import { useToast } from "./use-toast";

interface UseNotificationsOptions {
  enableRealTime?: boolean;
  autoFetch?: boolean;
  fetchInterval?: number;
}

interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  fetchNotifications: (
    query?: NotificationQuery
  ) => Promise<NotificationResponse | null>;
  fetchUnreadCount: () => Promise<number>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;

  // Real-time connection
  isConnected: boolean;
  isConnecting: boolean;
  reconnect: () => void;

  // Utility
  getUnreadNotifications: () => Notification[];
  getNotificationById: (id: string) => Notification | undefined;
  clearError: () => void;
}

export function useNotificationOperations({
  enableRealTime = true,
  autoFetch = true,
  fetchInterval = 30000, // 30 seconds
}: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [lastQuery, setLastQuery] = useState<NotificationQuery>({});

  // WebSocket connection for real-time updates
  const { isConnected, isConnecting, forceReconnect } = useWebSocket({
    onNotificationReceived: (notification) => {
      if (enableRealTime) {
        handleNewNotification(notification);
      }
    },
    onConnectionStatusChange: (connected) => {
      if (connected && enableRealTime) {
        console.log("Real-time notifications enabled");
      }
    },
    autoReconnect: enableRealTime,
  });

  // Handle new notification from WebSocket
  const handleNewNotification = useCallback(
    (notification: Notification) => {
      setNotifications((prev) => {
        // Check if notification already exists
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) return prev;

        // Add to beginning of array
        return [notification, ...prev];
      });

      // Update unread count if notification is unread
      if (!notification.isRead) {
        setUnreadCount((prev) => prev + 1);

        // Show toast notification
        toast({
          title: notification.title,
          description: notification.message,
          duration: 5000,
        });
      }
    },
    [toast]
  );

  // Fetch notifications with pagination
  const fetchNotifications = useCallback(
    async (query: NotificationQuery = {}) => {
      if (!user) return null;

      setIsLoading(true);
      setError(null);

      try {
        const mergedQuery = {
          page: 1,
          limit: 20,
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
          ...query,
        };

        const response = await notificationService.getNotifications(
          mergedQuery
        );

        if (mergedQuery.page === 1) {
          setNotifications(response.notifications);
        } else {
          setNotifications((prev) => [...prev, ...response.notifications]);
        }

        setHasMore(response.hasMore);
        setPage(mergedQuery.page || 1);
        setLastQuery(mergedQuery);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch notifications";
        setError(errorMessage);
        console.error("Error fetching notifications:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return 0;

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      return count;
    } catch (err) {
      console.error("Error fetching unread count:", err);
      return 0;
    }
  }, [user]);

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    const nextPage = page + 1;
    await fetchNotifications({ ...lastQuery, page: nextPage });
  }, [isLoading, hasMore, page, lastQuery, fetchNotifications]);

  // Refresh notifications (reset to page 1)
  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await Promise.all([
      fetchNotifications({ ...lastQuery, page: 1 }),
      fetchUnreadCount(),
    ]);
  }, [lastQuery, fetchNotifications, fetchUnreadCount]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.markAsRead(notificationId);

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );

        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to mark notification as read";
        console.error("Error marking notification as read:", err);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to mark all notifications as read";
      console.error("Error marking all notifications as read:", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        // Find the notification to check if it was unread
        const notification = notifications.find(
          (n) => n._id === notificationId
        );
        const wasUnread = notification && !notification.isRead;

        await notificationService.deleteNotification(notificationId);

        // Update local state
        setNotifications((prev) =>
          prev.filter((n) => n._id !== notificationId)
        );

        // Update unread count if the deleted notification was unread
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        toast({
          title: "Success",
          description: "Notification deleted",
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete notification";
        console.error("Error deleting notification:", err);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw err;
      }
    },
    [notifications, toast]
  );

  // Utility functions
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  const getNotificationById = useCallback(
    (id: string) => {
      return notifications.find((n) => n._id === id);
    },
    [notifications]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount and user change
  useEffect(() => {
    if (user && autoFetch) {
      refresh();
    } else if (!user) {
      // Clear state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setPage(1);
      setHasMore(true);
    }
  }, [user, autoFetch, refresh]);

  // Periodic refresh of unread count
  useEffect(() => {
    if (!user || !autoFetch) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, fetchInterval);

    return () => clearInterval(interval);
  }, [user, autoFetch, fetchInterval, fetchUnreadCount]);

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    page,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,

    // Real-time connection
    isConnected: enableRealTime ? isConnected : false,
    isConnecting: enableRealTime ? isConnecting : false,
    reconnect: forceReconnect,

    // Utility
    getUnreadNotifications,
    getNotificationById,
    clearError,
  };
}
