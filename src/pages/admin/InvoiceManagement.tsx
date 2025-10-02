import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVendors } from "@/services/vendorService";
import { getVendorSalesReportAsAdmin } from "@/services/reportService";
import { Vendor, SalesReport, ReportPeriod } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ViewSalesModal } from "@/components/modals/ViewSalesModal";

export default function InvoiceManagement() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch all vendors
  const {
    data: vendors = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vendors", search],
    queryFn: () => fetchVendors(search, 1, 100, "all"),
  });

  const handleViewReport = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setLoadingReport(true);
    try {
      const reportData = await getVendorSalesReportAsAdmin(vendor._id, period);
      setReport(reportData);
      setModalOpen(true);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to fetch report",
        variant: "destructive",
      });
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Invoice Management
        </h1>
        <p className="text-muted-foreground">
          Generate and download vendor-specific weekly invoice reports
        </p>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <div className="text-red-600">
          {error instanceof Error ? error.message : "Failed to load vendors"}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor: Vendor) => (
            <Card key={vendor._id}>
              <CardHeader>
                <CardTitle>{vendor.businessName}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {vendor.user?.email}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleViewReport(vendor)}
                  disabled={loadingReport && selectedVendor?._id === vendor._id}
                >
                  {loadingReport && selectedVendor?._id === vendor._id
                    ? "Loading..."
                    : "View/Download Report"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ViewSalesModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        salesData={null}
        vendorInfo={report?.vendorInfo}
      />
      {/* You can extend ViewSalesModal to show the full report, or create a custom modal for preview/export */}
    </div>
  );
}
