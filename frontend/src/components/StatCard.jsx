import React from 'react'

export default function StatCard({ label, labelHi, value, icon, color = 'blue', sub }) {
  const colors = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-emerald-500 to-emerald-600',
    amber:  'from-amber-500 to-amber-600',
    red:    'from-red-500 to-rose-600',
    purple: 'from-purple-500 to-indigo-600',
  }
  return (
    <div className="glass-card rounded-2xl p-5 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="hindi-text text-xs text-gray-400">{labelHi}</p>
          <p className="mt-2 text-2xl font-bold text-gray-800">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg text-white text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
