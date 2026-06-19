import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { FiCamera, FiRotateCcw, FiCheck, FiX } from 'react-icons/fi'

export default function WebcamCapture({ onCapture, onClose }) {
  const webcamRef = useRef(null)
  const [capturedImg, setCapturedImg] = useState(null)
  const [facingMode, setFacingMode] = useState('user')

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot()
    if (img) setCapturedImg(img)
  }, [webcamRef])

  const retake = () => setCapturedImg(null)

  const confirm = () => {
    onCapture(capturedImg)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-primary-700 text-white">
          <div>
            <h3 className="font-bold">Take Photo | फोटो लें</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          {!capturedImg ? (
            <>
              <div className="rounded-2xl overflow-hidden border-4 border-primary-100 shadow-inner">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode }}
                  className="w-full"
                  mirrored={facingMode === 'user'}
                />
              </div>
              <div className="flex gap-3 mt-4 justify-center">
                <button
                  onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
                >
                  <FiRotateCcw /> Flip
                </button>
                <button
                  onClick={capture}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition"
                >
                  <FiCamera size={18} /> Capture | क्लिक करें
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl overflow-hidden border-4 border-emerald-200 shadow-inner">
                <img src={capturedImg} alt="Preview" className="w-full" />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={retake}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
                >
                  <FiRotateCcw /> Retake
                </button>
                <button
                  onClick={confirm}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  <FiCheck /> Use Photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
