import React, { useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  Settings,
  DollarSign,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Archive,
  Bell,
} from "lucide-react";
import { UserRole } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";

interface SidebarProps {
  userRole: UserRole;
  isCollapsed: boolean;
  onToggle: () => void;
}

const superAdminNavItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: BarChart3,
  },
  {
    title: "Vendors",
    href: "/admin/vendors",
    icon: Users,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Commission Report",
    href: "/admin/commission",
    icon: DollarSign,
  },
  {
    title: "Commission Management",
    href: "/admin/commission-management",
    icon: TrendingUp,
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
];

const vendorNavItems = [
  {
    title: "Dashboard",
    href: "/vendor/dashboard",
    icon: BarChart3,
  },
  {
    title: "Products",
    href: "/vendor/products",
    icon: Package,
  },
  {
    title: "Categories",
    href: "/vendor/categories",
    icon: LayoutGrid,
  },
  {
    title: "Orders",
    href: "/vendor/orders",
    icon: ShoppingCart,
  },
  {
    title: "Sales",
    href: "/vendor/sales",
    icon: DollarSign,
  },
  {
    title: "Archive",
    href: "/vendor/archive",
    icon: Archive,
  },
  {
    title: "Notifications",
    href: "/vendor/notifications",
    icon: Bell,
  },
];

export const Sidebar = React.memo(
  ({ userRole, isCollapsed, onToggle }: SidebarProps) => {
    const location = useLocation();
    const { logout } = useAuth();
    const { navigate } = useNavigateWithLoading();

    const navItems = useMemo(
      () => (userRole === "superadmin" ? superAdminNavItems : vendorNavItems),
      [userRole]
    );

    const handleLogout = useCallback(() => {
      logout();
    }, [logout]);

    const handleNavigate = useCallback(
      (path: string) => {
        navigate(path);
      },
      [navigate]
    );

    const settingsPath = useMemo(
      () =>
        userRole === "superadmin" ? "/admin/settings" : "/vendor/settings",
      [userRole]
    );

    const isSettingsActive = useMemo(
      () => location.pathname === settingsPath,
      [location.pathname, settingsPath]
    );

    return (
      <div
        className={cn(
          "relative flex flex-col border-r bg-background transition-all duration-300 h-full",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent z-10"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Logo/Brand */}
        <div className="flex h-16 items-center justify-center px-4 border-b">
          {isCollapsed ? (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                AP
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="font-bricolage text-lg font-bold">
              Admin Panel
            </span>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    "w-full transition-all duration-200",
                    isCollapsed
                      ? "h-9 w-9 p-0 justify-center"
                      : "h-9 justify-start",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                  aria-label={isCollapsed ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4" />
                  {isCollapsed && <span className="sr-only">{item.title}</span>}
                  {!isCollapsed && (
                    <span className="ml-3 font-manrope">{item.title}</span>
                  )}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Settings & Logout */}
        <div className="border-t p-3 space-y-2">
          <Button
            variant={isSettingsActive ? "secondary" : "ghost"}
            onClick={() => handleNavigate(settingsPath)}
            className={cn(
              "w-full transition-all duration-200",
              isCollapsed ? "h-9 w-9 p-0 justify-center" : "h-9 justify-start",
              isSettingsActive && "bg-accent text-accent-foreground"
            )}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
            {!isCollapsed && (
              <span className="ml-3 font-manrope">Settings</span>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 transition-all duration-200",
              isCollapsed ? "h-9 w-9 p-0 justify-center" : "h-9 justify-start"
            )}
            aria-label={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-3 font-manrope">Logout</span>}
          </Button>
        </div>
      </div>
    );
  }
);

Sidebar.displayName = "Sidebar";
