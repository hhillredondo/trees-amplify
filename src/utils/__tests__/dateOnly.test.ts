import { describe, it, expect } from 'vitest'
import {
  parseDateOnly,
  formatDateOnly,
  formatYearOnly,
  getYearFromDateOnly,
  subtractMonthsFromDateOnly,
} from '../dateOnly'

describe('parseDateOnly', () => {
  it('parses a valid YYYY-MM-DD string', () => {
    expect(parseDateOnly('2000-06-15')).toEqual({ year: 2000, month: 6, day: 15 })
  })

  it('parses a datetime string (ignores time portion)', () => {
    expect(parseDateOnly('1990-12-25T10:30:00Z')).toEqual({ year: 1990, month: 12, day: 25 })
  })

  it('returns null for invalid format', () => {
    expect(parseDateOnly('not-a-date')).toBeNull()
    expect(parseDateOnly('')).toBeNull()
  })

  it('returns null for out-of-range month', () => {
    expect(parseDateOnly('2000-13-01')).toBeNull()
    expect(parseDateOnly('2000-00-01')).toBeNull()
  })

  it('returns null for out-of-range day', () => {
    expect(parseDateOnly('2000-01-00')).toBeNull()
    expect(parseDateOnly('2000-01-32')).toBeNull()
  })
})

describe('formatDateOnly', () => {
  it('formats a date as "Month Day, Year"', () => {
    expect(formatDateOnly('2000-01-15')).toBe('January 15, 2000')
    expect(formatDateOnly('1990-09-11')).toBe('September 11, 1990')
  })

  it('returns the original string for invalid dates', () => {
    expect(formatDateOnly('invalid')).toBe('invalid')
  })

  it('handles ancient dates', () => {
    expect(formatDateOnly('1000-09-11')).toBe('September 11, 1000')
  })
})

describe('formatYearOnly', () => {
  it('extracts the year', () => {
    expect(formatYearOnly('1985-03-22')).toBe('1985')
  })

  it('returns original string for invalid input', () => {
    expect(formatYearOnly('bad')).toBe('bad')
  })
})

describe('getYearFromDateOnly', () => {
  it('returns year as a number', () => {
    expect(getYearFromDateOnly('2024-07-04')).toBe(2024)
  })

  it('returns null for invalid input', () => {
    expect(getYearFromDateOnly('nope')).toBeNull()
  })
})

describe('subtractMonthsFromDateOnly', () => {
  it('subtracts months within the same year', () => {
    expect(subtractMonthsFromDateOnly('2020-06-15', 3)).toBe('2020-03-15')
  })

  it('rolls back to previous year', () => {
    expect(subtractMonthsFromDateOnly('2020-02-15', 3)).toBe('2019-11-15')
  })

  it('handles multi-year rollback', () => {
    expect(subtractMonthsFromDateOnly('2020-03-15', 15)).toBe('2018-12-15')
  })

  it('clamps day to last day of resulting month', () => {
    // March 31 minus 1 month = February 28/29
    const result = subtractMonthsFromDateOnly('2020-03-31', 1)
    expect(result).toBe('2020-02-29') // 2020 is a leap year
  })

  it('returns original string for invalid input', () => {
    expect(subtractMonthsFromDateOnly('bad', 3)).toBe('bad')
  })
})
