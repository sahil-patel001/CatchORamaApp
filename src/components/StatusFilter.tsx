import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface StatusOption {
  value: string;
  label: string;
}

interface StatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  options: StatusOption[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export const StatusFilter = React.memo(
  ({
    value,
    onValueChange,
    options,
    placeholder = "Select status",
    label = "Status",
    className = "",
  }: StatusFilterProps) => {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Label
          htmlFor="status-filter"
          className="text-sm font-medium whitespace-nowrap"
        >
          {label}:
        </Label>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger id="status-filter" className="w-[160px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

StatusFilter.displayName = "StatusFilter";

// Predefined status options for vendors
export const VENDOR_STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
];
