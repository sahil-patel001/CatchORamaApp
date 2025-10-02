import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Notification } from "@/types";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasViewedNotifications: boolean;

  // Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  setHasViewedNotifications: (viewed: boolean) => void;

  // Real-time updates
  refreshNotifications: () => Promise<void>;

  // Utility methods
  getNotificationById: (id: string) => Notification | undefined;
  getUnreadNotifications: () => Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);

  // Fetch recent notifications (for dropdown)
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const recentNotifications =
        await notificationService.getRecentNotifications();
      setNotifications(recentNotifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setHasViewedNotifications(true);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.deleteNotification(notificationId);

        // Find the notification to check if it was unread
        const notification = notifications.find(
          (n) => n._id === notificationId
        );
        const wasUnread = notification && !notification.isRead;

        // Update local state
        setNotifications((prev) =>
          prev.filter((n) => n._id !== notificationId)
        );

        // Update unread count if the deleted notification was unread
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("Failed to delete notification:", err);
        throw err;
      }
    },
    [notifications]
  );

  // Add new notification (for real-time updates)
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => {
      // Check if notification already exists
      const exists = prev.some((n) => n._id === notification._id);
      if (exists) return prev;

      // Add to beginning of array and keep only recent ones (top 5)
      return [notification, ...prev].slice(0, 5);
    });

    // Update unread count if notification is unread
    if (!notification.isRead) {
      setUnreadCount((prev) => prev + 1);
      // Reset viewed status when new unread notification arrives
      setHasViewedNotifications(false);
    }
  }, []);

  // Refresh notifications (fetch both notifications and unread count)
  const refreshNotifications = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  // Utility: Get notification by ID
  const getNotificationById = useCallback(
    (id: string) => {
      return notifications.find((n) => n._id === id);
    },
    [notifications]
  );

  // Utility: Get unread notifications
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  // Initial load when user changes
  useEffect(() => {
    if (user) {
      refreshNotifications();

      // Set up periodic refresh every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    } else {
      // Clear state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setHasViewedNotifications(false);
    }
  }, [user, refreshNotifications, fetchUnreadCount]);

  const contextValue: NotificationContextType = {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    hasViewedNotifications,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    setHasViewedNotifications,

    // Real-time updates
    refreshNotifications,

    // Utility methods
    getNotificationById,
    getUnreadNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}
