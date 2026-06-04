import { useMemo } from 'react'
import { usePortfolioPerformers } from '../hooks/usePortfolioPerformers'
import PerformersCard from './PerformersCard'
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

function CategoryPerformance({ icon, title, count, unit, top, bottom }) {
  if (count === 0) return null

  return (
    <div className="insights-cat-block">
      <div className="insights-cat-head">
        <span className="insights-cat-icon" aria-hidden="true">{icon}</span>
        <span className="insights-cat-title">{title}</span>
        <span className="insights-cat-count">
          {count} {unit}{count !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="insights-cat-perf">
        <PerformersCard
          title="Top Performers"
          items={top}
          type="top"
          emptyMessage="No gainers with prices yet"
        />
        <PerformersCard
          title="Bottom Performers"
          items={bottom}
          type="bottom"
          emptyMessage="No losers with prices yet"
        />
      </div>
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

export default function Insights() {
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
          <div className="insights-section-label">Performance</div>
          {!perf.hasPerformance ? (
            <p className="insights-hint">
              Refresh prices on your holdings to see top and bottom performers by category.
            </p>
          ) : (
            <div className="insights-cat-stack">
              <CategoryPerformance
                icon="🇮🇳"
                title="Indian Stocks"
                unit="stock"
                count={perf.indian.count}
                top={perf.indian.top}
                bottom={perf.indian.bottom}
              />
              <CategoryPerformance
                icon="🇺🇸"
                title="US Stocks"
                unit="stock"
                count={perf.us.count}
                top={perf.us.top}
                bottom={perf.us.bottom}
              />
              <CategoryPerformance
                icon="📋"
                title="Mutual Funds"
                unit="fund"
                count={perf.mf.count}
                top={perf.mf.top}
                bottom={perf.mf.bottom}
              />
            </div>
          )}
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
