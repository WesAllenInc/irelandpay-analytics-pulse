/**
 * Business calculation utilities for the Ireland Pay Analytics application
 * This module contains pure functions for data calculations that can be easily tested
 */

/**
 * Calculate the total volume from merchant volumes
 * @param volumes Array of merchant volumes
 * @returns The total volume
 */
export function calculateTotalVolume(volumes: Array<{ volume: number } | number>): number {
  return volumes.reduce((sum, item) => {
    // Handle both object with volume property and direct number values
    const value = typeof item === 'object' && item !== null ? (item as { volume: number }).volume : item as number;
    return sum + (value || 0);
  }, 0);
}

/**
 * Calculate the total residual from merchant residuals
 * @param residuals Array of merchant residuals
 * @returns The total residual
 */
export function calculateTotalResidual(residuals: Array<{ residual: number } | number>): number {
  return residuals.reduce((sum, item) => {
    // Handle both object with residual property and direct number values
    const value = typeof item === 'object' && item !== null ? (item as { residual: number }).residual : item as number;
    return sum + (value || 0);
  }, 0);
}

/**
 * Calculate forecasted volume based on current day of month
 * @param currentVolume Current month-to-date volume
 * @param dayOfMonth Current day of month (1-31)
 * @param daysInMonth Total days in the month (28-31)
 * @returns Forecasted volume for the full month
 */
export function calculateForecastedVolume(
  currentVolume: number,
  dayOfMonth: number,
  daysInMonth: number
): number {
  // Handle edge cases
  if (dayOfMonth <= 0 || daysInMonth <= 0) return 0;
  if (dayOfMonth > daysInMonth) dayOfMonth = daysInMonth;
  
  // If we're on the last day of the month, forecast equals current
  if (dayOfMonth === daysInMonth) return currentVolume;
  
  // Calculate forecasted volume based on daily average so far
  const dailyAverage = currentVolume / dayOfMonth;
  const forecastedVolume = dailyAverage * daysInMonth;
  
  return Math.round(forecastedVolume); // Round to nearest whole number
}

/**
 * Calculate forecasted residual based on current volume and residual
 * @param currentResidual Current month-to-date residual
 * @param currentVolume Current month-to-date volume
 * @param forecastedVolume Forecasted volume for the full month
 * @returns Forecasted residual for the full month
 */
export function calculateForecastedResidual(
  currentResidual: number,
  currentVolume: number,
  forecastedVolume: number
): number {
  // Handle edge cases
  if (currentVolume <= 0) return 0;
  
  // Calculate forecasted residual based on the current residual/volume ratio
  const residualRatio = currentResidual / currentVolume;
  const forecastedResidual = residualRatio * forecastedVolume;
  
  return Math.round(forecastedResidual * 100) / 100; // Round to 2 decimal places
}

/**
 * Format merchant data for the AgentMerchantTable component
 * @param merchants Raw merchant data from database
 * @param selectedMonth Selected month in 'YYYY-MM' format
 * @param currentDay Current day of month
 * @param daysInMonth Total days in the month
 * @returns Formatted merchant data for the table
 */
export function formatMerchantTableData(
  merchants: any[],
  selectedMonth: string,
  currentDay: number,
  daysInMonth: number
): Array<{
  merchantName: string;
  volume: number;
  agentBps: number;
  residualEarned: number;
  forecastedVolume: number;
  forecastedResidual: number;
}> {
  return merchants.map(merchant => {
    // Find volume for selected month
    const volumeEntry = merchant.merchant_processing_volumes
      .find((v: any) => v.processing_month.startsWith(selectedMonth)) || { gross_volume: 0 };
    
    // Find residual for selected month
    const residualEntry = merchant.residuals
      .find((r: any) => r.processing_month.startsWith(selectedMonth)) || { final_residual: 0, agent_bps: 0 };
    
    const volume = volumeEntry.gross_volume || 0;
    const residualEarned = residualEntry.final_residual || 0;
    const agentBps = residualEntry.agent_bps || 0;
    
    // Calculate forecasted values
    const forecastedVolume = calculateForecastedVolume(volume, currentDay, daysInMonth);
    const forecastedResidual = calculateForecastedResidual(residualEarned, volume, forecastedVolume);
    
    return {
      merchantName: merchant.dba_name,
      volume,
      agentBps,
      residualEarned,
      forecastedVolume,
      forecastedResidual
    };
  });
}

/**
 * Format volume trend data for the AgentVolumeChart component
 * @param volumeTrendData Raw volume trend data from database
 * @returns Formatted volume trend data for the chart
 */
export function formatVolumeTrendData(volumeTrendData: any[]): Array<{
  month: string;
  volume: number;
  residual: number;
}> {
  // Group by month and sum volumes
  const monthlyData = volumeTrendData.reduce((acc: Record<string, {volume: number, residual: number}>, curr) => {
    const month = curr.processing_month.substring(0, 7); // Get YYYY-MM part
    
    if (!acc[month]) {
      acc[month] = { volume: 0, residual: 0 };
    }
    
    acc[month].volume += curr.gross_volume || 0;
    // Residual might not be included in the volume data, this would need adjustment
    // if the actual data structure is different
    acc[month].residual += curr.residual || 0;
    
    return acc;
  }, {});
  
  // Convert to array and sort by month
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      volume: data.volume,
      residual: data.residual
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Format a CSV string for export
 * @param headers Array of header names
 * @param data Array of data rows (arrays)
 * @returns Formatted CSV string
 */
export function formatCSV(headers: string[], data: any[][]): string {
  // Format headers with proper escaping
  const formattedHeaders = headers.map(escapeCSVValue).join(',');
  
  // Format data rows with proper escaping
  const formattedRows = data.map(row => 
    row.map(cell => escapeCSVValue(cell.toString())).join(',')
  );
  
  // Combine headers and rows
  return [formattedHeaders, ...formattedRows].join('\n');
}

/**
 * Escape special characters in CSV values
 * @param value Value to escape
 * @returns Escaped value safe for CSV
 */
export function escapeCSVValue(value: string): string {
  // If the value contains commas, quotes, or newlines, wrap in quotes
  if (/[",\n\r]/.test(value)) {
    // Double any quotes within the value
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
