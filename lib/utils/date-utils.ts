/**
 * Date utility functions for the Ireland Pay Analytics dashboard
 */

/**
 * Get the first day of the current month
 */
export function getFirstDayOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Get the last day of the current month
 */
export function getLastDayOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
}

/**
 * Get the total number of days in the current month
 */
export function getDaysInCurrentMonth(): number {
  return getLastDayOfMonth().getDate()
}

/**
 * Get the number of days elapsed in the current month (excluding today)
 */
export function getDaysElapsedInMonth(): number {
  const now = new Date()
  return now.getDate() - 1
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a date as MM/DD
 */
export function formatDateToMMDD(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/**
 * Generate an array of dates for the current month
 */
export function generateCurrentMonthDates(): Date[] {
  const result: Date[] = []
  const firstDay = getFirstDayOfMonth()
  const lastDay = getLastDayOfMonth()
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    result.push(new Date(d))
  }
  
  return result
}

/**
 * Calculate the end-of-month estimate based on MTD data
 * 
 * @param mtdTotal The month-to-date total
 * @param daysElapsed The number of days elapsed in the month (excluding today)
 * @param totalDaysInMonth The total number of days in the month
 * @returns The estimated end-of-month total
 */
export function calculateEOMEstimate(
  mtdTotal: number,
  daysElapsed: number,
  totalDaysInMonth: number
): number {
  if (daysElapsed <= 0) return mtdTotal
  return (mtdTotal / daysElapsed) * totalDaysInMonth
}
