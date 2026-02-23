/**
 * Date-only parsing and formatting for birth/death/marriage dates.
 * Backend stores dates as YYYY-MM-DD. Using new Date(str) treats that as UTC midnight,
 * so in timezones behind UTC the displayed day can be one day earlier.
 * These helpers treat the value as a calendar date (no timezone shift).
 */

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})/

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

/** Extract [year, month, day] from "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS...". Returns null if invalid. */
export function parseDateOnly(dateStr: string): { year: number; month: number; day: number } | null {
  const part = dateStr.split('T')[0].trim()
  const m = DATE_ONLY_REGEX.exec(part)
  if (!m) return null
  const year = Number.parseInt(m[1], 10)
  const month = Number.parseInt(m[2], 10)
  const day = Number.parseInt(m[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

/** Format a date-only string for display (e.g. "September 11, 1000") without timezone shift. */
export function formatDateOnly(dateStr: string): string {
  const p = parseDateOnly(dateStr)
  if (!p) return dateStr
  const monthName = MONTH_NAMES[p.month] ?? String(p.month)
  return `${monthName} ${p.day}, ${p.year}`
}

/** Format a date-only string as year only (e.g. "1000"). */
export function formatYearOnly(dateStr: string): string {
  const p = parseDateOnly(dateStr)
  return p ? String(p.year) : dateStr
}

/** Get year number for date-only string (for age/lifespan math). */
export function getYearFromDateOnly(dateStr: string): number | null {
  const p = parseDateOnly(dateStr)
  return p ? p.year : null
}

/** Subtract months from a date-only string; returns YYYY-MM-DD. Used e.g. for marriage = birth - 9 months. */
export function subtractMonthsFromDateOnly(dateStr: string, months: number): string {
  const p = parseDateOnly(dateStr)
  if (!p) return dateStr
  let year = p.year
  let month = p.month - months
  while (month < 1) {
    month += 12
    year -= 1
  }
  while (month > 12) {
    month -= 12
    year += 1
  }
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = Math.min(p.day, daysInMonth)
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}
