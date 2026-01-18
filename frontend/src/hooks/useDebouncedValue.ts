import { useEffect, useState } from "react";

/**
 * Hook that returns a debounced version of the provided value.
 * The debounced value will only update after the specified delay has passed
 * without the value changing.
 *
 * @param value - The value to debounce
 * @param delayMs - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

