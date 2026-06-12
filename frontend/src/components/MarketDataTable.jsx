import { useEffect, useState, useMemo, useCallback } from 'react'
import { api } from '../utils/api'
import { formatINR } from '../utils/formatters'
import { formatNavDate } from '../utils/mfNavDisplay'
import { indianSymbolForExchange } from '../utils/indianExchange'
import { marketDataFootnote } from '../utils/holdingTabMessages'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import SkeletonRows from './SkeletonRows'

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function quoteToMarketFields(quote, holding) {
  if (!quote) return holding
  return {
    ...holding,
    open: quote.open ?? holding.open,
    dayHigh: quote.dayHigh ?? holding.dayHigh,
    dayLow: quote.dayLow ?? holding.dayLow,
    previousClose: quote.previousClose ?? holding.previousClose,
    yearHigh: quote.yearHigh ?? holding.yearHigh,
    yearLow: quote.yearLow ?? holding.yearLow,
    _quoteSymbol: quote.symbol,
  }
}

async function fetchMfNavHistory(schemeCode) {
  const today = new Date().toISOString().slice(0, 10)
  const dates = {
    nav1m: addDays(today, 30),
    nav3m: addDays(today, 90),
    nav6m: addDays(today, 180),
  }
  const out = { nav1m: null, nav3m: null, nav6m: null }
  await Promise.all(
    Object.entries(dates).map(async ([key, date]) => {
      try {
        const res = await api.getHistoricalNav(schemeCode, date)
        out[key] = res?.nav ?? null
      } catch {
        out[key] = null
      }
    })
  )
  return out
}

