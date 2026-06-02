import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

export const ASSET_TYPES = [
  { value: 'FD', label: '🏦 Fixed Deposit (FD)' },
  { value: 'PPF', label: '📘 PPF' },
  { value: 'EPF', label: '📗 EPF / PF' },
  { value: 'NPS', label: '🏛 NPS' },
  { value: 'RealEstate', label: '🏠 Real Estate' },
  { value: 'Gold', label: '🪙 Gold / Jewellery' },
  { value: 'Bonds', label: '📄 Bonds / Debentures' },
  { value: 'Crypto', label: '₿ Crypto' },
  { value: 'Other', label: '📦 Other' },
]

function emptyForm() {
  return {
    name: '',
    type: 'FD',
    investedAmount: '',
    currentValue: '',
    notes: '',
    addedDate: new Date().toISOString().split('T')[0],
  }
}

export default function AddOtherAssetModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || emptyForm())
  const [errors, setErrors] = useState({})
  const modalRef = useRef(null)

  useFocusTrap(modalRef, true, onClose)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Asset name is required'
    if (!form.investedAmount || isNaN(form.investedAmount) || +form.investedAmount <= 0)
      errs.investedAmount = 'Enter a valid invested amount'
    if (form.currentValue && (isNaN(form.currentValue) || +form.currentValue < 0))
      errs.currentValue = 'Enter a valid current value'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) onSave(form)
  }

  const title = initial ? 'Edit Asset' : 'Add Other Asset'

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="other-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="other-modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <select className="form-input" value={form.type} onChange={set('type')}>
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Asset Name / Description</label>
              <input
                className={`form-input${errors.name ? ' error' : ''}`}
                type="text"
                placeholder="e.g. SBI FD @7.5% 2yr, HDFC NPS Tier 1"
                value={form.name}
                onChange={set('name')}
                autoFocus
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount Invested (₹)</label>
                <input
                  className={`form-input mono${errors.investedAmount ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 100000"
                  value={form.investedAmount}
                  onChange={set('investedAmount')}
                  min="0"
                  step="any"
                />
                {errors.investedAmount && (
                  <div className="error-text">{errors.investedAmount}</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Current Value (₹) <span className="form-label-optional">optional</span>
                </label>
                <input
                  className={`form-input mono${errors.currentValue ? ' error' : ''}`}
                  type="number"
                  inputMode="decimal"
                  placeholder="Leave blank if unknown"
                  value={form.currentValue}
                  onChange={set('currentValue')}
                  min="0"
                  step="any"
                />
                {errors.currentValue && (
                  <div className="error-text">{errors.currentValue}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date Added / Start Date</label>
              <input
                className="form-input"
                type="date"
                value={form.addedDate}
                onChange={set('addedDate')}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Notes <span className="form-label-optional">optional</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Matures on 15 Jan 2026, interest rate 7.5%"
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
              {initial ? 'Save Changes' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
