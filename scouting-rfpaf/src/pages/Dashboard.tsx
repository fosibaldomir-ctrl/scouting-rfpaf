import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import CalendarioSemanal from '../components/CalendarioSemanal'
import { createEvento, deleteEvento as deleteEventoDB } from '../lib/supabase'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'
import { PlusCircle, Users, Star, ClipboardCheck, TrendingUp, Eye, ChevronRight, CalendarDays } from 'lucide-react'
import { useStore } from '../store/useStore'
import { PROPUESTAS } from '../data/masterData'
import type { FichaJugadora } from '../types'

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement
)

// Gris para las fichas que todavía no tiene ningún informe, igual que la
// etiqueta «Sin valorar» de las tarjetas de Base de Datos
const COLOR_SIN_VALORAR = '#94a3b8'

// Colores de propuesta, alineados con los badges de la app
const PROPUESTA_COLOR: Record<string, string> = {
  'SELECCIÓN': '#16a34a',
  'INCORPORAR': '#2563eb',
  'SEGUIR': '#eab308',
  'DESCARTAR': '#dc2626',
}

// Agrupación de demarcaciones por líneas (mismo criterio y colores que el Campograma)
const LINEAS = [
  { label: 'Porteras', color: '#7c3aed', positions: ['PORTERO'] },
  { label: 'Defensas', color: '#1d4ed8', positions: ['LATERAL', 'CENTRAL'] },
  { label: 'Medias', color: '#0369a1', positions: ['MEDIO CENTRO DEF.', 'MEDIO CENTRO OF.', 'INTERIOR', 'MEDIA PUNTA'] },
  { label: 'Extremas', color: '#b45309', positions: ['EXTERIOR'] },
  { label: 'Delanteras', color: '#be123c', positions: ['DELANTERO'] },
]

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function PropuestaBadge({ propuesta, sinValorar }: { propuesta: string; sinValorar?: boolean }) {
  if (sinValorar) {
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        Sin valorar
      </span>
    )
  }
  const map: Record<string, string> = {
    'SELECCIÓN': 'badge-seleccion',
    'INCORPORAR': 'badge-incorporar',
    'SEGUIR': 'badge-seguir',
    'DESCARTAR': 'badge-descartar',
  }
  return <span className={map[propuesta] ?? 'badge-seguir'}>{propuesta}</span>
}

function getClubEscudo(clubName: string, clubes: { nombre: string; escudo?: string | null }[]): string | null {
  return clubes.find((c) => c.nombre === clubName)?.escudo ?? null
}

function Stars({ value }: { value: number }) {
  const v = Math.round(value)
  return (
    <span className="whitespace-nowrap text-yellow-400 text-sm">
      {'★'.repeat(v)}<span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - v))}</span>
    </span>
  )
}

