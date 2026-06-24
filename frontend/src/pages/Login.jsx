import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const AUTH_KEY = 'loanManagerAuth'
const VALID_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(AUTH_KEY)) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const handleSubmit = event => {
    event.preventDefault()
    if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
      localStorage.setItem(AUTH_KEY, 'true')
      navigate(from, { replace: true })
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 px-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Login</h1>
          <p className="text-sm text-slate-500 mt-2">Enter your credentials to access the loan manager.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full input-field"
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full input-field"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-xs text-slate-500 text-center">
          Default credentials: <span className="font-semibold">admin / admin123</span>
        </div>
      </div>
    </div>
  )
}
