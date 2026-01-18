import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export type DateFilterMode = "preset" | "custom";

export interface DateRangePickerProps {
  /**
   * The selected date range
   */
  date?: DateRange;
  /**
   * Callback when date range changes
   */
  onDateChange?: (range: DateRange | undefined) => void;
  /**
   * Current filter mode (preset periods vs custom range)
   */
  mode: DateFilterMode;
  /**
   * Callback when mode changes
   */
  onModeChange: (mode: DateFilterMode) => void;
  /**
   * Current preset period value
   */
  presetPeriod: string;
  /**
   * Callback when preset period changes
   */
  onPresetPeriodChange: (period: string) => void;
  /**
   * Available preset periods
   */
  presetPeriods?: Array<{ value: string; label: string }>;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether the picker is disabled
   */
  disabled?: boolean;
  /**
   * Custom class name
   */
  className?: string;
}

const defaultPresetPeriods = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last 1 Year" },
];

export function DateRangePicker({
  date,
  onDateChange,
  mode,
  onModeChange,
  presetPeriod,
  onPresetPeriodChange,
  presetPeriods = defaultPresetPeriods,
  placeholder = "Pick a date range",
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      onModeChange("custom");
      // Clear any existing custom date range when switching to custom mode
      // This ensures a fresh start for date selection
      if (!date?.from || !date?.to) {
        onDateChange?.(undefined);
      }
    } else {
      onModeChange("preset");
      onPresetPeriodChange(value);
      // Clear custom date range when switching back to preset
      onDateChange?.(undefined);
    }
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    onDateChange?.(range);

    // Only close the popover when both dates are selected and form a valid range
    if (range?.from && range?.to) {
      // Ensure we have a valid date range (end date should be after or equal to start date)
      const isValidRange = range.to >= range.from;
      if (isValidRange) {
        // Add a small delay to ensure the user sees the selection before closing
        setTimeout(() => setIsOpen(false), 150);
      }
    }

    // If only start date is selected, keep the popover open for end date selection
    // The calendar will handle the range selection logic internally
  };

  const handleOpenChange = (open: boolean) => {
    // Prevent closing the popover if we're in custom mode and only have one date selected
    if (!open && mode === "custom" && date?.from && !date?.to) {
      // Don't close if only start date is selected
      return;
    }
    setIsOpen(open);
  };

  const formatDateRange = () => {
    if (mode === "preset") {
      const period = presetPeriods.find((p) => p.value === presetPeriod);
      return period?.label || "Select period";
    }

    if (date?.from) {
      if (date.to) {
        return `${format(date.from, "LLL dd, y")} - ${format(
          date.to,
          "LLL dd, y"
        )}`;
      }
      return format(date.from, "LLL dd, y");
    }
    return placeholder;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">Date Filter</Label>
      <div className="flex items-center space-x-2">
        <Select
          value={mode === "custom" ? "custom" : presetPeriod}
          onValueChange={handlePresetChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {presetPeriods.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {mode === "custom" && (
          <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from || new Date()}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                disabled={(date) => {
                  // Disable future dates - only allow dates up to today
                  const today = new Date();
                  today.setHours(23, 59, 59, 999); // End of today
                  return date > today;
                }}
                toDate={new Date()} // Also set toDate to prevent navigation to future months
                showOutsideDays={false} // Don't show days from other months
                fixedWeeks // Consistent calendar height
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage date range picker state
 */
export function useDateRangePicker(initialPresetPeriod = "30d") {
  const [mode, setMode] = useState<DateFilterMode>("preset");
  const [presetPeriod, setPresetPeriod] = useState(initialPresetPeriod);
  const [customDateRange, setCustomDateRange] = useState<
    DateRange | undefined
  >();

  const getEffectiveDateRange = (): {
    startDate?: string;
    endDate?: string;
    period?: string;
  } => {
    if (mode === "preset") {
      return { period: presetPeriod };
    }

    if (mode === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: format(customDateRange.from, "yyyy-MM-dd"),
        endDate: format(customDateRange.to, "yyyy-MM-dd"),
      };
    }

    return { period: presetPeriod }; // fallback to preset
  };

  const reset = () => {
    setMode("preset");
    setPresetPeriod(initialPresetPeriod);
    setCustomDateRange(undefined);
  };

  return {
    mode,
    setMode,
    presetPeriod,
    setPresetPeriod,
    customDateRange,
    setCustomDateRange,
    getEffectiveDateRange,
    reset,
  };
}
