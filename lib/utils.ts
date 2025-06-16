import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD)
 * @param value - The number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
  
  return formatter.format(value);
}

/**
 * Format a number with thousands separators
 * @param value - The number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  });
  
  return formatter.format(value);
}
