import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

export const INS_TYPE_OPTIONS = [
  { value: 'health', label: '🏥 Health Insurance' },
  { value: 'term',   label: '🛡️ Term Insurance' },
]

function emptyForm() {
  return {
    name: '',
    type: 'health',
    premium: '',
    coverAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    renewalDate: '',
    notes: '',
  }
}

export default function AddInsuranceModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...emptyForm(),
          ...initial,
          premium: initial.premium ?? '',
          coverAmount: initial.coverAmount ?? '',
          startDate: initial.startDate ?? '',
          renewalDate: initial.renewalDate ?? '',
        }
      : emptyForm()
  )
  const [errors, setErrors] = useState({})
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true, onClose)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Policy name / insurer is required'
    if (!form.premium || isNaN(form.premium) || +form.premium <= 0)
      errs.premium = 'Enter a valid annual premium'
    if (form.coverAmount && (isNaN(form.coverAmount) || +form.coverAmount < 0))
      errs.coverAmount = 'Enter a valid cover amount'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) onSave(form)
  }

  const isHealth = form.type === 'health'

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ins-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="ins-modal-title">
            {initial ? 'Edit Policy' : 'Add Insurance Policy'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Insurance Type</label>
              <select className="form-input" value={form.type} onChange={set('type')}>
                {INS_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Policy Name / Insurer</label>
              <input
                className={`form-input${errors.name ? ' error' : ''}`}
                type="text"
                placeholder={isHealth ? 'e.g. HDFC ERGO Optima Secure' : 'e.g. LIC Tech Term, HDFC Click 2 Protect'}
                value={form.name}
                onChange={set('name')}
                autoFocus
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Annual Premium (₹)</label>
                <input
                  className={`form-input mono${errors.premium ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 18500"
                  value={form.premium}
                  onChange={set('premium')}
                  min="0"
                  step="any"
                />
                {errors.premium && <div className="error-text">{errors.premium}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  {isHealth ? 'Sum Insured (₹)' : 'Sum Assured / Cover (₹)'}
                  <span className="form-label-optional"> optional</span>
                </label>
                <input
                  className={`form-input mono${errors.coverAmount ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder={isHealth ? 'e.g. 1000000' : 'e.g. 10000000'}
                  value={form.coverAmount}
                  onChange={set('coverAmount')}
                  min="0"
                  step="any"
                />
                {errors.coverAmount && <div className="error-text">{errors.coverAmount}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Policy Start Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={set('startDate')}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Renewal Date <span className="form-label-optional">optional</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={form.renewalDate}
                  onChange={set('renewalDate')}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Notes <span className="form-label-optional">optional</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Policy #123456, Family floater, riders…"
                value={form.notes}
                onChange={set('notes')}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initial ? 'Save Changes' : 'Add Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
