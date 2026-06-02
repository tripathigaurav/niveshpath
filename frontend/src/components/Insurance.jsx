import { useState, useCallback, useMemo } from 'react'
import { useInsurance } from '../hooks/usePortfolio'
import AddInsuranceModal from './AddInsuranceModal'
import ConfirmDialog from './ConfirmDialog'
import SummaryBar from './SummaryBar'
import FilterBar from './FilterBar'
import { formatINR, formatDate } from '../utils/formatters'

const TYPE_META = {
  health: { label: 'Health Insurance', icon: '🏥', color: 'var(--blue)' },
  term:   { label: 'Term Insurance',   icon: '🛡️', color: 'var(--green)' },
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function RenewalChip({ dateStr }) {
  if (!dateStr) return null
  const days = daysUntil(dateStr)
  let cls = 'ins-renewal-chip'
  if (days <= 30) cls += ' ins-renewal-chip--urgent'
  else if (days <= 90) cls += ' ins-renewal-chip--soon'
  return (
    <span className={cls} title={`Renewal: ${formatDate(dateStr)}`}>
      {days <= 0
        ? 'Overdue'
        : days <= 30
        ? `${days}d left`
        : days <= 90
        ? `${days}d`
        : formatDate(dateStr)}
    </span>
  )
}

function PolicyCard({ policy, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[policy.type] ?? { label: policy.type, icon: '📄', color: 'var(--text-3)' }

  return (
    <div
      className={`ins-card ins-card--${policy.type}`}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v) } }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      <div className="ins-card-header">
        <div className="ins-card-left">
          <span className="ins-type-icon" aria-hidden="true">{meta.icon}</span>
          <div>
            <div className="ins-card-name">{policy.name}</div>
            <div className="ins-card-meta">
              <span className="ins-type-badge">{meta.label}</span>
              <RenewalChip dateStr={policy.renewalDate} />
            </div>
          </div>
        </div>
        <div className="ins-card-right">
          {policy.coverAmount != null && (
            <div className="ins-card-cover">{formatINR(policy.coverAmount, true)}</div>
          )}
          <div className="ins-card-premium">{formatINR(policy.premium)} <span className="text-3">/yr</span></div>
        </div>
      </div>

      {expanded && (
        <div className="ins-card-details" onClick={(e) => e.stopPropagation()}>
          <div className="row-details-meta">
            {policy.coverAmount != null && (
              <div className="row-details-meta-item">
                Cover Amount: <span>{formatINR(policy.coverAmount)}</span>
              </div>
            )}
            <div className="row-details-meta-item">
              Annual Premium: <span>{formatINR(policy.premium)}</span>
            </div>
            {policy.startDate && (
              <div className="row-details-meta-item">
                Start Date: <span>{formatDate(policy.startDate)}</span>
              </div>
            )}
            {policy.renewalDate && (
              <div className="row-details-meta-item">
                Renewal Date: <span>{formatDate(policy.renewalDate)}</span>
              </div>
            )}
            {policy.notes && (
              <div className="row-details-meta-item">
                Notes: <span>{policy.notes}</span>
              </div>
            )}
          </div>
          <div className="row-details-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => { e.stopPropagation(); onEdit(policy) }}
            >
              ✏️ Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => { e.stopPropagation(); onDelete(policy) }}
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PolicySection({ title, icon, policies, onEdit, onDelete, onAdd, addLabel, emptyMessage }) {
  return (
    <section className="ins-section">
      <div className="ins-section-head">
        <div className="ins-section-title">
          <span aria-hidden="true">{icon}</span> {title}
          <span className="ins-count-badge">{policies.length}</span>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd}>
          {addLabel}
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="ins-empty">{emptyMessage}</div>
      ) : (
        <div className="ins-cards-grid">
          {policies.map((p) => (
            <PolicyCard key={p.id} policy={p} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="empty-state">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="12" y="20" width="56" height="48" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.5" />
        <path d="M40 30 L40 50 M30 40 L50 40" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="40" r="14" stroke="var(--blue)" strokeWidth="1.5" fill="none" opacity="0.4" />
      </svg>
      <h3>No insurance policies yet</h3>
      <p>Track your health and term insurance policies — premiums, cover amounts, and renewal dates.</p>
      <button type="button" className="btn btn-primary" onClick={onAdd}>
        + Add Your First Policy
      </button>
    </div>
  )
}

export default function Insurance({ showToast }) {
  const { policies, addPolicy, removePolicy, updatePolicy } = useInsurance()
  const [showAdd, setShowAdd] = useState(false)
  const [addInitial, setAddInitial] = useState(null)
  const [editPolicy, setEditPolicy] = useState(null)
  const [deletePolicy, setDeletePolicy] = useState(null)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return policies
    const q = filter.toLowerCase()
    return policies.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    )
  }, [policies, filter])

  const health = useMemo(() => filtered.filter((p) => p.type === 'health'), [filtered])
  const term   = useMemo(() => filtered.filter((p) => p.type === 'term'),   [filtered])

  const summary = useMemo(() => {
    const totalPremium  = policies.reduce((s, p) => s + (p.premium ?? 0), 0)
    const healthCover   = policies.filter((p) => p.type === 'health').reduce((s, p) => s + (p.coverAmount ?? 0), 0)
    const termCover     = policies.filter((p) => p.type === 'term').reduce((s, p) => s + (p.coverAmount ?? 0), 0)
    return { totalPremium, healthCover, termCover }
  }, [policies])

  const handleAdd = useCallback((data) => {
    addPolicy(data)
    setShowAdd(false)
    setAddInitial(null)
    showToast('Policy added', 'success')
  }, [addPolicy, showToast])

  const handleEdit = useCallback((data) => {
    updatePolicy(editPolicy.id, data)
    setEditPolicy(null)
    showToast('Policy updated', 'success')
  }, [editPolicy, updatePolicy, showToast])

  const handleDelete = useCallback(() => {
    removePolicy(deletePolicy.id)
    setDeletePolicy(null)
    showToast(`"${deletePolicy.name}" removed`, 'info')
  }, [deletePolicy, removePolicy, showToast])

  const openAdd = (type = null) => {
    setAddInitial(type ? { type } : null)
    setShowAdd(true)
  }

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Insurance</div>
          <div className="section-subtitle">
            {policies.length} polic{policies.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>
        <div className="section-header-right">
          <button type="button" className="btn btn-primary" onClick={() => openAdd()}>
            + Add Policy
          </button>
        </div>
      </div>

      {policies.length === 0 ? (
        <EmptyState onAdd={() => openAdd()} />
      ) : (
        <div className="ins-page-body">
          {/* Summary bar */}
          <SummaryBar
            variant="elevated"
            metrics={[
              {
                label: 'Total Annual Premium',
                value: formatINR(summary.totalPremium, true),
                sub: formatINR(summary.totalPremium),
              },
              {
                label: 'Health Cover',
                value: summary.healthCover > 0 ? formatINR(summary.healthCover, true) : '—',
                sub: summary.healthCover > 0 ? formatINR(summary.healthCover) : null,
              },
              {
                label: 'Term Cover',
                value: summary.termCover > 0 ? formatINR(summary.termCover, true) : '—',
                sub: summary.termCover > 0 ? formatINR(summary.termCover) : null,
              },
              {
                label: 'Policies',
                value: String(policies.length),
                sub: `${policies.filter(p => p.type === 'health').length} health · ${policies.filter(p => p.type === 'term').length} term`,
              },
            ]}
          />

          {policies.length > 2 && (
            <FilterBar
              value={filter}
              onChange={setFilter}
              total={policies.length}
              filtered={filtered.length}
              placeholder="Filter policies…"
            />
          )}

          <div className="ins-sections-stack">
            <PolicySection
              title="Health Insurance"
              icon="🏥"
              policies={health}
              onEdit={setEditPolicy}
              onDelete={setDeletePolicy}
              onAdd={() => openAdd('health')}
              addLabel="+ Add Health"
              emptyMessage="No health insurance policies yet."
            />
            <PolicySection
              title="Term Insurance"
              icon="🛡️"
              policies={term}
              onEdit={setEditPolicy}
              onDelete={setDeletePolicy}
              onAdd={() => openAdd('term')}
              addLabel="+ Add Term"
              emptyMessage="No term insurance policies yet."
            />
          </div>
        </div>
      )}

      {showAdd && (
        <AddInsuranceModal
          initial={addInitial}
          onSave={handleAdd}
          onClose={() => { setShowAdd(false); setAddInitial(null) }}
        />
      )}
      {editPolicy && (
        <AddInsuranceModal
          initial={editPolicy}
          onSave={handleEdit}
          onClose={() => setEditPolicy(null)}
        />
      )}
      {deletePolicy && (
        <ConfirmDialog
          title="Remove Policy"
          message={`Remove "${deletePolicy.name}" from your portfolio?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletePolicy(null)}
        />
      )}
    </div>
  )
}
