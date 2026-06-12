import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import RFPAFLogo from '../components/RFPAFLogo'

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
          <div className="inline-block mb-4">
            <RFPAFLogo />
          </div>
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
