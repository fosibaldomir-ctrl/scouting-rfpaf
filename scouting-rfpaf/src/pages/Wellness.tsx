import { useState, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Heart, Activity, AlertTriangle, Trash2, X, Check, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ZonaCuerpo, GravedadLesion, EstadoLesion, RegistroLesion, RegistroRPE } from '../types'

// ─── Zone definitions ─────────────────────────────────────────────────────────

interface BodyZone {
  id: ZonaCuerpo
  label: string
  cx: number
  cy: number
  rx: number
  ry: number
}

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

const FRONT_ZONES: BodyZone[] = [
  { id: 'cabeza',        label: 'Cabeza',                  cx: 100, cy: 36,  rx: 27, ry: 31 },
  { id: 'cuello',        label: 'Cuello/Cervical',         cx: 100, cy: 71,  rx: 12, ry: 10 },
  { id: 'pecho',         label: 'Pecho',                   cx: 100, cy: 110, rx: 34, ry: 28 },
  { id: 'abdomen',       label: 'Abdomen',                 cx: 100, cy: 158, rx: 30, ry: 24 },
  { id: 'hombro_izq',    label: 'Hombro Izq.',             cx: 44,  cy: 90,  rx: 20, ry: 16 },
  { id: 'hombro_der',    label: 'Hombro Der.',             cx: 156, cy: 90,  rx: 20, ry: 16 },
  { id: 'brazo_izq',     label: 'Brazo Izq.',              cx: 37,  cy: 130, rx: 13, ry: 28 },
  { id: 'brazo_der',     label: 'Brazo Der.',              cx: 163, cy: 130, rx: 13, ry: 28 },
  { id: 'antebrazo_izq', label: 'Antebrazo Izq.',          cx: 29,  cy: 182, rx: 11, ry: 24 },
  { id: 'antebrazo_der', label: 'Antebrazo Der.',          cx: 171, cy: 182, rx: 11, ry: 24 },
  { id: 'mano_izq',      label: 'Mano Izq.',               cx: 27,  cy: 230, rx: 13, ry: 17 },
  { id: 'mano_der',      label: 'Mano Der.',               cx: 173, cy: 230, rx: 13, ry: 17 },
  { id: 'cadera_izq',    label: 'Cadera/Ingle Izq.',       cx: 76,  cy: 212, rx: 20, ry: 18 },
  { id: 'cadera_der',    label: 'Cadera/Ingle Der.',       cx: 124, cy: 212, rx: 20, ry: 18 },
  { id: 'muslo_izq',     label: 'Muslo Izq.',              cx: 78,  cy: 265, rx: 19, ry: 36 },
  { id: 'muslo_der',     label: 'Muslo Der.',              cx: 122, cy: 265, rx: 19, ry: 36 },
  { id: 'rodilla_izq',   label: 'Rodilla Izq.',            cx: 78,  cy: 314, rx: 17, ry: 14 },
  { id: 'rodilla_der',   label: 'Rodilla Der.',            cx: 122, cy: 314, rx: 17, ry: 14 },
  { id: 'gemelo_izq',    label: 'Gemelo/Pierna Izq.',      cx: 77,  cy: 358, rx: 14, ry: 27 },
  { id: 'gemelo_der',    label: 'Gemelo/Pierna Der.',      cx: 123, cy: 358, rx: 14, ry: 27 },
  { id: 'tobillo_izq',   label: 'Tobillo Izq.',            cx: 74,  cy: 398, rx: 12, ry: 10 },
  { id: 'tobillo_der',   label: 'Tobillo Der.',            cx: 126, cy: 398, rx: 12, ry: 10 },
  { id: 'pie_izq',       label: 'Pie Izq.',                cx: 68,  cy: 416, rx: 22, ry: 13 },
  { id: 'pie_der',       label: 'Pie Der.',                cx: 132, cy: 416, rx: 22, ry: 13 },
]

