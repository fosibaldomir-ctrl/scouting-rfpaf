import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, Calendar } from 'lucide-react'
import type { Evento, TipoEvento } from '../types'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8:00–21:00

const TIPO_BG: Record<TipoEvento, string> = {
  reunion: '#2563eb',
  convocatoria: '#7c3aed',
  entrenamiento: '#16a34a',
  partido: '#dc2626',
  otro: '#6b7280',
}

const TIPO_LABEL: Record<TipoEvento, string> = {
  reunion: 'Reunión',
  convocatoria: 'Convocatoria',
  entrenamiento: 'Entrenamiento',
  partido: 'Partido',
  otro: 'Otro',
}

const TIPOS: TipoEvento[] = ['reunion', 'convocatoria', 'entrenamiento', 'partido', 'otro']
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getWeekDays(offset: number): Date[] {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY_FORM = {
  titulo: '',
  hora_inicio: '10:00',
  hora_fin: '11:00',
  tipo: 'reunion' as TipoEvento,
  descripcion: '',
}

interface Props {
  eventos: Evento[]
  onAdd: (ev: Omit<Evento, 'id' | 'creado_en'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function CalendarioSemanal({ eventos, onAdd, onDelete }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [modalFecha, setModalFecha] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [detalle, setDetalle] = useState<Evento | null>(null)
  const [saving, setSaving] = useState(false)

  const weekDays = getWeekDays(weekOffset)
  const todayYMD = toYMD(new Date())

  const weekLabel = (() => {
    const f = weekDays[0], l = weekDays[6]
    if (f.getMonth() === l.getMonth())
      return `${f.getDate()} – ${l.getDate()} ${MONTHS[l.getMonth()]} ${l.getFullYear()}`
    return `${f.getDate()} ${MONTHS[f.getMonth()]} – ${l.getDate()} ${MONTHS[l.getMonth()]} ${l.getFullYear()}`
  })()

  const getEvs = (ymd: string, hour: number) =>
    eventos.filter(e => e.fecha === ymd && parseInt(e.hora_inicio) === hour)

  const openAdd = (fecha: string, hour: number) => {
    const h = String(hour).padStart(2, '0')
    const h1 = String(Math.min(hour + 1, 21)).padStart(2, '0')
    setForm({ ...EMPTY_FORM, hora_inicio: `${h}:00`, hora_fin: `${h1}:00` })
    setModalFecha(fecha)
  }

  const handleSave = async () => {
    if (!form.titulo.trim() || !modalFecha) return
    setSaving(true)
    await onAdd({
      titulo: form.titulo.trim(),
      fecha: modalFecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin || null,
      tipo: form.tipo,
      descripcion: form.descripcion.trim(),
    })
    setSaving(false)
    setModalFecha(null)
  }

  const handleDelete = async () => {
    if (!detalle || !window.confirm(`¿Eliminar "${detalle.titulo}"?`)) return
    await onDelete(detalle.id)
    setDetalle(null)
  }

  const fmtFecha = (ymd: string) =>
    new Date(ymd + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-700">Agenda Semanal</h2>
          <div className="hidden sm:flex gap-2 flex-wrap">
            {TIPOS.map(t => (
              <span key={t} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TIPO_BG[t] }} />
                {TIPO_LABEL[t]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 font-medium whitespace-nowrap min-w-[160px] text-center">{weekLabel}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 rounded hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-[10px] px-2 py-0.5 bg-rfpaf-blue text-white rounded ml-1">
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 520 }}>
          {/* Day headers */}
          <div className="grid border-b border-gray-200 mb-1 pb-1" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div />
            {weekDays.map((day, i) => {
              const ymd = toYMD(day)
              const isToday = ymd === todayYMD
              return (
                <div key={ymd} className="text-center">
                  <div className={`text-[10px] font-semibold ${isToday ? 'text-rfpaf-blue' : 'text-gray-400'}`}>
                    {DAY_NAMES[i]}
                  </div>
                  <div className={`text-sm font-bold mx-auto w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-rfpaf-blue text-white' : 'text-gray-700'}`}>
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time slots */}
          <div className="overflow-y-auto" style={{ maxHeight: 256 }}>
            {HOURS.map(hour => (
              <div key={hour} className="grid" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', minHeight: 40 }}>
                <div className="text-[10px] text-gray-400 text-right pr-2 pt-1 leading-none select-none">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map(day => {
                  const ymd = toYMD(day)
                  const evs = getEvs(ymd, hour)
                  return (
                    <div
                      key={ymd}
                      className="border-t border-l border-gray-100 relative cursor-pointer hover:bg-blue-50/40 group transition-colors p-0.5"
                      style={{ minHeight: 40 }}
                      onClick={() => openAdd(ymd, hour)}
                    >
                      {evs.slice(0, 2).map(ev => (
                        <button
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); setDetalle(ev) }}
                          title={`${ev.titulo} ${ev.hora_inicio}${ev.hora_fin ? '–' + ev.hora_fin : ''}`}
                          className="block w-full text-left text-[9px] font-semibold text-white truncate px-1 py-0.5 rounded mb-0.5"
                          style={{ backgroundColor: TIPO_BG[ev.tipo] }}
                        >
                          {ev.titulo}
                        </button>
                      ))}
                      {evs.length > 2 && (
                        <div className="text-[8px] text-gray-400 px-1">+{evs.length - 2}</div>
                      )}
                      {evs.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-60">
                          <Plus className="w-3 h-3 text-rfpaf-blue" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal añadir evento */}
      {modalFecha && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalFecha(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Nuevo evento — {fmtFecha(modalFecha)}
              </h3>
              <button onClick={() => setModalFecha(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Título del evento *"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Hora inicio</label>
                  <input type="time" value={form.hora_inicio}
                    onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-0.5 block">Hora fin</label>
                  <input type="time" value={form.hora_fin}
                    onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Tipo de evento</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIPOS.map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, tipo: t }))}
                      className={`px-2 py-1 rounded text-[10px] font-bold text-white transition-all ${form.tipo === t ? 'opacity-100 ring-2 ring-offset-1 ring-gray-300 scale-105' : 'opacity-40 hover:opacity-70'}`}
                      style={{ backgroundColor: TIPO_BG[t] }}
                    >
                      {TIPO_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción, participantes… (opcional)"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"
              />
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving || !form.titulo.trim()}
                  className="flex-1 py-2 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 disabled:opacity-40 transition-colors">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button onClick={() => setModalFecha(null)}
                  className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle evento */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 text-white" style={{ backgroundColor: TIPO_BG[detalle.tipo] }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold uppercase opacity-75 mb-0.5">{TIPO_LABEL[detalle.tipo]}</div>
                  <h3 className="font-bold text-base">{detalle.titulo}</h3>
                </div>
                <button onClick={() => setDetalle(null)} className="opacity-75 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{fmtFecha(detalle.fecha)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{detalle.hora_inicio}{detalle.hora_fin ? ` – ${detalle.hora_fin}` : ''}</span>
              </div>
              {detalle.descripcion && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5">{detalle.descripcion}</p>
              )}
              <button onClick={handleDelete}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors mt-1">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar evento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
