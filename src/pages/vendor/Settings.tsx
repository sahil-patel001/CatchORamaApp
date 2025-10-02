import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useQuery } from "@tanstack/react-query";
import { getVendorProfile } from "@/services/vendorService";
import { Skeleton } from "@/components/ui/skeleton";

export function Settings() {
  const { user, changePassword, logout, isLoading, getPasswordStatus } =
    useAuth();
  const { toast } = useToast();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState<{
    hasPassword: boolean;
    isOAuthUser: boolean;
  } | null>(null);
  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
  });

  // Fetch vendor profile data
  const {
    data: vendorProfile,
    isLoading: vendorLoading,
    error: vendorError,
  } = useQuery({
    queryKey: ["vendorProfile"],
    queryFn: getVendorProfile,
    enabled: !!user,
  });

  // Update business data when vendor profile is loaded
  useEffect(() => {
    if (vendorProfile) {
      setBusinessData({
        businessName: vendorProfile.businessName || "",
        businessEmail: vendorProfile.user?.email || user?.email || "",
        businessPhone: vendorProfile.phone || "",
        businessAddress:
          vendorProfile.address?.full ||
          [
            vendorProfile.address?.street,
            vendorProfile.address?.city,
            vendorProfile.address?.state,
            vendorProfile.address?.zipCode,
            vendorProfile.address?.country,
          ]
            .filter(Boolean)
            .join(", ") ||
          "",
      });
    }
  }, [vendorProfile, user]);

  // Fetch password status on component mount
  useEffect(() => {
    const fetchPasswordStatus = async () => {
      const status = await getPasswordStatus();
      setPasswordStatus(status);
    };

    if (user) {
      fetchPasswordStatus();
    }
  }, [user, getPasswordStatus]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    // For OAuth users creating password for first time, don't send current password
    const currentPassword = passwordStatus?.hasPassword
      ? passwordData.currentPassword
      : undefined;

    const res = await changePassword(currentPassword, passwordData.newPassword);
    if (res.success) {
      const message = passwordStatus?.hasPassword
        ? "Password updated successfully"
        : "Password created successfully";
      toast({ title: "Success", description: message });

      // Update password status after successful creation/change
      const newStatus = await getPasswordStatus();
      setPasswordStatus(newStatus);

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else {
      toast({
        title: "Error",
        description: res.error || "Password update failed",
        variant: "destructive",
      });
    }
  };

  const handleBusinessUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Success",
      description: "Business information updated successfully",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Account deletion process would be initiated",
      variant: "destructive",
    });
    setDeleteAccountOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and business settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your personal account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={user?.name || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={user?.role || ""} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Update your business details</CardDescription>
          </CardHeader>
          <CardContent>
            {vendorLoading ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            ) : vendorError ? (
              <div className="text-center py-4">
                <p className="text-destructive">
                  Failed to load business information
                </p>
              </div>
            ) : (
              <form onSubmit={handleBusinessUpdate} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={businessData.businessName}
                    onChange={(e) =>
                      setBusinessData((prev) => ({
                        ...prev,
                        businessName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business-email">Business Email</Label>
                  <Input
                    id="business-email"
                    type="email"
                    value={businessData.businessEmail}
                    onChange={(e) =>
                      setBusinessData((prev) => ({
                        ...prev,
                        businessEmail: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business-phone">Business Phone</Label>
                  <Input
                    id="business-phone"
                    value={businessData.businessPhone}
                    onChange={(e) =>
                      setBusinessData((prev) => ({
                        ...prev,
                        businessPhone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business-address">Business Address</Label>
                  <Input
                    id="business-address"
                    value={businessData.businessAddress}
                    onChange={(e) =>
                      setBusinessData((prev) => ({
                        ...prev,
                        businessAddress: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button type="submit">Update Business Info</Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>
              {passwordStatus?.hasPassword
                ? "Change Password"
                : "Create Password"}
            </CardTitle>
            <CardDescription>
              {passwordStatus?.hasPassword
                ? "Update your account password"
                : passwordStatus?.isOAuthUser
                ? "Create a password for your Google account to enable password login"
                : "Set up a password for your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passwordStatus === null ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordStatus.hasPassword && (
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="new-password">
                    {passwordStatus.hasPassword ? "New Password" : "Password"}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">
                    {passwordStatus.hasPassword
                      ? "Confirm New Password"
                      : "Confirm Password"}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <Button type="submit">
                  {passwordStatus.hasPassword
                    ? "Update Password"
                    : "Create Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-destructive">Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteAccountOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data."
        onConfirm={handleDeleteAccount}
        confirmText="Delete Account"
      />
    </div>
  );
}
