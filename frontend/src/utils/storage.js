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
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error('[storage] Failed to save key:', key, err)
    window.dispatchEvent(new CustomEvent(STORAGE_ERROR))
    return false
  }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export const storage = {
  getIndianStocks: () => load(KEYS.INDIAN_STOCKS, []),
  setIndianStocks: (v) => save(KEYS.INDIAN_STOCKS, v),

  getUSStocks: () => load(KEYS.US_STOCKS, []),
  setUSStocks: (v) => save(KEYS.US_STOCKS, v),

  getMutualFunds: () => load(KEYS.MUTUAL_FUNDS, []),
  setMutualFunds: (v) => save(KEYS.MUTUAL_FUNDS, v),

  getSIPs: () => load(KEYS.SIPS, []),
  setSIPs: (v) => save(KEYS.SIPS, v),

  getOtherAssets: () => load(KEYS.OTHER_ASSETS, []),
  setOtherAssets: (v) => save(KEYS.OTHER_ASSETS, v),

  getInsurance: () => load(KEYS.INSURANCE, []),
  setInsurance: (v) => save(KEYS.INSURANCE, v),

  getWatchlist: () => load(KEYS.WATCHLIST, []),
  setWatchlist: (v) => save(KEYS.WATCHLIST, v),

  getTransactions: () => load(KEYS.TRANSACTIONS, []),
  setTransactions: (v) => save(KEYS.TRANSACTIONS, v),

  getSettings: () => {
    const defaults = {
      userName: '',
      theme: 'light',
      showUsdInInr: false,
      autoRefreshInterval: 30,
      avatarColor: '',
      hasSeenWelcome: false,
      lastExportAt: null,
      lastUsdInr: null,
    }
    const stored = load(KEYS.SETTINGS, null)
    if (!stored) return defaults
    return {
      ...defaults,
      ...stored,
      // Existing users who already have a name set have seen the welcome modal
      hasSeenWelcome: stored.hasSeenWelcome ?? Boolean(stored.userName),
    }
  },
  setSettings: (v) => save(KEYS.SETTINGS, v),

  exportAll: () => ({
    indianStocks: load(KEYS.INDIAN_STOCKS, []),
    usStocks: load(KEYS.US_STOCKS, []),
    mutualFunds: load(KEYS.MUTUAL_FUNDS, []),
    sips: load(KEYS.SIPS, []),
    otherAssets: load(KEYS.OTHER_ASSETS, []),
    insurance: load(KEYS.INSURANCE, []),
    watchlist: load(KEYS.WATCHLIST, []),
    transactions: load(KEYS.TRANSACTIONS, []),
    settings: load(KEYS.SETTINGS, {}),
    exportedAt: new Date().toISOString(),
  }),

  importAll: (data) => {
    if (!isPlainObject(data)) {
      throw new Error('Invalid portfolio file')
    }

    const arrayKeys = [
      'indianStocks', 'usStocks', 'mutualFunds', 'sips', 'otherAssets', 'insurance', 'watchlist', 'transactions',
    ]
    for (const key of arrayKeys) {
      if (key in data && !Array.isArray(data[key])) {
        throw new Error('Invalid portfolio file')
      }
    }
    if ('settings' in data && !isPlainObject(data.settings)) {
      throw new Error('Invalid portfolio file')
    }

    const REQUIRED_STOCK_FIELDS = ['id', 'symbol', 'qty', 'buyPrice']
    const REQUIRED_MF_FIELDS = ['id', 'schemeCode', 'schemeName', 'units', 'buyNAV']
    const REQUIRED_ASSET_FIELDS = ['id', 'name', 'type', 'investedAmount']

    function validateItems(items, requiredFields) {
      if (!Array.isArray(items)) return { valid: [], filteredOut: 0 }
      const valid = items.filter((item) =>
        isPlainObject(item) &&
        requiredFields.every((f) => item[f] !== undefined && item[f] !== null)
      )
      return { valid, filteredOut: items.length - valid.length }
    }

    let filteredOutCount = 0
    if (data.indianStocks) {
      const r = validateItems(data.indianStocks, REQUIRED_STOCK_FIELDS)
      data.indianStocks = r.valid
      filteredOutCount += r.filteredOut
    }
    if (data.usStocks) {
      const r = validateItems(data.usStocks, REQUIRED_STOCK_FIELDS)
      data.usStocks = r.valid
      filteredOutCount += r.filteredOut
    }
    if (data.mutualFunds) {
      const r = validateItems(data.mutualFunds, REQUIRED_MF_FIELDS)
      data.mutualFunds = r.valid
      filteredOutCount += r.filteredOut
    }
    if (data.otherAssets) {
      const r = validateItems(data.otherAssets, REQUIRED_ASSET_FIELDS)
      data.otherAssets = r.valid
      filteredOutCount += r.filteredOut
    }

    const storageMap = {
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
      if (data[field] !== undefined) {
        save(storageKey, data[field])
        imported++
      } else {
        skipped++
      }
    }

    return { imported, skipped: skipped + filteredOutCount }
  },

  // Category-wise helpers — each category key matches the exportAll field names
  CATEGORY_KEYS: {
    indianStocks: 'pt_indianStocks',
    usStocks:     'pt_usStocks',
    mutualFunds:  'pt_mutualFunds',
    otherAssets:  'pt_otherAssets',
  },

  exportCategory: (cat) => {
    const keyMap = {
      indianStocks: KEYS.INDIAN_STOCKS,
      usStocks:     KEYS.US_STOCKS,
      mutualFunds:  KEYS.MUTUAL_FUNDS,
      otherAssets:  KEYS.OTHER_ASSETS,
    }
    if (!keyMap[cat]) throw new Error(`Unknown category: ${cat}`)
    return {
      category: cat,
      data: load(keyMap[cat], []),
      exportedAt: new Date().toISOString(),
    }
  },

  importCategory: (cat, data) => {
    const keyMap = {
      indianStocks: KEYS.INDIAN_STOCKS,
      usStocks:     KEYS.US_STOCKS,
      mutualFunds:  KEYS.MUTUAL_FUNDS,
      otherAssets:  KEYS.OTHER_ASSETS,
    }
    if (!keyMap[cat]) throw new Error(`Unknown category: ${cat}`)
    if (!Array.isArray(data)) throw new Error('Category data must be an array')
    save(keyMap[cat], data)
  },
}
