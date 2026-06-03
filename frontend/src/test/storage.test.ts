import { storage, STORAGE_ERROR } from '../utils/storage'

describe('storage basic operations', () => {
  test('setIndianStocks + getIndianStocks round-trip', () => {
    const stocks = [
      { id: '1', symbol: 'RELIANCE.NS', qty: 10, buyPrice: 2500 },
      { id: '2', symbol: 'TCS.NS', qty: 5, buyPrice: 3200 },
    ]
    storage.setIndianStocks(stocks)
    expect(storage.getIndianStocks()).toEqual(stocks)
  })

  test('get returns empty array when nothing stored', () => {
    expect(storage.getIndianStocks()).toEqual([])
    expect(storage.getUSStocks()).toEqual([])
    expect(storage.getMutualFunds()).toEqual([])
    expect(storage.getOtherAssets()).toEqual([])
    expect(storage.getWatchlist()).toEqual([])
  })

  test('getSettings returns defaults when nothing stored', () => {
    const settings = storage.getSettings()
    expect(settings.theme).toBe('light')
    expect(settings.userName).toBe('')
    expect(settings.hasSeenWelcome).toBe(false)
  })

  test('corrupted JSON returns fallback', () => {
    localStorage.setItem('pt_indianStocks', '{broken json')
    expect(storage.getIndianStocks()).toEqual([])
  })
})

describe('exportAll / importAll', () => {
  test('round-trip: export then import produces same data', () => {
    const stocks = [{ id: '1', symbol: 'INFY.NS', qty: 20, buyPrice: 1500 }]
    const funds = [{
      id: '2',
      schemeCode: '119551',
      schemeName: 'Axis Bluechip',
      units: 100,
      buyNAV: 45,
    }]
    storage.setIndianStocks(stocks)
    storage.setMutualFunds(funds)

    const exported = storage.exportAll()
    localStorage.clear()
    storage.importAll(exported)

    expect(storage.getIndianStocks()).toEqual(stocks)
    expect(storage.getMutualFunds()).toEqual(funds)
  })

  test('exportAll includes timestamp', () => {
    const exported = storage.exportAll()
    expect(exported.exportedAt).toBeDefined()
    expect(new Date(exported.exportedAt).getTime()).not.toBeNaN()
  })

  test('importAll rejects non-object', () => {
    expect(() => storage.importAll('not an object')).toThrow('Invalid portfolio file')
    expect(() => storage.importAll(null)).toThrow('Invalid portfolio file')
    expect(() => storage.importAll(42)).toThrow('Invalid portfolio file')
  })

  test('importAll rejects array where object expected', () => {
    expect(() => storage.importAll([1, 2, 3])).toThrow('Invalid portfolio file')
  })

  test('importAll rejects non-array stocks', () => {
    expect(() => storage.importAll({ indianStocks: 'not array' })).toThrow('Invalid portfolio file')
  })

  test('importAll rejects non-object settings', () => {
    expect(() => storage.importAll({ settings: [1, 2] })).toThrow('Invalid portfolio file')
  })

  test('importAll returns imported/skipped counts', () => {
    const result = storage.importAll({ indianStocks: [], usStocks: [] })
    expect(result.imported).toBe(2)
    expect(result.skipped).toBeGreaterThanOrEqual(0)
  })

  test('importAll with partial data only imports provided keys', () => {
    storage.setIndianStocks([{ id: '1', symbol: 'X', qty: 1, buyPrice: 1 }])
    storage.importAll({ usStocks: [{ id: '2', symbol: 'AAPL', qty: 5, buyPrice: 150 }] })
    expect(storage.getIndianStocks()).toEqual([{ id: '1', symbol: 'X', qty: 1, buyPrice: 1 }])
    expect(storage.getUSStocks()).toEqual([{ id: '2', symbol: 'AAPL', qty: 5, buyPrice: 150 }])
  })

  test('importAll filters items missing required fields', () => {
    const result = storage.importAll({
      indianStocks: [
        { id: '1', symbol: 'INFY.NS', qty: 10, buyPrice: 100 },
        { id: '2', qty: 5, buyPrice: 200 },
      ],
    })
    expect(storage.getIndianStocks()).toHaveLength(1)
    expect(storage.getIndianStocks()[0].symbol).toBe('INFY.NS')
    expect(result.skipped).toBeGreaterThanOrEqual(8)
  })
})

describe('storage error event', () => {
  test('save dispatches pt_storage_error on quota error', () => {
    const origSetItem = localStorage.setItem
    localStorage.setItem = () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    }

    let eventFired = false
    window.addEventListener(STORAGE_ERROR, () => { eventFired = true })

    const result = storage.setIndianStocks([{ id: '1' }])
    expect(result).toBe(false)
    expect(eventFired).toBe(true)

    localStorage.setItem = origSetItem
  })
})

describe('exportCategory / importCategory', () => {
  test('exportCategory returns category + data + timestamp', () => {
    storage.setIndianStocks([
      { id: '1', symbol: 'INFY.NS', name: 'Infosys', qty: 10, buyPrice: 1500,
        currentPrice: null, dayChange: null, dayChangePct: null },
    ])
    const result = storage.exportCategory('indianStocks')
    expect(result.category).toBe('indianStocks')
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.exportedAt).toBeDefined()
  })

  test('importCategory stores data and is retrievable', () => {
    const stocks = [
      { id: '2', symbol: 'TCS.NS', name: 'TCS', qty: 5, buyPrice: 3200,
        currentPrice: null, dayChange: null, dayChangePct: null },
    ]
    storage.importCategory('indianStocks', stocks)
    expect(storage.getIndianStocks()).toEqual(stocks)
  })

  test('exportCategory throws on unknown category', () => {
    expect(() => storage.exportCategory('bogusCategory')).toThrow()
  })

  test('importCategory throws on unknown category', () => {
    expect(() => storage.importCategory('bogusCategory', [])).toThrow()
  })

  test('importCategory throws when data is not an array', () => {
    expect(() => storage.importCategory('indianStocks', 'not-an-array')).toThrow()
  })
})
