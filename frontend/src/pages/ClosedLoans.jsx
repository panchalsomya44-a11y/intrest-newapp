import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLoans, getCustomers } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import { FiCheckCircle, FiEye, FiSearch, FiX } from 'react-icons/fi'
import { GiTakeMyMoney } from 'react-icons/gi'

export default function ClosedLoans() {
  const navigate  = useNavigate()
  const [loans,     setLoans]     = useState([])
  const [customers, setCustomers] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lr, cr] = await Promise.all([
        getLoans({ is_active: false }),
        getCustomers(),
      ])
      setLoans(lr.data)
      const map = {}
      cr.data.forEach(c => { map[c.id] = c })
      setCustomers(map)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = loans.filter(l => {
    if (!search) return true
    const q    = search.toLowerCase()
    const cust = customers[l.customer_id]
    const name = cust ? `${cust.first_name} ${cust.last_name}`.toLowerCase() : ''
    return (
      l.loan_number.toLowerCase().includes(q) ||
      name.includes(q) ||
      (cust?.customer_id || '').toLowerCase().includes(q) ||
      (l.collateral_description || '').toLowerCase().includes(q) ||
      (l.collateral_description_hi || '').toLowerCase().includes(q)
    )
  })

  const totalPrincipal = filtered.reduce((s, l) => s + (l.total_principal || 0), 0)
  const totalPaid      = filtered.reduce((s, l) => s + (l.total_paid || 0), 0)
  const totalInterest  = filtered.reduce((s, l) => s + (l.total_interest || 0), 0)

  return (
    <div className="space-y-5 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-500" /> Closed Loans
          </h2>
          <p className="hindi-text text-sm text-gray-500">बंद ऋण — पूरी तरह चुकाए गए</p>
        </div>
        <span className="bg-emerald-100 text-emerald-700 text-sm font-bold px-4 py-2 rounded-full">
          {loans.length} loans closed
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Closed Loans</div>
          <div className="text-2xl font-bold text-gray-700">{filtered.length}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Principal</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalPrincipal)}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Interest Earned</div>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalInterest)}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Total Recovered</div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card rounded-2xl p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9 pr-9"
            placeholder="Search by loan #, customer name, ID, collateral..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-700 to-gray-600 text-white px-5 py-3 flex items-center gap-3">
          <FiCheckCircle size={16} className="text-emerald-400" />
          <span className="font-semibold">All Closed Loans / सभी बंद ऋण</span>
          <span className="ml-auto text-xs text-gray-300">{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-gray-400 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <GiTakeMyMoney size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No closed loans found</p>
            <p className="hindi-text text-sm">कोई बंद ऋण नहीं मिला</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-4 py-3 text-left">Loan #</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Collateral</th>
                    <th className="px-4 py-3 text-right">Principal</th>
                    <th className="px-4 py-3 text-right">Interest Earned</th>
                    <th className="px-4 py-3 text-right">Total Paid</th>
                    <th className="px-4 py-3 text-center">Rate</th>
                    <th className="px-4 py-3 text-center">Opened</th>
                    <th className="px-4 py-3 text-center">Closed On</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(loan => {
                    const cust = customers[loan.customer_id]
                    return (
                      <tr
                        key={loan.id}
                        onClick={() => navigate(`/loans/${loan.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-semibold">
                            {loan.loan_number}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {cust ? (
                            <div>
                              <div className="font-semibold text-gray-700 text-sm">
                                {cust.first_name} {cust.last_name}
                              </div>
                              {cust.first_name_hi && (
                                <div className="hindi-text text-xs text-gray-400">{cust.first_name_hi}</div>
                              )}
                              <div className="font-mono text-xs text-gray-400">{cust.customer_id}</div>
                            </div>
                          ) : <span className="text-gray-400 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500 max-w-xs">
                          {loan.collateral_description || loan.collateral_description_hi ? (
                            <div className="space-y-1">
                              {loan.collateral_description && <div className="truncate">{loan.collateral_description}</div>}
                              {loan.collateral_description_hi && <div className="hindi-text text-[11px] text-gray-400 truncate">{loan.collateral_description_hi}</div>}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                          {formatCurrency(loan.total_principal)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-amber-600">
                          {formatCurrency(loan.total_interest)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                          {formatCurrency(loan.total_paid)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {loan.interest_rate}%/mo
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {formatDate(loan.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs font-semibold text-emerald-600">
                            {formatDate(loan.closed_at || loan.created_at)}
                          </div>
                          <span className="badge-closed mt-0.5 inline-block">✓ Closed</span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/loans/${loan.id}`)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <FiEye size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Footer total row */}
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={3} className="px-4 py-3 text-xs text-gray-500 font-semibold uppercase">
                      Total ({filtered.length} loans)
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-700">
                      {formatCurrency(totalPrincipal)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-amber-600">
                      {formatCurrency(totalInterest)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
