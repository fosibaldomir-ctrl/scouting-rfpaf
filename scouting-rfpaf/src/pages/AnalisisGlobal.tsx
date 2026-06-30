import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { BarChart2, Plus, Trash2, CalendarDays, Users, Target } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { AnalisisPartido } from '../types'
export { buildTeamJugadoras } from '../utils/tactics'
import { buildTeamJugadoras } from '../utils/tactics'

function createEmptyAnalisis(nombre: string, rival: string, fecha: string): AnalisisPartido {
  return {
    id: uuidv4(),
    nombre,
    rival,
    fecha,
    equipoLocal: {
      nombre: 'Equipo Local',
      formacion: '4-3-3',
      color: '#1a3a6b',
      jugadoras: buildTeamJugadoras('4-3-3', 'local'),
    },
    equipoVisitante: {
      nombre: rival || 'Rival',
      formacion: '4-4-2',
      color: '#c0392b',
      jugadoras: buildTeamJugadoras('4-4-2', 'visit'),
    },
    analisisIA: '',
    caracteristicasRival: {
      salidaBalon: [], presion: [], bloque: [],
      lineaDefensiva: [], transicionOfensiva: [], transicionDefensiva: [],
    },
    videoRivalUrl: '',
    presentacionUrl: '',
    bloqueAtaque: { notas: '', videoUrl: '', imagenUrl: '' },
    bloqueDefensa: { notas: '', videoUrl: '', imagenUrl: '' },
    bloqueTransicion: { notas: '', videoUrl: '', imagenUrl: '' },
    abpOfensivo: [],
    abpDefensivo: [],
    videoPartidoUrl: '',
    tiempos: { inicio1: '', fin1: '', inicio2: '', fin2: '' },
    eventosPartido: [],
    creadoEn: new Date().toISOString(),
  }
}

export default function AnalisisGlobal() {
  const { analisis, activeAnalisisId, addAnalisis, deleteAnalisis, setActiveAnalisisId, clubes } = useStore()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    nombre: '', rival: '', fecha: new Date().toISOString().slice(0, 10),
    clubLocalId: '', clubVisitanteId: ''
  })

  const handleCreate = () => {
    if (!form.nombre.trim()) return
    const a = createEmptyAnalisis(form.nombre, form.rival, form.fecha)
    // Set club shields if selected
    const localClub = form.clubLocalId ? clubes.find(c => c.id === form.clubLocalId) : null
    const visitClub = form.clubVisitanteId ? clubes.find(c => c.id === form.clubVisitanteId) : null
    if (localClub) {
      a.equipoLocal.nombre = localClub.nombre
      a.equipoLocal.escudo = localClub.escudo || null
    }
    if (visitClub) {
      a.equipoVisitante.nombre = visitClub.nombre
      a.equipoVisitante.escudo = visitClub.escudo || null
    }
    addAnalisis(a)
    setActiveAnalisisId(a.id)
    setShowForm(false)
    setForm({ nombre: '', rival: '', fecha: new Date().toISOString().slice(0, 10), clubLocalId: '', clubVisitanteId: '' })
    navigate('/analisis-global/pizarra')
  }

  const handleSelect = (id: string) => {
    setActiveAnalisisId(id)
    navigate('/analisis-global/pizarra')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este análisis?')) return
    deleteAnalisis(id)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rfpaf-blue rounded-xl flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-rfpaf-blue">Mis Análisis</h1>
            <p className="text-sm text-gray-500">Selecciona o crea un análisis de partido</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-rfpaf-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Análisis
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-rfpaf-blue mb-4">Nuevo Análisis de Partido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Jornada 5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Equipo Local</label>
              <select
                value={form.clubLocalId}
                onChange={(e) => setForm((f) => ({ ...f, clubLocalId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              >
                <option value="">— Seleccionar club —</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Equipo Visitante</label>
              <select
                value={form.clubVisitanteId}
                onChange={(e) => setForm((f) => ({ ...f, clubVisitanteId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              >
                <option value="">— Seleccionar club —</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={!form.nombre.trim()}
              className="bg-rfpaf-blue text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Crear y abrir
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {analisis.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay análisis creados</p>
          <p className="text-sm mt-1">Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analisis.map((a) => {
            const isActive = a.id === activeAnalisisId
            return (
              <button
                key={a.id}
                onClick={() => handleSelect(a.id)}
                className={`w-full text-left bg-white rounded-3xl shadow-sm hover:shadow-lg transition-all overflow-hidden border-2 ${
                  isActive ? 'border-rfpaf-blue' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Header badge */}
                <div className="px-5 pt-4 pb-1">
                  <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Análisis</p>
                </div>

                {/* Shields — 3-column grid: shield | VS | shield, each column equal width */}
                <div className="grid grid-cols-3 items-center px-4 pt-4 pb-2 gap-2">
                  {/* Local */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden p-2">
                      {a.equipoLocal.escudo
                        ? <img src={a.equipoLocal.escudo} alt={a.equipoLocal.nombre} className="w-full h-full object-contain" />
                        : <Users className="w-9 h-9 text-gray-300" />}
                    </div>
                    <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wide text-center leading-tight w-full">
                      {a.equipoLocal.nombre}
                    </p>
                  </div>

                  {/* VS — perfectly centered */}
                  <div className="flex items-center justify-center pb-6">
                    <p className="text-2xl font-light text-gray-300 tracking-wider">VS</p>
                  </div>

                  {/* Visitante */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden p-2">
                      {a.equipoVisitante.escudo
                        ? <img src={a.equipoVisitante.escudo} alt={a.equipoVisitante.nombre} className="w-full h-full object-contain" />
                        : <Users className="w-9 h-9 text-gray-300" />}
                    </div>
                    <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wide text-center leading-tight w-full">
                      {a.equipoVisitante.nombre}
                    </p>
                  </div>
                </div>

                {/* Date and status */}
                <div className="px-5 py-3 border-t border-gray-100 space-y-1.5 text-sm text-gray-500 mt-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 flex-shrink-0" />
                    <span>{a.fecha || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 flex-shrink-0" />
                    <span>Planificado</span>
                  </div>
                </div>

                {/* Action row */}
                <div className="px-5 pb-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-rfpaf-blue">Abrir detalle →</p>
                  <button
                    onClick={(e) => handleDelete(e, a.id)}
                    className="text-gray-400 hover:text-rfpaf-red p-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
