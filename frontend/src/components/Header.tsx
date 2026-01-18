import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationIcon } from "@/components/ui/NotificationIcon";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { LogOut, User } from "lucide-react";
import { Notification } from "@/types";

interface HeaderProps {
  title: string;
}

export const Header = React.memo(({ title }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
    hasViewedNotifications,
    setHasViewedNotifications,
  } = useNotifications();

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      try {
        if (!notification.isRead) {
          await markAsRead(notification._id);
        }

        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
      } catch (error) {
        console.error("Failed to handle notification click:", error);
      }
    },
    [markAsRead]
  );

  const notificationPath = useMemo(
    () =>
      user?.role === "superadmin"
        ? "/admin/notifications"
        : "/vendor/notifications",
    [user?.role]
  );

  const handleViewAllClick = useCallback(() => {
    setHasViewedNotifications(true);
    navigate(notificationPath);
  }, [navigate, notificationPath, setHasViewedNotifications]);

  const handleMarkAllReadClick = useCallback(async () => {
    try {
      await markAllAsRead();
      setHasViewedNotifications(true);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [markAllAsRead, setHasViewedNotifications]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-xl font-bricolage font-semibold text-foreground">
          {title}
        </h1>
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-2 text-sm font-manrope">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.name}</span>
              <span className="text-muted-foreground">({user.role})</span>
            </div>
          )}
          <NotificationDropdown
            onNotificationClick={handleNotificationClick}
            onViewAllClick={handleViewAllClick}
            onMarkAllReadClick={handleMarkAllReadClick}
          >
            <NotificationIcon
              unreadCount={unreadCount}
              hasViewedNotifications={hasViewedNotifications}
            />
          </NotificationDropdown>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";
