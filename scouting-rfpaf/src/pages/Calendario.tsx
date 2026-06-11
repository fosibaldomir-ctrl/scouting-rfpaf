import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays } from 'lucide-react'
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
import type { PartidoCalendario } from '../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon = 0
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

const EMPTY_FORM = { observador: '', local: '', visitante: '', hora: '12:00' }

export default function Calendario() {
  const { observadores, clubes, partidos, addPartido, deletePartido } = useStore()

  const today = new Date()
  const todayYMD = toYMD(today)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const calDays = useMemo(() => getCalendarDays(year, month), [year, month])

  const partidosByDate = useMemo(() => {
    const map: Record<string, PartidoCalendario[]> = {}
    partidos.forEach((p) => {
      ;(map[p.fecha] ??= []).push(p)
    })
    return map
  }, [partidos])

  const selectedPartidos = partidosByDate[selectedDate] ?? []

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
    if (!form.local) errs.local = true
    if (!form.visitante) errs.visitante = true
    if (!form.hora) errs.hora = true
    if (Object.keys(errs).length) { setErrors(errs); return }

    addPartido({
      id: crypto.randomUUID(),
      fecha: selectedDate,
      hora: form.hora,
      local: form.local,
      visitante: form.visitante,
      observador: form.observador,
    })
    setForm(EMPTY_FORM)
  }

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    partidos.forEach((p) => { counts[p.observador] = (counts[p.observador] ?? 0) + 1 })
    const obs = observadores.filter((o) => counts[o.id])
    return {
      labels: obs.map((o) => o.nombre),
      datasets: [{
        label: 'Partidos asignados',
        data: obs.map((o) => counts[o.id] ?? 0),
        backgroundColor: '#1a3a6b',
        borderRadius: 6,
      }],
    }
  }, [partidos, observadores])

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue flex items-center gap-2">
          <CalendarDays className="w-6 h-6" />
          Calendario de Partidos
        </h1>
        <p className="text-gray-500 text-sm">Asigna partidos a observadores</p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendario */}
        <div className="lg:col-span-2 card p-4">
          {/* Nav mes */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-base font-bold text-rfpaf-blue">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

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
              const dayPartidos = partidosByDate[ymd] ?? []

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(ymd)}
                  className={`min-h-14 rounded-lg p-1 text-xs flex flex-col items-center transition-all border ${
                    isSelected
                      ? 'bg-rfpaf-blue text-white border-rfpaf-blue shadow-md'
                      : isToday
                      ? 'border-rfpaf-blue text-rfpaf-blue font-bold bg-blue-50'
                      : current
                      ? 'border-transparent hover:bg-gray-50 text-gray-700'
                      : 'border-transparent text-gray-300 cursor-default'
                  }`}
                >
                  <span className="font-semibold leading-none mt-1">{date.getDate()}</span>
                  {dayPartidos.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1.5 justify-center">
                      {dayPartidos.slice(0, 3).map((_, pi) => (
                        <span
                          key={pi}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-rfpaf-red'}`}
                        />
                      ))}
                      {dayPartidos.length > 3 && (
                        <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-rfpaf-red'}`}>
                          +{dayPartidos.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          {/* Formulario */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-700">
              Nuevo partido
              <span className="block text-rfpaf-blue font-normal mt-0.5">{selectedLabel}</span>
            </h3>

            <div>
              <label className="form-label">Observador *</label>
              <select
                className={`form-select ${errors.observador ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                value={form.observador}
                onChange={(e) => setField('observador', e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {observadores.map((o) => (
                  <option key={o.id} value={o.id}>{o.nombre}</option>
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

          {/* Partidos del día */}
          {selectedPartidos.length > 0 && (
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-bold text-gray-700">
                Partidos · {selectedLabel}
              </h3>
              {selectedPartidos
                .slice()
                .sort((a, b) => a.hora.localeCompare(b.hora))
                .map((p) => {
                  const obsNombre = observadores.find((o) => o.id === p.observador)?.nombre ?? p.observador
                  return (
                    <div
                      key={p.id}
                      className="flex items-start justify-between gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="text-xs leading-relaxed min-w-0">
                        <div className="font-semibold text-gray-800 truncate">
                          {p.local} <span className="text-gray-400 font-normal">vs</span> {p.visitante}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {p.hora} · <span className="text-rfpaf-blue font-medium">{obsNombre}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePartido(p.id)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-700 mb-4">Partidos por Observador</h2>
        {partidos.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            Sin partidos asignados aún
          </div>
        ) : (
          <div className="h-52">
            <Bar
              data={chartData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                  },
                  x: { ticks: { font: { size: 11 } } },
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
