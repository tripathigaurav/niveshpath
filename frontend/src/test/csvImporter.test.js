import { describe, it, expect } from 'vitest'
import { detectBroker, parseCsvText, mapRowsToHoldings, mapRowsToHoldingsManual } from '../utils/csvImporter'

describe('detectBroker', () => {
  it('detects zerodha from tradingsymbol + quantity', () => {
    const { key } = detectBroker(['tradingsymbol', 'quantity', 'average price'])
    expect(key).toBe('zerodha')
  })

  it('detects groww from stock name + quantity', () => {
    const { key } = detectBroker(['Stock Name', 'Quantity', 'Price'])
    expect(key).toBe('groww')
  })

  it('falls back to manual when headers unrecognized', () => {
    const { key } = detectBroker(['foo', 'bar', 'baz'])
    expect(key).toBe('manual')
  })
})

describe('parseCsvText', () => {
  it('parses simple CSV', () => {
    const rows = parseCsvText('symbol,qty,price\nTCS,10,3400\nINFY,5,1500')
    expect(rows).toHaveLength(2)
    expect(rows[0].symbol).toBe('TCS')
  })

  it('throws on malformed quotes', () => {
    expect(() => parseCsvText('"unclosed')).toThrow()
  })
})

describe('mapRowsToHoldings', () => {
  it('aggregates duplicate symbols', () => {
    const rows = [
      { tradingsymbol: 'TCS', quantity: '5', 'average price': '3400', 'trade date': '2024-01-01' },
      { tradingsymbol: 'TCS', quantity: '3', 'average price': '3500', 'trade date': '2024-02-01' },
    ]
    const { holdings, skipped } = mapRowsToHoldings(rows, 'zerodha')
    expect(holdings).toHaveLength(1)
    expect(holdings[0].qty).toBe(8)
    expect(skipped).toBe(0)
  })

  it('skips sell rows', () => {
    const rows = [
      { tradingsymbol: 'TCS', quantity: '5', 'average price': '3400', 'trade type': 'sell' },
    ]
    const { holdings, skipped } = mapRowsToHoldings(rows, 'zerodha')
    expect(holdings).toHaveLength(0)
    expect(skipped).toBe(1)
  })

  it('skips rows with qty <= 0', () => {
    const rows = [
      { tradingsymbol: 'TCS', quantity: '0', 'average price': '3400' },
      { tradingsymbol: 'INFY', quantity: '-5', 'average price': '1500' },
    ]
    const { holdings, skipped } = mapRowsToHoldings(rows, 'zerodha')
    expect(holdings).toHaveLength(0)
    expect(skipped).toBe(2)
  })

  it('clamps future dates to today', () => {
    const rows = [
      { tradingsymbol: 'TCS', quantity: '10', 'average price': '3400', 'trade date': '2099-01-01' },
    ]
    const { holdings } = mapRowsToHoldings(rows, 'zerodha')
    expect(holdings[0].buyDate).not.toBe('2099-01-01')
    expect(holdings[0].buyDate <= new Date().toISOString().slice(0, 10)).toBe(true)
  })
})

describe('mapRowsToHoldingsManual', () => {
  it('maps with explicit column names', () => {
    const rows = [
      { sym: 'RELIANCE', qty: '10', price: '2500', dt: '2024-03-01' },
    ]
    const { holdings } = mapRowsToHoldingsManual(rows, {
      symbol: 'sym', qty: 'qty', price: 'price', date: 'dt',
    })
    expect(holdings).toHaveLength(1)
    expect(holdings[0].symbol).toBe('RELIANCE')
    expect(holdings[0].qty).toBe(10)
  })

  it('throws if symbol/qty columns missing', () => {
    expect(() => mapRowsToHoldingsManual([{}], {})).toThrow('Symbol and Qty columns are required')
  })
})
