const TABS = [
  { id: 'basic', label: 'Basic' },
  { id: 'irr', label: 'IRR' },
  { id: 'market', label: 'Market Data' },
  { id: 'pnl', label: 'P&L Trend' },
]

const HOLDING_FILTERS = [
  { id: 'current', label: 'Current Holdings' },
  { id: 'past', label: 'Past Holdings' },
  { id: 'all', label: 'All Holdings' },
]

export default function HoldingsSubTabs({
  activeTab,
  onTabChange,
  showHoldingFilter = false,
  holdingFilter = 'current',
  onHoldingFilterChange,
  /** Renders on the right of the sub-tab row (e.g. NSE/BSE on Market Data). */
  subtabBarRight = null,
}) {
  return (
    <div className="holdings-subtabs">
      <div className="subtab-bar-row">
        <div className="subtab-bar" role="tablist" aria-label="Holdings views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`subtab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {subtabBarRight && (
          <div className="subtab-bar-right">{subtabBarRight}</div>
        )}
      </div>

      {showHoldingFilter && (
        <div className="holding-filter-bar" role="group" aria-label="Holdings filter">
          {HOLDING_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`holding-filter-btn${holdingFilter === f.id ? ' active' : ''}`}
              onClick={() => onHoldingFilterChange?.(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
