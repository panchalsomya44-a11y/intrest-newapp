import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLoan, getCustomer, addTranche, addPayment, updateInterestRate, closeLoan, deleteLoan, photoUrl } from '../utils/api'
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters'
import ConfirmModal from '../components/ConfirmModal'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiCheckCircle, FiEdit2, FiTrash2, FiUser, FiInfo, FiList, FiDownload, FiPrinter, FiPhone, FiMapPin, FiShoppingBag } from 'react-icons/fi'
import { GiReceiveMoney, GiPayMoney } from 'react-icons/gi'

// ─── Helper: today's date as YYYY-MM-DD ────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10)

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, titleHi, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full fade-in flex flex-col ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
        style={{ maxHeight: '92vh' }}
      >
        {/* Header — fixed, never scrolls */}
        <div className="bg-primary-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            {titleHi && <p className="hindi-text text-sm opacity-80">{titleHi}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg font-bold transition"
          >
            ×
          </button>
        </div>
        {/* Body — scrollable */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── TrancheRow ────────────────────────────────────────────────────────────────
function TrancheRow({ tranche }) {
  return (
    <tr className="hover:bg-blue-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(tranche.disbursal_date)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-blue-700">{formatCurrency(tranche.amount)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{tranche.notes || '—'}</td>
    </tr>
  )
}

// ─── LedgerRow ─────────────────────────────────────────────────────────────────
function LedgerRow({ entry }) {
  const typeConfig = {
    disbursal:        { dot: 'bg-blue-500',   label: 'Disbursal',         labelHi: 'वितरण' },
    payment:          { dot: 'bg-emerald-500', label: 'Payment',           labelHi: 'भुगतान' },
    interest_accrual: { dot: 'bg-amber-500',   label: 'Interest Accrual',  labelHi: 'ब्याज संचय' },
  }
  const cfg = typeConfig[entry.entry_type] || { dot: 'bg-gray-400', label: entry.entry_type, labelHi: '' }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(entry.entry_date)}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          {cfg.label}
          {cfg.labelHi && <span className="hindi-text text-xs text-gray-400">({cfg.labelHi})</span>}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-700">
        {entry.amount != null ? formatCurrency(entry.amount) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-right text-gray-600">
        {entry.principal_balance != null ? formatCurrency(entry.principal_balance) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-right text-amber-600">
        {entry.interest_balance != null ? formatCurrency(entry.interest_balance) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">{entry.notes || '—'}</td>
    </tr>
  )
}

// ─── Payment mode options ──────────────────────────────────────────────────────
const PAYMENT_MODES = [
  {
    value: 'auto',
    label: 'Auto (Interest first, then Principal)',
    labelHi: 'स्वचालित (पहले ब्याज, फिर मूलधन)',
  },
  {
    value: 'full_waive',
    label: 'Full Interest Waive — All goes to Principal',
    labelHi: 'ब्याज माफ — सब मूलधन में',
  },
  {
    value: 'custom',
    label: 'Custom Interest Amount (Negotiate)',
    labelHi: 'कस्टम ब्याज राशि (समझौता)',
  },
]

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════
export default function LoanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loan, setLoan]             = useState(null)
  const [customer, setCustomer]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const printRef = useRef()

  // Modal visibility
  const [showAddTranche,  setShowAddTranche]  = useState(false)
  const [showAddPayment,  setShowAddPayment]  = useState(false)
  const [showEditRate,    setShowEditRate]    = useState(false)
  const [showClose,       setShowClose]       = useState(false)
  const [showDelete,      setShowDelete]      = useState(false)
  const [showLedger,      setShowLedger]      = useState(false)

  // Form state
  const [trancheForm,  setTrancheForm]  = useState({ amount: '', date: todayStr(), notes: '' })
  const [paymentForm,  setPaymentForm]  = useState({ amount: '', date: todayStr(), notes: '', mode: 'auto', customInterest: '' })
  const [newRate,      setNewRate]      = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const reload = async () => {
    try {
      const res = await getLoan(id)
      setLoan(res.data)
      if (!customer && res.data?.customer_id) {
        try {
          const cRes = await getCustomer(res.data.customer_id)
          setCustomer(cRes.data)
        } catch (_) {}
      }
    } catch (err) {
      toast.error('Failed to load loan')
    }
  }

  useEffect(() => {
    setLoading(true)
    getLoan(id)
      .then(async (res) => {
        setLoan(res.data)
        if (res.data?.customer_id) {
          try {
            const cRes = await getCustomer(res.data.customer_id)
            setCustomer(cRes.data)
          } catch (_) {}
        }
      })
      .catch(() => toast.error('Failed to load loan'))
      .finally(() => setLoading(false))
  }, [id])

  // ── Payment preview ────────────────────────────────────────────────────────
  const paymentPreview = useMemo(() => {
    if (!loan || !paymentForm.amount) return null
    const paid            = parseFloat(paymentForm.amount) || 0
    const accruedInterest = loan.interest_balance || 0

    // Determine interest to charge based on mode
    let interestToCharge
    if (paymentForm.mode === 'full_waive') {
      interestToCharge = 0                                          // all waived
    } else if (paymentForm.mode === 'custom') {
      interestToCharge = Math.min(parseFloat(paymentForm.customInterest) || 0, accruedInterest)
    } else {
      interestToCharge = accruedInterest                            // auto: charge full
    }

    const isNegotiated    = paymentForm.mode !== 'auto'
    const interestCleared = Math.min(paid, interestToCharge)
    const principalCleared = Math.min(Math.max(paid - interestCleared, 0), loan.principal_balance || 0)
    const excess           = Math.max(paid - interestCleared - principalCleared, 0)
    const newPrincipal     = (loan.principal_balance || 0) - principalCleared

    // KEY: if negotiated, remaining interest is WAIVED (zeroed), not carried forward
    const interestWaived   = isNegotiated ? Math.max(accruedInterest - interestToCharge, 0) : 0
    const newInterestBal   = isNegotiated ? 0 : Math.max(accruedInterest - interestCleared, 0)

    return { paid, interestCleared, principalCleared, excess, newPrincipal, interestWaived, newInterestBal, accruedInterest }
  }, [loan, paymentForm.amount, paymentForm.mode, paymentForm.customInterest])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddTranche = async (e) => {
    e.preventDefault()
    const amount = parseFloat(trancheForm.amount)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
    try {
      // Convert date string (YYYY-MM-DD) to ISO datetime without timezone issues
      const [year, month, day] = trancheForm.date.split('-')
      const utcDate = new Date(Date.UTC(parseInt(year), parseInt(month)-1, parseInt(day)))
      await addTranche(id, {
        amount,
        disbursal_date: utcDate.toISOString(),
        notes: trancheForm.notes,
      })
      toast.success('Tranche added')
      setShowAddTranche(false)
      setTrancheForm({ amount: '', date: todayStr(), notes: '' })
      await reload()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add tranche')
    }
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    const amount = parseFloat(paymentForm.amount)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }

    let interest_override = null
    if (paymentForm.mode === 'full_waive') interest_override = 0
    else if (paymentForm.mode === 'custom')  interest_override = parseFloat(paymentForm.customInterest) || 0

    try {
      // Convert date string (YYYY-MM-DD) to ISO datetime without timezone issues
      const [year, month, day] = paymentForm.date.split('-')
      const utcDate = new Date(Date.UTC(parseInt(year), parseInt(month)-1, parseInt(day)))
      await addPayment(id, {
        amount,
        payment_date: utcDate.toISOString(),
        notes: paymentForm.notes,
        interest_override,
      })
      toast.success('Payment recorded')
      setShowAddPayment(false)
      setPaymentForm({ amount: '', date: todayStr(), notes: '', mode: 'auto', customInterest: '' })

      // ── Auto-close: reload updated loan and check if fully paid ──
      const updated = await getLoan(id)
      setLoan(updated.data)
      if (updated.data.outstanding <= 0 && updated.data.is_active) {
        await closeLoan(id)
        const closed = await getLoan(id)
        setLoan(closed.data)
        toast.success('🎉 Loan fully paid! Loan has been closed automatically.')
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to record payment')
    }
  }

  const handleUpdateRate = async (e) => {
    e.preventDefault()
    const rate = parseFloat(newRate)
    if (!rate || rate <= 0) { toast.error('Enter a valid rate'); return }
    try {
      await updateInterestRate(id, rate)
      toast.success('Interest rate updated')
      setShowEditRate(false)
      setNewRate('')
      await reload()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update rate')
    }
  }

  const handleClose = async () => {
    try {
      await closeLoan(id)
      toast.success('Loan closed')
      setShowClose(false)
      await reload()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to close loan')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteLoan(id)
      toast.success('Loan deleted')
      navigate('/loans')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete loan')
    }
  }

  const handlePrint = () => {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(`
      <html><head><title>Loan Statement - ${loan?.loan_number}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 24px; }
        .print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
        .print-title { font-size: 22px; font-weight: 800; color: #1e3a8a; }
        .print-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
        .section { margin-bottom: 18px; }
        .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-bottom: 10px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
        .card-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
        .card-val { font-size: 16px; font-weight: 700; margin-top: 2px; }
        .blue { color: #1d4ed8; } .amber { color: #d97706; } .red { color: #dc2626; } .green { color: #059669; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #eff6ff; color: #1e40af; font-size: 11px; text-transform: uppercase; padding: 8px 10px; text-align: left; }
        td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
        tr:last-child td { border-bottom: none; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
        .badge-auto { background: #dbeafe; color: #1d4ed8; }
        .badge-waive { background: #ffedd5; color: #c2410c; }
        .badge-custom { background: #f3e8ff; color: #7e22ce; }
        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 11px; color: #94a3b8; }
        .customer-photo { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; border: 2px solid #dbeafe; }
        @media print { body { padding: 10px; } button { display: none; } }
      </style>
      </head><body>${el.innerHTML}
      <div class="footer">Generated on ${new Date().toLocaleString('en-IN')} · Loan Management System</div>
      </body></html>
    `)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Loan not found</p>
        <p className="hindi-text text-sm mt-1">ऋण नहीं मिला</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto fade-in">
      {/* ── Two-column layout: main content + payment history sidebar ── */}
      <div className="flex gap-5 items-start">

        {/* ══ LEFT: Main content ══ */}
        <div className="flex-1 min-w-0 space-y-5">

      {/* ── HEADER ROW ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-3">
        {/* Back + Loan number */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-primary-200 text-primary-700 hover:bg-primary-50 font-semibold rounded-xl transition shadow-sm flex-shrink-0"
          >
            <FiArrowLeft size={16} /> Back
          </button>
          <span className="font-mono font-bold text-gray-800 text-lg truncate">{loan.loan_number}</span>
          {loan.is_active ? (
            <span className="badge-active flex-shrink-0">● Active</span>
          ) : (
            <span className="badge-closed flex-shrink-0">✓ Closed</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {loan.is_active && (
            <>
              <button
                onClick={() => setShowAddTranche(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow"
              >
                <GiReceiveMoney size={15} /> Add Amount
              </button>
              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition shadow"
              >
                <GiPayMoney size={15} /> Record Payment
              </button>
              <button
                onClick={() => { setNewRate(String(loan.interest_rate || '')); setShowEditRate(true) }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition shadow"
              >
                <FiEdit2 size={13} /> Edit Rate
              </button>
              <button
                onClick={() => setShowClose(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-500 text-white rounded-xl text-xs font-semibold hover:bg-gray-600 transition shadow"
              >
                <FiCheckCircle size={13} /> Close Loan
              </button>
            </>
          )}
          <button
            onClick={() => setShowLedger(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50 transition"
          >
            <FiList size={13} /> Ledger
          </button>
          <button
            onClick={() => navigate(`/loans/${id}/sell-collateral`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 border-amber-500 text-amber-600 hover:bg-amber-50 transition"
          >
            <FiShoppingBag size={13} /> Sell
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 border-red-400 text-red-500 hover:bg-red-50 transition"
          >
            <FiTrash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Disbursed */}
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Total Disbursed</div>
          <div className="hindi-text text-xs text-gray-400 mb-2">कुल वितरण</div>
          <div className="text-xl font-bold text-blue-700">{formatCurrency(loan.total_principal)}</div>
          <div className="text-xs text-gray-400 mt-1">{loan.tranches?.length || 0} tranche(s)</div>
        </div>

        {/* Principal Balance */}
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Principal Balance</div>
          <div className="hindi-text text-xs text-gray-400 mb-2">मूलधन शेष</div>
          <div className="text-xl font-bold text-primary-700">{formatCurrency(loan.principal_balance)}</div>
          <div className="text-xs text-gray-400 mt-1">Paid: {formatCurrency(loan.principal_paid)}</div>
        </div>

        {/* Interest Due */}
        <div
          role="button"
          onClick={() => setShowLedger(true)}
          className="glass-card rounded-2xl p-4 cursor-pointer hover:shadow-lg"
        >
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Interest Due</div>
          <div className="hindi-text text-xs text-gray-400 mb-2">ब्याज देय</div>
          <div className="text-xl font-bold text-amber-600">{formatCurrency(loan.interest_balance)}</div>
          <div className="text-xs text-gray-400 mt-1">
            {loan.interest_rate}%/mo · Paid: {formatCurrency(loan.interest_paid)}
          </div>
        </div>

        {/* Total Outstanding */}
        <div className={`glass-card rounded-2xl p-4 border-2 border-primary-200`}>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Total Outstanding</div>
          <div className="hindi-text text-xs text-gray-400 mb-2">कुल बकाया</div>
          <div className={`text-xl font-bold ${(loan.outstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(loan.outstanding)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Principal + Interest</div>
        </div>
      </div>

      {/* ── INFO BOX ────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 flex gap-3">
        <FiInfo className="text-primary-500 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            Interest accrues monthly on the outstanding principal. When a payment is received, it first clears
            accrued interest, then reduces the principal — unless a custom settlement is chosen.
          </p>
          <p className="hindi-text text-gray-500">
            ब्याज हर महीने मूलधन पर जुड़ता है। भुगतान पहले ब्याज चुकाता है, फिर मूलधन घटाता है — जब तक कि कस्टम विकल्प न चुना जाए।
          </p>
        </div>
      </div>

      {/* ── CUSTOMER CARD ───────────────────────────────────────────────── */}
      {customer && (
        <div
          className="glass-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary-300 transition"
          onClick={() => navigate(`/customers/${customer.id}`)}
        >
          <div className="w-14 h-14 rounded-xl bg-primary-50 border-2 border-primary-100 flex items-center justify-center flex-shrink-0">
            <FiUser size={24} className="text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-800 text-base">
              {customer.first_name} {customer.last_name}
            </div>
            {(customer.first_name_hi || customer.last_name_hi) && (
              <div className="hindi-text text-sm text-gray-500">
                {customer.first_name_hi} {customer.last_name_hi}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{customer.customer_id}</span>
              {(customer.village || customer.state) && (
                <span>{[customer.village, customer.state].filter(Boolean).join(', ')}</span>
              )}
            </div>
          </div>
          <FiArrowLeft className="rotate-180 text-gray-300 flex-shrink-0" size={16} />
        </div>
      )}

      {/* ── COLLATERAL ──────────────────────────────────────────────────── */}
      {(loan.collateral_description || loan.collateral_description_hi || loan.collateral_photo_path) && (
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Collateral / जमानत</div>
          {loan.collateral_description && (
            <p className="text-gray-700 text-sm">{loan.collateral_description}</p>
          )}
          {loan.collateral_description_hi && (
            <p className="hindi-text text-gray-700 text-sm">{loan.collateral_description_hi}</p>
          )}
          {loan.collateral_metal_type && (
            <div className="text-xs text-gray-600 mt-2">
              <span className="font-semibold">{loan.collateral_metal_type === 'gold' ? '🟡 Gold' : '🪙 Silver'}</span>
              {loan.collateral_metal_weight && <span> • {loan.collateral_metal_weight}g</span>}
            </div>
          )}
          {loan.collateral_photo_path && (
            <img src={photoUrl(loan.collateral_photo_path)} alt="Collateral" className="w-full h-40 object-cover rounded-lg mt-2" />
          )}
        </div>
      )}

      {/* ── DISBURSALS TABLE ─────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="bg-blue-600 text-white px-5 py-3 flex items-center gap-2">
          <GiReceiveMoney size={18} />
          <span className="font-semibold">Disbursals</span>
          <span className="hindi-text text-sm opacity-80 ml-1">वितरण</span>
        </div>
        {loan.tranches && loan.tranches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-50 text-xs text-blue-700 uppercase font-semibold">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loan.tranches.map((t, i) => <TrancheRow key={t.id || i} tranche={t} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">No disbursals yet</div>
        )}
      </div>

      {/* ── PAYMENTS TABLE ───────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="bg-emerald-600 text-white px-5 py-3 flex items-center gap-2">
          <GiPayMoney size={18} />
          <span className="font-semibold">Payments</span>
          <span className="hindi-text text-sm opacity-80 ml-1">भुगतान</span>
        </div>
        {loan.payments && loan.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-emerald-50 text-xs text-emerald-700 uppercase font-semibold">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Interest Mode</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loan.payments.map((p, i) => (
                  <React.Fragment key={p.id || i}>
                    <tr className="hover:bg-emerald-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.payment_date)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-sm">
                        {p.interest_override === null || p.interest_override === undefined ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Auto</span>
                        ) : p.interest_override === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Interest Waived</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                            Custom ₹{p.interest_override}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.notes || '—'}</td>
                    </tr>
                    {p.notes && p.notes.includes('Collateral sale proceeds') && (
                      <tr>
                        <td className="px-4 py-3" colSpan={4}>
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="font-semibold text-amber-800">Collateral sale recorded</div>
                            <div className="text-sm text-gray-600 mt-2">{p.notes}</div>
                            {loan.collateral_photo_path && (
                              <div className="mt-3 rounded overflow-hidden border">
                                <img src={photoUrl(loan.collateral_photo_path)} alt="Collateral sale" className="w-full h-40 object-cover" />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">No payments yet</div>
        )}
      </div>

        </div>{/* end LEFT column */}

        {/* ══ RIGHT: Payment History Sidebar ══ */}
        <div className="w-80 flex-shrink-0 space-y-4 sticky top-4">

          {/* Customer card in sidebar */}
          {customer && (
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {photoUrl(customer.photo_path) ? (
                  <img src={photoUrl(customer.photo_path)} alt={customer.first_name}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-primary-100 flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary-50 border-2 border-primary-100 flex items-center justify-center flex-shrink-0">
                    <FiUser size={22} className="text-primary-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 truncate">{customer.first_name} {customer.last_name}</div>
                  {customer.first_name_hi && (
                    <div className="hindi-text text-sm text-gray-500 truncate">{customer.first_name_hi} {customer.last_name_hi}</div>
                  )}
                  <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {customer.customer_id}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
                {customer.phone && (
                  <div className="flex items-center gap-2"><FiPhone size={11} className="text-gray-400"/>{customer.phone}</div>
                )}
                {(customer.village || customer.state) && (
                  <div className="flex items-center gap-2"><FiMapPin size={11} className="text-gray-400"/>
                    {[customer.village, customer.state].filter(Boolean).join(', ')}
                  </div>
                )}
                {customer.caste && <div className="text-gray-400">Caste: {customer.caste}</div>}
              </div>
            </div>
          )}

          {/* PDF / Print buttons */}
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Statement / विवरण</div>
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition shadow"
            >
              <FiPrinter size={15}/> Print Statement
            </button>
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-primary-500 text-primary-700 hover:bg-primary-50 rounded-xl text-sm font-semibold transition"
            >
              <FiDownload size={15}/> Download PDF
            </button>
          </div>

          {/* Payment history column */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GiPayMoney size={16}/>
                <span className="font-semibold text-sm">Payment History</span>
              </div>
              <span className="hindi-text text-xs opacity-80">भुगतान इतिहास</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {loan.payments && loan.payments.length > 0 ? (
                [...loan.payments].reverse().map((p, i) => (
                  <div key={p.id || i} className="px-4 py-3 hover:bg-emerald-50 transition-colors">
                    {/* Date + amount */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{formatDate(p.payment_date)}</span>
                      <span className="font-bold text-emerald-700 text-sm">{formatCurrency(p.amount)}</span>
                    </div>
                    {/* Interest mode badge */}
                    <div className="mb-1">
                      {p.interest_override === null || p.interest_override === undefined ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Auto</span>
                      ) : p.interest_override === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Interest Waived</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Custom ₹{p.interest_override}</span>
                      )}
                    </div>
                    {/* Customer name */}
                    {customer && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <FiUser size={10} className="text-gray-400"/>
                        <span>{customer.first_name} {customer.last_name}</span>
                        <span className="font-mono text-gray-400">· {customer.customer_id}</span>
                      </div>
                    )}
                    {p.notes && <div className="text-xs text-gray-400 mt-0.5 italic">"{p.notes}"</div>}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <GiPayMoney size={28} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-xs">No payments yet</p>
                  <p className="hindi-text text-xs text-gray-300">अभी कोई भुगतान नहीं</p>
                </div>
              )}
            </div>

            {/* Sidebar summary footer */}
            {loan.payments && loan.payments.length > 0 && (
              <div className="bg-emerald-50 border-t border-emerald-100 px-4 py-3">
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>{loan.payments.length} payment(s)</span>
                  <span>{formatCurrency(loan.total_paid)}</span>
                </div>
                <div className="hindi-text text-xs text-emerald-600 mt-0.5">कुल जमा</div>
              </div>
            )}
          </div>

        </div>{/* end RIGHT sidebar */}
      </div>{/* end two-column flex */}

      {/* ── Hidden print content ── */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="print-header">
          <div>
            <div className="print-title">Loan Statement / ऋण विवरण</div>
            <div className="print-sub">Loan No: {loan.loan_number} · Rate: {loan.interest_rate}%/month · Date: {formatDate(loan.created_at)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>Status: {loan.is_active ? 'Active' : 'Closed'}</div>
          </div>
        </div>

        {/* Customer section */}
        {customer && (
          <div className="section">
            <div className="section-title">Customer Details / ग्राहक विवरण</div>
            <div className="grid2">
              <div>
                <table>
                  <tbody>
                    <tr><td style={{paddingRight:12, color:'#64748b', width:120}}>Name</td><td style={{fontWeight:600}}>{customer.first_name} {customer.last_name}</td></tr>
                    {customer.first_name_hi && <tr><td style={{color:'#64748b'}}>नाम</td><td style={{fontFamily:'sans-serif'}}>{customer.first_name_hi} {customer.last_name_hi}</td></tr>}
                    <tr><td style={{color:'#64748b'}}>Customer ID</td><td style={{fontFamily:'monospace', fontWeight:600}}>{customer.customer_id}</td></tr>
                    {customer.phone && <tr><td style={{color:'#64748b'}}>Phone</td><td>{customer.phone}</td></tr>}
                    {customer.village && <tr><td style={{color:'#64748b'}}>Village</td><td>{customer.village}</td></tr>}
                    {customer.state && <tr><td style={{color:'#64748b'}}>State</td><td>{customer.state}</td></tr>}
                    {customer.caste && <tr><td style={{color:'#64748b'}}>Caste</td><td>{customer.caste}</td></tr>}
                  </tbody>
                </table>
              </div>
              {(loan.collateral_description || loan.collateral_description_hi) && (
                <div className="card">
                  <div className="card-label">Collateral / जमानत</div>
                  {loan.collateral_description && <div style={{marginTop:4, fontWeight:500}}>{loan.collateral_description}</div>}
                  {loan.collateral_description_hi && <div style={{marginTop:4, fontWeight:500, fontFamily:'sans-serif'}}>{loan.collateral_description_hi}</div>}
                  {loan.collateral_metal_type && (
                    <div style={{marginTop:4, fontSize:'0.875rem', color:'#64748b'}}>
                      {loan.collateral_metal_type === 'gold' ? '🟡 Gold' : '🪙 Silver'}
                      {loan.collateral_metal_weight && ` • ${loan.collateral_metal_weight}g`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="section">
          <div className="section-title">Financial Summary / वित्तीय सारांश</div>
          <div className="grid4">
            <div className="card"><div className="card-label">Total Disbursed</div><div className="card-val blue">{formatCurrency(loan.total_principal)}</div></div>
            <div className="card"><div className="card-label">Principal Balance</div><div className="card-val blue">{formatCurrency(loan.principal_balance)}</div></div>
            <div className="card"><div className="card-label">Interest Due</div><div className="card-val amber">{formatCurrency(loan.interest_balance)}</div></div>
            <div className="card"><div className="card-label">Total Outstanding</div><div className="card-val red">{formatCurrency(loan.outstanding)}</div></div>
            <div className="card"><div className="card-label">Total Paid</div><div className="card-val green">{formatCurrency(loan.total_paid)}</div></div>
            <div className="card"><div className="card-label">Interest Paid</div><div className="card-val green">{formatCurrency(loan.interest_paid)}</div></div>
            <div className="card"><div className="card-label">Principal Paid</div><div className="card-val green">{formatCurrency(loan.principal_paid)}</div></div>
            <div className="card"><div className="card-label">Interest Rate</div><div className="card-val blue">{loan.interest_rate}%/mo</div></div>
          </div>
        </div>

        {/* Disbursals */}
        <div className="section">
          <div className="section-title">Disbursals / वितरण</div>
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Notes</th></tr></thead>
            <tbody>
              {loan.tranches?.map((t, i) => (
                <tr key={i}><td>{formatDate(t.disbursal_date)}</td><td style={{fontWeight:600, color:'#1d4ed8'}}>{formatCurrency(t.amount)}</td><td>{t.notes || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payments */}
        <div className="section">
          <div className="section-title">Payment History / भुगतान इतिहास</div>
          {loan.payments && loan.payments.length > 0 ? (
            <table>
              <thead><tr><th>Date</th><th>Amount</th><th>Customer</th><th>Interest Mode</th><th>Notes</th></tr></thead>
              <tbody>
                {loan.payments.map((p, i) => (
                  <tr key={i}>
                    <td>{formatDate(p.payment_date)}</td>
                    <td style={{fontWeight:600, color:'#059669'}}>{formatCurrency(p.amount)}</td>
                    <td>{customer ? `${customer.first_name} ${customer.last_name} (${customer.customer_id})` : '—'}</td>
                    <td>
                      <span className={`badge ${p.interest_override === null || p.interest_override === undefined ? 'badge-auto' : 'badge-waive'}`}>
                        {p.interest_override === null || p.interest_override === undefined ? 'Auto' : p.interest_override === 0 ? 'Waived' : `Custom ₹${p.interest_override}`}
                      </span>
                    </td>
                    <td>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{color:'#94a3b8', fontSize:12}}>No payments recorded yet.</p>}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* ── 1. Add Tranche ──────────────────────────────────────────────── */}
      {showAddTranche && (
        <Modal title="Add Amount" titleHi="राशि जोड़ें" onClose={() => setShowAddTranche(false)}>
          <form onSubmit={handleAddTranche} className="space-y-4">
            <div>
              <label className="label">Amount (₹) / राशि</label>
              <input
                type="number"
                min="1"
                step="any"
                className="input-field text-2xl font-bold"
                placeholder="0.00"
                value={trancheForm.amount}
                onChange={e => setTrancheForm(f => ({ ...f, amount: e.target.value }))}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="label">Disbursal Date / वितरण तिथि</label>
              <input
                type="date"
                className="input-field"
                value={trancheForm.date}
                onChange={e => setTrancheForm(f => ({ ...f, date: e.target.value }))}
                required
              />
              <p className="text-xs text-amber-600 mt-1 hindi-text">
                ⚠ तिथि सावधानी से चुनें — ब्याज इसी से गणना होगा।
              </p>
              <p className="text-xs text-amber-600">
                ⚠ Choose date carefully — interest accrual starts from this date.
              </p>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. second instalment"
                value={trancheForm.notes}
                onChange={e => setTrancheForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow"
            >
              Add Disbursal
            </button>
          </form>
        </Modal>
      )}

      {/* ── 2. Record Payment — Partial Repay with negotiable interest ───── */}
      {showAddPayment && (
        <Modal title="Repay / Record Payment" titleHi="आंशिक या पूर्ण भुगतान" onClose={() => setShowAddPayment(false)}>
          <form onSubmit={handleAddPayment} className="space-y-4">

            {/* ── Current balance snapshot ── */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Principal Left<br/><span className="hindi-text text-gray-400">मूलधन शेष</span></div>
                <div className="text-base font-bold text-blue-700 mt-1">{formatCurrency(loan.principal_balance)}</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Interest Due<br/><span className="hindi-text text-gray-400">ब्याज देय</span></div>
                <div className="text-base font-bold text-amber-600 mt-1">{formatCurrency(loan.interest_balance)}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <div className="text-xs text-gray-500">Total Due<br/><span className="hindi-text text-gray-400">कुल बकाया</span></div>
                <div className="text-base font-bold text-red-600 mt-1">{formatCurrency(loan.outstanding)}</div>
              </div>
            </div>

            {/* ── Quick repay buttons ── */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Quick Fill / जल्दी भरें
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => setPaymentForm(f => ({ ...f, amount: (loan.interest_balance || 0).toFixed(2), mode: 'auto' }))}
                  className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition text-left">
                  <div>💰 Only Interest</div>
                  <div className="font-bold">{formatCurrency(loan.interest_balance)}</div>
                  <div className="hindi-text text-gray-400 text-xs">सिर्फ ब्याज</div>
                </button>
                <button type="button"
                  onClick={() => setPaymentForm(f => ({ ...f, amount: (loan.outstanding || 0).toFixed(2), mode: 'auto' }))}
                  className="py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition text-left">
                  <div>✅ Full Outstanding</div>
                  <div className="font-bold">{formatCurrency(loan.outstanding)}</div>
                  <div className="hindi-text text-gray-400 text-xs">पूरा बकाया</div>
                </button>
              </div>
            </div>

            {/* ── Amount input ── */}
            <div>
              <label className="label">Enter Any Amount (₹) / कोई भी राशि दर्ज करें</label>
              <input
                type="number" min="1" step="any" autoFocus required
                className="input-field text-2xl font-bold"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1 hindi-text">
                ग्राहक कितनी भी राशि दे सकता है — आंशिक या पूर्ण
              </p>
              <p className="text-xs text-gray-400">Customer can pay any amount — partial or full</p>
            </div>

            {/* ── Date ── */}
            <div>
              <label className="label">Payment Date / भुगतान तिथि</label>
              <input type="date" required className="input-field"
                value={paymentForm.date}
                onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            {/* ── Interest negotiation ── */}
            <div>
              <label className="label">Interest Settlement / ब्याज निपटान</label>
              <div className="space-y-2">
                {PAYMENT_MODES.map(m => (
                  <label key={m.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      paymentForm.mode === m.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}>
                    <input type="radio" name="paymode" value={m.value}
                      checked={paymentForm.mode === m.value}
                      onChange={() => setPaymentForm(f => ({ ...f, mode: m.value, customInterest: '' }))}
                      className="mt-1 accent-primary-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">{m.label}</div>
                      <div className="hindi-text text-xs text-gray-400 mt-0.5">{m.labelHi}</div>
                    </div>
                  </label>
                ))}
              </div>

              {paymentForm.mode === 'custom' && (
                <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <label className="label text-purple-700">Negotiated Interest Amount (₹) / समझौता ब्याज</label>
                  <input type="number" min="0" step="any"
                    className="input-field border-purple-300 focus:ring-purple-400 mt-1"
                    placeholder={`Accrued: ₹${(loan.interest_balance || 0).toFixed(2)} — enter agreed amount`}
                    value={paymentForm.customInterest}
                    onChange={e => setPaymentForm(f => ({ ...f, customInterest: e.target.value }))} />
                  <p className="text-xs text-purple-600 mt-1">
                    Accrued ₹{(loan.interest_balance||0).toFixed(2)} — enter less to waive partial interest
                  </p>
                  <p className="hindi-text text-xs text-purple-500 mt-0.5">
                    बकाया ब्याज ₹{(loan.interest_balance||0).toFixed(2)} है — कम लिखें तो बाकी माफ होगा
                  </p>
                </div>
              )}
            </div>

            {/* ── LIVE BREAKDOWN — shows instantly as you type ── */}
            {paymentPreview && parseFloat(paymentForm.amount || 0) > 0 && (
              <div className="rounded-2xl overflow-hidden border-2 border-primary-100">
                <div className="bg-primary-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-wide">
                  Live Breakdown / लाइव विवरण
                </div>
                <div className="bg-white p-4 space-y-2.5 text-sm">

                  {/* Payment bar */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">💵 Paying Now</span>
                    <span className="font-bold text-gray-900 text-base">{formatCurrency(paymentPreview.paid)}</span>
                  </div>

                  {/* Split bar visual */}
                  {(paymentPreview.interestCleared + paymentPreview.principalCleared) > 0 && (
                    <div className="w-full h-4 rounded-full overflow-hidden flex bg-gray-100">
                      {paymentPreview.interestCleared > 0 && (
                        <div
                          className="bg-amber-400 h-full transition-all"
                          style={{ width: `${(paymentPreview.interestCleared / paymentPreview.paid) * 100}%` }}
                          title={`Interest: ₹${paymentPreview.interestCleared}`}
                        />
                      )}
                      {paymentPreview.principalCleared > 0 && (
                        <div
                          className="bg-blue-500 h-full transition-all"
                          style={{ width: `${(paymentPreview.principalCleared / paymentPreview.paid) * 100}%` }}
                          title={`Principal: ₹${paymentPreview.principalCleared}`}
                        />
                      )}
                      {paymentPreview.excess > 0 && (
                        <div
                          className="bg-gray-300 h-full transition-all"
                          style={{ width: `${(paymentPreview.excess / paymentPreview.paid) * 100}%` }}
                        />
                      )}
                    </div>
                  )}
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"/> Interest</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> Principal</span>
                    {paymentPreview.excess > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block"/> Excess</span>}
                  </div>

                  <div className="border-t border-gray-100 pt-2 space-y-1.5">
                    <div className="flex justify-between text-amber-700">
                      <span>→ Interest cleared / ब्याज चुका</span>
                      <span className="font-semibold">{formatCurrency(paymentPreview.interestCleared)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>→ Principal reduced / मूलधन घटा</span>
                      <span className="font-semibold">{formatCurrency(paymentPreview.principalCleared)}</span>
                    </div>
                    {paymentPreview.interestWaived > 0 && (
                      <div className="flex justify-between text-orange-500">
                        <span>✓ Interest waived / ब्याज माफ</span>
                        <span className="font-semibold">{formatCurrency(paymentPreview.interestWaived)}</span>
                      </div>
                    )}
                    {paymentPreview.excess > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Excess / अधिक</span>
                        <span>{formatCurrency(paymentPreview.excess)}</span>
                      </div>
                    )}
                  </div>

                  {/* New balances after payment */}
                  <div className="bg-primary-50 rounded-xl p-3 mt-2 space-y-1.5">
                    <div className="text-xs font-semibold text-primary-700 uppercase mb-2">After This Payment / भुगतान के बाद</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">New Principal / नया मूलधन</span>
                      <span className="font-bold text-blue-700">{formatCurrency(paymentPreview.newPrincipal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Interest Balance / ब्याज शेष</span>
                      <span className={`font-bold ${paymentPreview.newInterestBal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(paymentPreview.newInterestBal)}
                        {paymentPreview.interestWaived > 0 && (
                          <span className="ml-1 text-xs text-orange-500">(₹{paymentPreview.interestWaived.toFixed(2)} waived)</span>
                        )}
                      </span>
                    </div>
                    <p className="hindi-text text-xs text-primary-600 mt-1">
                      अगला ब्याज सिर्फ ₹{paymentPreview.newPrincipal.toFixed(2)} पर लगेगा
                    </p>
                    <p className="text-xs text-primary-600">
                      Next interest only on ₹{paymentPreview.newPrincipal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Notes ── */}
            <div>
              <label className="label">Notes / नोट (optional)</label>
              <input type="text" className="input-field"
                placeholder="e.g. partial repay, festival payment, instalment..."
                value={paymentForm.notes}
                onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg text-base">
              ✓ Submit Payment / भुगतान दर्ज करें
            </button>
          </form>
        </Modal>
      )}

      {/* ── 3. Edit Interest Rate ────────────────────────────────────────── */}
      {showEditRate && (
        <Modal title="Update Interest Rate" titleHi="ब्याज दर बदलें" onClose={() => setShowEditRate(false)}>
          <form onSubmit={handleUpdateRate} className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-3 text-sm flex items-center gap-2">
              <span className="text-amber-600">Current rate:</span>
              <span className="font-bold text-amber-700">{loan.interest_rate}% / month</span>
            </div>
            <div>
              <label className="label">New Rate (% per month) / नई दर</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="input-field text-2xl font-bold"
                placeholder="3.0"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
                autoFocus
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              The new rate will apply to the remaining principal going forward.
            </p>
            <p className="hindi-text text-xs text-gray-400">
              नई दर आज से बचे हुए मूलधन पर लागू होगी।
            </p>
            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow"
            >
              Update Rate / अपडेट करें
            </button>
          </form>
        </Modal>
      )}

      {/* ── 4. Ledger ───────────────────────────────────────────────────── */}
      {showLedger && (
        <Modal title="Transaction Ledger" titleHi="लेनदेन विवरण" onClose={() => setShowLedger(false)} wide>
          <div className="space-y-4">
            {/* Per-tranche gross interest summary (informational - may not reflect payments/waivers) */}
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <div className="font-semibold mb-2">Per-tranche interest (gross)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {loan.tranches && loan.tranches.map((t) => {
                  const d0 = new Date(t.disbursal_date)
                  const now = new Date()
                  const days = Math.max(Math.floor((now - d0) / (1000 * 60 * 60 * 24)), 0)
                  const months = days / 30.0
                  const gross = Math.round((t.amount * (loan.interest_rate / 100) * months) * 100) / 100
                  return (
                    <div key={t.id} className="p-2 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500">Disbursal: {formatDate(t.disbursal_date)}</div>
                      <div className="font-medium">{formatCurrency(t.amount)}</div>
                      <div className="text-xs text-gray-600">{Math.floor(months)} month(s) · {days} day(s)</div>
                      <div className="text-sm text-amber-600 font-semibold">Gross interest: {formatCurrency(gross)}</div>
                    </div>
                  )
                })}
              </div>
              <div className="text-xs text-gray-500 mt-2">Note: This shows gross interest per tranche since disbursal (ignores payments/waivers). Actual outstanding interest is shown in the ledger below.</div>
            </div>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              {loan.ledger && loan.ledger.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr className="text-gray-500 uppercase font-semibold border-b-2 border-gray-200">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">Principal Bal.</th>
                      <th className="px-4 py-2 text-right">Interest Due</th>
                      <th className="px-4 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loan.ledger.map((entry, i) => (
                      <LedgerRow key={i} entry={{ ...entry, entry_type: entry.type, entry_date: entry.date }} />
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-700">Current Balance</td>
                      <td className="px-4 py-3 text-right text-primary-700">{formatCurrency(loan.principal_balance)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(loan.interest_balance)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-400">No ledger entries yet</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── 5. Close Loan confirm ────────────────────────────────────────── */}
      {showClose && (
        <ConfirmModal
          title="Close This Loan?"
          message="This will mark the loan as closed. History is preserved and you can still view it."
          onConfirm={handleClose}
          onCancel={() => setShowClose(false)}
          danger={false}
        />
      )}

      {/* ── 6. Delete Loan confirm ───────────────────────────────────────── */}
      {showDelete && (
        <ConfirmModal
          title="Delete This Loan?"
          message="This will permanently delete the loan, all disbursals and payment records. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          danger={true}
        />
      )}

    </div>
  )
}
