import { useState, useCallback, useMemo } from 'react'
import { useInsurance } from '../hooks/usePortfolio'
import AddInsuranceModal from './AddInsuranceModal'
import ConfirmDialog from './ConfirmDialog'
import SummaryBar from './SummaryBar'
import FilterBar from './FilterBar'
import InsuranceDetailModal from './InsuranceDetailModal'
import { formatINR, formatDate } from '../utils/formatters'
import { daysUntilRenewal, summarizeInsurance } from '../utils/insuranceMetrics'

const TYPE_META = {
  health: { label: 'Health Insurance', icon: '🏥', color: 'var(--blue)' },
  term:   { label: 'Term Insurance',   icon: '🛡️', color: 'var(--green)' },
}

function RenewalChip({ dateStr }) {
  if (!dateStr) return null
  const days = daysUntilRenewal(dateStr)
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

function PolicyCard({ policy, onEdit, onDelete, onOpenDetail }) {
  const meta = TYPE_META[policy.type] ?? { label: policy.type, icon: '📄', color: 'var(--text-3)' }

  return (
    <div
      className={`ins-card ins-card--${policy.type}`}
      onClick={() => onOpenDetail(policy)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(policy) } }}
      role="button"
      tabIndex={0}
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
    </div>
  )
}

function PolicySection({ title, icon, policies, onEdit, onDelete, onOpenDetail, onAdd, addLabel, emptyMessage }) {
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
            <PolicyCard key={p.id} policy={p} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />
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
  const [detailPolicy, setDetailPolicy] = useState(null)
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

  const summary = useMemo(() => summarizeInsurance(policies), [policies])

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
    <div className="page page--category">
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
        <div className="ins-holdings-panel">
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
                sub: `${summary.healthCount} health · ${summary.termCount} term`,
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
              onOpenDetail={setDetailPolicy}
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
              onOpenDetail={setDetailPolicy}
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

      <InsuranceDetailModal
        policy={detailPolicy}
        open={!!detailPolicy}
        onClose={() => setDetailPolicy(null)}
        onEdit={setEditPolicy}
        onDelete={setDeletePolicy}
      />
    </div>
  )
}
