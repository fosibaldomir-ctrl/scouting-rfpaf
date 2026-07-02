import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Heart, Activity, AlertTriangle, Trash2, X, Check, ChevronRight } from 'lucide-react'
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
}: {
  view: 'front' | 'back'
  lesiones: RegistroLesion[]
  onZoneClick: (zoneId: ZonaCuerpo, label: string) => void
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

      <svg viewBox={viewBox} style={{ height: 470, maxHeight: '58vh', width: 'auto', maxWidth: '100%' }}>
        {parts.map((part, pi) => {
          const segs: { d: string; side?: 'left' | 'right' }[] = []
          part.path?.common?.forEach(d => segs.push({ d }))
          part.path?.left?.forEach(d => segs.push({ d, side: 'left' }))
          part.path?.right?.forEach(d => segs.push({ d, side: 'right' }))
          return segs.map((seg, si) => {
            const zone = zoneFor(view, part.slug, seg.side)
            const injuryFill = zone ? getZoneFill(zone, lesiones) : null
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
                onClick={() => zone && onZoneClick(zone, ZONE_LABELS[zone])}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Wellness() {
  const [tab, setTab] = useState<'rpe' | 'lesiones'>('rpe')

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
          { id: 'rpe' as const,      label: 'RPE / Carga',   Icon: Activity },
          { id: 'lesiones' as const, label: 'Lesiones',      Icon: AlertTriangle },
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

      {tab === 'rpe' ? <RPETab /> : <LesionesTab />}
    </div>
  )
}
