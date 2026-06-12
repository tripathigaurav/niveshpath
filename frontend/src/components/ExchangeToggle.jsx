const EXCHANGES = ['NSE', 'BSE']

export default function ExchangeToggle({ value = 'NSE', onChange, showLabel = true }) {
  return (
    <div className="exchange-toggle-wrap">
      {showLabel && <span className="exchange-toggle-label">Exchange</span>}
      <div className="exchange-toggle" role="group" aria-label="Stock exchange">
      {EXCHANGES.map((ex) => (
        <button
          key={ex}
          type="button"
          className={`exchange-toggle-btn${value === ex ? ' active' : ''}`}
          aria-pressed={value === ex}
          onClick={() => onChange?.(ex)}
        >
          {ex}
        </button>
      ))}
      </div>
    </div>
  )
}
