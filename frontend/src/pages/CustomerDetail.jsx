import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCustomer, getLoans, photoUrl } from '../utils/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import { FiEdit2, FiPlus, FiArrowLeft, FiUser, FiPhone, FiMapPin, FiCalendar, FiEye, FiX } from 'react-icons/fi'
import { GiTakeMyMoney } from 'react-icons/gi'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer,      setCustomer]      = useState(null)
  const [loans,         setLoans]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showFullPhoto, setShowFullPhoto] = useState(false)

  useEffect(() => {
    Promise.all([getCustomer(id), getLoans({ customer_id: id })])
      .then(([c, l]) => { setCustomer(c.data); setLoans(l.data) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  if (!customer) return <div className="text-center py-20 text-gray-400">Customer not found</div>

  const activeLoans = loans.filter(l => l.is_active)
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstanding || 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      {/* Back */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-primary-600 font-medium transition">
          <FiArrowLeft /> Back
        </button>
        <button onClick={() => navigate(`/customers/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-medium text-sm hover:bg-amber-100 transition">
          <FiEdit2 /> Edit
        </button>
      </div>

      {/* Profile card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Photo — larger for scanned documents */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div
              className="rounded-2xl border-4 border-primary-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition"
              style={{ width: 120, height: 120 }}
              onClick={() => photoUrl(customer.photo_path) && setShowFullPhoto(true)}
              title="Click to view full size"
            >
              {photoUrl(customer.photo_path) ? (
                <img
                  src={photoUrl(customer.photo_path)}
                  alt={customer.first_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiUser size={40} className="text-gray-300" />
              )}
            </div>
            {photoUrl(customer.photo_path) && (
              <button
                onClick={() => setShowFullPhoto(true)}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <FiEye size={11} /> View Full
              </button>
            )}
            {customer.scanned_document_path && (
              <div className="text-center text-xs text-gray-500 mt-2">
                Scanned Document Photo
                <span className="hindi-text block">स्कैन किया दस्तावेज़</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{customer.first_name} {customer.last_name}</h2>
                {customer.first_name_hi && (
                  <div className="hindi-text text-lg text-gray-500">{customer.first_name_hi} {customer.last_name_hi}</div>
                )}
              </div>
              <span className="font-mono text-sm bg-primary-50 text-primary-700 px-3 py-1.5 rounded-xl font-bold border border-primary-100">
                {customer.customer_id}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {customer.relation_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FiUser size={14} className="text-gray-400" />
                  <span className="capitalize">{customer.relation_type}:</span>
                  <span className="font-medium">{customer.relation_name}</span>
                  {customer.relation_name_hi && <span className="hindi-text text-gray-400">({customer.relation_name_hi})</span>}
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FiPhone size={14} className="text-gray-400" /> {customer.phone}
                </div>
              )}
              {(customer.village || customer.state) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <FiMapPin size={14} className="text-gray-400" />
                  {[customer.village, customer.state].filter(Boolean).join(', ')}
                  {customer.village_hi && <span className="hindi-text text-gray-400">({customer.village_hi})</span>}
                </div>
              )}
              {customer.caste && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400">Caste:</span>
                  <span>{customer.caste}</span>
                  {customer.caste_hi && <span className="hindi-text text-gray-400">({customer.caste_hi})</span>}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <FiCalendar size={12} /> Joined: {formatDate(customer.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {customer.scanned_document_path && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-700">Scanned Document</h3>
              <p className="hindi-text text-sm text-gray-500">स्कैन किया दस्तावेज़</p>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
            <img src={photoUrl(customer.scanned_document_path)} alt="Scanned document" className="w-full h-auto object-contain bg-gray-50" />
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-primary-700">{loans.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Loans</div>
          <div className="hindi-text text-xs text-gray-400">कुल ऋण</div>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{activeLoans.length}</div>
          <div className="text-xs text-gray-500 mt-1">Active Loans</div>
          <div className="hindi-text text-xs text-gray-400">सक्रिय ऋण</div>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="text-xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</div>
          <div className="text-xs text-gray-500 mt-1">Outstanding</div>
          <div className="hindi-text text-xs text-gray-400">बकाया</div>
        </div>
      </div>

      {/* Loans section */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700">Loans | <span className="hindi-text font-normal">ऋण</span></h3>
          <button
            onClick={() => navigate(`/loans/new?customer_id=${id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition shadow"
          >
            <FiPlus /> New Loan
          </button>
        </div>

        {loans.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <GiTakeMyMoney size={40} className="mx-auto mb-3 opacity-30" />
            <p>No loans yet</p>
            <p className="hindi-text text-sm">अभी तक कोई ऋण नहीं</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map(loan => (
              <div
                key={loan.id}
                onClick={() => navigate(`/loans/${loan.id}`)}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${loan.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <div>
                    <div className="font-semibold text-gray-700 font-mono text-sm">{loan.loan_number}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDate(loan.created_at)} · {loan.interest_rate}%/month · {loan.tranches?.length || 0} tranche(s)
                    </div>
                    {(loan.collateral_description || loan.collateral_description_hi) && (
                      <div className="space-y-1 text-xs text-gray-400 mt-0.5">
                        {loan.collateral_description && <div>📦 {loan.collateral_description}</div>}
                        {loan.collateral_description_hi && <div className="hindi-text">📦 {loan.collateral_description_hi}</div>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${loan.is_active ? 'text-primary-700' : 'text-gray-400'}`}>
                    {formatCurrency(loan.outstanding)}
                  </div>
                  <div className="text-xs text-gray-400">
                    Principal: {formatCurrency(loan.total_principal)}
                  </div>
                  <div className={`text-xs mt-1 ${loan.is_active ? 'badge-active' : 'badge-closed'}`}>
                    {loan.is_active ? '● Active' : '✓ Closed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-size photo modal */}
      {showFullPhoto && photoUrl(customer.photo_path) && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullPhoto(false)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowFullPhoto(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-2 text-sm"
            >
              <FiX size={18} /> Close
            </button>
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={photoUrl(customer.photo_path)}
                alt={`${customer.first_name} ${customer.last_name}`}
                className="w-full max-h-screen object-contain bg-white"
              />
            </div>
            <div className="text-center mt-3 text-white text-sm">
              <span className="font-semibold">{customer.first_name} {customer.last_name}</span>
              {customer.first_name_hi && (
                <span className="hindi-text ml-2 text-gray-300">({customer.first_name_hi} {customer.last_name_hi})</span>
              )}
              <span className="ml-2 font-mono text-gray-400 text-xs">{customer.customer_id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
