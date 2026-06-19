import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  FiHome, FiUsers, FiDollarSign, FiMenu, FiX,
  FiChevronRight, FiCheckCircle, FiClock,
} from 'react-icons/fi'
import { GiPayMoney, GiTakeMyMoney } from 'react-icons/gi'

const navItems = [
  { to: '/', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: <FiHome /> },
  { to: '/customers', label: 'Customers', labelHi: 'ग्राहक', icon: <FiUsers /> },
  { to: '/loans', label: 'Active Loans', labelHi: 'सक्रिय ऋण', icon: <FiDollarSign /> },
  { to: '/closed-loans', label: 'Closed Loans', labelHi: 'बंद ऋण', icon: <FiCheckCircle />, accent: 'emerald' },
  { to: '/payment-history', label: 'Payment History', labelHi: 'भुगतान इतिहास', icon: <GiPayMoney />, accent: 'gold' },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const pageTitles = {
    '/': 'Dashboard | डैशबोर्ड',
    '/customers': 'Customers | ग्राहक',
    '/customers/new': 'New Customer | नया ग्राहक',
    '/loans': 'Active Loans | सक्रिय ऋण',
    '/loans/new': 'New Loan | नया ऋण',
    '/closed-loans': 'Closed Loans | बंद ऋण',
    '/payment-history': 'Payment History | भुगतान इतिहास',
  }
  const title = pageTitles[location.pathname] || 'Loan Manager'

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:inset-auto
          bg-gradient-to-b from-primary-900 via-primary-800 to-primary-700
          flex flex-col shadow-2xl`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
          <div className="w-10 h-10 rounded-xl bg-gold-400 flex items-center justify-center shadow-lg">
            <GiTakeMyMoney className="text-primary-900 text-xl" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">ऋण प्रबंधन</div>
            <div className="text-primary-200 text-xs">Loan Manager</div>
          </div>
          <button
            className="ml-auto md:hidden text-primary-200 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => {
                const indent = item.accent ? 'ml-3' : ''
                const base   = `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${indent}`
                if (isActive) {
                  if (item.accent === 'emerald') return `${base} bg-emerald-600/30 text-emerald-200 border border-emerald-500/40`
                  if (item.accent === 'gold')    return `${base} bg-amber-500/30 text-amber-200 border border-amber-400/40`
                  return `${base} bg-white/20 text-white shadow-sm backdrop-blur-sm`
                }
                if (item.accent === 'emerald') return `${base} text-emerald-300 hover:bg-emerald-600/20 hover:text-emerald-100 border border-white/10`
                if (item.accent === 'gold')    return `${base} text-amber-300 hover:bg-amber-500/20 hover:text-amber-100 border border-white/10`
                return `${base} text-primary-200 hover:bg-white/10 hover:text-white`
              }}
            >
              <span className={`text-lg ${item.accent === 'emerald' ? 'text-emerald-400' : item.accent === 'gold' ? 'text-amber-400' : ''}`}>
                {item.icon}
              </span>
              <div className="flex-1">
                <div>{item.label}</div>
                <div className="hindi-text text-xs opacity-75">{item.labelHi}</div>
              </div>
              <FiChevronRight size={14} className="opacity-50" />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-primary-700">
          <div className="text-primary-300 text-xs text-center">
            <div className="hindi-text">ब्याज = मूलधन × दर × समय</div>
            <div className="mt-1">Interest = Principal × Rate × Time</div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="glass-card flex items-center gap-4 px-6 py-4 border-b border-white/60 z-30">
          <button
            className="md:hidden text-gray-600 hover:text-primary-600"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu size={22} />
          </button>
          <h1 className="text-lg font-bold gradient-text">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100">
              <span className="text-xs text-primary-600 font-medium">Default Rate:</span>
              <span className="text-xs font-bold text-primary-700">3% / month</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
