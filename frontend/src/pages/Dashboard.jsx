import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, getLoans } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import StatCard from '../components/StatCard'
import { FiUsers, FiDollarSign, FiTrendingUp, FiAlertCircle, FiPlus, FiArrowRight } from 'react-icons/fi'
import { GiTakeMyMoney } from 'react-icons/gi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getCustomers(), getLoans()]).then(([c, l]) => {
      setCustomers(c.data)
      setLoans(l.data)
    }).finally(() => setLoading(false))
  }, [])

  const activeLoans = loans.filter(l => l.is_active)
  const totalPrincipal = activeLoans.reduce((s, l) => s + (l.total_principal || 0), 0)
  const totalInterest = activeLoans.reduce((s, l) => s + (l.total_interest || 0), 0)
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstanding || 0), 0)

  // Chart data: last 6 customers by month
  const monthlyData = (() => {
    const map = {}
    customers.forEach(c => {
      const m = new Date(c.created_at).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
      map[m] = (map[m] || 0) + 1
    })
    return Object.entries(map).slice(-6).map(([month, count]) => ({ month, count }))
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-blue-500 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="hindi-text text-2xl font-bold">नमस्ते! 🙏</div>
            <div className="text-blue-100 mt-1">Welcome to Loan Management System</div>
            <div className="hindi-text text-blue-200 text-sm">ऋण प्रबंधन प्रणाली में आपका स्वागत है</div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/customers/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold backdrop-blur-sm transition"
            >
              <FiPlus /> New Customer
            </button>
            <button
              onClick={() => navigate('/loans/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gold-400 hover:bg-gold-500 text-primary-900 rounded-xl text-sm font-bold transition"
            >
              <GiTakeMyMoney /> New Loan
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" labelHi="कुल ग्राहक" value={customers.length} icon={<FiUsers />} color="blue" />
        <StatCard label="Active Loans" labelHi="सक्रिय ऋण" value={activeLoans.length} icon={<FiDollarSign />} color="green" />
        <StatCard label="Principal Out" labelHi="मूलधन बकाया" value={formatCurrency(totalPrincipal)} icon={<GiTakeMyMoney />} color="amber" />
        <StatCard label="Interest Earned" labelHi="अर्जित ब्याज" value={formatCurrency(totalInterest)} icon={<FiTrendingUp />} color="purple"
          sub={`Outstanding: ${formatCurrency(totalOutstanding)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-bold text-gray-700 mb-4">Customer Registration Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent loans */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-700">Recent Active Loans</h2>
            <button onClick={() => navigate('/loans')} className="text-primary-600 text-sm flex items-center gap-1 hover:underline">
              View all <FiArrowRight />
            </button>
          </div>
          <div className="space-y-3">
            {activeLoans.slice(0, 5).map(loan => (
              <div
                key={loan.id}
                onClick={() => navigate(`/loans/${loan.id}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-primary-50 hover:bg-primary-100 cursor-pointer transition"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-700">{loan.loan_number}</div>
                  <div className="text-xs text-gray-500">{formatDate(loan.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary-700">{formatCurrency(loan.outstanding)}</div>
                  <div className="text-xs text-gray-400">{loan.interest_rate}%/mo</div>
                </div>
              </div>
            ))}
            {activeLoans.length === 0 && (
              <div className="text-center text-gray-400 py-6">
                <FiAlertCircle size={32} className="mx-auto mb-2" />
                <p>No active loans</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
