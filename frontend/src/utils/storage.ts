import type {
  StockHolding,
  MutualFundHolding,
  OtherAssetHolding,
  AppSettings,
  PortfolioExport,
  ImportResult,
} from '../types/portfolio'

export const STORAGE_ERROR = 'pt_storage_error'

const KEYS = {
  INDIAN_STOCKS: 'pt_indianStocks',
  US_STOCKS: 'pt_usStocks',
  MUTUAL_FUNDS: 'pt_mutualFunds',
  SIPS: 'pt_sips',
  OTHER_ASSETS: 'pt_otherAssets',
  INSURANCE: 'pt_insurance',
  WATCHLIST: 'pt_watchlist',
  TRANSACTIONS: 'pt_transactions',
  SETTINGS: 'pt_settings',
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error('[storage] Failed to save key:', key, err)
    window.dispatchEvent(new CustomEvent(STORAGE_ERROR))
    return false
  }
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  theme: 'light',
  showUsdInInr: false,
  autoRefreshInterval: 30,
  avatarColor: '',
  hasSeenWelcome: false,
  lastExportAt: null,
  lastUsdInr: null,
}

export const storage = {
  getIndianStocks: (): StockHolding[] => load<StockHolding[]>(KEYS.INDIAN_STOCKS, []),
  setIndianStocks: (v: StockHolding[]): boolean => save(KEYS.INDIAN_STOCKS, v),

  getUSStocks: (): StockHolding[] => load<StockHolding[]>(KEYS.US_STOCKS, []),
  setUSStocks: (v: StockHolding[]): boolean => save(KEYS.US_STOCKS, v),

  getMutualFunds: (): MutualFundHolding[] => load<MutualFundHolding[]>(KEYS.MUTUAL_FUNDS, []),
  setMutualFunds: (v: MutualFundHolding[]): boolean => save(KEYS.MUTUAL_FUNDS, v),

  getSIPs: (): unknown[] => load<unknown[]>(KEYS.SIPS, []),
  setSIPs: (v: unknown[]): boolean => save(KEYS.SIPS, v),

  getOtherAssets: (): OtherAssetHolding[] => load<OtherAssetHolding[]>(KEYS.OTHER_ASSETS, []),
  setOtherAssets: (v: OtherAssetHolding[]): boolean => save(KEYS.OTHER_ASSETS, v),

  getInsurance: (): unknown[] => load<unknown[]>(KEYS.INSURANCE, []),
  setInsurance: (v: unknown[]): boolean => save(KEYS.INSURANCE, v),

  getWatchlist: (): unknown[] => load<unknown[]>(KEYS.WATCHLIST, []),
  setWatchlist: (v: unknown[]): boolean => save(KEYS.WATCHLIST, v),

  getTransactions: (): unknown[] => load<unknown[]>(KEYS.TRANSACTIONS, []),
  setTransactions: (v: unknown[]): boolean => save(KEYS.TRANSACTIONS, v),

  getSettings: (): AppSettings => {
    const stored = load<Partial<AppSettings> | null>(KEYS.SETTINGS, null)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      hasSeenWelcome: stored.hasSeenWelcome ?? Boolean(stored.userName),
    }
  },
  setSettings: (v: AppSettings): boolean => save(KEYS.SETTINGS, v),

  exportAll: (): PortfolioExport => ({
    indianStocks: load<StockHolding[]>(KEYS.INDIAN_STOCKS, []),
    usStocks: load<StockHolding[]>(KEYS.US_STOCKS, []),
    mutualFunds: load<MutualFundHolding[]>(KEYS.MUTUAL_FUNDS, []),
    sips: load<unknown[]>(KEYS.SIPS, []),
    otherAssets: load<OtherAssetHolding[]>(KEYS.OTHER_ASSETS, []),
    insurance: load<unknown[]>(KEYS.INSURANCE, []),
    watchlist: load<unknown[]>(KEYS.WATCHLIST, []),
    transactions: load<unknown[]>(KEYS.TRANSACTIONS, []),
    settings: load<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS),
    exportedAt: new Date().toISOString(),
  }),

  importAll: (data: unknown): ImportResult => {
    if (!isPlainObject(data)) {
      throw new Error('Invalid portfolio file')
    }

    const arrayKeys = [
      'indianStocks', 'usStocks', 'mutualFunds', 'sips',
      'otherAssets', 'insurance', 'watchlist', 'transactions',
    ] as const
    for (const key of arrayKeys) {
      if (key in data && !Array.isArray(data[key])) {
        throw new Error('Invalid portfolio file')
      }
    }
    if ('settings' in data && !isPlainObject(data['settings'])) {
      throw new Error('Invalid portfolio file')
    }

    const REQUIRED_STOCK_FIELDS: (keyof StockHolding)[] = ['id', 'symbol', 'qty', 'buyPrice']
    const REQUIRED_MF_FIELDS: (keyof MutualFundHolding)[] = ['id', 'schemeCode', 'schemeName', 'units', 'buyNAV']
    const REQUIRED_ASSET_FIELDS: (keyof OtherAssetHolding)[] = ['id', 'name', 'type', 'investedAmount']

    function validateItems<T>(
      items: unknown[],
      requiredFields: string[],
    ): { valid: T[]; filteredOut: number } {
      const valid = items.filter(
        (item): item is T =>
          isPlainObject(item) &&
          requiredFields.every((f) => item[f] !== undefined && item[f] !== null),
      )
      return { valid, filteredOut: items.length - valid.length }
    }

    // Mutate a working copy so original callers see filtered results
    const d = { ...data } as Record<string, unknown>
    let filteredOutCount = 0

    if (Array.isArray(d['indianStocks'])) {
      const r = validateItems<StockHolding>(d['indianStocks'], REQUIRED_STOCK_FIELDS)
      d['indianStocks'] = r.valid
      filteredOutCount += r.filteredOut
    }
    if (Array.isArray(d['usStocks'])) {
      const r = validateItems<StockHolding>(d['usStocks'], REQUIRED_STOCK_FIELDS)
      d['usStocks'] = r.valid
      filteredOutCount += r.filteredOut
    }
    if (Array.isArray(d['mutualFunds'])) {
      const r = validateItems<MutualFundHolding>(d['mutualFunds'], REQUIRED_MF_FIELDS)
      d['mutualFunds'] = r.valid
      filteredOutCount += r.filteredOut
    }
    if (Array.isArray(d['otherAssets'])) {
      const r = validateItems<OtherAssetHolding>(d['otherAssets'], REQUIRED_ASSET_FIELDS)
      d['otherAssets'] = r.valid
      filteredOutCount += r.filteredOut
    }

    const storageMap: Record<string, string> = {
      indianStocks: KEYS.INDIAN_STOCKS,
      usStocks:     KEYS.US_STOCKS,
      mutualFunds:  KEYS.MUTUAL_FUNDS,
      sips:         KEYS.SIPS,
      otherAssets:  KEYS.OTHER_ASSETS,
      insurance:    KEYS.INSURANCE,
      watchlist:    KEYS.WATCHLIST,
      transactions: KEYS.TRANSACTIONS,
      settings:     KEYS.SETTINGS,
    }

    let imported = 0
    let skipped = 0

    for (const [field, storageKey] of Object.entries(storageMap)) {
      if (d[field] !== undefined) {
        save(storageKey, d[field])
        imported++
      } else {
        skipped++
      }
    }

    return { imported, skipped: skipped + filteredOutCount }
  },

  CATEGORY_KEYS: {
    indianStocks: 'pt_indianStocks',
    usStocks:     'pt_usStocks',
    mutualFunds:  'pt_mutualFunds',
    otherAssets:  'pt_otherAssets',
  } as Record<string, string>,

  exportCategory: (cat: string): { category: string; data: unknown; exportedAt: string } => {
    const keyMap: Record<string, string> = {
      indianStocks: KEYS.INDIAN_STOCKS,
      usStocks:     KEYS.US_STOCKS,
      mutualFunds:  KEYS.MUTUAL_FUNDS,
      otherAssets:  KEYS.OTHER_ASSETS,
    }
    if (!keyMap[cat]) throw new Error(`Unknown category: ${cat}`)
    return {
      category: cat,
      data: load<unknown[]>(keyMap[cat] as string, []),
      exportedAt: new Date().toISOString(),
    }
  },

  importCategory: (cat: string, data: unknown): void => {
    const keyMap: Record<string, string> = {
      indianStocks: KEYS.INDIAN_STOCKS,
      usStocks:     KEYS.US_STOCKS,
      mutualFunds:  KEYS.MUTUAL_FUNDS,
      otherAssets:  KEYS.OTHER_ASSETS,
    }
    if (!keyMap[cat]) throw new Error(`Unknown category: ${cat}`)
    if (!Array.isArray(data)) throw new Error('Category data must be an array')
    save(keyMap[cat] as string, data)
  },
}