function StockMarketTable({ holdings, formatPrice, assetType, exchange = 'NSE' }) {
  const [quotesById, setQuotesById] = useState({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)

  useEffect(() => {
    if (assetType !== 'indianStock' || !holdings.length) {
      setQuotesById({})
      return undefined
    }

    let cancelled = false
    setLoadingQuotes(true)
    const symbols = holdings.map((h) => indianSymbolForExchange(h.symbol, exchange))

    api
      .getBatchPrices(symbols)
      .then((results) => {
        if (cancelled) return
        const next = {}
        holdings.forEach((h, i) => {
          const sym = symbols[i]
          next[h.id] = results[sym] || null
        })
        setQuotesById(next)
      })
      .catch(() => {
        if (!cancelled) setQuotesById({})
      })
      .finally(() => {
        if (!cancelled) setLoadingQuotes(false)
      })

    return () => {
      cancelled = true
    }
  }, [holdings, exchange, assetType])

  const rows = useMemo(() => {
    if (assetType === 'indianStock') {
      return holdings.map((h) => quoteToMarketFields(quotesById[h.id], h))
    }
    return holdings
  }, [holdings, quotesById, assetType])

  const getSortVal = useCallback((h, key) => {
    switch (key) {
      case 'symbol':
        return h.symbol
      case 'open':
        return h.open
      case 'dayHigh':
        return h.dayHigh
      case 'previousClose':
        return h.previousClose
      case 'yearHigh':
        return h.yearHigh
      case 'yearLow':
        return h.yearLow
      default:
        return h[key]
    }
  }, [])

  const sortNamespace = assetType === 'indianStock' ? `market-indian-${exchange}` : `market-${assetType}`
  const { sorted, sortKey, sortDir, setSort } = useSortable(
    rows,
    'symbol',
    'asc',
    getSortVal,
    sortNamespace
  )

  if (loadingQuotes && assetType === 'indianStock') {
    return (
      <table className="holdings-table holdings-table--market">
        <tbody>
          <SkeletonRows count={holdings.length || 4} cols={6} />
        </tbody>
      </table>
    )
  }

  return (
    <table className="holdings-table holdings-table--market">
      <caption className="sr-only">Market data for stock holdings</caption>
      <thead>
        <tr>
          <SortTh col="symbol" label="Company" className="cell-company" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="open" label="Open" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="dayHigh" label="High" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="previousClose" label="Prev. Close" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="yearHigh" label="52-week High" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="yearLow" label="52-week Low" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
        </tr>
      </thead>
      <tbody>
        {sorted.map((h) => (
          <tr key={h.id}>
            <td className="cell-company">
              <div className="cell-company-symbol">
                {h.symbol}
                {assetType === 'indianStock' && (
                  <span className="exchange-badge" title="Quote exchange">
                    {exchange}
                  </span>
                )}
              </div>
              <div className="cell-company-name">{h.name}</div>
              {h.isEtf && (
                <span className="us-etf-badge in-etf-badge" title="Exchange-traded fund">ETF</span>
              )}
            </td>
            <td className="right mono">{h.open != null ? formatPrice(h.open) : '—'}</td>
            <td className="right mono">{h.dayHigh != null ? formatPrice(h.dayHigh) : '—'}</td>
            <td className="right mono">{h.previousClose != null ? formatPrice(h.previousClose) : '—'}</td>
            <td className="right mono">{h.yearHigh != null ? formatPrice(h.yearHigh) : '—'}</td>
            <td className="right mono">{h.yearLow != null ? formatPrice(h.yearLow) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MfMarketTable({ holdings }) {
  const [navHistory, setNavHistory] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all(
      holdings.map(async (f) => {
        const hist = await fetchMfNavHistory(f.schemeCode)
        return [f.id, hist]
      })
    )
      .then((pairs) => {
        if (!cancelled) {
          setNavHistory(Object.fromEntries(pairs))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [holdings])

  const rows = useMemo(
    () =>
      holdings.map((f) => ({
        ...f,
        _hist: navHistory[f.id] || {},
        _prev: f.previousNAV ?? f.prevNAV,
      })),
    [holdings, navHistory]
  )

  const getSortVal = useCallback((f, key) => {
    const hist = f._hist || {}
    switch (key) {
      case 'symbol':
        return f.schemeName
      case 'currentNAV':
        return f.currentNAV
      case 'prevNAV':
        return f._prev
      case 'nav1m':
        return hist.nav1m
      case 'nav3m':
        return hist.nav3m
      case 'nav6m':
        return hist.nav6m
      default:
        return f[key]
    }
  }, [])

  const { sorted, sortKey, sortDir, setSort } = useSortable(
    rows,
    'symbol',
    'asc',
    getSortVal,
    'market-mf'
  )

  if (loading) {
    return (
      <table className="holdings-table holdings-table--market">
        <tbody>
          <SkeletonRows count={holdings.length || 4} cols={7} />
        </tbody>
      </table>
    )
  }

  return (
    <table className="holdings-table holdings-table--market">
      <caption className="sr-only">NAV history for mutual fund holdings</caption>
      <thead>
        <tr>
          <SortTh col="symbol" label="Scheme" className="cell-scheme" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="currentNAV" label="Last NAV" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <th className="right">NAV Date</th>
          <SortTh col="prevNAV" label="Previous NAV" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="nav1m" label="1 Month NAV" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="nav3m" label="3 Month NAV" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
          <SortTh col="nav6m" label="6 Month NAV" className="right" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
        </tr>
      </thead>
      <tbody>
        {sorted.map((f) => {
          const hist = f._hist || {}
          return (
            <tr key={f.id}>
              <td className="cell-scheme">
                <div className="cell-scheme-name" title={f.schemeName}>{f.schemeName}</div>
              </td>
              <td className="right mono">{f.currentNAV != null ? formatINR(f.currentNAV) : '—'}</td>
              <td className="right">{f.navDate ? formatNavDate(f.navDate, { shortYear: true }) : '—'}</td>
              <td className="right mono">{f._prev != null ? formatINR(f._prev) : '—'}</td>
              <td className="right mono">{hist.nav1m != null ? formatINR(hist.nav1m) : '—'}</td>
              <td className="right mono">{hist.nav3m != null ? formatINR(hist.nav3m) : '—'}</td>
              <td className="right mono">{hist.nav6m != null ? formatINR(hist.nav6m) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function MarketDataTable({
  holdings,
  assetType,
  formatPrice = formatINR,
  exchange = 'NSE',
}) {
  if (!holdings.length) {
    return <p className="filter-no-results">No holdings to show</p>
  }

  return (
    <div className="table-scroll">
      {assetType === 'mutualFund' ? (
        <MfMarketTable holdings={holdings} />
      ) : (
        <StockMarketTable
          holdings={holdings}
          formatPrice={formatPrice}
          assetType={assetType}
          exchange={exchange}
        />
      )}
      <p className="market-data-footnote text-muted-sm">
        {marketDataFootnote(assetType, exchange)}
      </p>
    </div>
  )
}
