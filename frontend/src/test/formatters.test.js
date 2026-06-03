import { formatINR, formatPct, formatChange, formatUSD, formatDate, formatNumber, getGreeting } from '../utils/formatters'

describe('formatINR', () => {
  test('positive value with Indian comma grouping', () => {
    const result = formatINR(1234567.89)
    expect(result).toMatch(/12,34,567/)
  })

  test('negative value', () => {
    const result = formatINR(-5000)
    expect(result).toMatch(/-/)
    expect(result).toMatch(/5,000/)
  })

  test('zero', () => {
    const result = formatINR(0)
    expect(result).toBeDefined()
    expect(result).not.toBe('')
  })

  test('null returns dash', () => {
    expect(formatINR(null)).toBe('—')
  })

  test('NaN returns dash', () => {
    expect(formatINR(NaN)).toBe('—')
  })

  test('compact mode — crore', () => {
    const result = formatINR(15000000, true)
    expect(result).toMatch(/1\.50.*Cr/i)
  })

  test('compact mode — lakh', () => {
    const result = formatINR(350000, true)
    expect(result).toMatch(/3\.50.*Lac/i)
  })

  test('compact mode — thousands', () => {
    const result = formatINR(8500, true)
    expect(result).toMatch(/8\.50.*K/i)
  })
})

describe('formatPct', () => {
  test('positive percentage', () => {
    const result = formatPct(12.345)
    expect(result).toMatch(/12\.35/)
  })

  test('negative percentage', () => {
    const result = formatPct(-5.67)
    expect(result).toMatch(/-5\.67/)
  })

  test('null returns dash', () => {
    expect(formatPct(null)).toBe('—')
  })

  test('zero', () => {
    const result = formatPct(0)
    expect(result).toMatch(/0/)
  })
})

describe('formatChange', () => {
  test('positive shows + prefix', () => {
    const result = formatChange(250)
    expect(result).toMatch(/\+/)
  })

  test('negative shows - prefix', () => {
    const result = formatChange(-150)
    expect(result).toMatch(/-/)
  })

  test('null/undefined returns gracefully', () => {
    expect(() => formatChange(null)).not.toThrow()
    expect(() => formatChange(undefined)).not.toThrow()
    expect(formatChange(null)).toBe('—')
    expect(formatChange(undefined)).toBe('—')
  })
})

describe('formatUSD', () => {
  test('positive value with US comma grouping', () => {
    expect(formatUSD(1234.56)).toMatch(/1,234/)
  })

  test('null returns dash', () => {
    expect(formatUSD(null)).toBe('—')
    expect(() => formatUSD(null)).not.toThrow()
  })

  test('zero', () => {
    expect(formatUSD(0)).toBeDefined()
    expect(formatUSD(0)).not.toBe('')
  })
})

describe('formatDate', () => {
  test('valid ISO date string', () => {
    const result = formatDate('2026-01-15')
    expect(result).toBeDefined()
    expect(result).not.toBe('—')
  })

  test('null returns dash', () => {
    expect(formatDate(null)).toBe('—')
    expect(() => formatDate(null)).not.toThrow()
  })

  test('empty string returns dash', () => {
    expect(formatDate('')).toBe('—')
  })
})

describe('formatNumber', () => {
  test('formats integer with Indian grouping', () => {
    expect(formatNumber(1234567)).toMatch(/1,23,4,567|1,234,567|12,34,567/)
  })

  test('uses specified decimal places', () => {
    expect(formatNumber(3.14159, 2)).toMatch(/3\.14/)
  })

  test('null returns dash', () => {
    expect(formatNumber(null)).toBe('—')
  })
})

describe('getGreeting', () => {
  test('returns a non-empty string', () => {
    expect(typeof getGreeting()).toBe('string')
    expect(getGreeting().length).toBeGreaterThan(0)
  })

  test('includes name when provided', () => {
    expect(getGreeting('Gaurav')).toMatch(/Gaurav/)
  })

  test('works without name argument', () => {
    expect(() => getGreeting()).not.toThrow()
  })
})
