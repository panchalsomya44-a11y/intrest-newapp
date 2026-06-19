import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL: BASE })

// Customers
export const getCustomers = (params) => api.get('/api/customers/', { params })
export const getCustomer = (id) => api.get(`/api/customers/${id}`)
export const createCustomer = (formData) =>
  api.post('/api/customers/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateCustomer = (id, formData) =>
  api.put(`/api/customers/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteCustomer = (id) => api.delete(`/api/customers/${id}`)

// Loans
export const getLoans = (params) => api.get('/api/loans/', { params })
export const getLoan = (id) => api.get(`/api/loans/${id}`)
export const createLoan = (data) => api.post('/api/loans/', data)
export const addTranche = (loanId, data) => api.post(`/api/loans/${loanId}/tranches`, data)
export const addPayment = (loanId, data) => api.post(`/api/loans/${loanId}/payments`, data)
export const updateInterestRate = (loanId, rate) =>
  api.patch(`/api/loans/${loanId}/interest-rate`, { interest_rate: rate })
export const closeLoan = (loanId) => api.patch(`/api/loans/${loanId}/close`)
export const deleteLoan = (id) => api.delete(`/api/loans/${id}`)

export const photoUrl = (path) =>
  path ? `${BASE}/uploads/${path}` : null

// OCR scan document
export const scanDocument = (formData) =>
  api.post('/api/ocr/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export default api
