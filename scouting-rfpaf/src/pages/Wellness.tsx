import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Heart, Activity, AlertTriangle, Trash2, X, Check, ChevronRight, ClipboardList, TrendingUp, CalendarDays, Clock, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ZonaCuerpo, GravedadLesion, EstadoLesion, RegistroLesion, RegistroRPE } from '../types'
import { bodyFront, bodyBack, type BodyPart, type BodySlug } from '../data/bodyPaths'

// ─── Mapa muscular vectorial ────────────────────────────────────────────────────
// Cuerpo muscular (react-native-body-highlighter, MIT). Cada músculo se rellena de
// color cuando la zona correspondiente tiene una lesión activa.
// viewBox frontal "0 0 724 1448" · posterior "724 0 724 1448".

const ZONE_LABELS: Record<ZonaCuerpo, string> = {
  cabeza: 'Cabeza',
  cuello: 'Cuello/Cervical',
  hombro_izq: 'Hombro Izq.',
  hombro_der: 'Hombro Der.',
  pecho: 'Pecho',
  abdomen: 'Abdomen',
  espalda_alta: 'Espalda Alta',
  espalda_baja: 'Lumbar/Espalda Baja',
  brazo_izq: 'Brazo Izq.',
  brazo_der: 'Brazo Der.',
  antebrazo_izq: 'Antebrazo Izq.',
  antebrazo_der: 'Antebrazo Der.',
  mano_izq: 'Mano Izq.',
  mano_der: 'Mano Der.',
  cadera_izq: 'Cadera/Ingle Izq.',
  cadera_der: 'Cadera/Ingle Der.',
  gluteo_izq: 'Glúteo Izq.',
  gluteo_der: 'Glúteo Der.',
  muslo_izq: 'Muslo Izq.',
  muslo_der: 'Muslo Der.',
  rodilla_izq: 'Rodilla Izq.',
  rodilla_der: 'Rodilla Der.',
  gemelo_izq: 'Gemelo/Pierna Izq.',
  gemelo_der: 'Gemelo/Pierna Der.',
  tobillo_izq: 'Tobillo Izq.',
  tobillo_der: 'Tobillo Der.',
  pie_izq: 'Pie Izq.',
  pie_der: 'Pie Der.',
  talon_izq: 'Talón Izq.',
  talon_der: 'Talón Der.',
}

// Lado anatómico del sujeto a partir del lado dibujado en el SVG.
// FRONTAL: el lado dibujado a la izquierda es el lado DERECHO del sujeto (espejo).
// POSTERIOR: coincide (izquierda dibujada = izquierda del sujeto).
function subjSuffix(view: 'front' | 'back', side?: 'left' | 'right'): '' | '_izq' | '_der' {
  if (!side) return ''
  if (view === 'front') return side === 'left' ? '_der' : '_izq'
  return side === 'left' ? '_izq' : '_der'
}

// Mapea (vista, músculo, lado) → zona de lesión. Devuelve null si no aplica.
function zoneFor(view: 'front' | 'back', slug: BodySlug | undefined, side?: 'left' | 'right'): ZonaCuerpo | null {
  if (!slug) return null
  const s = subjSuffix(view, side)
  const paired = (base: string): ZonaCuerpo => (s ? `${base}${s}` : `${base}_izq`) as ZonaCuerpo
  if (view === 'front') {
    switch (slug) {
      case 'head': case 'hair':   return 'cabeza'
      case 'neck': case 'trapezius': return 'cuello'
      case 'chest':               return 'pecho'
      case 'abs': case 'obliques':return 'abdomen'
      case 'deltoids':            return paired('hombro')
      case 'biceps': case 'triceps': return paired('brazo')
      case 'forearm':             return paired('antebrazo')
      case 'hands':               return paired('mano')
      case 'adductors':           return paired('cadera')
      case 'quadriceps':          return paired('muslo')
      case 'knees':               return paired('rodilla')
      case 'tibialis': case 'calves': return paired('gemelo')
      case 'ankles':              return paired('tobillo')
      case 'feet':                return paired('pie')
      default:                    return null
    }
  }
  switch (slug) {
    case 'head': case 'hair':     return 'cabeza'
    case 'neck':                  return 'cuello'
    case 'trapezius': case 'upper-back': return 'espalda_alta'
    case 'lower-back':            return 'espalda_baja'
    case 'deltoids':              return paired('hombro')
    case 'triceps':               return paired('brazo')
    case 'forearm':               return paired('antebrazo')
    case 'hands':                 return paired('mano')
    case 'gluteal':               return paired('gluteo')
    case 'hamstring': case 'adductors': return paired('muslo')
    case 'calves':                return paired('gemelo')
    case 'ankles':                return paired('tobillo')
    case 'feet':                  return paired('talon')
    default:                      return null
  }
}