export default function Dashboard() {
  const { fichas, observadores, currentObservador, clubes, eventos, partidos, addEvento, deleteEvento } = useStore()
  const navigate = useNavigate()
  const obs = observadores.find((o) => o.id === currentObservador)

  const now = new Date()
  const fechaRaw = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const fechaLarga = fechaRaw.charAt(0).toUpperCase() + fechaRaw.slice(1)

  const stats = useMemo(() => {
    /* Una ficha sin informes lleva «SEGUIR» de arranque, que es solo el valor
     * por defecto del formulario: contarla como propuesta de seguimiento
     * hinchaba esa porción con jugadoras que nadie ha visto todavía. Aquí se
     * reparten solo las valoradas y las demás van a su propia porción. */
    const conInforme = fichas.filter((f) => (f.valoraciones?.length ?? 0) > 0)
    const byPropuesta = PROPUESTAS.reduce((acc, p) => {
      acc[p.value] = conInforme.filter((f) => f.propuesta === p.value).length
      return acc
    }, {} as Record<string, number>)
    const sinValorar = fichas.length - conInforme.length

    const lineas = LINEAS.map((l) => ({
      ...l,
      count: fichas.filter((f) => l.positions.includes(f.demarcacion)).length,
    }))

    const partidos = new Set(fichas.map((f) => `${f.fechaPartido}-${f.local}-${f.visitante}`)).size

    const hace7 = Date.now() - 7 * 86400000
    const nuevasSemana = fichas.filter((f) => new Date(f.creadoEn).getTime() >= hace7).length

    const valoradas = fichas.filter((f) => (f.valoraciones?.length ?? 0) > 0)
    const valMedia = valoradas.length
      ? valoradas.reduce((a, f) => a + (f.valoracionGeneral || 0), 0) / valoradas.length
      : 0
    const totalValoraciones = fichas.reduce((a, f) => a + (f.valoraciones?.length ?? 0), 0)

    return { byPropuesta, sinValorar, lineas, partidos, nuevasSemana, valMedia, valoradas: valoradas.length, totalValoraciones }
  }, [fichas])

  const doughnutData = {
    labels: [...PROPUESTAS.map((p) => p.label), 'SIN VALORAR'],
    datasets: [{
      data: [...PROPUESTAS.map((p) => stats.byPropuesta[p.value] || 0), stats.sinValorar],
      backgroundColor: [...PROPUESTAS.map((p) => PROPUESTA_COLOR[p.value]), COLOR_SIN_VALORAR],
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 6,
    }],
  }

  const barData = {
    labels: stats.lineas.map((l) => l.label),
    datasets: [{
      label: 'Jugadoras',
      data: stats.lineas.map((l) => l.count),
      backgroundColor: stats.lineas.map((l) => l.color),
      borderRadius: 6,
      maxBarThickness: 54,
    }],
  }

  // Bloques de valor
  const proximosPartidos = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return [...partidos]
      .filter((p) => new Date(`${p.fecha}T00:00:00`) >= hoy)
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))
      .slice(0, 5)
  }, [partidos])

  const ultimasValoraciones = useMemo(() =>
    fichas
      .flatMap((f) => (f.valoraciones ?? []).map((v) => ({ v, f })))
      .sort((a, b) => new Date(b.v.creadoEn || b.v.fechaPartido).getTime() - new Date(a.v.creadoEn || a.v.fechaPartido).getTime())
      .slice(0, 5),
  [fichas])

  const ultimas = [...fichas]
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
    .slice(0, 5)

  const totalFichas = fichas.length
  const paraSeleccion = stats.byPropuesta['SELECCIÓN'] || 0

  const kpis = [
    { icon: Users, label: 'Fichas en base de datos', value: totalFichas,
      sub: stats.nuevasSemana > 0 ? `+${stats.nuevasSemana} esta semana` : 'Sin altas esta semana',
      color: '#1a3a6b', bg: 'bg-blue-50', to: '/base-datos' },
    { icon: TrendingUp, label: 'Propuestas para Selección', value: paraSeleccion,
      sub: `${stats.partidos} partidos observados`,
      color: '#16a34a', bg: 'bg-green-50', to: '/base-datos?propuesta=SELECCIÓN' },
    { icon: Star, label: 'Valoración media', value: stats.valMedia ? stats.valMedia.toFixed(1) : '—',
      sub: `${stats.valoradas} jugadoras valoradas`,
      color: '#ca8a04', bg: 'bg-yellow-50', to: '/base-datos' },
    { icon: ClipboardCheck, label: 'Valoraciones registradas', value: stats.totalValoraciones,
      sub: `${observadores.length} observadores`,
      color: '#c0392b', bg: 'bg-red-50', to: '/base-datos' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Hero ── */}
      <div className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: 'linear-gradient(120deg, #1a3a6b 0%, #2e4d8f 55%, #c0392b 140%)' }}>
        <div className="px-5 sm:px-7 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            {obs?.foto ? (
              <img src={obs.foto} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/40 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {obs?.nombre?.charAt(0) ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium">{fechaLarga} · Semana {isoWeek(now)}</p>
              <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight truncate">
                Hola, {obs?.nombre ?? 'observador'}
              </h1>
              <p className="text-white/80 text-sm mt-0.5">
                {totalFichas === 0
                  ? 'Empieza registrando la primera jugadora.'
                  : <><strong className="text-white">{totalFichas}</strong> jugadoras en base de datos · <strong className="text-white">{paraSeleccion}</strong> propuestas para Selección</>}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/nueva-ficha')}
            className="flex items-center gap-2 bg-white text-rfpaf-blue font-bold px-4 py-2.5 rounded-xl shadow hover:bg-blue-50 transition-colors flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Ficha
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, sub, color, bg, to }) => (
          <button key={label} onClick={() => navigate(to)}
            className="card text-left flex flex-col gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`} style={{ color }}>
                <Icon className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
              <p className="text-xs font-semibold text-gray-600 mt-1 leading-tight">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Gráficas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-4">Propuestas</h2>
          {totalFichas > 0 ? (
            <div className="h-52 relative flex items-center justify-center">
              <Doughnut
                data={doughnutData}
                options={{
                  maintainAspectRatio: false,
                  cutout: '68%',
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { size: 11 } } },
                    tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 },
                  },
                }}
              />
              {/* Total en el centro del anillo */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 44 }}>
                <span className="text-3xl font-bold text-gray-800 leading-none">{totalFichas}</span>
                <span className="text-[11px] text-gray-400 uppercase tracking-wide">fichas</span>
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos aún</div>
          )}
        </div>
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-4">Jugadoras por línea</h2>
          {totalFichas > 0 ? (
            <div className="h-52">
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 10, cornerRadius: 8 } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 } } },
                    y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } }, grid: { color: '#eef2f7' } },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos aún</div>
          )}
        </div>
      </div>

      {/* ── Bloques de valor ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos partidos */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-rfpaf-blue" /> Próximos partidos
            </h2>
            <button onClick={() => navigate('/calendario')} className="text-rfpaf-blue text-sm hover:underline">
              Calendario
            </button>
          </div>
          {proximosPartidos.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400 mb-2">No hay partidos programados.</p>
              <button onClick={() => navigate('/calendario')} className="text-rfpaf-blue text-sm font-semibold hover:underline">
                Programar en el Calendario
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {proximosPartidos.map((pt) => {
                const o = observadores.find((ob) => ob.id === pt.observador)
                const escLocal = getClubEscudo(pt.local, clubes)
                const escVis = getClubEscudo(pt.visitante, clubes)
                const d = new Date(`${pt.fecha}T00:00:00`)
                return (
                  <li key={pt.id}>
                    <button onClick={() => navigate('/calendario')}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors">
                      {/* Chip de fecha */}
                      <div className="flex-shrink-0 w-11 rounded-lg bg-blue-50 text-rfpaf-blue text-center py-1 leading-none">
                        <div className="text-base font-bold">{d.getDate()}</div>
                        <div className="text-[9px] uppercase font-semibold">{d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
                          {escLocal && <img src={escLocal} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                          <span className="truncate">{pt.local}</span>
                          <span className="text-gray-400 font-normal">·</span>
                          {escVis && <img src={escVis} alt="" className="w-4 h-4 object-contain flex-shrink-0" />}
                          <span className="truncate">{pt.visitante}</span>
                        </p>
                        <p className="text-xs text-gray-400 truncate">{pt.hora} · {pt.categoria}</p>
                      </div>
                      {o && (
                        o.foto
                          ? <img src={o.foto} alt={o.nombre} title={o.nombre} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          : <div title={o.nombre} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">{o.nombre.charAt(0)}</div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Últimas valoraciones */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-3">Últimas valoraciones</h2>
          {ultimasValoraciones.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Aún no hay valoraciones registradas.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {ultimasValoraciones.map(({ v, f }, i) => {
                const o = observadores.find((ob) => ob.id === v.observador)
                return (
                  <li key={f.id + '-' + i}>
                    <button onClick={() => navigate(`/ficha/${f.id}`)}
                      className="w-full flex items-center gap-3 py-2 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{f.nombre} {f.primerApellido}</p>
                        <p className="text-xs text-gray-400 truncate inline-flex items-center gap-1">
                          {o?.foto && <img src={o.foto} alt="" className="w-4 h-4 rounded-full object-cover" />}
                          {o?.nombre ?? v.observador ?? '—'} · {new Date(v.fechaPartido).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <Stars value={v.valoracionGeneral} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Agenda ── */}
      <CalendarioSemanal
        eventos={eventos}
        onAdd={async (ev) => {
          const saved = await createEvento(ev)
          if (saved) addEvento(saved as Parameters<typeof addEvento>[0])
        }}
        onDelete={async (id) => {
          const ok = await deleteEventoDB(id)
          if (ok) deleteEvento(id)
        }}
      />

      {/* ── Últimas fichas ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-700">Últimas fichas</h2>
          <button onClick={() => navigate('/base-datos')} className="text-rfpaf-blue text-sm hover:underline">
            Ver todas
          </button>
        </div>
        {ultimas.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400">No hay fichas registradas aún.</p>
            <button onClick={() => navigate('/nueva-ficha')} className="btn-primary mt-3 text-sm">
              Registrar primera ficha
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  {['Fecha', 'Jugadora', 'Club', 'Categoría', 'Demarcación', 'Propuesta', ''].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimas.map((f: FichaJugadora) => {
                  const escudo = getClubEscudo(f.equipo, clubes)
                  return (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4 text-gray-600">{new Date(f.fechaPartido).toLocaleDateString('es-ES')}</td>
                      <td className="py-3 pr-4 font-medium whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {f.foto ? (
                            <img src={f.foto} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                              {f.nombre.charAt(0)}{f.primerApellido.charAt(0)}
                            </div>
                          )}
                          <span>{f.nombre} {f.primerApellido}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {escudo && <img src={escudo} alt="" className="w-5 h-5 object-contain rounded-sm flex-shrink-0" />}
                          <span>{f.equipo}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{f.categoriaEquipo || f.categoria}</td>
                      <td className="py-3 pr-4 text-gray-600">{f.demarcacion}</td>
                      <td className="py-3 pr-4">
                        <PropuestaBadge propuesta={f.propuesta} sinValorar={(f.valoraciones?.length ?? 0) === 0} />
                      </td>
                      <td className="py-3">
                        <button onClick={() => navigate(`/ficha/${f.id}`)} className="text-rfpaf-blue hover:text-rfpaf-blue-light">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
