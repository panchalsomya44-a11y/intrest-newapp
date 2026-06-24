import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLoans, getCustomers } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import { FiSearch, FiX, FiCalendar, FiArrowRight, FiPrinter, FiDownload } from 'react-icons/fi'
import { GiPayMoney, GiReceiveMoney, GiTakeMyMoney } from 'react-icons/gi'

export default function PaymentHistory() {
  const navigate  = useNavigate()
  const printRef  = useRef()
  const [allEvents,   setAllEvents]   = useState([])   // flat list: payments + disbursals
  const [customers,   setCustomers]   = useState({})
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterFrom,  setFilterFrom]  = useState('')
  const [filterTo,    setFilterTo]    = useState('')
  const [typeFilter,  setTypeFilter]  = useState('all')  // 'all' | 'payment' | 'disbursal'

  const parseSalePayment = notes => {
    if (!notes) return null
    const saleMatch = notes.match(/Sale value ₹([\d,]+(?:\.\d+)?) applied to interest ₹([\d,]+(?:\.\d+)?) \+ principal ₹([\d,]+(?:\.\d+)?)(?:\. Customer received ₹([\d,]+(?:\.\d+)?) after settlement\.)?/) 
    if (!saleMatch) return null

    return {
      saleAmount: parseFloat(saleMatch[1].replace(/,/g, '')),
      interestAmount: parseFloat(saleMatch[2].replace(/,/g, '')),
      principalAmount: parseFloat(saleMatch[3].replace(/,/g, '')),
      refundAmount: saleMatch[4] ? parseFloat(saleMatch[4].replace(/,/g, '')) : 0,
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lr, cr] = await Promise.all([getLoans(), getCustomers()])

      const custMap = {}
      cr.data.forEach(c => { custMap[c.id] = c })
      setCustomers(custMap)

      const flat = []

      lr.data.forEach(loan => {
        // ── Payments (paise jama / received) ──
        ;(loan.payments || []).forEach(p => {
          const saleInfo = parseSalePayment(p.notes)
          if (saleInfo) {
            const appliedAmount = saleInfo.interestAmount + saleInfo.principalAmount
            flat.push({
              kind:          'payment',
              event_date:    p.payment_date,
              amount:        appliedAmount,
              id:            `${p.id}-applied`,
              loan_id:       loan.id,
              loan_number:   loan.loan_number,
              customer_id:   loan.customer_id,
              collateral:    loan.collateral_description,
              collateral_hi: loan.collateral_description_hi,
              loan_active:   loan.is_active,
              interest_rate: loan.interest_rate,
              interest_override: p.interest_override,
              notes:         `Sale proceeds applied to interest ₹${saleInfo.interestAmount.toFixed(2)} + principal ₹${saleInfo.principalAmount.toFixed(2)}`,
            })

            if (saleInfo.refundAmount > 0) {
              flat.push({
                kind:          'refund',
                event_date:    p.payment_date,
                amount:        saleInfo.refundAmount,
                id:            `${p.id}-refund`,
                loan_id:       loan.id,
                loan_number:   loan.loan_number,
                customer_id:   loan.customer_id,
                collateral:    loan.collateral_description,
                collateral_hi: loan.collateral_description_hi,
                loan_active:   loan.is_active,
                interest_rate: loan.interest_rate,
                interest_override: null,
                notes:         'Customer refund after collateral sale',
              })
            }
          } else {
            flat.push({
              kind:          'payment',
              event_date:    p.payment_date,
              amount:        p.amount,
              id:            p.id,
              loan_id:       loan.id,
              loan_number:   loan.loan_number,
              customer_id:   loan.customer_id,
              collateral:    loan.collateral_description,
              collateral_hi: loan.collateral_description_hi,
              loan_active:   loan.is_active,
              interest_rate: loan.interest_rate,
              interest_override: p.interest_override,
              notes:         p.notes,
            })
          }
        })

        // ── Disbursals (paise diye / given out) ──
        ;(loan.tranches || []).forEach(t => {
          flat.push({
            kind:        'disbursal',
            event_date:  t.disbursal_date,
            amount:      t.amount,
            id:          `t-${t.id}`,
            loan_id:     loan.id,
            loan_number: loan.loan_number,
            customer_id: loan.customer_id,
            collateral:  loan.collateral_description,
        collateral_hi: loan.collateral_description_hi,
            loan_active: loan.is_active,
            interest_rate: loan.interest_rate,
            notes:       t.notes,
          })
        })
      })

      // Sort by date descending (latest first)
      flat.sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
      setAllEvents(flat)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = allEvents.filter(ev => {
    // type filter
    if (typeFilter === 'disbursal' && ev.kind === 'payment') return false
    if (typeFilter === 'payment' && ev.kind !== 'payment') return false

    // date range
    if (filterFrom && new Date(ev.event_date) < new Date(filterFrom)) return false
    if (filterTo   && new Date(ev.event_date) > new Date(filterTo + 'T23:59:59')) return false

    // text search
    if (search) {
      const q    = search.toLowerCase()
      const cust = customers[ev.customer_id]
      const name = cust ? `${cust.first_name} ${cust.last_name}`.toLowerCase() : ''
      const nameHi = cust ? `${cust.first_name_hi || ''} ${cust.last_name_hi || ''}`.toLowerCase() : ''
      const custId = (cust?.customer_id || '').toLowerCase()
      const phone  = (cust?.phone || '').toLowerCase()
      const lnum   = ev.loan_number.toLowerCase()
      const amt    = String(ev.amount)
      const collateral = (ev.collateral || '').toLowerCase()
      const collateralHi = (ev.collateral_hi || '').toLowerCase()
      if (!name.includes(q) && !nameHi.includes(q) && !custId.includes(q) &&
          !phone.includes(q) && !lnum.includes(q) && !amt.includes(q) &&
          !collateral.includes(q) && !collateralHi.includes(q)) return false
    }
    return true
  })

  // ── Group by date ─────────────────────────────────────────────────────────
  const grouped = {}
  filtered.forEach(ev => {
    const d = new Date(ev.event_date)
    const day = d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) + ' (' + d.toLocaleDateString('en-IN', { weekday: 'long' }) + ')'
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(ev)
  })
  const groupedDates = Object.keys(grouped)

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalGiven    = filtered.filter(e => e.kind === 'disbursal' || e.kind === 'refund').reduce((s, e) => s + e.amount, 0)
  const totalReceived = filtered.filter(e => e.kind === 'payment').reduce((s, e) => s + e.amount, 0)

  // ── Print / PDF ───────────────────────────────────────────────────────────
  const handlePrint = () => {
    const filterLabel = [
      typeFilter !== 'all' ? (typeFilter === 'disbursal' ? 'Given only' : 'Received only') : '',
      filterFrom ? `From: ${filterFrom}` : '',
      filterTo   ? `To: ${filterTo}`     : '',
      search     ? `Search: "${search}"` : '',
    ].filter(Boolean).join(' | ')

    const rows = groupedDates.map(day => {
      const evs = grouped[day]
      const dayGiven    = evs.filter(e => e.kind === 'disbursal' || e.kind === 'refund').reduce((s, e) => s + e.amount, 0)
      const dayReceived = evs.filter(e => e.kind === 'payment').reduce((s, e) => s + e.amount, 0)

      const rowsHtml = evs.map(ev => {
        const cust = customers[ev.customer_id]
        const name = cust ? `${cust.first_name} ${cust.last_name}` : `#${ev.customer_id}`
        const nameHi = cust?.first_name_hi ? `${cust.first_name_hi} ${cust.last_name_hi}` : ''
        const custId = cust?.customer_id || ''
        const phone  = cust?.phone || ''
        const village = cust?.village || ''
        const isRefund = ev.kind === 'refund'
        const isD    = ev.kind === 'disbursal' || isRefund
        const mode   = isD ? '—' :
          ev.interest_override === null || ev.interest_override === undefined ? 'Auto' :
          ev.interest_override === 0 ? 'Waived' : `Custom ₹${ev.interest_override}`
        const typeLabel = isRefund ? '↺ Refund' : isD ? '↑ Given' : '↓ Received'

        return `<tr>
          <td>${new Date(ev.event_date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
          <td><span class="${isD ? 'badge-given' : 'badge-recd'}">${typeLabel}</span></td>
          <td><strong>${name}</strong>${nameHi ? `<br/><span class="hi">${nameHi}</span>` : ''}<br/><span class="mono">${custId}</span>${phone ? ` · ${phone}` : ''}${village ? ` · ${village}` : ''}</td>
          <td class="mono">${ev.loan_number}<br/><span class="sm">${ev.collateral || ''}${ev.collateral_hi ? `<br/><span class="hi">${ev.collateral_hi}</span>` : ''}</span></td>
          <td class="${isD ? 'amt-given' : 'amt-recd'}">${isD ? '+' : '−'}${formatCurrency(ev.amount)}</td>
          <td>${mode}</td>
          <td class="sm">${ev.notes || '—'}</td>
        </tr>`
      }).join('')

      return `
        <tr class="day-header">
          <td colspan="5"><strong>${day}</strong></td>
          <td colspan="2" style="text-align:right">
            ${dayGiven > 0    ? `<span class="amt-given">↑ ${formatCurrency(dayGiven)}</span>` : ''}
            ${dayReceived > 0 ? `<span class="amt-recd"> ↓ ${formatCurrency(dayReceived)}</span>` : ''}
          </td>
        </tr>
        ${rowsHtml}
        <tr class="day-footer">
          <td colspan="4"></td>
          <td colspan="3" style="text-align:right;font-weight:700">
            ${dayGiven > 0 && dayReceived > 0
              ? `Net: ${formatCurrency(dayReceived - dayGiven)}`
              : dayGiven > 0 ? `Total Given: ${formatCurrency(dayGiven)}`
              : `Total Received: ${formatCurrency(dayReceived)}`}
          </td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8"/>
      <title>Transaction History - ${new Date().toLocaleDateString('en-IN')}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;padding:20px}
        h1{font-size:20px;font-weight:800;color:#1e3a8a;margin-bottom:4px}
        .sub{font-size:11px;color:#64748b;margin-bottom:16px}
        .summary{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}
        .scard{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 16px;min-width:140px}
        .scard .lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}
        .scard .val{font-size:16px;font-weight:700;margin-top:2px}
        .blue{color:#1d4ed8}.green{color:#059669}.amber{color:#d97706}.red{color:#dc2626}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#1e40af;color:#fff;font-size:10px;text-transform:uppercase;padding:7px 8px;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}
        .day-header td{background:#dbeafe;color:#1e40af;font-size:11px;padding:8px;border-top:2px solid #93c5fd}
        .day-footer td{background:#f8fafc;border-bottom:2px solid #e2e8f0;font-size:11px}
        tr:hover td{background:#f8fafc}
        .badge-given{background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;white-space:nowrap}
        .badge-recd{background:#d1fae5;color:#059669;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;white-space:nowrap}
        .amt-given{color:#1d4ed8;font-weight:700}
        .amt-recd{color:#059669;font-weight:700}
        .mono{font-family:monospace;font-size:11px;color:#64748b}
        .sm{font-size:10px;color:#94a3b8}
        .hi{font-size:11px;color:#94a3b8}
        .footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;text-align:center;font-size:10px;color:#94a3b8}
        @media print{body{padding:8px}button{display:none}}
      </style>
    </head><body>
      <h1>Transaction History / लेन-देन इतिहास</h1>
      <div class="sub">
        Generated: ${new Date().toLocaleString('en-IN')}
        ${filterLabel ? ` &nbsp;·&nbsp; Filters: ${filterLabel}` : ''}
      </div>
      <div class="summary">
        <div class="scard"><div class="lbl">Total Transactions</div><div class="val">${filtered.length}</div></div>
        <div class="scard"><div class="lbl">Given / दिए</div><div class="val blue">${formatCurrency(totalGiven)}</div></div>
        <div class="scard"><div class="lbl">Received / जमा</div><div class="val green">${formatCurrency(totalReceived)}</div></div>
        <div class="scard"><div class="lbl">Net Balance</div><div class="val ${totalReceived - totalGiven >= 0 ? 'green' : 'red'}">${formatCurrency(totalReceived - totalGiven)}</div></div>
        <div class="scard"><div class="lbl">Days</div><div class="val">${groupedDates.length}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Time</th><th>Type</th><th>Customer</th><th>Loan # / Collateral</th>
          <th>Amount</th><th>Interest Mode</th><th>Notes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Loan Management System · ऋण प्रबंधन प्रणाली</div>
    </body></html>`

    const win = window.open('', '_blank', 'width=1000,height=750')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 600)
  }

  return (
    <div className="space-y-5 fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
            <GiTakeMyMoney className="text-primary-500 text-2xl" /> Transaction History
          </h2>
          <p className="hindi-text text-sm text-gray-500">दिनांकवार लेन-देन इतिहास — दिए और जमा दोनों</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
            <GiReceiveMoney /> Given: {formatCurrency(totalGiven)}
          </span>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
            <GiPayMoney /> Received: {formatCurrency(totalReceived)}
          </span>
          {/* Print + Download buttons */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full text-xs font-semibold transition shadow"
          >
            <FiPrinter size={13} /> Print
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 border-2 border-primary-500 text-primary-700 hover:bg-primary-50 rounded-full text-xs font-semibold transition"
          >
            <FiDownload size={13} /> PDF
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card rounded-2xl p-4 space-y-3">

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            className="input-field pl-9 pr-9"
            placeholder="Search by name, ID, phone, loan #, amount | नाम, आईडी, फोन से खोजें"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <FiX size={15} />
            </button>
          )}
        </div>

        {/* Type + Date filters */}
        <div className="flex gap-3 flex-wrap items-end">
          {/* Type toggle */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Transaction Type / प्रकार</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {[
                { val: 'all',       label: 'All',       labelHi: 'सभी' },
                { val: 'disbursal', label: 'Given',     labelHi: 'दिए', color: 'blue' },
                { val: 'payment',   label: 'Received',  labelHi: 'जमा', color: 'emerald' },
              ].map(t => (
                <button
                  key={t.val}
                  onClick={() => setTypeFilter(t.val)}
                  className={`px-4 py-2 text-xs font-semibold transition flex-1
                    ${typeFilter === t.val
                      ? t.color === 'blue'    ? 'bg-blue-600 text-white'
                      : t.color === 'emerald' ? 'bg-emerald-600 text-white'
                      : 'bg-primary-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  {t.label}
                  <span className="hindi-text block text-xs opacity-70">{t.labelHi}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-end gap-2 flex-1 min-w-0">
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">From / से</label>
              <input type="date" className="input-field text-sm"
                value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <span className="text-gray-400 pb-2.5">—</span>
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">To / तक</label>
              <input type="date" className="input-field text-sm"
                value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>
          </div>

          {(filterFrom || filterTo || search || typeFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterFrom(''); setFilterTo(''); setTypeFilter('all') }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-500 rounded-xl text-xs font-medium hover:bg-red-100 transition"
            >
              <FiX size={13} /> Clear
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="text-xs text-gray-500">
          Showing <strong>{filtered.length}</strong> transactions across <strong>{groupedDates.length}</strong> days
        </div>
      </div>

      {/* ── Timeline ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl text-center py-16 text-gray-400">
          <GiTakeMyMoney size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No transactions found</p>
          <p className="hindi-text text-sm mt-1">कोई लेन-देन नहीं मिला</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedDates.map(day => {
            const dayEvents   = grouped[day]
            const dayGiven    = dayEvents.filter(e => e.kind === 'disbursal').reduce((s, e) => s + e.amount, 0)
            const dayReceived = dayEvents.filter(e => e.kind === 'payment').reduce((s, e) => s + e.amount, 0)

            return (
              <div key={day} className="glass-card rounded-2xl overflow-hidden shadow-sm">

                {/* ── Day header ── */}
                <div className="bg-gradient-to-r from-primary-800 to-primary-700 text-white px-5 py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FiCalendar size={15} className="text-primary-300" />
                      <span className="font-bold text-base">{day}</span>
                      <span className="text-primary-300 text-xs ml-1">· {dayEvents.length} transaction(s)</span>
                    </div>
                    <div className="flex gap-3 text-xs font-semibold">
                      {dayGiven > 0 && (
                        <span className="flex items-center gap-1 bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full">
                          <GiReceiveMoney /> Diye: {formatCurrency(dayGiven)}
                        </span>
                      )}
                      {dayReceived > 0 && (
                        <span className="flex items-center gap-1 bg-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full">
                          <GiPayMoney /> Jama: {formatCurrency(dayReceived)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Event rows ── */}
                <div className="divide-y divide-gray-100">
                  {dayEvents.map((ev, i) => {
                    const cust        = customers[ev.customer_id]
                    const isRefund    = ev.kind === 'refund'
                    const isDisbursal = ev.kind === 'disbursal'
                    const isOutflow   = isDisbursal || isRefund

                    return (
                      <div
                        key={ev.id || i}
                        onClick={() => navigate(`/loans/${ev.loan_id}`)}
                        className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors
                          ${isOutflow ? 'hover:bg-blue-50' : 'hover:bg-emerald-50'}`}
                      >
                        {/* Type icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm
                          ${isOutflow ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isOutflow ? <GiReceiveMoney size={20} /> : <GiPayMoney size={20} />}
                        </div>

                        {/* Customer info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                              ${isOutflow ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {isRefund ? '↺ Refund' : isDisbursal ? '↑ Diya / Given' : '↓ Jama / Received'}
                            </span>
                            <span className="font-mono text-xs text-primary-500 bg-primary-50 px-2 py-0.5 rounded-lg">
                              {ev.loan_number}
                            </span>
                          </div>

                          <div className="font-semibold text-gray-800 text-sm">
                            {cust ? `${cust.first_name} ${cust.last_name}` : `Customer #${ev.customer_id}`}
                          </div>
                          {cust?.first_name_hi && (
                            <div className="hindi-text text-xs text-gray-400">{cust.first_name_hi} {cust.last_name_hi}</div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                            {cust?.customer_id && (
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{cust.customer_id}</span>
                            )}
                            {cust?.phone && <span>📞 {cust.phone}</span>}
                            {cust?.village && <span>📍 {cust.village}</span>}
                            {ev.collateral && <span>📦 {ev.collateral}</span>}
                            {ev.collateral_hi && <span className="hindi-text">📦 {ev.collateral_hi}</span>}
                          </div>

                          {ev.notes && (
                            <div className="text-xs text-gray-400 mt-1 italic">"{ev.notes}"</div>
                          )}
                        </div>

                        {/* Amount + mode */}
                        <div className="text-right flex-shrink-0">
                          <div className={`text-xl font-bold ${isOutflow ? 'text-blue-600' : 'text-emerald-600'}`}>
                            {isOutflow ? '+' : '−'}{formatCurrency(ev.amount)}
                          </div>
                          {!isOutflow && (
                            <div className="mt-1">
                              {ev.interest_override === null || ev.interest_override === undefined ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Auto</span>
                              ) : ev.interest_override === 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Waived</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                                  Custom ₹{ev.interest_override}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {ev.interest_rate}%/mo
                          </div>
                          <span className={`text-xs mt-1 inline-block ${ev.loan_active ? 'badge-active' : 'badge-closed'}`}>
                            {ev.loan_active ? '● Active' : '✓ Closed'}
                          </span>
                        </div>

                        <FiArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                      </div>
                    )
                  })}
                </div>

                {/* ── Day footer ── */}
                <div className={`border-t px-5 py-2.5 flex justify-between items-center text-xs font-semibold
                  ${dayGiven > 0 && dayReceived > 0 ? 'bg-gray-50 border-gray-200 text-gray-600'
                    : dayGiven > 0 ? 'bg-blue-50 border-blue-100 text-blue-700'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                  <span>{dayEvents.length} transaction(s) on this day</span>
                  <div className="flex gap-4">
                    {dayGiven > 0 && (
                      <span className="text-blue-600">↑ Given: {formatCurrency(dayGiven)}</span>
                    )}
                    {dayReceived > 0 && (
                      <span className="text-emerald-600">↓ Received: {formatCurrency(dayReceived)}</span>
                    )}
                    {dayGiven > 0 && dayReceived > 0 && (
                      <span className={`font-bold ${dayReceived >= dayGiven ? 'text-emerald-700' : 'text-red-600'}`}>
                        Net: {formatCurrency(dayReceived - dayGiven)}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
