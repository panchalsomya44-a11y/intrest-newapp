import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createCustomer, updateCustomer, getCustomer, photoUrl } from '../utils/api'
import { indianStates } from '../utils/formatters'
import WebcamCapture from '../components/WebcamCapture'
import HindiInput from '../components/HindiInput'
import OcrScanner from '../components/OcrScanner'
import toast from 'react-hot-toast'
import { FiCamera, FiUpload, FiSave, FiArrowLeft, FiUser, FiZap } from 'react-icons/fi'

const RELATION_TYPES = [
  { value: 'father', en: 'Father', hi: 'पिता' },
  { value: 'husband', en: 'Husband', hi: 'पति' },
  { value: 'wife', en: 'Wife', hi: 'पत्नी' },
  { value: 'mother', en: 'Mother', hi: 'माता' },
]

const Field = ({ label, labelHi, children }) => (
  <div>
    <label className="label">{label} <span className="hindi-text font-normal text-gray-400">| {labelHi}</span></label>
    {children}
  </div>
)

export default function CustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const fileInputRef = useRef()

  const [form, setForm] = useState({
    first_name: '', last_name: '', relation_name: '', relation_type: 'father',
    caste: '', village: '', state: '', phone: '', address: '',
    first_name_hi: '', last_name_hi: '', relation_name_hi: '',
    caste_hi: '', village_hi: '', address_hi: '',
  })
  const [customId, setCustomId] = useState('')   // user-defined customer ID
  const [photoFile, setPhotoFile] = useState(null)
  const [photoBase64, setPhotoBase64] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [showOcr, setShowOcr]           = useState(false)
  const [scannedDocPhoto, setScannedDocPhoto] = useState(null)
  const [saving, setSaving]             = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (isEdit) {
      getCustomer(id).then(r => {
        const c = r.data
        setForm({
          first_name: c.first_name || '', last_name: c.last_name || '',
          relation_name: c.relation_name || '', relation_type: c.relation_type || 'father',
          caste: c.caste || '', village: c.village || '', state: c.state || '',
          phone: c.phone || '', address: c.address || '',
          first_name_hi: c.first_name_hi || '', last_name_hi: c.last_name_hi || '',
          relation_name_hi: c.relation_name_hi || '', caste_hi: c.caste_hi || '',
          village_hi: c.village_hi || '', address_hi: c.address_hi || '',
        })
        if (c.photo_path) setPreviewUrl(photoUrl(c.photo_path))
        setLoading(false)
      })
    }
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoBase64(null)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleWebcamCapture = (base64) => {
    setPhotoBase64(base64)
    setPhotoFile(null)
    setPreviewUrl(base64)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // ── Validation: at least ONE of three must be provided ────────────────
    // 1. English name (first + last)
    const hasEnglish = form.first_name.trim() && form.last_name.trim()
    // 2. Hindi name (first + last)
    const hasHindi   = form.first_name_hi.trim() && form.last_name_hi.trim()
    // 3. Photo or scanned image
    const hasPhoto   = !!(photoFile || photoBase64 || previewUrl)

    if (!hasEnglish && !hasHindi && !hasPhoto) {
      toast.error(
        'Please fill at least one: English name, Hindi name, or upload/scan a photo',
        { duration: 4000 }
      )
      return
    }

    // Customer ID required for new customers
    if (!isEdit && !customId.trim()) {
      toast.error('Please enter a Customer ID | ग्राहक ID डालें')
      return
    }

    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (customId.trim()) fd.append('custom_customer_id', customId.trim())
      if (photoFile) fd.append('photo', photoFile)
      else if (photoBase64) fd.append('photo_base64', photoBase64)

      if (isEdit) {
        await updateCustomer(id, fd)
        toast.success('Customer updated successfully!')
      } else {
        const res = await createCustomer(fd)
        toast.success(`Customer created! ID: ${res.data.customer_id}`)
      }
      navigate('/customers')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving customer')
    } finally {
      setSaving(false)
    }
  }

  const handleOcrExtracted = (fields) => {
    setForm(f => ({
      ...f,
      first_name:       fields.first_name       || f.first_name,
      last_name:        fields.last_name        || f.last_name,
      relation_name:    fields.relation_name    || f.relation_name,
      relation_type:    fields.relation_type    || f.relation_type,
      caste:            fields.caste            || f.caste,
      village:          fields.village          || f.village,
      phone:            fields.phone            || f.phone,
      address:          fields.address          || f.address,
      first_name_hi:    fields.first_name_hi    || f.first_name_hi,
      last_name_hi:     fields.last_name_hi     || f.last_name_hi,
      relation_name_hi: fields.relation_name_hi || f.relation_name_hi,
      caste_hi:         fields.caste_hi         || f.caste_hi,
      village_hi:       fields.village_hi       || f.village_hi,
    }))

    // ── Save scanned photo as customer profile photo too ──────────────────
    if (fields._scannedPhotoUrl) {
      setScannedDocPhoto(fields._scannedPhotoUrl)
      // Also use it as the customer's profile photo (shown in customer detail)
      if (!previewUrl) {
        // Only set if no photo was already chosen
        setPhotoBase64(fields._scannedPhotoUrl)
        setPhotoFile(null)
        setPreviewUrl(fields._scannedPhotoUrl)
      }
    }

    toast.success('Fields filled! Scanned photo saved as customer photo too.')
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
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold gradient-text">{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
          <p className="hindi-text text-sm text-gray-500">{isEdit ? 'ग्राहक अपडेट करें' : 'नया ग्राहक जोड़ें'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Photo section */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <FiUser className="text-primary-500" /> Photo | <span className="hindi-text font-normal">फोटो</span>
          </h3>
          <div className="flex items-center gap-6 flex-wrap">
            {/* Preview */}
            <div className="w-28 h-28 rounded-2xl border-4 border-primary-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <FiUser size={40} className="text-gray-300" />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowWebcam(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition shadow-md"
              >
                <FiCamera /> Webcam | <span className="hindi-text">वेबकैम</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary-200 text-primary-700 font-medium text-sm hover:bg-primary-50 transition"
              >
                <FiUpload /> Upload File | <span className="hindi-text">फ़ाइल अपलोड</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => { setPreviewUrl(null); setPhotoFile(null); setPhotoBase64(null) }}
                  className="text-xs text-red-500 hover:text-red-700 underline"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="font-bold text-gray-700">Personal Details | <span className="hindi-text font-normal">व्यक्तिगत विवरण</span></h3>
            {/* OCR Scan button */}
            <button
              type="button"
              onClick={() => setShowOcr(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition shadow-md"
            >
              <FiZap size={15} /> Scan Document
              <span className="hindi-text text-xs opacity-80 ml-1">| दस्तावेज़ स्कैन</span>
            </button>
          </div>

          {/* OR rule info */}
          <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-2 text-xs text-blue-800">
              <span className="text-blue-500 text-base flex-shrink-0">ℹ</span>
              <div>
                <strong>Mandatory — Fill at least ONE of these three:</strong>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className={`px-2 py-1 rounded-lg font-semibold border ${form.first_name.trim() && form.last_name.trim() ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-blue-200 text-blue-600'}`}>
                    {form.first_name.trim() && form.last_name.trim() ? '✓' : '○'} English Name
                  </span>
                  <span className="text-blue-400 font-bold self-center">OR</span>
                  <span className={`px-2 py-1 rounded-lg font-semibold border ${form.first_name_hi.trim() && form.last_name_hi.trim() ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-blue-200 text-blue-600'}`}>
                    {form.first_name_hi.trim() && form.last_name_hi.trim() ? '✓' : '○'} <span className="hindi-text">हिंदी नाम</span>
                  </span>
                  <span className="text-blue-400 font-bold self-center">OR</span>
                  <span className={`px-2 py-1 rounded-lg font-semibold border ${previewUrl ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-blue-200 text-blue-600'}`}>
                    {previewUrl ? '✓' : '○'} Photo / Scan
                  </span>
                </div>
                <p className="hindi-text text-blue-600 mt-1.5">
                  तीनों में से कम से कम एक भरना जरूरी है — English नाम, हिंदी नाम, या फोटो
                </p>
              </div>
            </div>
          </div>

          {/* Customer ID */}          {!isEdit && (
            <div className="mb-5 p-4 bg-primary-50 rounded-xl border border-primary-200">
              <label className="label text-primary-700">
                Customer ID <span className="text-red-400">*</span>
                <span className="hindi-text font-normal text-gray-400 ml-1">| ग्राहक पहचान संख्या</span>
              </label>
              <div className="flex gap-3 items-center">
                <input
                  className="input-field font-mono text-lg font-bold tracking-widest flex-1"
                  value={customId}
                  onChange={e => setCustomId(e.target.value.toUpperCase())}
                  placeholder="e.g. 001, A-001, CUST-001"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setCustomId('CUST-' + Math.random().toString(36).slice(2,6).toUpperCase())}
                  className="px-3 py-2.5 bg-white border border-primary-300 text-primary-600 rounded-xl text-xs font-semibold hover:bg-primary-100 transition whitespace-nowrap"
                >
                  Auto Generate
                </button>
              </div>
              <p className="text-xs text-primary-600 mt-1.5">
                Apna khud ka ID daalein — jaise 001, A001, RAMESH-01 etc.
              </p>
              <p className="hindi-text text-xs text-gray-400">
                अपनी पसंद का ID डालें — जैसे 001, A001 आदि
              </p>
            </div>
          )}

          {/* English fields */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">English</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" labelHi="पहला नाम">
                <input className="input-field" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Last Name" labelHi="उपनाम">
                <input className="input-field" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
              </Field>
              <Field label="Relation Type" labelHi="संबंध प्रकार">
                <select className="input-field" value={form.relation_type} onChange={e => set('relation_type', e.target.value)}>
                  {RELATION_TYPES.map(r => <option key={r.value} value={r.value}>{r.en} / {r.hi}</option>)}
                </select>
              </Field>
              <Field label="Father/Husband/Wife Name" labelHi="पिता/पति/पत्नी का नाम">
                <input className="input-field" value={form.relation_name} onChange={e => set('relation_name', e.target.value)} placeholder="Relation's name" />
              </Field>
              <Field label="Caste" labelHi="जाति">
                <input className="input-field" value={form.caste} onChange={e => set('caste', e.target.value)} placeholder="Caste" />
              </Field>
              <Field label="Village" labelHi="गाँव">
                <input className="input-field" value={form.village} onChange={e => set('village', e.target.value)} placeholder="Village name" />
              </Field>
              <Field label="State" labelHi="राज्य">
                <select className="input-field" value={form.state} onChange={e => set('state', e.target.value)}>
                  <option value="">Select State</option>
                  {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Phone" labelHi="फोन">
                <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Mobile number" type="tel" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address" labelHi="पता">
                  <textarea className="input-field" rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
                </Field>
              </div>
            </div>
          </div>

          {/* Hindi fields */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="hindi-text text-xs font-semibold text-indigo-400 uppercase tracking-wider">हिंदी विवरण</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 mb-4 flex items-start gap-2">
              <span className="text-orange-500 text-lg flex-shrink-0">✦</span>
              <div className="text-xs text-orange-700">
                <strong>Hindi Auto-Convert:</strong> Pehle English fields bharo, phir har Hindi field ke paas
                <span className="font-bold bg-orange-100 px-1.5 py-0.5 rounded mx-1">अ↓A</span>
                button dabao — automatically Hindi mein convert ho jaayega!
                <span className="hindi-text block text-orange-500 mt-0.5">
                  पहले अंग्रेजी भरें, फिर बटन दबाएं — हिंदी में बदल जाएगा
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HindiInput
                label="First Name (Hindi)" labelHi="पहला नाम"
                value={form.first_name_hi}
                onChange={e => set('first_name_hi', e.target.value)}
                placeholder="Somya — type English, press अ↓A"
              />
              <HindiInput
                label="Last Name (Hindi)" labelHi="उपनाम"
                value={form.last_name_hi}
                onChange={e => set('last_name_hi', e.target.value)}
                placeholder="Panchal — type English, press अ↓A"
              />
              <HindiInput
                label="Relation Name (Hindi)" labelHi="संबंधी का नाम"
                value={form.relation_name_hi}
                onChange={e => set('relation_name_hi', e.target.value)}
                placeholder="Ram Lal — type English, press अ↓A"
              />
              <HindiInput
                label="Caste (Hindi)" labelHi="जाति"
                value={form.caste_hi}
                onChange={e => set('caste_hi', e.target.value)}
                placeholder="Panchal — type English, press अ↓A"
              />
              <HindiInput
                label="Village (Hindi)" labelHi="गाँव"
                value={form.village_hi}
                onChange={e => set('village_hi', e.target.value)}
                placeholder="Ahmedabad — type English, press अ↓A"
              />
              <div className="sm:col-span-2">
                <HindiInput
                  label="Address (Hindi)" labelHi="पता"
                  value={form.address_hi}
                  onChange={e => set('address_hi', e.target.value)}
                  placeholder="House No, Gali, Mohalla — type English, press अ↓A"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Scanned document photo preview */}
          {scannedDocPhoto && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                  <FiZap size={12} /> Scanned Document
                  <span className="hindi-text font-normal text-gray-400">| स्कैन किया दस्तावेज़</span>
                </div>
                <div className="flex gap-2">
                  {previewUrl !== scannedDocPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoBase64(scannedDocPhoto)
                        setPhotoFile(null)
                        setPreviewUrl(scannedDocPhoto)
                        toast.success('Set as profile photo!')
                      }}
                      className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-lg hover:bg-violet-200 transition font-medium"
                    >
                      📌 Use as Profile Photo
                    </button>
                  )}
                  {previewUrl === scannedDocPhoto && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium">
                      ✓ Set as Profile Photo
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setScannedDocPhoto(null)}
                    className="text-xs text-gray-400 hover:text-red-500 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border-2 border-violet-200 shadow-sm">
                <img
                  src={scannedDocPhoto}
                  alt="Scanned document"
                  className="w-full max-h-64 object-contain bg-gray-50"
                />
              </div>
              <p className="text-xs text-violet-600 mt-1.5 hindi-text">
                यह दस्तावेज़ की फोटो customer की profile में भी save होगी
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                This document photo will also be saved to customer profile
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg transition disabled:opacity-60"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave />}
            {isEdit ? 'Update Customer' : 'Save Customer'} | <span className="hindi-text font-normal">{isEdit ? 'अपडेट करें' : 'सहेजें'}</span>
          </button>
        </div>
      </form>

      {showWebcam && (
        <WebcamCapture onCapture={handleWebcamCapture} onClose={() => setShowWebcam(false)} />
      )}

      {showOcr && (
        <OcrScanner
          onExtracted={handleOcrExtracted}
          onClose={() => setShowOcr(false)}
        />
      )}
    </div>
  )
}