// Color sólido del músculo según la peor lesión activa de la zona (null = sin lesión).
function getZoneFill(zoneId: ZonaCuerpo, lesiones: RegistroLesion[]): string | null {
  const active = lesiones.filter(l => l.zonas.includes(zoneId) && l.estado !== 'alta')
  if (!active.length) return null
  const rank: Record<GravedadLesion, number> = { grave: 3, moderada: 2, leve: 1 }
  const worst = [...active].sort((a, b) => rank[b.gravedad] - rank[a.gravedad])[0]
  if (worst.estado === 'recuperandose') return '#22c55e'
  if (worst.gravedad === 'grave')       return '#ef4444'
  if (worst.gravedad === 'moderada')    return '#f97316'
  return '#eab308'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RPE_INFO: Record<number, { label: string }> = {
  1: { label: 'Muy leve' },
  2: { label: 'Leve' },
  3: { label: 'Moderado' },
  4: { label: 'Algo intenso' },
  5: { label: 'Intenso' },
  6: { label: 'Muy intenso' },
  7: { label: 'Muy duro' },
  8: { label: 'Durísimo' },
  9: { label: 'Casi máximo' },
  10: { label: 'Máximo absoluto' },
}

function rpeBgClass(rpe: number) {
  if (rpe <= 2) return 'bg-green-500'
  if (rpe <= 4) return 'bg-lime-500'
  if (rpe <= 6) return 'bg-yellow-500'
  if (rpe <= 8) return 'bg-orange-500'
  return 'bg-red-500'
}

function rpeTextClass(rpe: number) {
  if (rpe <= 2) return 'text-green-700'
  if (rpe <= 4) return 'text-lime-700'
  if (rpe <= 6) return 'text-yellow-700'
  if (rpe <= 8) return 'text-orange-700'
  return 'text-red-700'
}

// ─── Body muscular vectorial ────────────────────────────────────────────────────

const BASE_MUSCLE = '#d6dae0'   // gris músculo en reposo
const BASE_STROKE = '#9aa1ab'   // contorno
const HOVER_FILL  = '#93c5fd'   // azul claro al pasar el ratón

function MuscleBody({
  view,
  lesiones,
  onZoneClick,
  colorFor,
  height = 470,
}: {
  view: 'front' | 'back'
  lesiones: RegistroLesion[]
  onZoneClick?: (zoneId: ZonaCuerpo, label: string) => void
  colorFor?: (zone: ZonaCuerpo) => string | null
  height?: number
}) {
  const [hoverZone, setHoverZone] = useState<ZonaCuerpo | null>(null)
  const parts: BodyPart[] = view === 'front' ? bodyFront : bodyBack
  const viewBox = view === 'front' ? '0 0 724 1448' : '724 0 724 1448'

  return (
    <div className="relative select-none flex flex-col items-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {view === 'front' ? 'Frontal' : 'Posterior'}
      </p>
      {hoverZone && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2.5 py-1 rounded-md z-20 whitespace-nowrap pointer-events-none shadow-xl border border-gray-700">
          {ZONE_LABELS[hoverZone]}
        </div>
      )}

      <svg viewBox={viewBox} style={{ height, maxHeight: '58vh', width: 'auto', maxWidth: '100%' }}>
        {parts.map((part, pi) => {
          const segs: { d: string; side?: 'left' | 'right' }[] = []
          part.path?.common?.forEach(d => segs.push({ d }))
          part.path?.left?.forEach(d => segs.push({ d, side: 'left' }))
          part.path?.right?.forEach(d => segs.push({ d, side: 'right' }))
          return segs.map((seg, si) => {
            const zone = zoneFor(view, part.slug, seg.side)
            const injuryFill = zone ? (colorFor ? colorFor(zone) : getZoneFill(zone, lesiones)) : null
            const isHover = zone !== null && zone === hoverZone
            const fill = injuryFill ?? (isHover ? HOVER_FILL : BASE_MUSCLE)
            return (
              <path
                key={`${pi}-${si}`}
                d={seg.d}
                fill={fill}
                stroke={BASE_STROKE}
                strokeWidth={0.9}
                style={{ cursor: zone ? 'pointer' : 'default', transition: 'fill .12s' }}
                onMouseEnter={() => zone && setHoverZone(zone)}
                onMouseLeave={() => setHoverZone(null)}
                onClick={() => zone && onZoneClick?.(zone, ZONE_LABELS[zone])}
              >
                {zone && <title>{ZONE_LABELS[zone]}</title>}
              </path>
            )
          })
        })}
      </svg>
    </div>
  )
}

