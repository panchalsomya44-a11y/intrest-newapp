import { format, formatDistanceToNow } from 'date-fns'

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0)

export const formatDate = (d) => {
  if (!d) return '—'
  return format(new Date(d), 'dd MMM yyyy')
}

export const formatDateTime = (d) => {
  if (!d) return '—'
  return format(new Date(d), 'dd MMM yyyy, hh:mm a')
}

export const timeAgo = (d) => {
  if (!d) return ''
  return formatDistanceToNow(new Date(d), { addSuffix: true })
}

export const indianStates = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]
