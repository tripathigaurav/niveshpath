import { useEffect, useState, useMemo, useCallback } from 'react'
import { formatINR } from '../utils/formatters'
import { formatNavDate } from '../utils/mfNavDisplay'
import { indianSymbolForExchange } from '../utils/indianExchange'
import {
  marketDataColumnsHint,
  marketDataFootnote,
} from '../utils/holdingTabMessages'
import { isExtendedStockMarketDataMissing, isMfNavHistoryMissing } from '../utils/marketDataStatus'
import HoldingsDataIssue from './HoldingsDataIssue'
import { fetchBatchPricesWithFallback, mergeQuoteIntoHolding } from '../utils/priceProvider'
import { fetchMfNavHistory } from '../utils/mfNavHistory'
import { useSortable } from '../hooks/useSortable'
import SortTh from './SortTh'
import SkeletonRows from './SkeletonRows'

function enrichHoldingMarketFields(holding) {
  if (
    holding.previousClose != null ||
    holding.currentPrice == null ||
    holding.dayChange == null
  ) {
    return holding
  }
  return { ...holding, previousClose: holding.currentPrice - holding.dayChange }
}

function quoteToMarketFields(quote, holding) {
  const base = enrichHoldingMarketFields(holding)
  if (!quote) return base
  return {
    ...mergeQuoteIntoHolding(base, quote),
    _quoteSymbol: quote.symbol,
  }
}

async function mapPool(items, mapper, concurrency = 3) {
  const out = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await mapper(items[i], i)
    }
  }
  const workers = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return out
}

function StockMarketTable({
  holdings,
  formatPrice,
  assetType,
  exchange = 'NSE',
  quoteRefreshKey = 0,
  onRetry,
  loading = false,
}) {
  const [quotesById, setQuotesById] = useState({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)

  useEffect(() => {
    const needsQuotes = assetType === 'indianStock' || assetType === 'usStock'
    if (!needsQuotes || !holdings.length) {
      setQuotesById({})
      return undefined
    }

    let cancelled = false
    setLoadingQuotes(true)
    const symbols = holdings.map((h) =>
      assetType === 'indianStock'
        ? indianSymbolForExchange(h.symbol, exchange)
        : h.symbol
    )

    fetchBatchPricesWithFallback(symbols)
      .then(({ quotes }) => {
        if (cancelled) return
        const next = {}
        holdings.forEach((h, i) => {
          const sym = symbols[i]
          next[h.id] = quotes[sym] || null
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
  }, [holdings, exchange, assetType, quoteRefreshKey])

  const rows = useMemo(() => {
    if (assetType === 'indianStock' || assetType === 'usStock') {
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

  const extendedMissing =
    !loadingQuotes &&
    isExtendedStockMarketDataMissing(rows) &&
    rows.some((h) => h.currentPrice != null)

  if (loadingQuotes && (assetType === 'indianStock' || assetType === 'usStock')) {
    return (
      <table className="holdings-table holdings-table--market">
        <tbody>
          <SkeletonRows count={holdings.length || 4} cols={6} />
        </tbody>
      </table>
    )
  }

  return (
    <>
      {extendedMissing && (
        <HoldingsDataIssue
          assetType={assetType}
          status={{
            ready: false,
            level: 'info',
            code: 'extended_missing',
            assetType,
          }}
          context="market"
          onRetry={onRetry}
          loading={loading || loadingQuotes}
          className="market-data-notice"
        />
      )}
      <p className="market-data-columns-hint text-muted-sm">
        {marketDataColumnsHint(assetType)}
      </p>
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
    </>
  )
}

function MfMarketTable({ holdings, onRetry, navRefreshKey = 0, refreshing = false }) {
  const [navHistory, setNavHistory] = useState({})
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingHistory(true)
    mapPool(holdings, async (f) => {
      const hist = await fetchMfNavHistory(f.schemeCode)
      return [f.id, hist]
    }, 2)
      .then((pairs) => {
        if (!cancelled) {
          setNavHistory(Object.fromEntries(pairs))
        }
      })
      .catch(() => {
        if (!cancelled) setNavHistory({})
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })
    return () => {
      cancelled = true
    }
  }, [holdings, navRefreshKey])

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

  const navHistoryMissing =
    !loadingHistory && !refreshing && isMfNavHistoryMissing(holdings, navHistory)

  if (loadingHistory) {
    return (
      <table className="holdings-table holdings-table--market">
        <tbody>
          <SkeletonRows count={holdings.length || 4} cols={7} />
        </tbody>
      </table>
    )
  }

  return (
    <>
      {navHistoryMissing && (
        <HoldingsDataIssue
          assetType="mutualFund"
          status={{
            ready: false,
            level: 'info',
            code: 'extended_missing',
            assetType: 'mutualFund',
          }}
          context="market"
          onRetry={onRetry}
          loading={refreshing || loadingHistory}
          className="market-data-notice"
        />
      )}
      <p className="market-data-columns-hint text-muted-sm">
        {marketDataColumnsHint('mutualFund')}
      </p>
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
    </>
  )
}

export default function MarketDataTable({
  holdings,
  assetType,
  formatPrice = formatINR,
  exchange = 'NSE',
  onRetry,
  quoteRefreshKey = 0,
  loading = false,
}) {
  if (!holdings.length) {
    return <p className="filter-no-results">No holdings to show</p>
  }

  return (
    <div className="table-scroll">
      {assetType === 'mutualFund' ? (
        <MfMarketTable
          holdings={holdings}
          onRetry={onRetry}
          navRefreshKey={quoteRefreshKey}
          refreshing={loading}
        />
      ) : (
        <StockMarketTable
          holdings={holdings}
          formatPrice={formatPrice}
          assetType={assetType}
          exchange={exchange}
          onRetry={onRetry}
          quoteRefreshKey={quoteRefreshKey}
          loading={loading}
        />
      )}
      <p className="market-data-footnote text-muted-sm">
        {marketDataFootnote(assetType, exchange)}
      </p>
    </div>
  )
}
