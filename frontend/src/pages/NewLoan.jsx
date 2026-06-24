import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCustomers, createLoan } from '../utils/api'
import HindiInput from '../components/HindiInput'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiSave, FiSearch } from 'react-icons/fi'
import { formatDate } from '../utils/formatters'

export default function NewLoan() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedCustomerId = searchParams.get('customer_id')

  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [form, setForm] = useState({
    collateral_description: '',
    collateral_description_hi: '',
    collateral_metal_type: 'gold',
    collateral_metal_weight: '',
    collateral_photo: null,
    interest_rate: 3,
    notes: '',
    first_tranche_amount: '',
    first_tranche_date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCustomers().then(r => {
      setCustomers(r.data)
      if (preselectedCustomerId) {
        const c = r.data.find(c => c.id === parseInt(preselectedCustomerId))
        if (c) setSelectedCustomer(c)
      }
    })
  }, [preselectedCustomerId])

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true
    const q = customerSearch.toLowerCase()
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.customer_id.toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    )
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedCustomer) { toast.error('Please select a customer'); return }
    if (!form.first_tranche_amount || parseFloat(form.first_tranche_amount) <= 0) {
      toast.error('Please enter a valid loan amount')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('customer_id', selectedCustomer.id)
      if (form.collateral_description) fd.append('collateral_description', form.collateral_description)
      if (form.collateral_description_hi) fd.append('collateral_description_hi', form.collateral_description_hi)
      if (form.collateral_metal_type) fd.append('collateral_metal_type', form.collateral_metal_type)
      if (form.collateral_metal_weight) fd.append('collateral_metal_weight', form.collateral_metal_weight)
      if (form.collateral_photo) fd.append('collateral_photo', form.collateral_photo)
      if (form.interest_rate) fd.append('interest_rate', form.interest_rate)
      if (form.notes) fd.append('notes', form.notes)
      fd.append('first_tranche_amount', form.first_tranche_amount)
      if (form.first_tranche_date) fd.append('first_tranche_date', new Date(form.first_tranche_date).toISOString())

      const res = await createLoan(fd)
      toast.success(`Loan created! ${res.data.loan_number}`)
      navigate(`/loans/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error creating loan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold gradient-text">New Loan</h2>
          <p className="hindi-text text-sm text-gray-500">नया ऋण</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer Selection */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-gray-700 mb-3">Select Customer | <span className="hindi-text font-normal">ग्राहक चुनें</span></h3>

          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 bg-primary-50 rounded-xl border border-primary-200">
              <div>
                <div className="font-semibold text-primary-800">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                {selectedCustomer.first_name_hi && (
                  <div className="hindi-text text-sm text-primary-600">{selectedCustomer.first_name_hi} {selectedCustomer.last_name_hi}</div>
                )}
                <div className="font-mono text-xs text-primary-500">{selectedCustomer.customer_id}</div>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="text-xs text-primary-500 underline hover:text-primary-700">Change</button>
            </div>
          ) : (
            <div>
              <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field pl-9"
                  placeholder="Search customer by name, ID, phone..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl">
                {filteredCustomers.slice(0, 20).map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 cursor-pointer transition"
                  >
                    <div>
                      <div className="font-medium text-gray-700 text-sm">{c.first_name} {c.last_name}</div>
                      {c.first_name_hi && <div className="hindi-text text-xs text-gray-400">{c.first_name_hi}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs text-primary-600">{c.customer_id}</div>
                      {c.village && <div className="text-xs text-gray-400">{c.village}</div>}
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">No customers found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loan Details */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-gray-700">Loan Details | <span className="hindi-text font-normal">ऋण विवरण</span></h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₹) | <span className="hindi-text font-normal">राशि</span></label>
              <input
                className="input-field text-xl font-bold"
                type="number"
                min="1"
                step="any"
                value={form.first_tranche_amount}
                onChange={e => set('first_tranche_amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label">Loan Date | <span className="hindi-text font-normal">ऋण तिथि</span></label>
              <input
                className="input-field"
                type="date"
                value={form.first_tranche_date}
                onChange={e => set('first_tranche_date', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Interest starts from this date</p>
            </div>
            <div>
              <label className="label">Interest Rate (% / month) | <span className="hindi-text font-normal">ब्याज दर</span></label>
              <div className="flex items-center gap-2">
                <input
                  className="input-field flex-1"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.interest_rate}
                  onChange={e => set('interest_rate', e.target.value)}
                />
                <span className="text-sm text-gray-500 font-medium">% / mo</span>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Collateral | <span className="hindi-text font-normal">जमानत</span></label>
            <input className="input-field" value={form.collateral_description} onChange={e => set('collateral_description', e.target.value)} placeholder="e.g., Gold ring, Property papers, etc." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Metal Type | <span className="hindi-text font-normal">धातु</span></label>
              <select className="input-field" value={form.collateral_metal_type} onChange={e => set('collateral_metal_type', e.target.value)}>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
            <div>
              <label className="label">Weight (grams) | <span className="hindi-text font-normal">वजन (ग्राम)</span></label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                value={form.collateral_metal_weight}
                onChange={e => set('collateral_metal_weight', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="label">Collateral Photo | <span className="hindi-text font-normal">जमानत फोटो</span></label>
            <input
              className="input-field"
              type="file"
              accept="image/*"
              onChange={e => set('collateral_photo', e.target.files?.[0] || null)}
            />
            {form.collateral_photo && (
              <p className="text-sm text-gray-500 mt-2">Selected: {form.collateral_photo.name}</p>
            )}
          </div>
          <div>
            <label className="hindi-text label">जमानत (हिंदी में)</label>
            <HindiInput
              value={form.collateral_description_hi}
              onChange={e => set('collateral_description_hi', e.target.value)}
              sourceValue={form.collateral_description}
              placeholder="जमानत का विवरण हिंदी में"
            />
          </div>
          <div>
            <label className="label">Notes | <span className="hindi-text font-normal">नोट</span></label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>

        <div className="flex gap-4 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg transition disabled:opacity-60"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave />}
            Create Loan | <span className="hindi-text font-normal">ऋण बनाएं</span>
          </button>
        </div>
      </form>
    </div>
  )
}
