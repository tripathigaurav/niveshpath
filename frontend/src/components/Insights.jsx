import { useMemo } from 'react'
import { usePortfolioPerformers } from '../hooks/usePortfolioPerformers'
import { formatPct } from '../utils/formatters'
import { pnlColorClass } from '../utils/pnl'
import StockScreener from './StockScreener'
import UpcomingIPOs from './UpcomingIPOs'
import { getHarvestCandidates, getRealizedGainsFY } from '../utils/taxHarvesting'

const COMING_SOON = [
  {
    id: 'news-in',
    icon: '🇮🇳',
    title: 'Indian Market News',
    desc: 'Headlines and moves for your NSE/BSE holdings',
  },
  {
    id: 'news-us',
    icon: '🇺🇸',
    title: 'US Market Highlights',
    desc: 'NASDAQ/NYSE news tied to your US portfolio',
  },
  {
    id: 'news-mf',
    icon: '📋',
    title: 'MF Updates',
    desc: 'NAV changes, fund announcements, and alerts',
  },
  {
    id: 'news-other',
    icon: '🏦',
    title: 'Other Assets',
    desc: 'FD rates, gold, and manual asset insights',
  },
]

function formatAbsPnl(val) {
  if (val == null) return null
  const abs = Math.abs(val)
  if (abs >= 1e7) return `${val >= 0 ? '+' : '-'}₹${(abs / 1e7).toFixed(2)}Cr`
  if (abs >= 1e5) return `${val >= 0 ? '+' : '-'}₹${(abs / 1e5).toFixed(2)}L`
  if (abs >= 1e3) return `${val >= 0 ? '+' : '-'}₹${(abs / 1e3).toFixed(1)}K`
  return `${val >= 0 ? '+' : '-'}₹${abs.toFixed(0)}`
}

function PerformerRow({ p }) {
  return (
    <li className="perf-row">
      <span className="perf-row-icon" aria-hidden="true">{p.icon}</span>
      <span className="perf-row-name" title={p.name}>{p.name || p.symbol}</span>
      <span className={`perf-row-pct ${pnlColorClass(p.pnlPct)}`}>
        {formatPct(p.pnlPct)}
      </span>
      {p.pnlAbs != null && (
        <span className="perf-row-abs">{formatAbsPnl(p.pnlAbs)}</span>
      )}
    </li>
  )
}

function PerformerColumn({ title, items, emptyMsg }) {
  return (
    <div className="perf-col">
      <div className="perf-col-title">{title} <span className="perf-col-metric">by return %</span></div>
      {items.length === 0 ? (
        <p className="perf-col-empty">{emptyMsg}</p>
      ) : (
        <ol className="perf-col-list">
          {items.map((p, i) => <PerformerRow key={p.id ?? i} p={p} />)}
        </ol>
      )}
    </div>
  )
}

function ComingSoonCard({ icon, title, desc }) {
  return (
    <div className="insights-soon-card">
      <span className="insights-soon-icon" aria-hidden="true">{icon}</span>
      <div className="insights-soon-body">
        <div className="insights-soon-title">{title}</div>
        <p className="insights-soon-desc">{desc}</p>
      </div>
      <span className="insights-soon-badge">Coming soon</span>
    </div>
  )
}

