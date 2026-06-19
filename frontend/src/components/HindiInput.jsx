import React, { useState } from 'react'
import { toHindi } from '../utils/hindiTranslit'

/**
 * HindiInput — Text input with Roman→Devanagari conversion.
 *
 * How it works:
 *  1. User types English (Roman) text in the field
 *  2. Clicks the अ↓A button
 *  3. Text converts to Hindi (Devanagari)
 *
 * OR: sourceValue prop can be passed from the sibling English field.
 * If sourceValue exists, it converts that. Otherwise converts current value.
 */
export default function HindiInput({
  value,
  onChange,
  placeholder,
  className = '',
  sourceValue,
  label,
  labelHi,
  rows,
  ...rest
}) {
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState(false)

  const handleConvert = async () => {
    // Priority: sourceValue (English sibling) > current field value
    const src = (sourceValue !== undefined && sourceValue !== null && sourceValue.trim())
      ? sourceValue.trim()
      : (value || '').trim()

    if (!src) return

    setConverting(true)
    setError(false)

    try {
      // Try Google Transliterate API (free, no key needed)
      const result = await googleTransliterate(src)
      onChange({ target: { value: result } })
    } catch (e) {
      // Fallback to local dictionary
      const result = toHindi(src)
      onChange({ target: { value: result } })
    } finally {
      setTimeout(() => setConverting(false), 500)
    }
  }

  const inputCls = `input-field hindi-text flex-1 ${className}`
  const Tag = rows ? 'textarea' : 'input'

  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {labelHi && <span className="hindi-text font-normal text-gray-400 ml-1">| {labelHi}</span>}
        </label>
      )}
      <div className="flex gap-2 items-start">
        <Tag
          {...rest}
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder || 'हिंदी में लिखें या अंग्रेजी लिखकर बटन दबाएं'}
          className={inputCls}
          lang="hi"
        />
        <button
          type="button"
          onClick={handleConvert}
          disabled={converting}
          title="Type English → Click to convert to Hindi"
          className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 rounded-xl border-2 text-xs font-bold transition
            ${converting
              ? 'bg-orange-500 border-orange-500 text-white animate-pulse'
              : 'bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100 hover:border-orange-500 active:scale-95'
            }`}
          style={{ minWidth: 46, minHeight: 46 }}
        >
          {converting ? (
            <span className="text-sm">⏳</span>
          ) : (
            <>
              <span className="text-base leading-none hindi-text">अ</span>
              <span className="text-xs leading-none opacity-60">↓</span>
              <span className="text-xs leading-none">A</span>
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-orange-500 mt-1 leading-relaxed">
        ✦ Is field mein English type karo, phir <strong>अ↓A</strong> dabao
        <span className="hindi-text ml-1 text-gray-400">| यहाँ अंग्रेजी टाइप करें और बटन दबाएं</span>
      </p>
    </div>
  )
}

/**
 * Google Input Tools transliteration API (free, no API key needed)
 * Works for Hindi (hi) transliteration from Roman script
 */
async function googleTransliterate(text) {
  const words = text.trim().split(/\s+/)
  const results = []

  for (const word of words) {
    if (!word) continue
    // Check if already Devanagari
    if (/[\u0900-\u097F]/.test(word)) {
      results.push(word)
      continue
    }

    try {
      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`
      const res = await fetch(url)
      const data = await res.json()

      // Response format: ["SUCCESS", [["word", ["transliterated", ...], ...]]]
      if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
        results.push(data[1][0][1][0])
      } else {
        // fallback to local
        results.push(toHindi(word))
      }
    } catch {
      results.push(toHindi(word))
    }
  }

  return results.join(' ')
}
