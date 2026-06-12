import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

export default function Login() {
  const { observadores, login } = useStore()
  const navigate = useNavigate()
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (!selected) {
      setError('Selecciona un observador para continuar')
      return
    }
    login(selected)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rfpaf-blue to-rfpaf-blue-light flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          {/* Escudo RFPAF */}
          <svg
            width="80"
            height="100"
            viewBox="0 0 80 100"
            className="mx-auto mb-4"
          >
            {/* Fondo del escudo */}
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#1a3a6b', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#0f2847', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            {/* Escudo */}
            <path
              d="M 40 5 L 70 20 L 70 50 Q 70 75 40 95 Q 10 75 10 50 L 10 20 Z"
              fill="url(#shieldGrad)"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            {/* Franja blanca central */}
            <rect x="28" y="15" width="24" height="70" fill="rgba(255,255,255,0.15)" />
            {/* Emblema interior: pelota de fútbol */}
            <circle cx="40" cy="45" r="15" fill="none" stroke="white" strokeWidth="1.5" />
            {/* Pentágonos del balón */}
            <circle cx="40" cy="45" r="10" fill="white" opacity="0.3" />
            <text x="40" y="50" textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">
              ⚽
            </text>
            {/* Estrella en la punta */}
            <polygon
              points="40,8 43,18 54,18 45,25 48,35 40,30 32,35 35,25 26,18 37,18"
              fill="#fbbf24"
            />
          </svg>
          <h1 className="text-2xl font-bold text-rfpaf-blue">RFPAF Scouting</h1>
          <p className="text-gray-500 text-sm mt-1">
            Real Federación de Fútbol del Principado de Asturias
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label className="form-label">Observador</label>
            <select
              className="form-select"
              value={selected}
              onChange={(e) => { setSelected(e.target.value); setError('') }}
            >
              <option value="">— Selecciona tu nombre —</option>
              {observadores.map((obs) => (
                <option key={obs.id} value={obs.id}>
                  {obs.nombre}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-rfpaf-red text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full btn-primary py-3 text-base"
          >
            Entrar al Sistema
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sistema de Scouting · Temporada 2024-25
        </p>
      </div>
    </div>
  )
}
