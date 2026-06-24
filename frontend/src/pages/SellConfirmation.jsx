import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { addPayment, closeLoan, getLoan, photoUrl } from '../utils/api'
import { formatCurrency } from '../utils/formatters'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi'

export default function SellConfirmation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { state } = location
  const [saving, setSaving] = useState(false)
  const [loan, setLoan] = useState(null)
  const [loading, setLoading] = useState(true)

  const query = new URLSearchParams(location.search)
  const saleAmount = parseFloat(state?.saleAmount ?? query.get('saleAmount') ?? '0') || 0
  const metal = state?.metal ?? query.get('metal') ?? 'gold'
  const weight_g = state?.weight_g ?? query.get('weight_g') ?? 0
  const rate_per_kg = parseFloat(state?.rate_per_kg ?? query.get('rate_per_kg') ?? '0') || 0
  const loanOutstanding = parseFloat(state?.loanOutstanding ?? query.get('loanOutstanding') ?? '0') || 0
  const collateral_description = state?.collateral_description ?? query.get('collateral_description') ?? ''
  const collateral_description_hi = state?.collateral_description_hi ?? query.get('collateral_description_hi') ?? ''
  const collateral_photo_path = state?.collateral_photo_path ?? query.get('collateral_photo_path') ?? null
  const loan_number = state?.loan_number ?? query.get('loan_number') ?? ''

  useEffect(() => {
    if (!state && !location.search) {
      navigate(-1)
      return
    }
    setLoading(true)
    getLoan(id)
      .then(res => setLoan(res.data))
      .catch(() => toast.error('Failed to load loan details'))
      .finally(() => setLoading(false))
  }, [state, location.search, navigate, id])

  // Calculate how sale amount will be applied
  const interestBalance = loan?.interest_balance || 0
  const principalBalance = loan?.principal_balance || 0
  const interestToPay = Math.min(saleAmount, interestBalance)
  const principalToPay = Math.min(Math.max(saleAmount - interestToPay, 0), principalBalance)
  const excessAmount = Math.max(saleAmount - interestToPay - principalToPay, 0)

  const remainingAfter = Math.max(loanOutstanding - saleAmount, 0)
  const customerRefund = Math.max(saleAmount - loanOutstanding, 0)

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const saleNotes = excessAmount > 0
        ? `Sale value ₹${saleAmount.toFixed(2)} applied to interest ₹${interestToPay.toFixed(2)} + principal ₹${principalToPay.toFixed(2)}. Customer received ₹${excessAmount.toFixed(2)} after settlement.`
        : `Sale value ₹${saleAmount.toFixed(2)} applied to interest ₹${interestToPay.toFixed(2)} + principal ₹${principalToPay.toFixed(2)}. Remaining outstanding ₹${remainingAfter.toFixed(2)}.`

      await addPayment(id, {
        amount: saleAmount,
        notes: saleNotes,
      })

      // Refresh loan and decide where to navigate.
      const updatedLoan = await getLoan(id)
      // If outstanding is zero or negative treat as fully paid.
      if (updatedLoan.data?.outstanding <= 0) {
        // If backend didn't auto-close, ensure it's closed.
        if (updatedLoan.data?.is_active) {
          try {
            await closeLoan(id)
          } catch (e) {
            // ignore close errors, we'll still navigate to closed list
          }
        }
        toast.success('Loan fully paid and closed after collateral sale.')
        // Redirect to closed loans list and replace history so back does not reopen sale confirmation.
        navigate('/closed-loans', { replace: true })
      } else {
        toast.success('Sale applied to loan. Outstanding updated.')
        navigate(`/loans/${id}`)
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to record sale payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(-1)} className="btn-ghost"><FiArrowLeft/> Back</button>
        <h2 className="text-xl font-bold">Confirm Collateral Sale</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          {collateral_description && (
            <div>
              <div className="text-xs text-gray-400 uppercase">Collateral</div>
              <div className="font-semibold">{collateral_description}</div>
              {collateral_description_hi && <div className="hindi-text text-sm text-gray-500">{collateral_description_hi}</div>}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase">Metal</div>
              <div className="font-semibold">{metal}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Weight</div>
              <div className="font-semibold">{weight_g} g</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Rate</div>
              <div className="font-semibold">₹{rate_per_kg} / kg</div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="text-xs text-emerald-600 uppercase font-semibold">Sale Proceeds</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">{formatCurrency(saleAmount)}</div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">How Sale Proceeds Will Be Applied:</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <div className="text-xs text-orange-600 uppercase">Interest Due</div>
                  <div className="text-sm text-gray-600">Pays off accrued interest</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Balance: {formatCurrency(interestBalance)}</div>
                  <div className="text-lg font-bold text-orange-600">{formatCurrency(interestToPay)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div className="text-xs text-blue-600 uppercase">Principal Balance</div>
                  <div className="text-sm text-gray-600">Reduces loan principal</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Balance: {formatCurrency(principalBalance)}</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(principalToPay)}</div>
                </div>
              </div>
              {excessAmount > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <div className="text-xs text-red-600 uppercase">Customer Refund</div>
                    <div className="text-sm text-gray-600">Excess proceeds to customer</div>
                  </div>
                  <div className="text-lg font-bold text-red-600">{formatCurrency(excessAmount)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
            <div className="p-4 bg-gray-50 border rounded">
              <div className="text-xs text-gray-400 uppercase">Outstanding Before</div>
              <div className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(loanOutstanding)}</div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded">
              <div className="text-xs text-emerald-600 uppercase font-semibold">Remaining After Sale</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(remainingAfter)}</div>
            </div>
          </div>

          {collateral_photo_path && (
            <div className="rounded-2xl overflow-hidden border">
              <img src={photoUrl(collateral_photo_path)} alt="Collateral" className="w-full h-64 object-cover" />
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button onClick={handleConfirm} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Confirm & Apply Sale'}</button>
            <button onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
