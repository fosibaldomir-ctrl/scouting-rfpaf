import type { Categoria, Club, CategoriaItem, Observador, EvaluacionDemarcacion, Propuesta } from '../../types'
import { PROPUESTAS } from '../../data/masterData'
import ScoreSlider from '../forms/ScoreSlider'

export interface DatosPartidoValue {
  fechaPartido: string
  categoria: Categoria | ''
  local: string
  visitante: string
  observador: string
}

export function DatosPartidoFields({ value, onChange, errors, categorias, clubes, observadores }: {
  value: DatosPartidoValue
  onChange: (patch: Partial<DatosPartidoValue>) => void
  errors?: Record<string, string>
  categorias: CategoriaItem[]
  clubes: Club[]
  observadores: Observador[]
}) {
  const err = errors ?? {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Fecha del Partido *</label>
          <input type="date" className={`form-input ${err.fechaPartido ? 'border-red-400' : ''}`}
            value={value.fechaPartido} onChange={(e) => onChange({ fechaPartido: e.target.value })} />
          {err.fechaPartido && <p className="text-red-500 text-xs mt-1">{err.fechaPartido}</p>}
        </div>
        <div>
          <label className="form-label">Categoría *</label>
          <select className={`form-select ${err.categoria ? 'border-red-400' : ''}`}
            value={value.categoria} onChange={(e) => onChange({ categoria: e.target.value as Categoria })}>
            {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Equipo Local *</label>
          <select className={`form-select ${err.local ? 'border-red-400' : ''}`}
            value={value.local} onChange={(e) => onChange({ local: e.target.value })}>
            <option value="">— Seleccionar —</option>
            {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
          {err.local && <p className="text-red-500 text-xs mt-1">{err.local}</p>}
        </div>
        <div>
          <label className="form-label">Equipo Visitante *</label>
          <select className={`form-select ${err.visitante ? 'border-red-400' : ''}`}
            value={value.visitante} onChange={(e) => onChange({ visitante: e.target.value })}>
            <option value="">— Seleccionar —</option>
            {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
          {err.visitante && <p className="text-red-500 text-xs mt-1">{err.visitante}</p>}
        </div>
      </div>
      <div>
        <label className="form-label">Observador *</label>
        <select className={`form-select ${err.observador ? 'border-red-400' : ''}`}
          value={value.observador} onChange={(e) => onChange({ observador: e.target.value })}>
          <option value="">— Seleccionar —</option>
          {observadores.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        {err.observador && <p className="text-red-500 text-xs mt-1">{err.observador}</p>}
      </div>
    </div>
  )
}

export function EvaluacionTecnicaFields({ itemsDemarc, values, onChange }: {
  itemsDemarc: string[]
  values: EvaluacionDemarcacion
  onChange: (key: keyof EvaluacionDemarcacion, val: number) => void
}) {
  if (itemsDemarc.length === 0) return null
  const colors = ['#1a3a6b', '#c0392b', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4']
  const tecValues = [values.item1, values.item2, values.item3, values.item4, values.item5, values.item6]
  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-gray-500 font-medium">Evalúa cada ítem (1-5):</p>
      {itemsDemarc.map((item, i) => (
        <ScoreSlider
          key={i}
          label={item}
          value={tecValues[i]}
          max={5}
          onChange={(v) => onChange(`item${i + 1}` as keyof EvaluacionDemarcacion, v)}
          color={colors[i % colors.length]}
        />
      ))}
    </div>
  )
}

export interface CierreValue {
  valoracionGeneral: number
  propuesta: Propuesta | ''
  descripcionJugadora: string
  observaciones: string
  cierre: string
}

export function CierreFields({ value, onChange }: {
  value: CierreValue
  onChange: (patch: Partial<CierreValue>) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="form-label">Valoración General</label>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ valoracionGeneral: n })}
              className={`text-2xl transition-transform hover:scale-110 ${n <= (value.valoracionGeneral ?? 3) ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
          <span className="text-sm text-gray-500 ml-2 self-center">{value.valoracionGeneral ?? 3}/5</span>
        </div>
      </div>
      <div>
        <label className="form-label">Propuesta</label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {PROPUESTAS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ propuesta: p.value as Propuesta })}
              className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                value.propuesta === p.value
                  ? p.color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                  : p.color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : p.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                  : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label">Descripción de la Jugadora</label>
        <textarea rows={3} className="form-input resize-none"
          placeholder="Describe las características principales de la jugadora..."
          value={value.descripcionJugadora} onChange={(e) => onChange({ descripcionJugadora: e.target.value })} />
      </div>
      <div>
        <label className="form-label">Observaciones</label>
        <textarea rows={2} className="form-input resize-none"
          placeholder="Notas adicionales..."
          value={value.observaciones} onChange={(e) => onChange({ observaciones: e.target.value })} />
      </div>
      <div>
        <label className="form-label">Cierre</label>
        <textarea rows={2} className="form-input resize-none"
          placeholder="Resumen final..."
          value={value.cierre} onChange={(e) => onChange({ cierre: e.target.value })} />
      </div>
    </div>
  )
}
