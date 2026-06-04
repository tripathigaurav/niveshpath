import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

export const ASSET_TYPES = [
  { value: 'FD',         label: '🏦 Fixed Deposit (FD)' },
  { value: 'PPF',        label: '📘 PPF' },
  { value: 'EPF',        label: '📗 EPF / PF' },
  { value: 'NPS',        label: '🏛 NPS' },
  { value: 'RealEstate', label: '🏠 Real Estate' },
  { value: 'Gold',       label: '🪙 Gold / Jewellery' },
  { value: 'Bonds',      label: '📄 Bonds / Debentures' },
  { value: 'Crypto',     label: '₿ Crypto' },
  { value: 'Other',      label: '📦 Other' },
]

/**
 * TYPE_CONFIG — per-type metadata.
 * extraFields: { field, label, type, placeholder?, optional?, required?, options? }
 * type: 'text' | 'number' | 'date' | 'select'
 */
const TYPE_CONFIG = {
  FD: {
    namePlaceholder: 'e.g. SBI FD @7.5% — 2yr',
    investedLabel: 'Principal Amount (₹)',
    currentValueLabel: 'Maturity / Current Value (₹)',
    dateLabel: 'Start / Booking Date',
    extraFields: [
      { field: 'bank',         label: 'Bank / Institution',        type: 'text',   placeholder: 'e.g. SBI, HDFC Bank, Post Office' },
      { field: 'interestRate', label: 'Interest Rate (%)',          type: 'number', placeholder: 'e.g. 7.5' },
      { field: 'maturityDate', label: 'Maturity Date',              type: 'date' },
      { field: 'tenure',       label: 'Tenure',                     type: 'text',   placeholder: 'e.g. 2 years, 15 months', optional: true },
    ],
  },
  PPF: {
    namePlaceholder: 'e.g. PPF — SBI Account',
    investedLabel: 'Total Invested (₹)',
    extraFields: [
      { field: 'bank',         label: 'Bank / Post Office',         type: 'text',   placeholder: 'e.g. SBI, India Post', optional: true },
      { field: 'interestRate', label: 'Current Interest Rate (%)',  type: 'number', placeholder: '7.1', optional: true },
    ],
  },
  EPF: {
    namePlaceholder: 'e.g. EPF — TCS',
    investedLabel: 'Total Balance (₹)',
    extraFields: [
      { field: 'employer',     label: 'Employer Name',              type: 'text',   placeholder: 'e.g. TCS, Infosys' },
      { field: 'uanNumber',    label: 'UAN Number',                 type: 'text',   placeholder: 'Optional', optional: true },
      { field: 'interestRate', label: 'Interest Rate (%)',          type: 'number', placeholder: '8.25', optional: true },
    ],
  },
  NPS: {
    namePlaceholder: 'e.g. NPS Tier 1 — HDFC Pension',
    investedLabel: 'Total Invested (₹)',
    extraFields: [
      { field: 'npsTier',      label: 'Tier',                       type: 'select', options: ['Tier 1', 'Tier 2'] },
      { field: 'npsScheme',    label: 'Fund Manager / Scheme',      type: 'text',   placeholder: 'e.g. HDFC Pension Fund', optional: true },
      { field: 'pranNumber',   label: 'PRAN Number',                type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  RealEstate: {
    namePlaceholder: 'e.g. 2BHK Flat, Baner Pune',
    investedLabel: 'Purchase Price (₹)',
    currentValueLabel: 'Current Market Value (₹)',
    dateLabel: 'Purchase Date',
    extraFields: [
      { field: 'location',     label: 'Location / Address',         type: 'text',   placeholder: 'e.g. Baner, Pune', fullWidth: true },
      { field: 'propertyType', label: 'Property Type',              type: 'select', options: ['Flat / Apartment', 'House / Villa', 'Plot', 'Commercial', 'Other'] },
      { field: 'area',         label: 'Area (sq ft)',               type: 'number', placeholder: 'e.g. 1200', optional: true },
    ],
  },
  Gold: {
    namePlaceholder: 'e.g. Gold Coins 22K — 50g',
    investedLabel: 'Purchase Amount (₹)',
    currentValueLabel: 'Current Market Value (₹)',
    dateLabel: 'Purchase Date',
    extraFields: [
      { field: 'goldWeight',   label: 'Weight (grams)',             type: 'number', placeholder: 'e.g. 50', required: true },
      { field: 'goldPurity',   label: 'Purity',                    type: 'select', options: ['24K', '22K', '18K', 'Other'] },
      { field: 'goldForm',     label: 'Form',                      type: 'select', options: ['Coins', 'Jewellery', 'Bar / Biscuit', 'SGB', 'Gold ETF', 'Other'] },
    ],
  },
  Bonds: {
    namePlaceholder: 'e.g. 7.1% GOI Bond 2029',
    investedLabel: 'Purchase Amount (₹)',
    currentValueLabel: 'Current Market Value (₹)',
    dateLabel: 'Purchase Date',
    extraFields: [
      { field: 'issuer',       label: 'Issuer',                     type: 'text',   placeholder: 'e.g. Govt of India, HDFC Ltd' },
      { field: 'interestRate', label: 'Coupon Rate (%)',             type: 'number', placeholder: 'e.g. 7.1' },
      { field: 'maturityDate', label: 'Maturity Date',              type: 'date',   optional: true },
      { field: 'isin',         label: 'ISIN',                       type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  Crypto: {
    namePlaceholder: 'e.g. Bitcoin Holdings',
    investedLabel: 'Amount Invested (₹)',
    currentValueLabel: 'Current Value (₹)',
    dateLabel: 'First Purchase Date',
    extraFields: [
      { field: 'cryptoSymbol',   label: 'Coin / Token',             type: 'text',   placeholder: 'e.g. BTC, ETH, SOL' },
      { field: 'quantity',       label: 'Quantity',                 type: 'number', placeholder: 'e.g. 0.5' },
      { field: 'cryptoExchange', label: 'Exchange / Wallet',        type: 'text',   placeholder: 'e.g. WazirX, Coinbase, Ledger', optional: true },
    ],
  },
  Other: {
    namePlaceholder: 'e.g. Loan given to friend, Angel investment',
    extraFields: [],
  },
}

function emptyForm() {
  return {
    name: '', type: 'FD', investedAmount: '', currentValue: '',
    notes: '', addedDate: new Date().toISOString().split('T')[0],
  }
}

/** When switching type, keep base fields and clear extra fields from the old type. */
function clearOtherTypeFields(form, newType) {
  const keep = new Set(['name', 'type', 'investedAmount', 'currentValue', 'notes', 'addedDate'])
  ;(TYPE_CONFIG[newType]?.extraFields ?? []).forEach((f) => keep.add(f.field))
  const next = {}
  for (const k of keep) next[k] = form[k] ?? ''
  return next
}

export default function AddOtherAssetModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial || emptyForm())
  const [errors, setErrors] = useState({})
  const modalRef = useRef(null)

  useFocusTrap(modalRef, true, onClose)

  const config = TYPE_CONFIG[form.type] ?? TYPE_CONFIG.Other
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleTypeChange = (e) => {
    const t = e.target.value
    setForm((f) => ({ ...clearOtherTypeFields(f, t), type: t }))
    setErrors({})
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Asset name is required'
    if (!form.investedAmount || isNaN(form.investedAmount) || +form.investedAmount <= 0)
      errs.investedAmount = 'Enter a valid invested amount'
    if (form.currentValue && (isNaN(form.currentValue) || +form.currentValue < 0))
      errs.currentValue = 'Enter a valid current value'
    config.extraFields.forEach((f) => {
      if (f.required && !String(form[f.field] ?? '').trim())
        errs[f.field] = `${f.label} is required`
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    // Coerce numeric strings → numbers; empty strings → null so P&L isn't calculated from 0
    const out = { ...form }
    out.investedAmount = parseFloat(out.investedAmount) || 0
    out.currentValue   = out.currentValue !== '' && out.currentValue != null
      ? parseFloat(out.currentValue)
      : null
    // Coerce any numeric extra fields too
    for (const f of (TYPE_CONFIG[out.type]?.extraFields ?? [])) {
      if (f.type === 'number' && out[f.field] !== '' && out[f.field] != null) {
        out[f.field] = parseFloat(out[f.field])
      }
    }
    onSave(out)
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="other-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--md modal--tall" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="other-modal-title">
            {initial ? 'Edit Asset' : 'Add Other Asset'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Asset type */}
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <select className="form-select" value={form.type} onChange={handleTypeChange}>
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div className="form-group">
              <label className="form-label">Asset Name / Description</label>
              <input
                className={`form-input${errors.name ? ' error' : ''}`}
                type="text"
                placeholder={config.namePlaceholder ?? 'Describe this asset'}
                value={form.name}
                onChange={set('name')}
                autoFocus
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            {/* Dynamic type-specific fields */}
            {config.extraFields.length > 0 && (
              <div className="form-row form-row--wrap">
                {config.extraFields.map((f) => (
                  <div className={`form-group${f.fullWidth ? ' col-full' : ''}`} key={f.field}>
                    <label className="form-label">
                      {f.label}
                      {f.optional && <span className="form-label-optional"> optional</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        className={`form-select${errors[f.field] ? ' error' : ''}`}
                        value={form[f.field] ?? f.options[0]}
                        onChange={set(f.field)}
                      >
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        className={`form-input${f.type === 'number' ? ' mono' : ''}${errors[f.field] ? ' error' : ''}`}
                        type={f.type}
                        placeholder={f.placeholder ?? ''}
                        value={form[f.field] ?? ''}
                        onChange={set(f.field)}
                        min={f.type === 'number' ? '0' : undefined}
                        step={f.type === 'number' ? 'any' : undefined}
                      />
                    )}
                    {errors[f.field] && <div className="error-text">{errors[f.field]}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Invested + Current Value */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{config.investedLabel ?? 'Amount Invested (₹)'}</label>
                <input
                  className={`form-input mono${errors.investedAmount ? ' error' : ''}`}
                  type="number" inputMode="decimal" placeholder="e.g. 100000"
                  value={form.investedAmount} onChange={set('investedAmount')}
                  min="0" step="any"
                />
                {errors.investedAmount && <div className="error-text">{errors.investedAmount}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  {config.currentValueLabel ?? 'Current Value (₹)'}
                  <span className="form-label-optional"> optional</span>
                </label>
                <input
                  className={`form-input mono${errors.currentValue ? ' error' : ''}`}
                  type="number" inputMode="decimal" placeholder="Leave blank if unknown"
                  value={form.currentValue} onChange={set('currentValue')}
                  min="0" step="any"
                />
                {errors.currentValue && <div className="error-text">{errors.currentValue}</div>}
              </div>
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label">{config.dateLabel ?? 'Date Added / Start Date'}</label>
              <input
                className="form-input" type="date"
                value={form.addedDate} onChange={set('addedDate')}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">
                Notes <span className="form-label-optional">optional</span>
              </label>
              <input
                className="form-input" type="text"
                placeholder="Any additional details…"
                value={form.notes} onChange={set('notes')}
              />
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {initial ? 'Save Changes' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
