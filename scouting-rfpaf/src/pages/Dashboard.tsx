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
import { PlusCircle, Users, Calendar, Trophy, TrendingUp, Eye } from 'lucide-react'
import { useStore } from '../store/useStore'
import { PROPUESTAS } from '../data/masterData'
import type { FichaJugadora } from '../types'

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement
)


function PropuestaBadge({ propuesta }: { propuesta: string }) {
  const map: Record<string, string> = {
    'SELECCIÓN': 'badge-seleccion',
    'INCORPORAR': 'badge-incorporar',
    'SEGUIR': 'badge-seguir',
    'DESCARTAR': 'badge-descartar',
  }
  return <span className={map[propuesta] ?? 'badge-seguir'}>{propuesta}</span>
}

function getClubEscudo(clubName: string, clubes: any[]): string | null {
  const club = clubes.find((c) => c.nombre === clubName)
  return club?.escudo ?? null
}

export default function Dashboard() {
  const { fichas, observadores, currentObservador, clubes, eventos, addEvento, deleteEvento } = useStore()
  const navigate = useNavigate()
  const obs = observadores.find((o) => o.id === currentObservador)

  const stats = useMemo(() => {
    const byPropuesta = PROPUESTAS.reduce((acc, p) => {
      acc[p.value] = fichas.filter((f) => f.propuesta === p.value).length
      return acc
    }, {} as Record<string, number>)

    const byDemarcacion = fichas.reduce((acc, f) => {
      acc[f.demarcacion] = (acc[f.demarcacion] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const partidos = new Set(fichas.map((f) => `${f.fechaPartido}-${f.local}-${f.visitante}`)).size
    const categorias = new Set(fichas.map((f) => f.categoria)).size

    return { byPropuesta, byDemarcacion, partidos, categorias }
  }, [fichas])

  const doughnutData = {
    labels: PROPUESTAS.map((p) => p.label),
    datasets: [{
      data: PROPUESTAS.map((p) => stats.byPropuesta[p.value] || 0),
      backgroundColor: ['#16a34a', '#2563eb', '#ca8a04', '#dc2626'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  const demarcLabels = Object.keys(stats.byDemarcacion)
  const barData = {
    labels: demarcLabels,
    datasets: [{
      label: 'Jugadoras',
      data: demarcLabels.map((d) => stats.byDemarcacion[d]),
      backgroundColor: '#1a3a6b',
      borderRadius: 6,
    }],
  }

  const ultimas = [...fichas].sort(
    (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
  ).slice(0, 5)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue">Dashboard</h1>
          <p className="text-gray-500 text-sm truncate">Bienvenido, {obs?.nombre}</p>
        </div>
        <button
          onClick={() => navigate('/nueva-ficha')}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Ficha</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Fichas Totales', value: fichas.length, color: 'bg-blue-50 text-rfpaf-blue' },
          { icon: Calendar, label: 'Partidos', value: stats.partidos, color: 'bg-green-50 text-green-700' },
          { icon: Trophy, label: 'Categorías', value: stats.categorias, color: 'bg-yellow-50 text-yellow-700' },
          { icon: TrendingUp, label: 'Para Selección', value: stats.byPropuesta['SELECCIÓN'] || 0, color: 'bg-red-50 text-rfpaf-red' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-4">Propuestas</h2>
          {fichas.length > 0 ? (
            <div className="h-48 flex items-center justify-center">
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin datos aún
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-4">Jugadoras por Demarcación</h2>
          {fichas.length > 0 ? (
            <div className="h-48">
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { ticks: { font: { size: 10 } } } },
                }}
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin datos aún
            </div>
          )}
        </div>
      </div>

      {/* Agenda Semanal */}
      <CalendarioSemanal
        eventos={eventos}
        onAdd={async (ev) => {
          const saved = await createEvento(ev)
          if (saved) addEvento(saved as any)
        }}
        onDelete={async (id) => {
          const ok = await deleteEventoDB(id)
          if (ok) deleteEvento(id)
        }}
      />

      {/* Últimas fichas */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-700">Últimas Fichas</h2>
          <button
            onClick={() => navigate('/base-datos')}
            className="text-rfpaf-blue text-sm hover:underline"
          >
            Ver todas
          </button>
        </div>
        {ultimas.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400">No hay fichas registradas aún.</p>
            <button
              onClick={() => navigate('/nueva-ficha')}
              className="btn-primary mt-3 text-sm"
            >
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
                      <td className="py-3 pr-4 text-gray-600">{f.categoria}</td>
                      <td className="py-3 pr-4 text-gray-600">{f.demarcacion}</td>
                      <td className="py-3 pr-4">
                        <PropuestaBadge propuesta={f.propuesta} />
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => navigate(`/ficha/${f.id}`)}
                          className="text-rfpaf-blue hover:text-rfpaf-blue-light"
                        >
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
