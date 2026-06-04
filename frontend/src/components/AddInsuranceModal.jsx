import { useState, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'

export const INS_TYPE_OPTIONS = [
  { value: 'health',      label: '🏥 Health Insurance' },
  { value: 'term',        label: '🛡️ Term Life Insurance' },
  { value: 'ulip',        label: '📈 ULIP' },
  { value: 'endowment',   label: '💰 Endowment / Moneyback' },
  { value: 'vehicle',     label: '🚗 Vehicle Insurance' },
  { value: 'home',        label: '🏠 Home / Property' },
  { value: 'travel',      label: '✈️ Travel Insurance' },
  { value: 'other',       label: '📦 Other' },
]

/**
 * TYPE_CONFIG — per-type metadata for the add/edit form.
 * extraFields: { field, label, type, placeholder?, optional?, required?, options? }
 */
const TYPE_CONFIG = {
  health: {
    namePlaceholder: 'e.g. HDFC ERGO Optima Secure, Star Health',
    premiumLabel: 'Annual Premium (₹)',
    coverLabel: 'Sum Insured (₹)',
    coverPlaceholder: 'e.g. 1000000',
    extraFields: [
      { field: 'membersCovered', label: 'Members Covered',     type: 'text',   placeholder: 'e.g. Self + Spouse + 2 Kids', fullWidth: true },
      { field: 'insurer',        label: 'Insurance Company',   type: 'text',   placeholder: 'e.g. HDFC ERGO, Star, Niva Bupa', optional: true },
      { field: 'policyNumber',   label: 'Policy Number',       type: 'text',   placeholder: 'Optional', optional: true },
      { field: 'roomRentLimit',  label: 'Room Rent Limit',     type: 'text',   placeholder: 'e.g. Single private AC room', optional: true },
    ],
  },
  term: {
    namePlaceholder: 'e.g. LIC Tech Term, HDFC Click 2 Protect',
    premiumLabel: 'Annual Premium (₹)',
    coverLabel: 'Sum Assured / Cover (₹)',
    coverPlaceholder: 'e.g. 10000000',
    extraFields: [
      { field: 'insurer',          label: 'Insurance Company',     type: 'text',   placeholder: 'e.g. LIC, HDFC Life, Max Life' },
      { field: 'policyTerm',       label: 'Policy Term (years)',   type: 'number', placeholder: 'e.g. 30' },
      { field: 'deathBenefitType', label: 'Death Benefit',         type: 'select', options: ['Lump Sum', 'Monthly Income', 'Lump Sum + Monthly Income'] },
      { field: 'policyNumber',     label: 'Policy Number',         type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  ulip: {
    namePlaceholder: 'e.g. HDFC Click2Wealth, SBI Smart Wealth',
    premiumLabel: 'Annual Premium (₹)',
    coverLabel: 'Current Fund Value (₹)',
    coverPlaceholder: 'e.g. 250000',
    extraFields: [
      { field: 'insurer',       label: 'Insurance Company',   type: 'text',   placeholder: 'e.g. HDFC Life, SBI Life' },
      { field: 'fundName',      label: 'Fund Name',           type: 'text',   placeholder: 'e.g. Equity Plus Fund', optional: true },
      { field: 'policyTerm',    label: 'Policy Term (years)', type: 'number', placeholder: 'e.g. 10' },
      { field: 'lockInPeriod',  label: 'Lock-in Period',      type: 'text',   placeholder: 'e.g. 5 years', optional: true },
      { field: 'policyNumber',  label: 'Policy Number',       type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  endowment: {
    namePlaceholder: 'e.g. LIC Jeevan Anand, SBI Life Smart Money',
    premiumLabel: 'Annual Premium (₹)',
    coverLabel: 'Sum Assured (₹)',
    coverPlaceholder: 'e.g. 500000',
    extraFields: [
      { field: 'insurer',       label: 'Insurance Company',   type: 'text',   placeholder: 'e.g. LIC, SBI Life' },
      { field: 'policyTerm',    label: 'Policy Term (years)', type: 'number', placeholder: 'e.g. 20' },
      { field: 'maturityDate',  label: 'Maturity Date',       type: 'date',   optional: true },
      { field: 'policyNumber',  label: 'Policy Number',       type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  vehicle: {
    namePlaceholder: 'e.g. Hyundai Creta Comprehensive',
    premiumLabel: 'Annual Premium (₹)',
    coverLabel: 'IDV — Insured Declared Value (₹)',
    coverPlaceholder: 'e.g. 800000',
    extraFields: [
      { field: 'vehicleName',   label: 'Vehicle Name',        type: 'text',   placeholder: 'e.g. Hyundai Creta 2022, Honda Activa', fullWidth: true },
      { field: 'vehicleNumber', label: 'Registration Number', type: 'text',   placeholder: 'e.g. MH12AB1234' },
      { field: 'coverType',     label: 'Cover Type',          type: 'select', options: ['Comprehensive', 'Third Party Only', 'Own Damage Only'] },
      { field: 'insurer',       label: 'Insurance Company',   type: 'text',   placeholder: 'e.g. Bajaj Allianz, ICICI Lombard', optional: true },
      { field: 'policyNumber',  label: 'Policy Number',       type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  home: {
    namePlaceholder: 'e.g. Home Insurance — Baner Flat',
    premiumLabel: 'Annual Premium (₹)',
    coverLabel: 'Building Cover (₹)',
    coverPlaceholder: 'e.g. 5000000',
    extraFields: [
      { field: 'propertyAddress', label: 'Property Address',    type: 'text',   placeholder: 'e.g. Flat 4B, Baner, Pune', fullWidth: true },
      { field: 'insurer',         label: 'Insurance Company',   type: 'text',   placeholder: 'e.g. Bajaj Allianz, HDFC ERGO', optional: true },
      { field: 'contentCover',    label: 'Content Cover (₹)',   type: 'number', placeholder: 'e.g. 500000', optional: true },
      { field: 'policyNumber',    label: 'Policy Number',       type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  travel: {
    namePlaceholder: 'e.g. Europe Trip — HDFC ERGO Travel',
    premiumLabel: 'Premium (₹)',
    coverLabel: 'Cover Amount (₹)',
    coverPlaceholder: 'e.g. 500000',
    extraFields: [
      { field: 'destination',   label: 'Destination / Region', type: 'text',   placeholder: 'e.g. Europe, Worldwide, Asia' },
      { field: 'coverPeriod',   label: 'Cover Period',         type: 'text',   placeholder: 'e.g. 15 days, Annual multi-trip' },
      { field: 'insurer',       label: 'Insurance Company',    type: 'text',   placeholder: 'e.g. HDFC ERGO, Bajaj Allianz', optional: true },
      { field: 'policyNumber',  label: 'Policy Number',        type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
  other: {
    namePlaceholder: 'e.g. Crop insurance, Liability policy',
    premiumLabel: 'Annual Premium (₹)',
    coverLabel: 'Cover Amount (₹)',
    coverPlaceholder: 'e.g. 1000000',
    extraFields: [
      { field: 'insurer',      label: 'Insurance Company',  type: 'text',   placeholder: 'Optional', optional: true },
      { field: 'policyNumber', label: 'Policy Number',      type: 'text',   placeholder: 'Optional', optional: true },
    ],
  },
}

function emptyForm() {
  return {
    name: '', type: 'health', premium: '', coverAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    renewalDate: '', notes: '',
  }
}

function clearOtherTypeFields(form, newType) {
  const keep = new Set(['name', 'type', 'premium', 'coverAmount', 'startDate', 'renewalDate', 'notes'])
  ;(TYPE_CONFIG[newType]?.extraFields ?? []).forEach((f) => keep.add(f.field))
  const next = {}
  for (const k of keep) next[k] = form[k] ?? ''
  return next
}

export default function AddInsuranceModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...emptyForm(), ...initial, premium: initial.premium ?? '', coverAmount: initial.coverAmount ?? '', startDate: initial.startDate ?? '', renewalDate: initial.renewalDate ?? '' }
      : emptyForm()
  )
  const [errors, setErrors] = useState({})
  const modalRef = useRef(null)
  useFocusTrap(modalRef, true, onClose)

  const config = TYPE_CONFIG[form.type] ?? TYPE_CONFIG.other
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleTypeChange = (e) => {
    const t = e.target.value
    setForm((f) => ({ ...clearOtherTypeFields(f, t), type: t }))
    setErrors({})
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Policy name / insurer is required'
    if (!form.premium || isNaN(form.premium) || +form.premium <= 0)
      errs.premium = 'Enter a valid premium amount'
    if (form.coverAmount && (isNaN(form.coverAmount) || +form.coverAmount < 0))
      errs.coverAmount = 'Enter a valid cover amount'
    config.extraFields.forEach((f) => {
      if (f.required && !String(form[f.field] ?? '').trim())
        errs[f.field] = `${f.label} is required`
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) onSave(form)
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ins-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--md modal--tall" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="ins-modal-title">
            {initial ? 'Edit Policy' : 'Add Insurance Policy'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Insurance type */}
            <div className="form-group">
              <label className="form-label">Insurance Type</label>
              <select className="form-select" value={form.type} onChange={handleTypeChange}>
                {INS_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Policy name */}
            <div className="form-group">
              <label className="form-label">Policy Name / Insurer</label>
              <input
                className={`form-input${errors.name ? ' error' : ''}`}
                type="text"
                placeholder={config.namePlaceholder}
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

            {/* Premium + Cover */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{config.premiumLabel}</label>
                <input
                  className={`form-input mono${errors.premium ? ' error' : ''}`}
                  type="number" inputMode="decimal" placeholder="e.g. 18500"
                  value={form.premium} onChange={set('premium')}
                  min="0" step="any"
                />
                {errors.premium && <div className="error-text">{errors.premium}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  {config.coverLabel}
                  <span className="form-label-optional"> optional</span>
                </label>
                <input
                  className={`form-input mono${errors.coverAmount ? ' error' : ''}`}
                  type="number" inputMode="decimal"
                  placeholder={config.coverPlaceholder ?? 'e.g. 1000000'}
                  value={form.coverAmount} onChange={set('coverAmount')}
                  min="0" step="any"
                />
                {errors.coverAmount && <div className="error-text">{errors.coverAmount}</div>}
              </div>
            </div>

            {/* Start + Renewal dates */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Policy Start Date</label>
                <input
                  className="form-input" type="date"
                  value={form.startDate} onChange={set('startDate')}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Renewal Date <span className="form-label-optional">optional</span>
                </label>
                <input
                  className="form-input" type="date"
                  value={form.renewalDate} onChange={set('renewalDate')}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">
                Notes <span className="form-label-optional">optional</span>
              </label>
              <input
                className="form-input" type="text"
                placeholder="e.g. riders, nominee, policy conditions…"
                value={form.notes} onChange={set('notes')}
              />
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {initial ? 'Save Changes' : 'Add Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
