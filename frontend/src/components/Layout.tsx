import React, { useState, useCallback } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ContentLoader } from "./ui/ContentLoader";
import { UserRole } from "@/types";
import ErrorBoundary from "./ErrorBoundary";

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  title: string;
}

export const Layout = React.memo(({ children, userRole, title }: LayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Memoized toggle function to prevent unnecessary re-renders
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <ErrorBoundary level="page">
      <div className="min-h-screen flex w-full bg-background">
        <div className="sticky top-0 h-screen">
          <ErrorBoundary level="component">
            <Sidebar
              userRole={userRole}
              isCollapsed={sidebarCollapsed}
              onToggle={handleSidebarToggle}
            />
          </ErrorBoundary>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="sticky top-0 z-10 bg-background border-b">
            <ErrorBoundary level="component">
              <Header title={title} />
            </ErrorBoundary>
          </div>
          <main className="flex-1 p-6 overflow-auto">
            <div className="animate-fade-in space-y-4">
              <ErrorBoundary level="component">
                <Breadcrumbs />
              </ErrorBoundary>
              <ErrorBoundary level="component">
                <ContentLoader>{children}</ContentLoader>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
});

Layout.displayName = 'Layout';
