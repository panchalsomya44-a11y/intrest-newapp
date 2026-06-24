import React, { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { scanDocument } from '../utils/api'
import {
  FiUpload, FiCamera, FiX, FiRotateCcw,
  FiZap, FiCheck, FiAlertCircle, FiEye
} from 'react-icons/fi'
import toast from 'react-hot-toast'

/**
 * OcrScanner
 * - Upload or webcam capture a photo of handwritten/printed customer details
 * - Sends to backend (pytesseract OCR with Hindi+English)
 * - Shows photo preview + extracted fields
 * - User can edit fields before applying to the form
 *
 * Props:
 *   onExtracted(fields) — called when user clicks "Apply to Form"
 *   onClose()
 */
async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function OcrScanner({ onExtracted, onClose }) {
  const [step, setStep]       = useState('choose')  // choose | camera | preview | scanning | result
  const [imgSrc, setImgSrc]   = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rawText, setRawText] = useState('')
  const [fields, setFields]   = useState(null)
  const [error, setError]     = useState(null)
  const webcamRef = useRef()
  const fileRef   = useRef()

  // ── File upload ────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setImgFile(file)
    setImgSrc(dataUrl)
    setStep('preview')
    setError(null)
  }

  // ── Webcam capture ─────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    const dataUrl = webcamRef.current?.getScreenshot()
    if (!dataUrl) return
    const blob = await fetch(dataUrl).then(r => r.blob())
    const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
    setImgFile(file)
    setImgSrc(dataUrl)
    setStep('preview')
    setError(null)
  }, [webcamRef])

  // ── Run OCR via backend ────────────────────────────────────────────────
  const runScan = async () => {
    if (!imgFile) return
    setScanning(true)
    setStep('scanning')
    setError(null)

    // Fake progress animation
    let p = 0
    const interval = setInterval(() => {
      p = Math.min(p + 8, 85)
      setProgress(p)
    }, 200)

    try {
      const fd = new FormData()
      fd.append('file', imgFile)
      const res = await scanDocument(fd)
      clearInterval(interval)
      setProgress(100)

      setRawText(res.data.raw_text || '')
      setFields({ ...res.data.fields })
      setStep('result')

      if (res.data.message) {
        toast(res.data.message, { icon: '⚠️' })
      }
    } catch (err) {
      clearInterval(interval)
      // Even on network error, go to result with empty fields
      setRawText('')
      setFields({
        first_name: '', last_name: '', relation_name: '',
        relation_type: 'father', caste: '', village: '',
        phone: '', address: '',
        first_name_hi: '', last_name_hi: '',
        relation_name_hi: '', caste_hi: '', village_hi: '',
      })
      setStep('result')
      toast('Could not auto-detect fields — please fill manually', { icon: '⚠️' })
    } finally {
      setScanning(false)
    }
  }

  // ── Apply fields to parent form ────────────────────────────────────────
  const handleApply = () => {
    onExtracted({ ...fields, _scannedPhotoUrl: imgSrc })
    toast.success('Fields filled from scanned document!')
    onClose()
  }

  const setF = (k, v) => setFields(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '94vh' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-700 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FiZap /> Document Scanner
            </h3>
            <p className="text-sm text-violet-200 hindi-text">दस्तावेज़ स्कैन → खेत स्वतः भरें</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-xl transition">
            <FiX />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">

          {/* ── STEP: CHOOSE ─────────────────────────────────────── */}
          {step === 'choose' && (
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-900">
                <p className="font-semibold mb-2">📋 How to use / कैसे उपयोग करें:</p>
                <ol className="list-decimal ml-4 space-y-1 text-xs leading-relaxed">
                  <li>Apne <strong>handwritten register</strong> ya printed form ki <strong>clear photo</strong> lo</li>
                  <li>Upload karo ya webcam se click karo</li>
                  <li><strong>Scan</strong> karo — system automatically text read karega</li>
                  <li>Fields check karo aur <strong>"Apply to Form"</strong> dabao</li>
                </ol>
                <p className="hindi-text text-xs text-violet-600 mt-2">
                  ✦ अच्छे result के लिए: अच्छी रोशनी में, साफ लिखावट वाला page scan करें
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-violet-300 rounded-2xl hover:bg-violet-50 hover:border-violet-500 transition group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition">
                    <FiUpload size={28} className="text-violet-500" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-700">Upload Photo</div>
                    <div className="hindi-text text-xs text-gray-400 mt-0.5">फोटो अपलोड करें</div>
                    <div className="text-xs text-gray-400 mt-1">JPG, PNG — any image</div>
                  </div>
                </button>

                <button
                  onClick={() => setStep('camera')}
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-emerald-300 rounded-2xl hover:bg-emerald-50 hover:border-emerald-500 transition group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition">
                    <FiCamera size={28} className="text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-700">Use Webcam</div>
                    <div className="hindi-text text-xs text-gray-400 mt-0.5">कैमरे से क्लिक करें</div>
                    <div className="text-xs text-gray-400 mt-1">Live camera capture</div>
                  </div>
                </button>
              </div>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* ── STEP: CAMERA ─────────────────────────────────────── */}
          {step === 'camera' && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border-4 border-violet-100">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.95}
                  className="w-full"
                  videoConstraints={{ facingMode: 'environment' }}
                />
              </div>
              <p className="text-xs text-center text-gray-500">
                📷 Register/form ko camera ke saamne rakho — seedha aur achhi roshni mein
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep('choose')} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
                  <FiRotateCcw size={13} /> Back
                </button>
                <button
                  onClick={handleCapture}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow"
                >
                  <FiCamera /> Click Photo / क्लिक करें
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PREVIEW ────────────────────────────────────── */}
          {step === 'preview' && imgSrc && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                <img src={imgSrc} alt="Document preview" className="w-full max-h-72 object-contain" />
                <div className="absolute top-2 right-2 bg-white/90 rounded-xl px-2 py-1 flex items-center gap-1 text-xs text-gray-600 shadow">
                  <FiEye size={11} /> Preview
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <FiAlertCircle className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Tips for best results / बेहतर result के लिए:</strong>
                <ul className="mt-1 space-y-0.5 list-disc ml-4">
                  <li>Achhi roshni mein photo lo</li>
                  <li>Page seedha (straight) raho, teda nahi</li>
                  <li>Text clearly visible hona chahiye</li>
                  <li>Hindi aur English dono support hain</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setImgSrc(null); setImgFile(null); setStep('choose') }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
                  <FiRotateCcw size={13} /> Retake
                </button>
                <button
                  onClick={runScan}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition shadow"
                >
                  <FiZap /> Scan & Extract Fields / स्कैन करें
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SCANNING ───────────────────────────────────── */}
          {step === 'scanning' && (
            <div className="text-center py-8 space-y-5">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
                <div className="absolute inset-0 rounded-full border-4 border-t-violet-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FiZap size={28} className="text-violet-500 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="font-bold text-gray-700 text-lg">Scanning document...</div>
                <div className="hindi-text text-gray-500 text-sm mt-1">दस्तावेज़ स्कैन हो रहा है...</div>
                <div className="text-xs text-gray-400 mt-1">Reading Hindi + English text</div>
              </div>
              <div className="w-full max-w-xs mx-auto">
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-violet-700 font-bold mt-1 text-sm">{progress}%</div>
              </div>
            </div>
          )}

          {/* ── STEP: RESULT ─────────────────────────────────────── */}
          {step === 'result' && fields && (
            <div className="space-y-4">
              {/* Image + Raw text side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Scanned Document</div>
                  <div className="rounded-xl overflow-hidden border-2 border-violet-100">
                    <img src={imgSrc} alt="scanned" className="w-full h-36 object-cover" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase mb-1">OCR Raw Text</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 h-36 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {rawText || '(No text detected — try a clearer photo)'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Success / warning */}
              {Object.values(fields).some(v => v && String(v).trim()) ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-center gap-2">
                  <FiCheck className="flex-shrink-0 text-emerald-600" />
                  <span>
                    Fields extracted! Check below and edit if needed, then click <strong>"Apply to Form"</strong>.
                    <span className="hindi-text block text-xs mt-0.5 text-emerald-600">नीचे जाँचें, ज़रूरत हो तो सुधारें, फिर Apply दबाएं।</span>
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                  <FiAlertCircle className="flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Could not auto-detect fields. You can manually fill below or try a clearer photo.
                    <span className="hindi-text block text-xs mt-0.5 text-amber-600">स्वतः नहीं पहचाना — नीचे manually भरें या साफ photo try करें।</span>
                  </span>
                </div>
              )}

              {/* Editable extracted fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'first_name',      label: 'First Name',             labelHi: 'पहला नाम' },
                  { key: 'last_name',       label: 'Last Name',              labelHi: 'उपनाम' },
                  { key: 'relation_name',   label: 'Father / Husband Name',  labelHi: 'पिता/पति का नाम' },
                  { key: 'caste',           label: 'Caste',                  labelHi: 'जाति' },
                  { key: 'village',         label: 'Village',                labelHi: 'गाँव' },
                  { key: 'phone',           label: 'Phone',                  labelHi: 'फोन' },
                  { key: 'first_name_hi',   label: 'First Name (Hindi)',      labelHi: 'पहला नाम हिंदी' },
                  { key: 'last_name_hi',    label: 'Last Name (Hindi)',       labelHi: 'उपनाम हिंदी' },
                  { key: 'relation_name_hi',label: 'Father Name (Hindi)',     labelHi: 'पिता का नाम हिंदी' },
                  { key: 'caste_hi',        label: 'Caste (Hindi)',           labelHi: 'जाति हिंदी' },
                  { key: 'village_hi',      label: 'Village (Hindi)',         labelHi: 'गाँव हिंदी' },
                ].map(({ key, label, labelHi }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      {label}
                      <span className="hindi-text font-normal text-gray-400 ml-1">| {labelHi}</span>
                      {fields[key] && <span className="ml-1 text-emerald-500 text-xs">✓</span>}
                    </label>
                    <input
                      className={`input-field text-sm ${key.endsWith('_hi') ? 'hindi-text' : ''} ${fields[key] ? 'border-emerald-300 bg-emerald-50/50' : ''}`}
                      value={fields[key] || ''}
                      onChange={e => setF(key, e.target.value)}
                      placeholder={`Enter ${label}`}
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Address / पता</label>
                  <textarea
                    className="input-field text-sm"
                    rows={2}
                    value={fields.address || ''}
                    onChange={e => setF('address', e.target.value)}
                    placeholder="Full address"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setStep('choose'); setImgSrc(null); setImgFile(null); setFields(null) }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm"
                >
                  <FiRotateCcw size={13} /> Scan Again
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg text-base"
                >
                  <FiCheck size={18} /> Apply to Form / फॉर्म में भरें
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