const BACK_ZONES: BodyZone[] = [
  { id: 'cabeza',        label: 'Nuca/Occipital',          cx: 100, cy: 36,  rx: 27, ry: 31 },
  { id: 'cuello',        label: 'Cervical',                cx: 100, cy: 71,  rx: 12, ry: 10 },
  { id: 'espalda_alta',  label: 'Espalda Alta',            cx: 100, cy: 110, rx: 34, ry: 28 },
  { id: 'espalda_baja',  label: 'Lumbar/Espalda Baja',     cx: 100, cy: 158, rx: 30, ry: 24 },
  { id: 'hombro_izq',    label: 'Hombro Izq.',             cx: 44,  cy: 90,  rx: 20, ry: 16 },
  { id: 'hombro_der',    label: 'Hombro Der.',             cx: 156, cy: 90,  rx: 20, ry: 16 },
  { id: 'brazo_izq',     label: 'Brazo Izq.',              cx: 37,  cy: 130, rx: 13, ry: 28 },
  { id: 'brazo_der',     label: 'Brazo Der.',              cx: 163, cy: 130, rx: 13, ry: 28 },
  { id: 'antebrazo_izq', label: 'Antebrazo Izq.',          cx: 29,  cy: 182, rx: 11, ry: 24 },
  { id: 'antebrazo_der', label: 'Antebrazo Der.',          cx: 171, cy: 182, rx: 11, ry: 24 },
  { id: 'mano_izq',      label: 'Mano Izq.',               cx: 27,  cy: 230, rx: 13, ry: 17 },
  { id: 'mano_der',      label: 'Mano Der.',               cx: 173, cy: 230, rx: 13, ry: 17 },
  { id: 'gluteo_izq',    label: 'Glúteo Izq.',             cx: 76,  cy: 212, rx: 20, ry: 18 },
  { id: 'gluteo_der',    label: 'Glúteo Der.',             cx: 124, cy: 212, rx: 20, ry: 18 },
  { id: 'muslo_izq',     label: 'Isquios/Muslo Izq.',      cx: 78,  cy: 265, rx: 19, ry: 36 },
  { id: 'muslo_der',     label: 'Isquios/Muslo Der.',      cx: 122, cy: 265, rx: 19, ry: 36 },
  { id: 'rodilla_izq',   label: 'Rodilla Izq. (post.)',    cx: 78,  cy: 314, rx: 17, ry: 14 },
  { id: 'rodilla_der',   label: 'Rodilla Der. (post.)',    cx: 122, cy: 314, rx: 17, ry: 14 },
  { id: 'gemelo_izq',    label: 'Gemelo Izq.',             cx: 77,  cy: 358, rx: 14, ry: 27 },
  { id: 'gemelo_der',    label: 'Gemelo Der.',             cx: 123, cy: 358, rx: 14, ry: 27 },
  { id: 'tobillo_izq',   label: 'Tobillo Izq.',            cx: 74,  cy: 398, rx: 12, ry: 10 },
  { id: 'tobillo_der',   label: 'Tobillo Der.',            cx: 126, cy: 398, rx: 12, ry: 10 },
  { id: 'talon_izq',     label: 'Talón Izq.',              cx: 68,  cy: 416, rx: 22, ry: 13 },
  { id: 'talon_der',     label: 'Talón Der.',              cx: 132, cy: 416, rx: 22, ry: 13 },
]

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

function getZoneStyle(zoneId: ZonaCuerpo, lesiones: RegistroLesion[]) {
  const active = lesiones.filter(l => l.zonas.includes(zoneId) && l.estado !== 'alta')
  if (!active.length) return { fill: 'transparent', stroke: 'none', opacity: 0 }
  const sorted = [...active].sort((a, b) => {
    const g: Record<GravedadLesion, number> = { grave: 3, moderada: 2, leve: 1 }
    return g[b.gravedad] - g[a.gravedad]
  })
  const worst = sorted[0]
  if (worst.estado === 'recuperandose') return { fill: '#bbf7d0', stroke: '#16a34a', opacity: 0.8 }
  if (worst.gravedad === 'grave')    return { fill: '#fecaca', stroke: '#dc2626', opacity: 0.85 }
  if (worst.gravedad === 'moderada') return { fill: '#fed7aa', stroke: '#ea580c', opacity: 0.85 }
  return { fill: '#fef08a', stroke: '#ca8a04', opacity: 0.85 }
}

// ─── Body SVG ────────────────────────────────────────────────────────────────

