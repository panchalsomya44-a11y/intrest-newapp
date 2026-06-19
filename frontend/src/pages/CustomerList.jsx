import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, deleteCustomer, photoUrl } from '../utils/api'
import { formatDate } from '../utils/formatters'
import SearchBar from '../components/SearchBar'
import ConfirmModal from '../components/ConfirmModal'
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiUser, FiFilter } from 'react-icons/fi'
import { indianStates } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function CustomerList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterCaste, setFilterCaste] = useState('')
  const [filterVillage, setFilterVillage] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (filterState) params.state = filterState
    if (filterCaste) params.caste = filterCaste
    if (filterVillage) params.village = filterVillage
    getCustomers(params)
      .then(r => setCustomers(r.data))
      .finally(() => setLoading(false))
  }, [search, filterState, filterCaste, filterVillage])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    try {
      await deleteCustomer(deleteId)
      toast.success('Customer deleted')
      setDeleteId(null)
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold gradient-text">Customers</h2>
          <p className="hindi-text text-sm text-gray-500">ग्राहक सूची</p>
        </div>
        <button
          onClick={() => navigate('/customers/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow-md transition"
        >
          <FiPlus /> Add Customer
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by name, ID, phone, village... | नाम, आईडी से खोजें"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition
              ${showFilters ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <FiFilter /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="label">State | राज्य</label>
              <select className="input-field" value={filterState} onChange={e => setFilterState(e.target.value)}>
                <option value="">All States</option>
                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Caste | जाति</label>
              <input className="input-field" value={filterCaste} onChange={e => setFilterCaste(e.target.value)} placeholder="Filter by caste" />
            </div>
            <div>
              <label className="label">Village | गाँव</label>
              <input className="input-field" value={filterVillage} onChange={e => setFilterVillage(e.target.value)} placeholder="Filter by village" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiUser size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No customers found</p>
            <p className="hindi-text text-sm">कोई ग्राहक नहीं मिला</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary-50 border-b border-primary-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-primary-700 uppercase">Photo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-primary-700 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-primary-700 uppercase">Name | नाम</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-primary-700 uppercase hidden md:table-cell">Village | गाँव</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-primary-700 uppercase hidden md:table-cell">State | राज्य</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-primary-700 uppercase hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-primary-700 uppercase hidden lg:table-cell">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-primary-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map(c => (
                  <tr key={c.id} className="table-row-hover" onClick={() => navigate(`/customers/${c.id}`)}>
                    <td className="px-4 py-3">
                      {photoUrl(c.photo_path) ? (
                        <img src={photoUrl(c.photo_path)} alt={c.first_name} className="w-9 h-9 rounded-full object-cover border-2 border-primary-100" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg font-semibold">{c.customer_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{c.first_name} {c.last_name}</div>
                      {c.first_name_hi && (
                        <div className="hindi-text text-xs text-gray-500">{c.first_name_hi} {c.last_name_hi}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">
                      {c.village || '—'}
                      {c.village_hi && <div className="hindi-text text-xs text-gray-400">{c.village_hi}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">{c.state || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/customers/${c.id}`)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
                          <FiEye size={16} />
                        </button>
                        <button onClick={() => navigate(`/customers/${c.id}/edit`)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                          <FiEdit2 size={16} />
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteId && (
        <ConfirmModal
          title="Delete Customer?"
          message="This will delete the customer and all associated loans. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