// ─── RPE Tab ─────────────────────────────────────────────────────────────────

function RPETab() {
  const { fichas, registrosRPE, addRegistroRPE, deleteRegistroRPE } = useStore()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    jugadoraNombre: '',
    fecha: today,
    rpe: 0,
    minutos: 90,
    notas: '',
  })
  const [filterPlayer, setFilterPlayer] = useState('')

  const jugadoras = fichas.map(f => `${f.nombre} ${f.primerApellido}`)

  function handleSave() {
    if (!form.jugadoraNombre.trim() || form.rpe === 0) return
    const r: RegistroRPE = {
      id: uuidv4(),
      jugadoraNombre: form.jugadoraNombre.trim(),
      fecha: form.fecha,
      rpe: form.rpe,
      minutos: form.minutos,
      cargaTotal: form.rpe * form.minutos,
      notas: form.notas,
      creadoEn: new Date().toISOString(),
    }
    addRegistroRPE(r)
    setForm({ jugadoraNombre: '', fecha: today, rpe: 0, minutos: 90, notas: '' })
  }

  const filteredRPE = registrosRPE.filter(r =>
    !filterPlayer || r.jugadoraNombre.toLowerCase().includes(filterPlayer.toLowerCase())
  )

  const weeklyLoads = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const byPlayer: Record<string, { total: number; sessions: number; rpeSum: number }> = {}
    registrosRPE
      .filter(r => new Date(r.fecha) >= cutoff)
      .forEach(r => {
        if (!byPlayer[r.jugadoraNombre]) byPlayer[r.jugadoraNombre] = { total: 0, sessions: 0, rpeSum: 0 }
        byPlayer[r.jugadoraNombre].total += r.cargaTotal
        byPlayer[r.jugadoraNombre].sessions += 1
        byPlayer[r.jugadoraNombre].rpeSum += r.rpe
      })
    return Object.entries(byPlayer)
      .map(([name, d]) => ({ name, total: d.total, sessions: d.sessions, avgRPE: Math.round((d.rpeSum / d.sessions) * 10) / 10 }))
      .sort((a, b) => b.total - a.total)
  }, [registrosRPE])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-rfpaf-blue" />
            Nuevo Registro RPE
          </h3>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jugadora</label>
            <input
              list="rpe-jugadoras"
              value={form.jugadoraNombre}
              onChange={e => setForm(f => ({ ...f, jugadoraNombre: e.target.value }))}
              placeholder="Nombre jugadora..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
            />
            <datalist id="rpe-jugadoras">
              {jugadoras.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              RPE — Percepción del Esfuerzo
              {form.rpe > 0 && (
                <span className={`ml-2 font-semibold ${rpeTextClass(form.rpe)}`}>
                  {form.rpe} — {RPE_INFO[form.rpe].label}
                </span>
              )}
            </label>
            <div className="flex gap-1 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setForm(f => ({ ...f, rpe: n }))}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    form.rpe === n
                      ? `${rpeBgClass(n)} text-white shadow-md scale-110`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Minutos</label>
            <input
              type="number"
              min={1}
              max={300}
              value={form.minutos}
              onChange={e => setForm(f => ({ ...f, minutos: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
            />
          </div>

          {form.rpe > 0 && form.minutos > 0 && (
            <div className="bg-rfpaf-blue/5 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-600">Carga Total (UA)</span>
              <span className="text-lg font-bold text-rfpaf-blue">{form.rpe * form.minutos}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!form.jugadoraNombre.trim() || form.rpe === 0}
            className="w-full bg-rfpaf-blue text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-rfpaf-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Guardar RPE
          </button>
        </div>
      </div>

      {/* Summary + history */}
      <div className="lg:col-span-2 space-y-4">
        {weeklyLoads.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Carga Semanal (últimos 7 días)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left py-1.5 pr-4 font-medium">Jugadora</th>
                    <th className="text-center py-1.5 px-2 font-medium">Sesiones</th>
                    <th className="text-center py-1.5 px-2 font-medium">RPE medio</th>
                    <th className="text-right py-1.5 font-medium">Carga (UA)</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyLoads.map(row => (
                    <tr key={row.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2 pr-4 font-medium text-gray-800">{row.name}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{row.sessions}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold text-white ${rpeBgClass(Math.round(row.avgRPE))}`}>
                          {row.avgRPE}
                        </span>
                      </td>
                      <td className="py-2 text-right font-semibold text-rfpaf-blue">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="font-semibold text-gray-800 text-sm">Histórico ({filteredRPE.length})</h3>
            <input
              value={filterPlayer}
              onChange={e => setFilterPlayer(e.target.value)}
              placeholder="Filtrar jugadora..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 w-36 sm:w-44"
            />
          </div>

          {filteredRPE.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin registros aún</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredRPE.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg text-sm font-bold text-white flex items-center justify-center ${rpeBgClass(r.rpe)}`}>
                    {r.rpe}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.jugadoraNombre}</p>
                    <p className="text-xs text-gray-500">
                      {r.fecha} · {r.minutos}&nbsp;min ·{' '}
                      <span className="font-semibold text-rfpaf-blue">{r.cargaTotal}&nbsp;UA</span>
                    </p>
                    {r.notas && <p className="text-xs text-gray-400 truncate mt-0.5">{r.notas}</p>}
                  </div>
                  <button
                    onClick={() => deleteRegistroRPE(r.id)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Lesiones Tab ─────────────────────────────────────────────────────────────

const TIPOS_LESION = [
  'Muscular (desgarro/rotura)',
  'Muscular (elongación/contractura)',
  'Ligamentosa (esguince)',
  'Ligamentosa (rotura)',
  'Ósea (fractura)',
  'Ósea (fisura)',
  'Tendón (tendinitis/rotura)',
  'Articular (luxación)',
  'Contusión',
  'Sobrecarga',
  'Otro',
]

interface LesionForm {
  jugadoraNombre: string
  fechaInicio: string
  tipo: string
  gravedad: GravedadLesion
  diasBaja: number
  partidosPerdidos: number
  descripcion: string
}

const GRAVEDAD_BADGE: Record<GravedadLesion, string> = {
  leve:     'bg-yellow-100 text-yellow-700',
  moderada: 'bg-orange-100 text-orange-700',
  grave:    'bg-red-100 text-red-700',
}
const ESTADO_BADGE: Record<EstadoLesion, string> = {
  activa:        'bg-red-100 text-red-700',
  recuperandose: 'bg-green-100 text-green-700',
  alta:          'bg-gray-100 text-gray-500',
}
const ESTADO_LABEL: Record<EstadoLesion, string> = {
  activa:        'Activa',
  recuperandose: 'Recuperándose',
  alta:          'Alta médica',
}

function LesionesTab() {
  const { fichas, lesiones, addLesion, updateLesion, deleteLesion } = useStore()
  const [modal, setModal] = useState<{ open: boolean; zoneId: ZonaCuerpo | null; zoneLabel: string }>({
    open: false, zoneId: null, zoneLabel: '',
  })
  const [form, setForm] = useState<LesionForm>({
    jugadoraNombre: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    tipo: TIPOS_LESION[0],
    gravedad: 'leve',
    diasBaja: 0,
    partidosPerdidos: 0,
    descripcion: '',
  })
  const [showClosed, setShowClosed] = useState(false)

  const jugadoras = fichas.map(f => `${f.nombre} ${f.primerApellido}`)
  const activeLesiones = lesiones.filter(l => l.estado !== 'alta')
  const closedLesiones = lesiones.filter(l => l.estado === 'alta')

  function handleZoneClick(zoneId: ZonaCuerpo, zoneLabel: string) {
    setModal({ open: true, zoneId, zoneLabel })
    setForm({
      jugadoraNombre: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      tipo: TIPOS_LESION[0],
      gravedad: 'leve',
      diasBaja: 0,
      partidosPerdidos: 0,
      descripcion: '',
    })
  }

  function handleSave() {
    if (!modal.zoneId || !form.jugadoraNombre.trim()) return
    const l: RegistroLesion = {
      id: uuidv4(),
      jugadoraNombre: form.jugadoraNombre.trim(),
      fechaInicio: form.fechaInicio,
      zonas: [modal.zoneId],
      tipo: form.tipo,
      gravedad: form.gravedad,
      estado: 'activa',
      descripcion: form.descripcion,
      diasBaja: form.diasBaja,
      partidosPerdidos: form.partidosPerdidos,
      creadoEn: new Date().toISOString(),
    }
    addLesion(l)
    setModal({ open: false, zoneId: null, zoneLabel: '' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Body maps — front + back simultaneously */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Mapa Corporal</h3>
          <div className="grid grid-cols-2 gap-3">
            <MuscleBody view="front" lesiones={lesiones} onZoneClick={handleZoneClick}/>
            <MuscleBody view="back"  lesiones={lesiones} onZoneClick={handleZoneClick}/>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-400 text-center">Toca una zona para registrar lesión</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
              {[
                { color: 'bg-yellow-300', label: 'Leve' },
                { color: 'bg-orange-400', label: 'Moderada' },
                { color: 'bg-red-400',    label: 'Grave' },
                { color: 'bg-green-300',  label: 'Recuperando' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Injury list */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Lesiones Activas ({activeLesiones.length})
          </h3>
          {activeLesiones.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Sin lesiones activas</p>
          ) : (
            <div className="space-y-3">
              {activeLesiones.map(l => (
                <div key={l.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{l.jugadoraNombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {l.zonas.map(z => ZONE_LABELS[z]).join(', ')} · {l.tipo}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Desde {l.fechaInicio} · {l.diasBaja} días baja
                      </p>
                    </div>
                    <button
                      onClick={() => deleteLesion(l.id)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {l.descripcion && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">{l.descripcion}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${GRAVEDAD_BADGE[l.gravedad]}`}>
                      {l.gravedad}
                    </span>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200">
                      {(['activa', 'recuperandose', 'alta'] as EstadoLesion[]).map(estado => (
                        <button
                          key={estado}
                          onClick={() => updateLesion(l.id, {
                            estado,
                            ...(estado === 'alta' ? { fechaAlta: new Date().toISOString().split('T')[0] } : {}),
                          })}
                          className={`px-2.5 py-1 text-xs transition-all ${
                            l.estado === estado
                              ? `${ESTADO_BADGE[estado]} font-semibold`
                              : 'bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {ESTADO_LABEL[estado]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {closedLesiones.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <button
              onClick={() => setShowClosed(s => !s)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Lesiones con Alta ({closedLesiones.length})
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showClosed ? 'rotate-90' : ''}`} />
            </button>
            {showClosed && (
              <div className="mt-3 space-y-2">
                {closedLesiones.map(l => (
                  <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-600">{l.jugadoraNombre}</p>
                      <p className="text-xs text-gray-400">
                        {l.zonas.map(z => ZONE_LABELS[z]).join(', ')} · Alta: {l.fechaAlta ?? '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteLesion(l.id)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New injury modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">Nueva Lesión</h2>
                <p className="text-xs text-gray-500 mt-0.5">{modal.zoneLabel}</p>
              </div>
              <button
                onClick={() => setModal({ open: false, zoneId: null, zoneLabel: '' })}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jugadora *</label>
                <input
                  list="les-jugadoras"
                  value={form.jugadoraNombre}
                  onChange={e => setForm(f => ({ ...f, jugadoraNombre: e.target.value }))}
                  placeholder="Nombre..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
                />
                <datalist id="les-jugadoras">
                  {jugadoras.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de lesión</label>
                <input
                  type="date"
                  value={form.fechaInicio}
                  onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de lesión</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
                >
                  {TIPOS_LESION.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Gravedad</label>
                <div className="flex gap-2">
                  {(['leve', 'moderada', 'grave'] as GravedadLesion[]).map(g => (
                    <button
                      key={g}
                      onClick={() => setForm(f => ({ ...f, gravedad: g }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                        form.gravedad === g
                          ? g === 'leve'
                            ? 'bg-yellow-400 text-yellow-900'
                            : g === 'moderada'
                              ? 'bg-orange-500 text-white'
                              : 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Días de baja estimados</label>
                  <input
                    type="number"
                    min={0}
                    value={form.diasBaja}
                    onChange={e => setForm(f => ({ ...f, diasBaja: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Partidos perdidos</label>
                  <input
                    type="number"
                    min={0}
                    value={form.partidosPerdidos}
                    onChange={e => setForm(f => ({ ...f, partidosPerdidos: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (opcional)</label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Detalles de la lesión..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"
                />
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setModal({ open: false, zoneId: null, zoneLabel: '' })}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.jugadoraNombre.trim()}
                className="flex-1 bg-rfpaf-blue text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-rfpaf-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Guardar Lesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Historial / Ficha médica ───────────────────────────────────────────────────

const GRAVEDAD_COLOR: Record<GravedadLesion, string> = {
  leve: '#eab308', moderada: '#f97316', grave: '#ef4444',
}
const GRAVEDAD_NAME: Record<GravedadLesion, string> = {
  leve: 'Leve', moderada: 'Moderada', grave: 'Grave',
}

// Temporada de fútbol: comienza en julio (mes 6).
function seasonOf(dateStr: string): string {
  const d = new Date(dateStr)
  const start = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1
  return `${String(start).slice(2)}/${String(start + 1).slice(2)}`
}

function riskLabel(score: number): { label: string; color: string; bar: string } {
  if (score >= 2.5) return { label: 'Riesgo Máximo / Crítico', color: 'text-red-700', bar: 'bg-red-500' }
  if (score >= 1.8) return { label: 'Riesgo Alto / Elevado', color: 'text-orange-700', bar: 'bg-orange-500' }
  if (score >= 1.2) return { label: 'Riesgo Medio / Acumulable', color: 'text-yellow-700', bar: 'bg-yellow-500' }
  if (score >= 0.5) return { label: 'Riesgo Bajo', color: 'text-lime-700', bar: 'bg-lime-500' }
  return { label: 'Sin riesgo relevante', color: 'text-green-700', bar: 'bg-green-500' }
}

function KPI({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-gray-900'}`}>
        {value}{unit && <span className="text-sm font-semibold text-gray-400 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}

function RiskCard({ label, score }: { label: string; score: number }) {
  const info = riskLabel(score)
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-gray-600">{label}</span>
        <span className={`text-sm font-bold ${info.color}`}>{score.toFixed(2)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${info.bar}`} style={{ width: `${Math.min(100, (score / 3) * 100)}%` }} />
      </div>
      <p className={`text-[10px] mt-1 ${info.color}`}>{info.label}</p>
    </div>
  )
}

function HistorialTab() {
  const { fichas, lesiones } = useStore()
  const players = useMemo(
    () => Array.from(new Set(lesiones.map(l => l.jugadoraNombre))).sort(),
    [lesiones],
  )
  const [player, setPlayer] = useState('')
  const selected = player || players[0] || ''

  const stats = useMemo(() => {
    const data = lesiones.filter(l => l.jugadoraNombre === selected)
    if (!data.length) return null
    const sorted = [...data].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
    const total = data.length
    const totalDias = data.reduce((s, l) => s + (l.diasBaja || 0), 0)
    const totalPartidos = data.reduce((s, l) => s + (l.partidosPerdidos || 0), 0)
    const graves = data.filter(l => l.gravedad === 'grave').length
    const moderadas = data.filter(l => l.gravedad === 'moderada').length
    const leves = data.filter(l => l.gravedad === 'leve').length
    const mediaDias = Math.round(totalDias / total)
    const mayorPeriodo = Math.max(...data.map(l => l.diasBaja || 0))
    const nSeasons = new Set(data.map(l => seasonOf(l.fechaInicio))).size || 1

    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const g = (new Date(sorted[i].fechaInicio).getTime() - new Date(sorted[i - 1].fechaInicio).getTime()) / 86400000
      if (g >= 0) gaps.push(g)
    }
    const tiempoMedio = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0

    const porGravedad = (['grave', 'moderada', 'leve'] as GravedadLesion[]).map(g => {
      const arr = data.filter(l => l.gravedad === g)
      return { g, count: arr.length, dias: arr.reduce((s, l) => s + (l.diasBaja || 0), 0), pct: Math.round((arr.length / total) * 100) }
    })

    const tipoMap: Record<string, number> = {}
    data.forEach(l => { tipoMap[l.tipo] = (tipoMap[l.tipo] || 0) + 1 })
    const porTipo = Object.entries(tipoMap).map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count)

    const zonaCount: Partial<Record<ZonaCuerpo, number>> = {}
    const zonaDias: Partial<Record<ZonaCuerpo, number>> = {}
    data.forEach(l => l.zonas.forEach(z => {
      zonaCount[z] = (zonaCount[z] || 0) + 1
      zonaDias[z] = (zonaDias[z] || 0) + (l.diasBaja || 0)
    }))
    const zonaMasLes = (Object.entries(zonaCount) as [ZonaCuerpo, number][]).sort((a, b) => b[1] - a[1])[0] ?? null
    const zonaMasDias = (Object.entries(zonaDias) as [ZonaCuerpo, number][]).sort((a, b) => b[1] - a[1])[0] ?? null
    const nZonas = Object.keys(zonaCount).length

    const activa = data.find(l => l.estado !== 'alta')
    const estadoActual: EstadoLesion = activa ? activa.estado : 'alta'

    // Sub-scores de riesgo (0-3)
    const gravedadScore = (leves + moderadas * 2 + graves * 3) / total
    const disponibilidadScore = Math.min(3, (totalDias / nSeasons) / 60)
    const continuidadScore = tiempoMedio > 0 ? Math.min(3, 365 / tiempoMedio) : (total > 1 ? 1.5 : 0.5)
    const maxZona = zonaMasLes ? zonaMasLes[1] : 0
    const reincidenciaScore = Math.min(3, maxZona > 1 ? (maxZona - 1) + 0.8 : (total > 0 ? 0.4 : 0))
    const riskTotal = +((gravedadScore + disponibilidadScore + continuidadScore + reincidenciaScore) / 4).toFixed(2)

    return {
      data, sorted, total, totalDias, totalPartidos, graves, moderadas, leves,
      mediaDias, mayorPeriodo, nSeasons,
      lesionesPorTemp: +(total / nSeasons).toFixed(1),
      diasPorTemp: Math.round(totalDias / nSeasons),
      partidosPorTemp: Math.round(totalPartidos / nSeasons),
      tiempoMedio, porGravedad, porTipo, zonaCount, zonaMasLes, zonaMasDias, nZonas,
      estadoActual, gravedadScore, disponibilidadScore, continuidadScore, reincidenciaScore, riskTotal,
    }
  }, [lesiones, selected])

  const zonaColorFor = (z: ZonaCuerpo): string | null => {
    const c = stats?.zonaCount[z]
    if (!c) return null
    if (c >= 3) return '#dc2626'
    if (c === 2) return '#f97316'
    return '#facc15'
  }

  if (!players.length) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Aún no hay lesiones registradas. Registra lesiones en la pestaña «Lesiones» para generar la ficha médica.</p>
      </div>
    )
  }

  const risk = stats ? riskLabel(stats.riskTotal) : null
  const ficha = fichas.find(f => `${f.nombre} ${f.primerApellido}` === selected)

  // Cronología: rango de años
  const years = stats ? stats.data.map(l => new Date(l.fechaInicio).getFullYear()) : []
  const minY = years.length ? Math.min(...years) : new Date().getFullYear()
  const maxY = years.length ? Math.max(...years) + 1 : minY + 1
  const spanMs = new Date(`${maxY}-01-01`).getTime() - new Date(`${minY}-01-01`).getTime()

  return (
    <div className="space-y-5">
      {/* Cabecera jugadora + selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rfpaf-blue/10 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-rfpaf-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{selected}</h2>
          <p className="text-xs text-gray-500">
            {ficha ? `${ficha.demarcacion ?? ''}${ficha.club ? ' · ' + ficha.club : ''}`.trim() : 'Análisis individual · Ficha médica'}
          </p>
        </div>
        <select
          value={selected}
          onChange={e => setPlayer(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
        >
          {players.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {!stats ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400 text-sm">
          Sin datos para esta jugadora.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Lesiones totales" value={stats.total} accent="text-rfpaf-blue" />
            <KPI label="Días lesionada" value={stats.totalDias} unit="días" />
            <KPI label="Meses lesionada" value={(stats.totalDias / 30).toFixed(1)} unit="m" />
            <KPI label="Partidos perdidos" value={stats.totalPartidos} accent="text-rfpaf-red" />
          </div>

          {/* Riesgo global + sub-scores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-sm p-5 text-white flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-widest text-white/50 font-semibold">Riesgo según historial</p>
              <p className="text-4xl font-bold mt-1">{stats.riskTotal.toFixed(2)}<span className="text-lg text-white/40"> / 3</span></p>
              <p className={`text-sm font-semibold mt-1 ${risk!.color.replace('700', '300')}`}>{risk!.label}</p>
              <p className="text-[11px] text-white/50 mt-2 leading-snug">
                Índice compuesto de gravedad, disponibilidad, continuidad y reincidencia del historial de lesiones.
              </p>
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
              <RiskCard label="Gravedad" score={stats.gravedadScore} />
              <RiskCard label="Disponibilidad" score={stats.disponibilidadScore} />
              <RiskCard label="Continuidad sin lesiones" score={stats.continuidadScore} />
              <RiskCard label="Reincidencia" score={stats.reincidenciaScore} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda: estadísticas + gravedad + tipología */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rfpaf-blue" /> Resumen
                </h3>
                <StatCell label="Temporadas con lesiones" value={stats.nSeasons} />
                <StatCell label="Lesiones por temporada" value={stats.lesionesPorTemp} />
                <StatCell label="Días lesionada por temporada" value={stats.diasPorTemp} />
                <StatCell label="Media de días por lesión" value={stats.mediaDias} />
                <StatCell label="Mayor periodo lesionada" value={`${stats.mayorPeriodo} días`} />
                <StatCell label="Tiempo medio entre lesiones" value={`${stats.tiempoMedio} días`} />
                <StatCell label="Lesiones graves" value={stats.graves} />
                <StatCell label="Zonas diferentes lesionadas" value={stats.nZonas} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Según gravedad</h3>
                <div className="space-y-2">
                  {stats.porGravedad.map(row => (
                    <div key={row.g}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRAVEDAD_COLOR[row.g] }} />
                          {GRAVEDAD_NAME[row.g]}
                        </span>
                        <span className="text-gray-500">{row.count} · {row.dias} días</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: GRAVEDAD_COLOR[row.g] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Tipología (Top {Math.min(4, stats.porTipo.length)})</h3>
                <div className="space-y-2">
                  {stats.porTipo.slice(0, 4).map(t => (
                    <div key={t.tipo} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-700 truncate">{t.tipo}</span>
                      <span className="text-xs font-bold text-rfpaf-blue flex-shrink-0">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna central+derecha: mapa corporal + zonas */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 text-sm mb-1">Según zona de la lesión</h3>
                <p className="text-xs text-gray-400 mb-3">{stats.nZonas} zonas diferentes lesionadas</p>
                <div className="grid grid-cols-2 gap-3">
                  <MuscleBody view="front" lesiones={stats.data} colorFor={zonaColorFor} height={380} />
                  <MuscleBody view="back"  lesiones={stats.data} colorFor={zonaColorFor} height={380} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="border border-gray-100 rounded-xl p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Zona con más lesiones</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {stats.zonaMasLes ? `${ZONE_LABELS[stats.zonaMasLes[0]]} — ${stats.zonaMasLes[1]}` : '—'}
                    </p>
                  </div>
                  <div className="border border-gray-100 rounded-xl p-3">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Zona con más días lesionada</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {stats.zonaMasDias ? `${ZONE_LABELS[stats.zonaMasDias[0]]} — ${stats.zonaMasDias[1]} días` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cronología */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-rfpaf-blue" /> Cronología de lesiones
                </h3>
                <div className="relative h-16 mx-2">
                  <div className="absolute left-0 right-0 top-6 h-0.5 bg-gray-200" />
                  {stats.data.map(l => {
                    const pos = spanMs > 0
                      ? ((new Date(l.fechaInicio).getTime() - new Date(`${minY}-01-01`).getTime()) / spanMs) * 100
                      : 50
                    return (
                      <div key={l.id} className="absolute -translate-x-1/2 group" style={{ left: `${Math.max(1, Math.min(99, pos))}%`, top: '13px' }}>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: GRAVEDAD_COLOR[l.gravedad] }} />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                          {l.fechaInicio} · {l.tipo}
                        </div>
                      </div>
                    )
                  })}
                  <div className="absolute left-0 right-0 top-10 flex justify-between text-[10px] text-gray-400">
                    {Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i).map(y => <span key={y}>{y}</span>)}
                  </div>
                </div>
              </div>

              {/* Tabla detallada */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rfpaf-blue" /> Historial detallado
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-100">
                        <th className="text-left py-1.5 pr-3 font-medium">Temp.</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Fecha</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Tipo</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Zona</th>
                        <th className="text-center py-1.5 px-2 font-medium">Días</th>
                        <th className="text-center py-1.5 px-2 font-medium">Part.</th>
                        <th className="text-center py-1.5 pl-2 font-medium">Grav.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...stats.data].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)).map(l => (
                        <tr key={l.id} className="border-b border-gray-50">
                          <td className="py-2 pr-3 text-gray-600">{seasonOf(l.fechaInicio)}</td>
                          <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{l.fechaInicio}</td>
                          <td className="py-2 pr-3 text-gray-700 max-w-[140px] truncate">{l.tipo}</td>
                          <td className="py-2 pr-3 text-gray-700">{l.zonas.map(z => ZONE_LABELS[z]).join(', ')}</td>
                          <td className="py-2 px-2 text-center font-semibold text-gray-800">{l.diasBaja}</td>
                          <td className="py-2 px-2 text-center text-gray-600">{l.partidosPerdidos ?? 0}</td>
                          <td className="py-2 pl-2 text-center">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRAVEDAD_COLOR[l.gravedad] }} title={GRAVEDAD_NAME[l.gravedad]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Wellness() {
  const [tab, setTab] = useState<'rpe' | 'lesiones' | 'historial'>('rpe')

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rfpaf-blue rounded-xl flex items-center justify-center flex-shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wellness</h1>
          <p className="text-sm text-gray-500">Control de carga, fatiga y lesiones del equipo</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { id: 'rpe' as const,       label: 'RPE / Carga',  Icon: Activity },
          { id: 'lesiones' as const,  label: 'Lesiones',     Icon: AlertTriangle },
          { id: 'historial' as const, label: 'Ficha Médica', Icon: ClipboardList },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-white text-rfpaf-blue shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'rpe' ? <RPETab /> : tab === 'lesiones' ? <LesionesTab /> : <HistorialTab />}
    </div>
  )
}
