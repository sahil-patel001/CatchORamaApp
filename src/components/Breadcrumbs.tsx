import React, { useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href: string;
  isCurrent?: boolean;
};

export const Breadcrumbs = React.memo(() => {
  const location = useLocation();
  const { pathname } = location;

  const pathnames = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname]
  );

  const getLabel = useCallback((path: string): string => {
    switch (path) {
      case "dashboard":
        return "Dashboard";
      case "products":
        return "Products";
      case "orders":
        return "Orders";
      case "sales":
        return "Sales";
      case "settings":
        return "Settings";
      case "vendors":
        return "Vendors";
      case "commission":
        return "Commission Report";
      case "commission-management":
        return "Commission Management";
      default:
        return path.charAt(0).toUpperCase() + path.slice(1);
    }
  }, []);

  const breadcrumbs = useMemo(() => {
    return pathnames
      .map((value, index) => {
        if (value === "admin" || value === "vendor") {
          return null;
        }

        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;

        return {
          label: getLabel(value),
          href: to,
          isCurrent: last,
        };
      })
      .filter(Boolean) as BreadcrumbItem[];
  }, [getLabel, pathnames]);

  const homePath = useMemo(
    () =>
      pathname.includes("admin") ? "/admin/dashboard" : "/vendor/dashboard",
    [pathname]
  );

  const shouldHideBreadcrumbs = useMemo(() => {
    return (
      breadcrumbs.length === 0 ||
      (breadcrumbs.length === 1 && breadcrumbs[0]?.href === homePath)
    );
  }, [breadcrumbs, homePath]);

  if (shouldHideBreadcrumbs) {
    return null;
  }

  return (
    <nav className="flex items-center text-sm mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
        <li className="inline-flex items-center">
          <Link
            to={homePath}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="w-3 h-3 me-2.5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
            </svg>
            Home
          </Link>
        </li>
        {breadcrumbs.map((item, index) => (
          <li key={item.href}>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
              {item.isCurrent ? (
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
});

Breadcrumbs.displayName = "Breadcrumbs";

export default Breadcrumbs;
