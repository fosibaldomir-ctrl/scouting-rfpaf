import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { BarChart2, Plus, Trash2, CalendarDays, Users, Target, ClipboardList } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { AnalisisPartido } from '../types'
export { buildTeamJugadoras } from '../utils/tactics'
import { buildTeamJugadoras } from '../utils/tactics'

const CATEGORIAS_ANALISIS = ['Sub 12', 'Sub 14', 'Sub 16', 'Selección'] as const

const CATEGORIA_COLORS: Record<string, string> = {
  'Sub 12': 'bg-emerald-100 text-emerald-700',
  'Sub 14': 'bg-blue-100 text-blue-700',
  'Sub 16': 'bg-purple-100 text-purple-700',
  'Selección': 'bg-amber-100 text-amber-700',
}

function createEmptyAnalisis(nombre: string, fecha: string, categoria: string): AnalisisPartido {
  return {
    id: uuidv4(),
    nombre,
    rival: '',
    fecha,
    categoria,
    equipoLocal: {
      nombre: 'Equipo Local',
      formacion: '4-3-3',
      color: '#1a3a6b',
      jugadoras: buildTeamJugadoras('4-3-3', 'local'),
    },
    equipoVisitante: {
      nombre: 'Rival',
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
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas')
  const [form, setForm] = useState({
    nombre: '',
    fecha: new Date().toISOString().slice(0, 10),
    categoria: '',
    clubLocalId: '',
    clubVisitanteId: '',
  })

  const conteoPorCategoria: Record<string, number> = {}
  for (const a of analisis) {
    const key = a.categoria || 'Sin categoría'
    conteoPorCategoria[key] = (conteoPorCategoria[key] ?? 0) + 1
  }
  const filtros = ['Todas', ...CATEGORIAS_ANALISIS, 'Sin categoría']
  const analisisFiltrados = filtroCategoria === 'Todas'
    ? analisis
    : analisis.filter((a) => (a.categoria || 'Sin categoría') === filtroCategoria)

  const handleCreate = () => {
    if (!form.nombre.trim()) return
    const a = createEmptyAnalisis(form.nombre, form.fecha, form.categoria)
    const localClub = form.clubLocalId ? clubes.find((c) => c.id === form.clubLocalId) : null
    const visitClub = form.clubVisitanteId ? clubes.find((c) => c.id === form.clubVisitanteId) : null
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
    setForm({ nombre: '', fecha: new Date().toISOString().slice(0, 10), categoria: '', clubLocalId: '', clubVisitanteId: '' })
    navigate('/analisis-global/pizarra')
  }

  const handleGoTo = (id: string, path: string) => {
    setActiveAnalisisId(id)
    navigate(path)
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              >
                <option value="">— Seleccionar —</option>
                {CATEGORIAS_ANALISIS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Equipo Local</label>
              <select
                value={form.clubLocalId}
                onChange={(e) => setForm((f) => ({ ...f, clubLocalId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              >
                <option value="">— Seleccionar club —</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
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
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
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

      {/* Category filter tabs */}
      {analisis.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {filtros.map((cat) => {
            const count = cat === 'Todas' ? analisis.length : (conteoPorCategoria[cat] ?? 0)
            if (cat !== 'Todas' && count === 0) return null
            const isActive = filtroCategoria === cat
            return (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isActive ? 'bg-rfpaf-blue text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-rfpaf-blue/40 hover:text-rfpaf-blue'
                }`}
              >
                {cat}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Cards */}
      {analisis.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay análisis creados</p>
          <p className="text-sm mt-1">Crea el primero con el botón de arriba</p>
        </div>
      ) : analisisFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin análisis en «{filtroCategoria}»</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analisisFiltrados.map((a) => {
            const isActive = a.id === activeAnalisisId
            const catColor = a.categoria
              ? (CATEGORIA_COLORS[a.categoria] ?? 'bg-gray-100 text-gray-600')
              : 'bg-gray-100 text-gray-400'
            return (
              <div
                key={a.id}
                className={`relative bg-white rounded-3xl shadow-sm overflow-hidden border-2 transition-all ${
                  isActive ? 'border-rfpaf-blue shadow-md' : 'border-gray-200'
                }`}
              >
                {/* Delete — absolute top-right */}
                <button
                  onClick={(e) => handleDelete(e, a.id)}
                  className="absolute top-3 right-3 z-10 text-gray-300 hover:text-rfpaf-red p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Clickable header + shields → opens Pizarra */}
                <div
                  onClick={() => handleGoTo(a.id, '/analisis-global/pizarra')}
                  className="cursor-pointer"
                >
                  {/* Category badge */}
                  <div className="px-5 pt-4 pb-2 pr-10">
                    <span className={`inline-block text-[11px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${catColor}`}>
                      {a.categoria || 'Análisis'}
                    </span>
                  </div>

                  {/* Shields — 3 equal columns */}
                  <div className="grid grid-cols-3 items-center px-4 pt-3 pb-2 gap-2">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden p-2">
                        {a.equipoLocal.escudo
                          ? <img src={a.equipoLocal.escudo} alt={a.equipoLocal.nombre} className="w-full h-full object-contain" />
                          : <Users className="w-9 h-9 text-gray-300" />}
                      </div>
                      <p className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wide text-center leading-tight w-full">
                        {a.equipoLocal.nombre}
                      </p>
                    </div>

                    <div className="flex items-center justify-center pb-5">
                      <p className="text-2xl font-light text-gray-300 tracking-wider">VS</p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
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

                  {/* Date row */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                    <CalendarDays className="w-4 h-4 flex-shrink-0" />
                    <span>{a.fecha || '—'}</span>
                    {isActive && (
                      <span className="ml-auto text-[10px] font-bold bg-rfpaf-blue text-white px-2 py-0.5 rounded-full">
                        Activo
                      </span>
                    )}
                  </div>
                </div>

                {/* Action tabs */}
                <div className="grid grid-cols-2 border-t-2 border-gray-100">
                  <button
                    onClick={() => handleGoTo(a.id, '/analisis-global/pizarra')}
                    className="flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-rfpaf-blue hover:bg-rfpaf-blue/5 transition-colors border-r border-gray-100"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Pizarra
                  </button>
                  <button
                    onClick={() => handleGoTo(a.id, '/analisis-global/plan')}
                    className="flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Plan de Partido
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
