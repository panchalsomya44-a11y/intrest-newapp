import React from 'react'
import { FiAlertTriangle } from 'react-icons/fi'

export default function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 fade-in">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4
          ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <FiAlertTriangle className={danger ? 'text-red-600' : 'text-amber-600'} size={24} />
        </div>
        <h3 className="text-center font-bold text-gray-800 text-lg">{title}</h3>
        <p className="text-center text-gray-500 text-sm mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white font-semibold
              ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
