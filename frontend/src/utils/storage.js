export const STORAGE_ERROR = 'pt_storage_error'

const KEYS = {
  INDIAN_STOCKS: 'pt_indianStocks',
  US_STOCKS: 'pt_usStocks',
  MUTUAL_FUNDS: 'pt_mutualFunds',
  SIPS: 'pt_sips',
  OTHER_ASSETS: 'pt_otherAssets',
  WATCHLIST: 'pt_watchlist',
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

  getWatchlist: () => load(KEYS.WATCHLIST, []),
  setWatchlist: (v) => save(KEYS.WATCHLIST, v),

  getSettings: () => {
    const defaults = {
      userName: '',
      theme: 'light',
      showUsdInInr: false,
      autoRefreshInterval: 30,
      avatarColor: '',
      hasSeenWelcome: false,
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
    watchlist: load(KEYS.WATCHLIST, []),
    settings: load(KEYS.SETTINGS, {}),
    exportedAt: new Date().toISOString(),
  }),

  importAll: (data) => {
    if (!isPlainObject(data)) {
      throw new Error('Invalid portfolio file')
    }

    const arrayKeys = ['indianStocks', 'usStocks', 'mutualFunds', 'sips', 'otherAssets', 'watchlist']
    for (const key of arrayKeys) {
      if (key in data && !Array.isArray(data[key])) {
        throw new Error('Invalid portfolio file')
      }
    }
    if ('settings' in data && !isPlainObject(data.settings)) {
      throw new Error('Invalid portfolio file')
    }

    const storageMap = {
      indianStocks: KEYS.INDIAN_STOCKS,
      usStocks:     KEYS.US_STOCKS,
      mutualFunds:  KEYS.MUTUAL_FUNDS,
      sips:         KEYS.SIPS,
      otherAssets:  KEYS.OTHER_ASSETS,
      watchlist:    KEYS.WATCHLIST,
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

    return { imported, skipped }
  },
}
