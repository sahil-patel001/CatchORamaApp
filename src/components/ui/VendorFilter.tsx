import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface VendorOption {
  value: string;
  label: string;
}

interface VendorFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  options: VendorOption[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export function VendorFilter({
  value,
  onValueChange,
  options,
  placeholder = "All vendors",
  label = "Vendor",
  className = "",
}: VendorFilterProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Label
        htmlFor="vendor-filter"
        className="text-sm font-medium whitespace-nowrap"
      >
        {label}:
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="vendor-filter" className="w-[180px]">
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
