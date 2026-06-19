import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLoans, getCustomers } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import { FiPlus, FiEye, FiClock } from 'react-icons/fi'
import { GiTakeMyMoney } from 'react-icons/gi'

// ── Reusable loan row ────────────────────────────────────────────────────────
function LoanRow({ loan, customer, onView }) {
  return (
    <tr className="table-row-hover" onClick={onView}>
      <td className="px-4 py-3">
        <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg font-semibold">
          {loan.loan_number}
        </span>
      </td>
      <td className="px-4 py-3">
        {customer ? (
          <div>
            <div className="font-medium text-gray-800 text-sm">{customer.first_name} {customer.last_name}</div>
            {customer.first_name_hi && (
              <div className="hindi-text text-xs text-gray-400">{customer.first_name_hi}</div>
            )}
            <div className="font-mono text-xs text-gray-400">{customer.customer_id}</div>
          </div>
        ) : <span className="text-gray-400 text-sm">—</span>}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500 max-w-32 truncate">
        {loan.collateral_description || '—'}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
        {formatCurrency(loan.total_principal)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-amber-600 font-medium">
        {formatCurrency(loan.total_interest)}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`font-bold text-sm ${loan.is_active ? 'text-primary-700' : 'text-gray-400'}`}>
          {formatCurrency(loan.outstanding)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
          {loan.interest_rate}%
        </span>
      </td>
      <td className="px-4 py-3 text-center text-xs text-gray-500">{formatDate(loan.created_at)}</td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <button onClick={onView} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
          <FiEye size={16} />
        </button>
      </td>
    </tr>
  )
}

// ── Table headers ─────────────────────────────────────────────────────────────
function TableHead({ color = 'primary' }) {
  const cls = `text-${color}-700 bg-${color}-50`
  return (
    <thead>
      <tr className={`border-b border-${color}-100 ${cls}`}>
        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Loan #</th>
        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Customer</th>
        <th className="text-left px-4 py-3 text-xs font-semibold uppercase hidden md:table-cell">Collateral</th>
        <th className="text-right px-4 py-3 text-xs font-semibold uppercase">Principal</th>
        <th className="text-right px-4 py-3 text-xs font-semibold uppercase">Interest</th>
        <th className="text-right px-4 py-3 text-xs font-semibold uppercase">Outstanding</th>
        <th className="text-center px-4 py-3 text-xs font-semibold uppercase">Rate</th>
        <th className="text-center px-4 py-3 text-xs font-semibold uppercase">Date</th>
        <th className="px-4 py-3"></th>
      </tr>
    </thead>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function LoanList() {
  const navigate = useNavigate()
  const [activeLoans,  setActiveLoans]  = useState([])
  const [customers,    setCustomers]    = useState({})
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [activeRes, custRes] = await Promise.all([
        getLoans({ is_active: true }),
        getCustomers(),
      ])
      setActiveLoans(activeRes.data)
      const map = {}
      custRes.data.forEach(c => { map[c.id] = c })
      setCustomers(map)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredActive = (() => {
    if (!search) return activeLoans
    const lq = search.toLowerCase()
    return activeLoans.filter(l => {
      const cust = customers[l.customer_id]
      const name = cust ? `${cust.first_name} ${cust.last_name}`.toLowerCase() : ''
      return l.loan_number.toLowerCase().includes(lq) || name.includes(lq) ||
             (cust?.customer_id || '').toLowerCase().includes(lq) ||
             (l.collateral_description || '').toLowerCase().includes(lq)
    })
  })()

  const totalOutstanding  = activeLoans.reduce((s, l) => s + (l.outstanding || 0), 0)
  const totalPrincipalOut = activeLoans.reduce((s, l) => s + (l.principal_balance || 0), 0)

  return (
    <div className="space-y-5 fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold gradient-text">Active Loans | सक्रिय ऋण</h2>
          <p className="text-xs text-gray-500 mt-0.5">{activeLoans.length} active loan(s)</p>
        </div>
        <button
          onClick={() => navigate('/loans/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow-md transition"
        >
          <FiPlus /> New Loan
        </button>
      </div>

      {/* ── Summary bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Active Loans / सक्रिय ऋण</div>
          <div className="text-2xl font-bold text-primary-700">{activeLoans.length}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Outstanding / कुल बकाया</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Principal Out / मूलधन बाहर</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalPrincipalOut)}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — ACTIVE LOANS
      ══════════════════════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Section header */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <FiClock size={16} />
            </div>
            <div>
              <div className="font-bold">Active Loans / सक्रिय ऋण</div>
              <div className="text-xs text-primary-200">{activeLoans.length} loans · {formatCurrency(totalOutstanding)} outstanding</div>
            </div>
          </div>
          <div className="w-48">
            <input
              className="w-full px-3 py-1.5 rounded-lg bg-white/20 placeholder-white/60 text-white text-sm outline-none border border-white/30 focus:border-white/60"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredActive.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <GiTakeMyMoney size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active loans</p>
            <p className="hindi-text text-xs">कोई सक्रिय ऋण नहीं</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <TableHead color="primary" />
              <tbody className="divide-y divide-gray-100">
                {filteredActive.map(loan => (
                  <LoanRow
                    key={loan.id}
                    loan={loan}
                    customer={customers[loan.customer_id]}
                    onView={() => navigate(`/loans/${loan.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
