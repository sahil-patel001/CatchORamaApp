import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch (error) {
    console.error("Invalid date for formatting:", date);
    return "Invalid Date";
  }
}

/**
 * Calculate cubic weight based on dimensions
 * Formula: (Length × Width × Height) / 2500
 * @param length - Length in cm
 * @param breadth - Breadth in cm
 * @param height - Height in cm
 * @returns Cubic weight in kg (rounded to 2 decimal places)
 */
export function calculateCubicWeight(
  length: number,
  breadth: number,
  height: number
): number {
  if (
    !length ||
    !breadth ||
    !height ||
    length <= 0 ||
    breadth <= 0 ||
    height <= 0
  ) {
    return 0;
  }

  const cubicWeight = (length * breadth * height) / 2500;
  return Math.round(cubicWeight * 100) / 100; // Round to 2 decimal places
}

/**
 * Determine stock status based on current stock and low stock threshold
 * @param currentStock - Current stock quantity
 * @param lowStockThreshold - Low stock threshold (defaults to 10 if not set)
 * @returns Stock status: "out_of_stock" | "low_stock" | "in_stock"
 */
export function getStockStatus(
  currentStock: number,
  lowStockThreshold?: number
): "out_of_stock" | "low_stock" | "in_stock" {
  if (currentStock <= 0) {
    return "out_of_stock";
  }

  const threshold = lowStockThreshold || 10; // Default to 10 if no threshold set
  if (currentStock <= threshold) {
    return "low_stock";
  }

  return "in_stock";
}

/**
 * Get badge variant for stock status
 * @param stockStatus - Stock status from getStockStatus
 * @returns Badge variant
 */
export function getStockBadgeVariant(
  stockStatus: "out_of_stock" | "low_stock" | "in_stock"
): "default" | "secondary" | "destructive" {
  switch (stockStatus) {
    case "out_of_stock":
      return "destructive";
    case "low_stock":
      return "secondary";
    case "in_stock":
    default:
      return "default";
  }
}

/**
 * Get low stock threshold from product (handles both inventory structure and legacy field)
 * @param product - Product object
 * @returns Low stock threshold or undefined
 */
export function getLowStockThreshold(product: any): number | undefined {
  return product.inventory?.lowStockThreshold || product.lowStockThreshold;
}