export default function Insights({ onOpenRebalance } = {}) {
  const perf = usePortfolioPerformers()
  const { candidates, realizedGains } = useMemo(() => ({
    candidates: getHarvestCandidates(),
    realizedGains: getRealizedGainsFY(),
  }), [])

  if (!perf.hasAny) {
    return (
      <div className="page page--insights">
        <div className="coming-soon" role="status" aria-live="polite">
          <div className="placeholder-icon" aria-hidden="true">💡</div>
          <h2>Insights</h2>
          <p>Add Indian stocks, US stocks, or mutual funds to see performance rankings here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--insights">
      <div className="insights-header">
        <div>
          <div className="section-title">Insights</div>
          <div className="section-subtitle">Performance, news, and portfolio signals</div>
        </div>
      </div>

      <div className="insights-body">
        <section className="insights-section">
          <div className="insights-section-label">Upcoming IPOs</div>
          <UpcomingIPOs />
        </section>

        <section className="insights-section">
          <div className="insights-section-label">Performance</div>
          {!perf.hasPerformance ? (
            <p className="insights-hint">
              Refresh prices on your holdings to see top and bottom performers.
            </p>
          ) : (
            <div className="perf-panel">
              <PerformerColumn
                title="Top Performers"
                items={perf.allTop}
                emptyMsg="No gainers yet"
              />
              <PerformerColumn
                title="Bottom Performers"
                items={perf.allBottom}
                emptyMsg="No losers yet"
              />
            </div>
          )}
        </section>

        <section className="insights-section">
          <div className="insights-section-label">Stock Screener</div>
          <StockScreener />
        </section>

        <section className="insights-section">
          <div className="insights-section-label">Portfolio Tools</div>
          <div className="insights-soon-grid">
            {onOpenRebalance && (
              <div className="insights-soon-card" style={{ cursor: 'pointer', borderStyle: 'solid', opacity: 1 }} onClick={onOpenRebalance} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpenRebalance()}>
                <span className="insights-soon-icon" aria-hidden="true">⚖</span>
                <div className="insights-soon-body">
                  <div className="insights-soon-title">Portfolio Rebalancing</div>
                  <p className="insights-soon-desc">Set target allocations and see buy/sell amounts</p>
                </div>
                <span className="insights-soon-badge" style={{ background: 'var(--accent)', color: '#fff' }}>Open</span>
              </div>
            )}
          </div>
        </section>

        <section className="insights-section">
          <div className="insights-section-label">More coming soon</div>
          <div className="insights-soon-grid">
            {COMING_SOON.map((item) => (
              <ComingSoonCard key={item.id} {...item} />
            ))}
          </div>
        </section>

        {candidates.length > 0 && (
          <section className="insights-section">
            <div className="insights-section-label">Tax harvesting opportunities</div>
            <p className="insights-harvest-note">
              These holdings have unrealized losses. Selling before 31 Mar lets you offset realized gains this FY.{' '}
              <em>Not financial advice.</em>
            </p>
            {(realizedGains.realizedStcg > 0 || realizedGains.realizedLtcg > 0) && (
              <div className="insights-harvest-realized">
                <span>Realized this FY: </span>
                {realizedGains.realizedStcg > 0 && (
                  <span className="harvest-pill harvest-pill--stcg">STCG ₹{realizedGains.realizedStcg.toLocaleString('en-IN')}</span>
                )}
                {realizedGains.realizedLtcg > 0 && (
                  <span className="harvest-pill harvest-pill--ltcg">LTCG ₹{realizedGains.realizedLtcg.toLocaleString('en-IN')}</span>
                )}
              </div>
            )}
            <div className="table-wrap insights-harvest-wrap">
              <table className="data-table insights-harvest-table">
                <colgroup>
                  <col className="col-harvest-holding" />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '14%' }} />
                  <col className="col-harvest-notes" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Holding</th>
                    <th scope="col">Type</th>
                    <th scope="col" className="num">Unrealized loss</th>
                    <th scope="col">Term</th>
                    <th scope="col" className="num">Est. tax saving</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="harvest-holding-line">
                          <span className="harvest-icon" aria-hidden="true">{c.icon}</span>
                          <span className="harvest-symbol">{c.symbol}</span>
                        </div>
                        {c.name !== c.symbol && (
                          <div className="harvest-name">{c.name}</div>
                        )}
                      </td>
                      <td><span className="harvest-type">{c.assetType === 'indianStock' ? 'Stock' : 'MF'}</span></td>
                      <td className="num pnl-loss">−₹{Math.round(c.unrealizedLoss).toLocaleString('en-IN')} ({c.pnlPct != null ? c.pnlPct.toFixed(1) : '—'}%)</td>
                      <td><span className={`harvest-term ${c.isLongTerm ? 'long' : 'short'}`}>{c.isLongTerm ? 'LTCL' : 'STCL'}</span></td>
                      <td className="num pnl-gain">≈ ₹{Math.round(c.potentialTaxSaving).toLocaleString('en-IN')}</td>
                      <td className="harvest-notes">{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
