import React from 'react'
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CustomerList from './pages/CustomerList'
import CustomerForm from './pages/CustomerForm'
import CustomerDetail from './pages/CustomerDetail'
import LoanList from './pages/LoanList'
import LoanDetail from './pages/LoanDetail'
import SellCollateral from './pages/SellCollateral'
import SellConfirmation from './pages/SellConfirmation'
import NewLoan from './pages/NewLoan'
import ClosedLoans from './pages/ClosedLoans'
import PaymentHistory from './pages/PaymentHistory'
import Login from './pages/Login'

const AUTH_KEY = 'loanManagerAuth'
const isAuthenticated = () => typeof window !== 'undefined' && Boolean(localStorage.getItem(AUTH_KEY))

function RequireAuth({ children }) {
  const location = useLocation()
  return isAuthenticated()
    ? children
    : <Navigate to="/login" replace state={{ from: location }} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <Layout>
              <Outlet />
            </Layout>
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/loans" element={<LoanList />} />
        <Route path="/loans/new" element={<NewLoan />} />
        <Route path="/loans/:id" element={<LoanDetail />} />
        <Route path="/loans/:id/sell-collateral" element={<SellCollateral />} />
        <Route path="/loans/:id/sale-confirm" element={<SellConfirmation />} />
        <Route path="/closed-loans" element={<ClosedLoans />} />
        <Route path="/payment-history" element={<PaymentHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
