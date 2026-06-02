export default function FilterBar({
  value,
  onChange,
  total,
  filtered,
  placeholder = 'Filter holdings…',
  inputRef,
}) {
  return (
    <div className="table-filter-bar">
      <div className="filter-input-wrap">
        <input
          ref={inputRef}
          className="filter-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
        />
        {value && (
          <button
            type="button"
            className="filter-clear"
            onClick={() => onChange('')}
            aria-label="Clear filter"
          >
            ×
          </button>
        )}
      </div>
      {value && (
        <span className="filter-count" aria-live="polite">
          {filtered} of {total}
        </span>
      )}
    </div>
  )
}
