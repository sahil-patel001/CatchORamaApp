import React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationIconProps {
  unreadCount?: number;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "default";
  showBadge?: boolean;
  hasViewedNotifications?: boolean;
}

export const NotificationIcon = React.forwardRef<
  HTMLButtonElement,
  NotificationIconProps
>(
  (
    {
      unreadCount = 0,
      onClick,
      className,
      size = "md",
      variant = "ghost",
      showBadge = true,
      hasViewedNotifications = false,
      ...props
    },
    ref
  ) => {
    const hasUnread = unreadCount > 0;
    const shouldShowIndicator = hasUnread && !hasViewedNotifications;

    const sizeClasses = {
      sm: "h-8 w-8",
      md: "h-9 w-9",
      lg: "h-10 w-10",
    };

    const iconSizes = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    return (
      <div className="relative">
        <Button
          ref={ref}
          variant={variant}
          size="icon"
          onClick={onClick}
          className={cn(
            sizeClasses[size],
            "transition-colors duration-200",
            hasUnread && "text-primary",
            className
          )}
          title={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
          aria-label={`Notifications${
            hasUnread ? `, ${unreadCount} unread` : ""
          }`}
          {...props}
        >
          <Bell
            className={cn(iconSizes[size], "transition-all duration-200")}
          />
        </Button>

        {/* Green dot indicator for unread notifications */}
        {showBadge && shouldShowIndicator && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center">
            {unreadCount <= 9 ? (
              // Simple green dot for counts 1-9
              <div className="h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            ) : (
              // Badge with count for 10+
              <div className="h-4 min-w-4 px-1 bg-green-500 text-white text-xs font-medium rounded-full border-2 border-background flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

NotificationIcon.displayName = "NotificationIcon";