function BodySVG({
  view,
  lesiones,
  onZoneClick,
}: {
  view: 'front' | 'back'
  lesiones: RegistroLesion[]
  onZoneClick: (zoneId: ZonaCuerpo, label: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const zones = view === 'front' ? FRONT_ZONES : BACK_ZONES
  const u = `bd-${view}`

  return (
    <div className="relative select-none flex flex-col items-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {view === 'front' ? 'Frontal' : 'Posterior'}
      </p>
      {hovered && (
        <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2.5 py-1 rounded-md z-20 whitespace-nowrap pointer-events-none shadow-xl border border-gray-700">
          {zones.find(z => z.id === hovered)?.label ?? hovered}
        </div>
      )}

      <svg viewBox="0 0 200 440" className="w-full" style={{ height: 'auto' }}>
        <defs>
          {/* Skin highlight — center */}
          <radialGradient id={`${u}-sk`} cx="45%" cy="18%" r="72%">
            <stop offset="0%"   stopColor="#fce5cc"/>
            <stop offset="55%"  stopColor="#e8b888"/>
            <stop offset="100%" stopColor="#c47848"/>
          </radialGradient>
          {/* Skin shadow — limbs/sides */}
          <radialGradient id={`${u}-sd`} cx="50%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#f0d0a8"/>
            <stop offset="60%"  stopColor="#d4956a"/>
            <stop offset="100%" stopColor="#a06030"/>
          </radialGradient>
          {/* Injury glow */}
          <filter id={`${u}-gl`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ─── ANATOMICAL SILHOUETTE ─── */}
        <g stroke="#a86838" strokeWidth="0.55" strokeLinejoin="round">
          {/* Head */}
          <ellipse cx="100" cy="35" rx="27" ry="31" fill={`url(#${u}-sk)`}/>
          {/* Ears */}
          <ellipse cx="72"  cy="35" rx="5" ry="9" fill={`url(#${u}-sd)`}/>
          <ellipse cx="128" cy="35" rx="5" ry="9" fill={`url(#${u}-sd)`}/>
          {/* Neck */}
          <path d="M89,64 C87,68 86,74 86,83 L114,83 C114,74 113,68 111,64 Z" fill={`url(#${u}-sk)`}/>
          {/* Left shoulder/trapezius */}
          <path d="M86,79 C74,79 56,85 40,95 C28,103 22,118 28,130 C32,138 44,140 54,136 L56,112 L70,100 L78,87 Z" fill={`url(#${u}-sd)`}/>
          {/* Right shoulder/trapezius */}
          <path d="M114,79 C126,79 144,85 160,95 C172,103 178,118 172,130 C168,138 156,140 146,136 L144,112 L130,100 L122,87 Z" fill={`url(#${u}-sd)`}/>
          {/* Torso */}
          <path d="M70,92 L130,92 C134,106 136,128 135,152 C134,172 130,192 128,206 L72,206 C70,192 66,172 65,152 C64,128 66,106 70,92 Z" fill={`url(#${u}-sk)`}/>
          {/* Pelvis */}
          <path d="M68,204 C62,216 60,230 64,240 L136,240 C140,230 138,216 132,204 Z" fill={`url(#${u}-sk)`}/>
          {/* Left upper arm */}
          <path d="M20,102 C14,112 10,130 10,152 C10,170 14,186 20,200 L48,196 C46,178 44,154 46,128 L54,114 Z" fill={`url(#${u}-sd)`}/>
          {/* Right upper arm */}
          <path d="M180,102 C186,112 190,130 190,152 C190,170 186,186 180,200 L152,196 C154,178 156,154 154,128 L146,114 Z" fill={`url(#${u}-sd)`}/>
          {/* Left forearm */}
          <path d="M18,198 C12,212 8,234 8,256 C8,272 12,286 16,298 L42,294 C40,276 40,250 42,224 L48,196 Z" fill={`url(#${u}-sd)`}/>
          {/* Right forearm */}
          <path d="M182,198 C188,212 192,234 192,256 C192,272 188,286 184,298 L158,294 C160,276 160,250 158,224 L152,196 Z" fill={`url(#${u}-sd)`}/>
          {/* Left hand */}
          <path d="M14,296 C10,308 8,322 10,340 L42,338 C42,318 42,302 42,292 Z" fill={`url(#${u}-sk)`}/>
          {/* Right hand */}
          <path d="M186,296 C190,308 192,322 190,340 L158,338 C158,318 158,302 158,292 Z" fill={`url(#${u}-sk)`}/>
          {/* Left thigh */}
          <path d="M64,238 C60,256 58,280 60,306 C62,324 66,338 70,350 L96,350 L96,238 Z" fill={`url(#${u}-sk)`}/>
          {/* Right thigh */}
          <path d="M104,238 L104,350 L130,350 C134,338 138,324 140,306 C142,280 140,256 136,238 Z" fill={`url(#${u}-sk)`}/>
          {/* Left knee */}
          <path d="M68,348 C62,356 60,366 62,376 L96,376 L96,348 Z" fill={`url(#${u}-sd)`}/>
          {/* Right knee */}
          <path d="M104,348 L104,376 L138,376 C140,366 138,356 132,348 Z" fill={`url(#${u}-sd)`}/>
          {/* Left calf */}
          <path d="M62,374 C58,390 56,412 58,428 L94,428 L96,374 Z" fill={`url(#${u}-sk)`}/>
          {/* Right calf */}
          <path d="M104,374 L106,428 L142,428 C144,412 142,390 138,374 Z" fill={`url(#${u}-sk)`}/>
          {/* Left foot */}
          <path d="M54,426 C48,432 44,438 48,440 L94,440 L92,426 Z" fill={`url(#${u}-sd)`}/>
          {/* Right foot */}
          <path d="M108,426 L110,440 L152,440 C156,438 152,432 146,426 Z" fill={`url(#${u}-sd)`}/>
        </g>

        {/* ─── MUSCLE DEFINITION LINES ─── */}
        {view === 'front' ? (
          <g fill="none" stroke="#7a4820" strokeWidth="0.65" opacity="0.18">
            <line x1="100" y1="90" x2="100" y2="152"/>
            <path d="M70,94 C82,92 96,98 100,114 C96,132 78,138 68,128 C62,120 64,104 70,94 Z"/>
            <path d="M130,94 C118,92 104,98 100,114 C104,132 122,138 132,128 C138,120 136,104 130,94 Z"/>
            <line x1="83"  y1="154" x2="117" y2="154"/>
            <line x1="82"  y1="170" x2="118" y2="170"/>
            <line x1="82"  y1="186" x2="118" y2="186"/>
            <line x1="100" y1="152" x2="100" y2="206"/>
            <circle cx="100" cy="178" r="2.5" fill="#7a4820" stroke="none" opacity="0.25"/>
            <line x1="100" y1="242" x2="100" y2="348"/>
            <ellipse cx="30"  cy="152" rx="8" ry="16" opacity="0.5"/>
            <ellipse cx="170" cy="152" rx="8" ry="16" opacity="0.5"/>
          </g>
        ) : (
          <g fill="none" stroke="#7a4820" strokeWidth="0.65" opacity="0.18">
            <line x1="100" y1="90" x2="100" y2="208"/>
            <ellipse cx="80"  cy="120" rx="13" ry="20"/>
            <ellipse cx="120" cy="120" rx="13" ry="20"/>
            <line x1="100" y1="240" x2="100" y2="258"/>
            <path d="M64,240 C68,252 78,258 100,258 C122,258 132,252 136,240"/>
            <line x1="100" y1="260" x2="100" y2="348"/>
            <ellipse cx="78"  cy="386" rx="9" ry="19" opacity="0.5"/>
            <ellipse cx="122" cy="386" rx="9" ry="19" opacity="0.5"/>
          </g>
        )}

        {/* ─── CLICKABLE ZONE OVERLAYS ─── */}
        {zones.map(zone => {
          const style = getZoneStyle(zone.id, lesiones)
          const isHov = hovered === zone.id
          const hasInjury = style.opacity > 0
          return (
            <ellipse
              key={zone.id}
              cx={zone.cx}
              cy={zone.cy}
              rx={zone.rx}
              ry={zone.ry}
              fill={hasInjury ? style.fill : isHov ? '#60a5fa' : 'transparent'}
              fillOpacity={hasInjury ? style.opacity : isHov ? 0.4 : 0}
              stroke={hasInjury ? style.stroke : isHov ? '#2563eb' : 'none'}
              strokeWidth={hasInjury ? 2 : isHov ? 1.5 : 0}
              filter={hasInjury ? `url(#${u}-gl)` : undefined}
              className="cursor-pointer transition-all duration-100"
              onMouseEnter={() => setHovered(zone.id)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(zone.id)}
              onTouchEnd={() => setHovered(null)}
              onClick={() => onZoneClick(zone.id, zone.label)}
            >
              <title>{zone.label}</title>
            </ellipse>
          )
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
            <BodySVG view="front" lesiones={lesiones} onZoneClick={handleZoneClick}/>
            <BodySVG view="back"  lesiones={lesiones} onZoneClick={handleZoneClick}/>
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
