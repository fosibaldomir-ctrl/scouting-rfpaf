import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { BarChart2, Plus, Trash2, ChevronLeft, CalendarDays, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { AnalisisPartido, FormacionFutbol, JugadoraTactica } from '../types'
import PizarraTacticaTab from './analisis/PizarraTacticaTab'
import PlanPartidoTab from './analisis/PlanPartidoTab'
import ABPTab from './analisis/ABPTab'
import EventosTab from './analisis/EventosTab'

const TABS = ['Pizarra Táctica', 'Plan de Partido', 'ABP', 'Eventos'] as const
type Tab = typeof TABS[number]

const FORMATION_PRESETS: Record<FormacionFutbol, Array<{ x: number; y: number }>> = {
  '4-4-2': [
    { x: 50, y: 92 },
    { x: 14, y: 76 }, { x: 36, y: 76 }, { x: 64, y: 76 }, { x: 86, y: 76 },
    { x: 14, y: 56 }, { x: 36, y: 56 }, { x: 64, y: 56 }, { x: 86, y: 56 },
    { x: 35, y: 36 }, { x: 65, y: 36 },
  ],
  '4-3-3': [
    { x: 50, y: 92 },
    { x: 14, y: 76 }, { x: 36, y: 76 }, { x: 64, y: 76 }, { x: 86, y: 76 },
    { x: 24, y: 54 }, { x: 50, y: 54 }, { x: 76, y: 54 },
    { x: 18, y: 32 }, { x: 50, y: 30 }, { x: 82, y: 32 },
  ],
  '4-2-3-1': [
    { x: 50, y: 92 },
    { x: 14, y: 76 }, { x: 36, y: 76 }, { x: 64, y: 76 }, { x: 86, y: 76 },
    { x: 34, y: 60 }, { x: 66, y: 60 },
    { x: 16, y: 45 }, { x: 50, y: 43 }, { x: 84, y: 45 },
    { x: 50, y: 28 },
  ],
  '4-3-2-1': [
    { x: 50, y: 92 },
    { x: 14, y: 76 }, { x: 36, y: 76 }, { x: 64, y: 76 }, { x: 86, y: 76 },
    { x: 24, y: 58 }, { x: 50, y: 58 }, { x: 76, y: 58 },
    { x: 35, y: 42 }, { x: 65, y: 42 },
    { x: 50, y: 28 },
  ],
  '3-5-2': [
    { x: 50, y: 92 },
    { x: 25, y: 76 }, { x: 50, y: 76 }, { x: 75, y: 76 },
    { x: 8, y: 56 }, { x: 28, y: 54 }, { x: 50, y: 52 }, { x: 72, y: 54 }, { x: 92, y: 56 },
    { x: 35, y: 34 }, { x: 65, y: 34 },
  ],
  '3-4-3': [
    { x: 50, y: 92 },
    { x: 25, y: 76 }, { x: 50, y: 76 }, { x: 75, y: 76 },
    { x: 14, y: 56 }, { x: 38, y: 56 }, { x: 62, y: 56 }, { x: 86, y: 56 },
    { x: 18, y: 34 }, { x: 50, y: 32 }, { x: 82, y: 34 },
  ],
  '5-3-2': [
    { x: 50, y: 92 },
    { x: 8, y: 76 }, { x: 26, y: 76 }, { x: 50, y: 76 }, { x: 74, y: 76 }, { x: 92, y: 76 },
    { x: 24, y: 54 }, { x: 50, y: 54 }, { x: 76, y: 54 },
    { x: 35, y: 34 }, { x: 65, y: 34 },
  ],
  '5-4-1': [
    { x: 50, y: 92 },
    { x: 8, y: 76 }, { x: 26, y: 76 }, { x: 50, y: 76 }, { x: 74, y: 76 }, { x: 92, y: 76 },
    { x: 14, y: 56 }, { x: 38, y: 56 }, { x: 62, y: 56 }, { x: 86, y: 56 },
    { x: 50, y: 34 },
  ],
  '4-1-4-1': [
    { x: 50, y: 92 },
    { x: 14, y: 76 }, { x: 36, y: 76 }, { x: 64, y: 76 }, { x: 86, y: 76 },
    { x: 50, y: 62 },
    { x: 14, y: 48 }, { x: 36, y: 48 }, { x: 64, y: 48 }, { x: 86, y: 48 },
    { x: 50, y: 30 },
  ],
  '4-5-1': [
    { x: 50, y: 92 },
    { x: 14, y: 76 }, { x: 36, y: 76 }, { x: 64, y: 76 }, { x: 86, y: 76 },
    { x: 8, y: 54 }, { x: 28, y: 54 }, { x: 50, y: 52 }, { x: 72, y: 54 }, { x: 92, y: 54 },
    { x: 50, y: 32 },
  ],
  '4-4-1-1': [
    { x: 50, y: 92 },
    { x: 14, y: 76 }, { x: 36, y: 76 }, { x: 64, y: 76 }, { x: 86, y: 76 },
    { x: 14, y: 58 }, { x: 36, y: 58 }, { x: 64, y: 58 }, { x: 86, y: 58 },
    { x: 50, y: 44 },
    { x: 50, y: 30 },
  ],
}

export function buildTeamJugadoras(formation: FormacionFutbol, team: 'local' | 'visit'): JugadoraTactica[] {
  const preset = FORMATION_PRESETS[formation]
  return preset.map((pos, i) => ({
    uid: `${team}-${i}`,
    numero: i + 1,
    nombre: String(i + 1),
    posX: pos.x,
    posY: team === 'local' ? pos.y : 100 - pos.y,
  }))
}

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
      salidaBalon: [],
      presion: [],
      bloque: [],
      lineaDefensiva: [],
      transicionOfensiva: [],
      transicionDefensiva: [],
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
  const { analisis, addAnalisis, deleteAnalisis } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Pizarra Táctica')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', rival: '', fecha: new Date().toISOString().slice(0, 10) })

  const selected = analisis.find((a) => a.id === selectedId)

  const handleCreate = () => {
    if (!form.nombre.trim()) return
    const a = createEmptyAnalisis(form.nombre, form.rival, form.fecha)
    addAnalisis(a)
    setSelectedId(a.id)
    setActiveTab('Pizarra Táctica')
    setShowForm(false)
    setForm({ nombre: '', rival: '', fecha: new Date().toISOString().slice(0, 10) })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este análisis?')) return
    deleteAnalisis(id)
    if (selectedId === id) setSelectedId(null)
  }

  if (selected) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="bg-rfpaf-blue text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{selected.nombre}</p>
            <p className="text-white/70 text-xs truncate">vs {selected.rival} · {selected.fecha}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-rfpaf-blue text-rfpaf-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
          {activeTab === 'Pizarra Táctica' && <PizarraTacticaTab analisis={selected} />}
          {activeTab === 'Plan de Partido' && <PlanPartidoTab analisis={selected} />}
          {activeTab === 'ABP' && <ABPTab analisis={selected} />}
          {activeTab === 'Eventos' && <EventosTab analisis={selected} />}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rfpaf-blue rounded-xl flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-rfpaf-blue">Análisis Global</h1>
            <p className="text-sm text-gray-500">Pizarra táctica, plan de partido, ABP y eventos</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-rfpaf-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-rfpaf-blue-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Análisis
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-rfpaf-blue mb-4">Nuevo Análisis de Partido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Jornada 5 vs Sporting"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rival</label>
              <input
                value={form.rival}
                onChange={(e) => setForm((f) => ({ ...f, rival: e.target.value }))}
                placeholder="Nombre del rival"
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
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={!form.nombre.trim()}
              className="bg-rfpaf-blue text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-rfpaf-blue-light transition-colors disabled:opacity-50"
            >
              Crear
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analisis.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              onClick={() => setSelectedId(a.id)}
            >
              <div className="h-2 bg-rfpaf-blue" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-rfpaf-blue truncate">{a.nombre}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        vs {a.rival || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {a.fecha}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
                    className="text-gray-400 hover:text-rfpaf-red p-1 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className="text-xs bg-rfpaf-blue/10 text-rfpaf-blue px-2 py-0.5 rounded-full font-medium">
                    {a.equipoLocal.formacion}
                  </span>
                  <span className="text-xs text-gray-400">vs</span>
                  <span className="text-xs bg-rfpaf-red/10 text-rfpaf-red px-2 py-0.5 rounded-full font-medium">
                    {a.equipoVisitante.formacion}
                  </span>
                  {a.eventosPartido.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {a.eventosPartido.length} eventos
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
