import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, CalendarDays, BarChart3, X } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useStore } from '../store/useStore'
import type { Observador, PartidoCalendario } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Paleta de colores para observadores (índice → color)
const PALETTE = [
  '#2563eb', // azul
  '#16a34a', // verde
  '#dc2626', // rojo
  '#9333ea', // púrpura
  '#ea580c', // naranja
  '#0891b2', // cyan
  '#d97706', // ámbar
  '#db2777', // rosa
]

function getObsColor(obsId: string, observadores: Observador[]): string {
  const idx = observadores.findIndex((o) => o.id === obsId)
  return PALETTE[idx >= 0 ? idx % PALETTE.length : 0]
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Lun = 0
  const days: { date: Date; current: boolean }[] = []

  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), current: false })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), current: true })
  }
  const rem = 42 - days.length
  for (let d = 1; d <= rem; d++) {
    days.push({ date: new Date(year, month + 1, d), current: false })
  }
  return days
}

const EMPTY_FORM = { observador: '', local: '', visitante: '', hora: '12:00', categoria: '' }

export default function Calendario() {
  const { observadores, clubes, categorias, partidos, addPartido, deletePartido } = useStore()

  const today = new Date()
  const todayYMD = toYMD(today)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [resumenOpen, setResumenOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [dayModalOpen, setDayModalOpen] = useState(false)

  const calDays = useMemo(() => getCalendarDays(year, month), [year, month])

  const partidosByDate = useMemo(() => {
    const map: Record<string, PartidoCalendario[]> = {}
    partidos.forEach((p) => { ;(map[p.fecha] ??= []).push(p) })
    return map
  }, [partidos])

  const selectedPartidos = (partidosByDate[selectedDate] ?? [])
    .slice().sort((a, b) => a.hora.localeCompare(b.hora))

  const [sy, sm, sd] = selectedDate.split('-').map(Number)
  const selectedLabel = `${sd} de ${MONTHS[sm - 1]} de ${sy}`

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: false }))
  }

  function handleAdd() {
    const errs: Record<string, boolean> = {}
    if (!form.observador) errs.observador = true
    if (!form.local)      errs.local = true
    if (!form.visitante)  errs.visitante = true
    if (!form.hora)       errs.hora = true
    if (!form.categoria)  errs.categoria = true
    if (Object.keys(errs).length) { setErrors(errs); return }

    addPartido({
      id: crypto.randomUUID(),
      fecha: selectedDate,
      hora: form.hora,
      local: form.local,
      visitante: form.visitante,
      observador: form.observador,
      categoria: form.categoria,
    })
    setForm(EMPTY_FORM)
  }

  // Conteo de partidos por observador (para el resumen)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    partidos.forEach((p) => { c[p.observador] = (c[p.observador] ?? 0) + 1 })
    return c
  }, [partidos])

  // Gráfico: barras con color propio de cada observador
  const chartData = useMemo(() => {
    const obs = observadores.filter((o) => counts[o.id])
    return {
      labels: obs.map((o) => o.nombre),
      datasets: [{
        label: 'Partidos asignados',
        data: obs.map((o) => counts[o.id] ?? 0),
        backgroundColor: obs.map((o) => getObsColor(o.id, observadores)),
        borderRadius: 6,
      }],
    }
  }, [counts, observadores])

  // Observadores con partidos
  const obsConPartidos = useMemo(() => {
    return observadores.filter((o) => counts[o.id])
  }, [counts, observadores])

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue flex items-center gap-2">
            <CalendarDays className="w-6 h-6" />
            Calendario de Partidos
          </h1>
          <p className="text-gray-500 text-sm">Asigna partidos a observadores</p>
        </div>
        {!resumenOpen && (
          <button
            onClick={() => setResumenOpen(true)}
            className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-rfpaf-blue border border-rfpaf-blue/30 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors flex-shrink-0"
            title="Mostrar resumen"
          >
            <BarChart3 className="w-4 h-4" />
            Resumen
          </button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Calendario — crece para ocupar el espacio disponible */}
        <div className="flex-1 min-w-0 card p-4">
          {/* Nav mes */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-base font-bold text-rfpaf-blue">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Leyenda observadores */}
          {obsConPartidos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {obsConPartidos.map((o) => (
                <span
                  key={o.id}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: getObsColor(o.id, observadores) }}
                >
                  {o.nombre}
                </span>
              ))}
            </div>
          )}

          {/* Cabeceras días */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map(({ date, current }, i) => {
              const ymd = toYMD(date)
              const isToday = ymd === todayYMD
              const isSelected = ymd === selectedDate
              const dayPartidos = (partidosByDate[ymd] ?? [])
                .slice().sort((a, b) => a.hora.localeCompare(b.hora))

              return (
                <button
                  key={i}
                  onClick={() => { if (current) { setSelectedDate(ymd); setDayModalOpen(true) } }}
                  className={`min-h-[88px] rounded-lg p-1 flex flex-col items-stretch transition-all border text-left ${
                    isSelected
                      ? 'bg-rfpaf-blue border-rfpaf-blue shadow-md'
                      : isToday
                      ? 'border-rfpaf-blue bg-blue-50'
                      : current
                      ? 'border-transparent hover:bg-gray-50'
                      : 'border-transparent opacity-30 cursor-default'
                  }`}
                >
                  {/* Número día */}
                  <span className={`text-xs font-bold leading-none mb-1 ml-0.5 ${
                    isSelected ? 'text-white' : isToday ? 'text-rfpaf-blue' : 'text-gray-700'
                  }`}>
                    {date.getDate()}
                  </span>

                  {/* Chips de partidos — con más detalle (equipos) */}
                  <div className="flex flex-col gap-0.5">
                    {dayPartidos.slice(0, 3).map((p) => {
                      const color = getObsColor(p.observador, observadores)
                      return (
                        <div
                          key={p.id}
                          className="text-white text-[8px] font-semibold px-1 py-0.5 rounded leading-tight"
                          style={{ backgroundColor: color }}
                        >
                          <span className="block break-words">{p.hora} {p.local}</span>
                          <span className="block break-words opacity-90">vs {p.visitante}</span>
                        </div>
                      )
                    })}
                    {dayPartidos.length > 3 && (
                      <span className={`text-[9px] ml-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                        +{dayPartidos.length - 3} más
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel del día (formulario + partidos) */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          {/* Formulario (desplegable) */}
          <div className="card p-4">
            <button
              onClick={() => setFormOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Plus className="w-4 h-4 text-rfpaf-blue" />
                Nuevo partido
                <span className="block text-rfpaf-blue font-normal text-xs">· {selectedLabel}</span>
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${formOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {formOpen && (
            <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
            <div>
              <label className="form-label">Observador *</label>
              <select
                className={`form-select ${errors.observador ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                value={form.observador}
                onChange={(e) => setField('observador', e.target.value)}
                style={form.observador ? { borderLeftWidth: 4, borderLeftColor: getObsColor(form.observador, observadores) } : {}}
              >
                <option value="">— Selecciona —</option>
                {observadores.map((o) => (
                  <option key={o.id} value={o.id}>{o.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Categoría *</label>
              <select
                className={`form-select ${errors.categoria ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                value={form.categoria}
                onChange={(e) => setField('categoria', e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Equipo local *</label>
              <select
                className={`form-select ${errors.local ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                value={form.local}
                onChange={(e) => setField('local', e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Equipo visitante *</label>
              <select
                className={`form-select ${errors.visitante ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                value={form.visitante}
                onChange={(e) => setField('visitante', e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Hora *</label>
              <input
                type="time"
                className={`form-input ${errors.hora ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                value={form.hora}
                onChange={(e) => setField('hora', e.target.value)}
              />
            </div>

            <button
              onClick={handleAdd}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Añadir partido
            </button>
            </div>
            )}
          </div>

        </div>

        {/* RESUMEN colapsable (estilo panel lateral, como la captura) */}
        {resumenOpen && (
          <div className="w-full lg:w-64 flex-shrink-0 card p-4 self-start">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-rfpaf-blue tracking-wide uppercase">Resumen</h2>
              <button
                onClick={() => setResumenOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
                title="Ocultar resumen"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {partidos.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Sin partidos asignados aún</p>
            ) : (
              <>
                {/* Total */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Total partidos</span>
                  <span className="text-lg font-bold text-rfpaf-blue">{partidos.length}</span>
                </div>

                {/* Filas por observador */}
                <div className="space-y-1.5 mb-4">
                  {obsConPartidos.map((o) => {
                    const color = getObsColor(o.id, observadores)
                    return (
                      <div
                        key={o.id}
                        className="flex items-center justify-between py-1 pl-2 pr-1 rounded"
                        style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <span className="text-sm text-gray-700 truncate">{o.nombre}</span>
                        <span className="text-sm font-bold ml-2 flex-shrink-0" style={{ color }}>
                          {counts[o.id]}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Mini gráfico */}
                <div className="h-44">
                  <Bar
                    data={chartData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { stepSize: 1, font: { size: 10 } },
                          grid: { color: 'rgba(0,0,0,0.05)' },
                        },
                        x: { ticks: { font: { size: 9 } } },
                      },
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal: partidos del día seleccionado */}
      {dayModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDayModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera modal */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-rfpaf-blue text-white">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-tight truncate">{selectedLabel}</h3>
                  <p className="text-xs text-white/70">
                    {selectedPartidos.length} {selectedPartidos.length === 1 ? 'partido programado' : 'partidos programados'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDayModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de partidos */}
            <div className="p-5 space-y-2.5 overflow-y-auto">
              {selectedPartidos.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hay partidos programados este día</p>
                </div>
              ) : (
                selectedPartidos.map((p) => {
                  const obsNombre = observadores.find((o) => o.id === p.observador)?.nombre ?? p.observador
                  const color = getObsColor(p.observador, observadores)
                  return (
                    <div
                      key={p.id}
                      className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden"
                      style={{ borderLeftWidth: 4, borderLeftColor: color }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-800 break-words">
                          {p.local} <span className="text-gray-400 font-normal">vs</span> {p.visitante}
                        </div>
                        <div className="text-gray-500 text-xs mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-700">{p.hora}</span>
                          {p.categoria && (
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[11px] font-medium">{p.categoria}</span>
                          )}
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {obsNombre}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePartido(p.id)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 transition-colors"
                        title="Eliminar partido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pie modal: añadir partido */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { setDayModalOpen(false); setFormOpen(true) }}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir partido a este día
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
