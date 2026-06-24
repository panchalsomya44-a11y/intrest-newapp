import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLoan, photoUrl } from '../utils/api'
import { formatCurrency } from '../utils/formatters'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi'

export default function SellCollateral() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loan, setLoan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMetal, setSelectedMetal] = useState('gold')
  const [weight, setWeight] = useState('')
  const [goldRate, setGoldRate] = useState(6500)
  const [silverRate, setSilverRate] = useState(84)
  const [sellAmount, setSellAmount] = useState(null)

  useEffect(() => {
    setLoading(true)
    getLoan(id)
      .then(res => {
        const loanData = res.data
        console.log('Loan data loaded:', loanData)
        setLoan(loanData)
        if (loanData.collateral_metal_type) {
          setSelectedMetal(loanData.collateral_metal_type)
        }
        if (loanData.collateral_metal_weight) {
          setWeight(loanData.collateral_metal_weight.toString())
        }
      })
      .catch(() => toast.error('Failed to load collateral data'))
      .finally(() => setLoading(false))
  }, [id])

  const metalRate = selectedMetal === 'gold' ? parseFloat(goldRate) || 0 : parseFloat(silverRate) || 0
  const metalAmount = ((parseFloat(weight) || 0) / 1000) * metalRate
  const displayAmount = sellAmount != null ? sellAmount : metalAmount

  const remainingAfterSale = loan ? Math.max((loan.outstanding || 0) - displayAmount, 0) : 0
  const customerRefund = loan ? Math.max(displayAmount - (loan.outstanding || 0), 0) : 0
  const loanClosed = loan ? !loan.is_active : false

  const handleSell = () => {
    if (!loan || loanClosed) {
      toast.error('Loan is already closed. Cannot calculate sale value.')
      return
    }
    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Enter a valid weight to calculate sell amount')
      return
    }
    setSellAmount(metalAmount)
    toast.success('Sell value calculated')
  }

  const handleRecordSale = () => {
    if (!loan || loanClosed) {
      toast.error('Loan is already closed. Cannot record a collateral sale.')
      return
    }
    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Enter a valid weight')
      return
    }

    const amount = ((parseFloat(weight) || 0) / 1000) * metalRate
    if (amount <= 0) {
      toast.error('Sell amount must be greater than zero')
      return
    }

    const params = new URLSearchParams({
      saleAmount: String(amount),
      metal: selectedMetal,
      weight_g: String(weight),
      rate_per_kg: String(metalRate),
      loanOutstanding: String(loan?.outstanding || 0),
      collateral_description: loan?.collateral_description || '',
      collateral_description_hi: loan?.collateral_description_hi || '',
      collateral_photo_path: loan?.collateral_photo_path || '',
      loan_number: loan?.loan_number || '',
    })

    navigate(`/loans/${id}/sale-confirm?${params.toString()}`, {
      state: {
        saleAmount: amount,
        metal: selectedMetal,
        weight_g: weight,
        rate_per_kg: metalRate,
        loanOutstanding: loan?.outstanding || 0,
        collateral_description: loan?.collateral_description,
        collateral_description_hi: loan?.collateral_description_hi,
        collateral_photo_path: loan?.collateral_photo_path,
        loan_number: loan?.loan_number,
      },
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
        >
          <FiArrowLeft size={18} /> Back
        </button>
        <div>
          <h2 className="text-xl font-bold gradient-text">Sell Collateral</h2>
          <p className="hindi-text text-sm text-gray-500">जमानत बेचें</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Loan</div>
            <div className="font-bold text-gray-800 text-lg">{loan.loan_number}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Status</div>
            <div className={`font-semibold ${loan.is_active ? 'text-emerald-600' : 'text-red-600'}`}>
              {loan.is_active ? 'Active' : 'Closed'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Collateral</div>
            <div className="text-sm text-gray-700">{loan.collateral_description || '—'}</div>
            {loan.collateral_description_hi && (
              <div className="hindi-text text-xs text-gray-500 mt-2">{loan.collateral_description_hi}</div>
            )}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Loan Amount</div>
            <div className="text-lg font-bold text-primary-700">{formatCurrency(loan.total_principal || 0)}</div>
            <div className="text-xs text-gray-500 mt-1">Outstanding {formatCurrency(loan.outstanding || 0)}</div>
          </div>
        </div>

        <div className="grid gap-4">
          {loan.collateral_photo_path && (
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <img src={photoUrl(loan.collateral_photo_path)} alt="Collateral" className="w-full h-72 object-cover" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Metal | <span className="hindi-text font-normal">धातु</span></label>
              <select
                className="input-field"
                value={selectedMetal}
                onChange={e => { setSelectedMetal(e.target.value); setWeight(''); setSellAmount(null) }}
                disabled={loanClosed}
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
            <div>
              <label className="label">Weight (g) | <span className="hindi-text font-normal">वजन (ग्राम)</span></label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="1"
                value={weight}
                onChange={e => { setWeight(e.target.value); setSellAmount(null) }}
                placeholder="0"
                disabled={loanClosed}
              />
              {loan.collateral_metal_weight != null && (
                <div className="text-xs text-gray-500 mt-2">Loan weight: {loan.collateral_metal_weight.toFixed(0)} g</div>
              )}
            </div>
            <div>
              <label className="label">Today Rate (₹/kg) | <span className="hindi-text font-normal">आज की दर</span></label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                value={selectedMetal === 'gold' ? goldRate : silverRate}
                onChange={e => selectedMetal === 'gold' ? setGoldRate(e.target.value) : setSilverRate(e.target.value)}
                disabled={loanClosed}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Selected Metal Amount</div>
            <div className="text-lg font-semibold text-gray-800">{formatCurrency(metalAmount)}</div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Sell Value</div>
              <div className="text-2xl font-bold text-emerald-700">{sellAmount != null ? formatCurrency(sellAmount) : formatCurrency(metalAmount)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Remaining Outstanding After Sale</div>
              <div className="text-lg font-semibold text-gray-800">{formatCurrency(sellAmount != null ? remainingAfterSale : (loan.outstanding || 0))}</div>
            </div>
            {customerRefund > 0 && (
              <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
                <div className="text-xs text-red-500 uppercase tracking-wide mb-1">Customer Refund Due</div>
                <div className="text-lg font-semibold text-red-600">{formatCurrency(customerRefund)}</div>
              </div>
            )}
          </div>

          {/* ✅ UPDATED BUTTON BLOCKS - FIXED */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleSell}
              disabled={loanClosed}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl ${loanClosed ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-800 active:bg-slate-900'} font-semibold transition shadow`}
            >
              Calculate Sale Value
            </button>
            <button
              type="button"
              onClick={handleRecordSale}
              disabled={loanClosed}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl ${loanClosed ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700'} font-semibold transition shadow`}
            >
              <FiShoppingBag size={18} /> Record Sale
            </button>
          </div>

        <div className="text-sm text-gray-500">
          Enter the weight in grams for gold or silver, click Sell to calculate the amount, then record the sale to apply it against the loan outstanding.
        </div>
      </div>
    </div>
  )
}