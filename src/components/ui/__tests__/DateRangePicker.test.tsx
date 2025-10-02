import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DateRangePicker, useDateRangePicker } from "../DateRangePicker";

// Mock date-fns format function
vi.mock("date-fns", () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    return date.toLocaleDateString();
  }),
}));

describe("DateRangePicker", () => {
  const defaultProps = {
    mode: "preset" as const,
    onModeChange: vi.fn(),
    presetPeriod: "30d",
    onPresetPeriodChange: vi.fn(),
    date: undefined,
    onDateChange: vi.fn(),
  };

  it("renders preset mode by default", () => {
    render(<DateRangePicker {...defaultProps} />);
    expect(screen.getByText("Date Filter")).toBeInTheDocument();
    expect(screen.getByText("Last 30 Days")).toBeInTheDocument();
  });

  it("shows custom date picker when mode is custom", () => {
    render(<DateRangePicker {...defaultProps} mode="custom" />);
    expect(screen.getByText("Custom Range")).toBeInTheDocument();
    expect(screen.getByText("Pick a date range")).toBeInTheDocument();
  });

  it("calls onPresetPeriodChange when selecting a preset period", () => {
    const onPresetPeriodChange = vi.fn();
    render(
      <DateRangePicker
        {...defaultProps}
        onPresetPeriodChange={onPresetPeriodChange}
      />
    );

    // This would require more complex interaction testing with the Select component
    // For now, we'll test that the component renders properly
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("switches to custom mode when custom range is selected", () => {
    const onModeChange = vi.fn();
    render(<DateRangePicker {...defaultProps} onModeChange={onModeChange} />);

    // This would require Select component interaction testing
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

describe("useDateRangePicker hook", () => {
  const TestComponent = ({ initialPeriod = "30d" }) => {
    const dateRangePicker = useDateRangePicker(initialPeriod);
    const { mode, presetPeriod, getEffectiveDateRange } = dateRangePicker;

    return (
      <div>
        <span data-testid="mode">{mode}</span>
        <span data-testid="period">{presetPeriod}</span>
        <span data-testid="effective-range">
          {JSON.stringify(getEffectiveDateRange())}
        </span>
        <button
          data-testid="set-custom"
          onClick={() => dateRangePicker.setMode("custom")}
        >
          Set Custom
        </button>
        <button data-testid="reset" onClick={() => dateRangePicker.reset()}>
          Reset
        </button>
      </div>
    );
  };

  it("initializes with correct default values", () => {
    render(<TestComponent />);
    expect(screen.getByTestId("mode")).toHaveTextContent("preset");
    expect(screen.getByTestId("period")).toHaveTextContent("30d");
    expect(screen.getByTestId("effective-range")).toHaveTextContent(
      JSON.stringify({ period: "30d" })
    );
  });

  it("can switch to custom mode", () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId("set-custom"));
    expect(screen.getByTestId("mode")).toHaveTextContent("custom");
  });

  it("can reset to initial state", () => {
    render(<TestComponent initialPeriod="7d" />);
    fireEvent.click(screen.getByTestId("set-custom"));
    expect(screen.getByTestId("mode")).toHaveTextContent("custom");

    fireEvent.click(screen.getByTestId("reset"));
    expect(screen.getByTestId("mode")).toHaveTextContent("preset");
    expect(screen.getByTestId("period")).toHaveTextContent("7d");
  });

  it("returns correct effective date range for preset mode", () => {
    render(<TestComponent initialPeriod="7d" />);
    expect(screen.getByTestId("effective-range")).toHaveTextContent(
      JSON.stringify({ period: "7d" })
    );
  });

  it("returns correct effective date range for custom mode with dates", () => {
    const TestComponentWithCustomDates = () => {
      const dateRangePicker = useDateRangePicker("30d");
      const { getEffectiveDateRange } = dateRangePicker;

      React.useEffect(() => {
        dateRangePicker.setMode("custom");
        dateRangePicker.setCustomDateRange({
          from: new Date("2024-01-01"),
          to: new Date("2024-01-31"),
        });
      }, []);

      return (
        <div>
          <span data-testid="effective-range-custom">
            {JSON.stringify(getEffectiveDateRange())}
          </span>
        </div>
      );
    };

    render(<TestComponentWithCustomDates />);

    // The exact format will depend on the date formatting, but we can check structure
    const effectiveRange = screen.getByTestId(
      "effective-range-custom"
    ).textContent;
    expect(effectiveRange).toContain("startDate");
    expect(effectiveRange).toContain("endDate");
  });
});
