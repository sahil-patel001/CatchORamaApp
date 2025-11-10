import { Notification } from "@/types";
import api from "./api";

const API_BASE_URL = "/notifications";

export interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
  priority?: string;
  category?: string;
  sortBy?: "createdAt" | "priority" | "isRead";
  sortOrder?: "asc" | "desc";
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

class NotificationService {
  /**
   * Get notifications with pagination and filtering
   */
  async getNotifications(
    query: NotificationQuery = {}
  ): Promise<NotificationResponse> {
    try {
      const params = new URLSearchParams();

      // Set default values
      params.append("page", (query.page || 1).toString());
      params.append("limit", (query.limit || 10).toString());
      params.append("sortBy", query.sortBy || "createdAt");
      params.append("sortOrder", query.sortOrder || "desc");

      // Add optional filters
      if (query.isRead !== undefined) {
        params.append("isRead", query.isRead.toString());
      }
      if (query.type) {
        params.append("type", query.type);
      }
      if (query.priority) {
        params.append("priority", query.priority);
      }
      if (query.category) {
        params.append("category", query.category);
      }

      const response = await api.get(`${API_BASE_URL}`, {
        params: Object.fromEntries(params),
        withCredentials: true,
      });

      // Transform backend response to match frontend interface
      const backendData = response.data;
      return {
        notifications: backendData.notifications,
        total: backendData.pagination.total,
        page: backendData.pagination.page,
        totalPages: backendData.pagination.pages,
        hasMore: backendData.pagination.hasNext,
      };
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  /**
   * Get recent notifications (top 5 for dropdown)
   */
  async getRecentNotifications(): Promise<Notification[]> {
    try {
      // Use the unread endpoint for dropdown which gives us recent notifications
      const response = await api.get(`${API_BASE_URL}/unread`, {
        params: { limit: 5 },
        withCredentials: true,
      });

      return response.data.data?.notifications || [];
    } catch (error) {
      console.error("Error fetching recent notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get(`${API_BASE_URL}/unread`, {
        withCredentials: true,
      });

      return response.data.data?.unreadCount || 0;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.patch(
        `${API_BASE_URL}/${notificationId}/read`,
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark a notification as unread
   */
  async markAsUnread(notificationId: string): Promise<void> {
    try {
      await api.patch(
        `${API_BASE_URL}/${notificationId}/unread`,
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Error marking notification as unread:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await api.patch(
        `${API_BASE_URL}/mark-all-read`,
        {},
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`${API_BASE_URL}/${notificationId}`, {
        withCredentials: true,
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
