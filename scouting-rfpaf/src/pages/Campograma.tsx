import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import FichaPreviewCard from '../components/ficha/FichaPreviewCard'
import type { Demarcacion, FichaJugadora } from '../types'

/* ─────────────────────────  Utilidades  ───────────────────────── */

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

// Puntuación compuesta 0-100: técnica 50% · valoración 30% · físico 20%
function calcularPuntuacion(f: FichaJugadora): number {
  const t = f.evaluacionTecnica
  const tecnicaAvg = t
    ? (t.item1 + t.item2 + t.item3 + t.item4 + t.item5 + t.item6) / 6
    : 0
  const fisicoAvg = ((f.fuerza ?? 0) + (f.velocidad ?? 0) + (f.resistencia ?? 0)) / 3
  const valoracion = f.valoracionGeneral ?? 0

  const scoreTecnica = (tecnicaAvg / 5) * 50
  const scoreValoracion = (valoracion / 5) * 30
  const scoreFisico = (fisicoAvg / 10) * 20

  return Math.round(scoreTecnica + scoreValoracion + scoreFisico)
}

type CategoriaEdad = 'sub12' | 'sub14' | 'sub16'

const CATEGORIAS_EDAD: { id: CategoriaEdad; label: string; rango: string }[] = [
  { id: 'sub12', label: 'Sub-12', rango: '10 - 12 años' },
  { id: 'sub14', label: 'Sub-14', rango: '12 - 14 años' },
  { id: 'sub16', label: 'Sub-16', rango: '14 - 16 años' },
]

function perteneceCategoria(edad: number, cat: CategoriaEdad): boolean {
  if (cat === 'sub12') return edad >= 10 && edad <= 12
  if (cat === 'sub14') return edad >= 12 && edad <= 14
  if (cat === 'sub16') return edad >= 14 && edad <= 16
  return false
}

const ABREV: Record<Demarcacion, string> = {
  PORTERO: 'POR',
  LATERAL: 'LAT',
  CENTRAL: 'CEN',
  'MEDIO CENTRO DEF.': 'MCD',
  'MEDIO CENTRO OF.': 'MCO',
  INTERIOR: 'INT',
  'MEDIA PUNTA': 'MP',
  EXTERIOR: 'EXT',
  DELANTERO: 'DEL',
}

/* ─────────────────────────  Sistemas tácticos  ───────────────────────── */

interface Slot {
  demarcacion: Demarcacion
  x: number // % horizontal
  y: number // % vertical (0 = ataque arriba, 100 = portería abajo)
}

interface Sistema {
  id: string
  nombre: string
  slots: Slot[]
}

const SISTEMAS: Sistema[] = [
  {
    id: '433',
    nombre: '1-4-3-3',
    slots: [
      { demarcacion: 'PORTERO', x: 50, y: 91 },
      { demarcacion: 'LATERAL', x: 12, y: 71 },
      { demarcacion: 'CENTRAL', x: 37, y: 77 },
      { demarcacion: 'CENTRAL', x: 63, y: 77 },
      { demarcacion: 'LATERAL', x: 88, y: 71 },
      { demarcacion: 'MEDIO CENTRO DEF.', x: 50, y: 56 },
      { demarcacion: 'INTERIOR', x: 28, y: 44 },
      { demarcacion: 'INTERIOR', x: 72, y: 44 },
      { demarcacion: 'EXTERIOR', x: 13, y: 24 },
      { demarcacion: 'DELANTERO', x: 50, y: 13 },
      { demarcacion: 'EXTERIOR', x: 87, y: 24 },
    ],
  },
  {
    id: '442',
    nombre: '1-4-4-2',
    slots: [
      { demarcacion: 'PORTERO', x: 50, y: 91 },
      { demarcacion: 'LATERAL', x: 12, y: 71 },
      { demarcacion: 'CENTRAL', x: 37, y: 77 },
      { demarcacion: 'CENTRAL', x: 63, y: 77 },
      { demarcacion: 'LATERAL', x: 88, y: 71 },
      { demarcacion: 'EXTERIOR', x: 13, y: 50 },
      { demarcacion: 'MEDIO CENTRO DEF.', x: 38, y: 54 },
      { demarcacion: 'MEDIO CENTRO OF.', x: 62, y: 54 },
      { demarcacion: 'EXTERIOR', x: 87, y: 50 },
      { demarcacion: 'DELANTERO', x: 35, y: 16 },
      { demarcacion: 'DELANTERO', x: 65, y: 16 },
    ],
  },
  {
    id: '4231',
    nombre: '1-4-2-3-1',
    slots: [
      { demarcacion: 'PORTERO', x: 50, y: 91 },
      { demarcacion: 'LATERAL', x: 12, y: 71 },
      { demarcacion: 'CENTRAL', x: 37, y: 77 },
      { demarcacion: 'CENTRAL', x: 63, y: 77 },
      { demarcacion: 'LATERAL', x: 88, y: 71 },
      { demarcacion: 'MEDIO CENTRO DEF.', x: 35, y: 58 },
      { demarcacion: 'MEDIO CENTRO DEF.', x: 65, y: 58 },
      { demarcacion: 'EXTERIOR', x: 13, y: 36 },
      { demarcacion: 'MEDIA PUNTA', x: 50, y: 38 },
      { demarcacion: 'EXTERIOR', x: 87, y: 36 },
      { demarcacion: 'DELANTERO', x: 50, y: 14 },
    ],
  },
  {
    id: '352',
    nombre: '1-3-5-2',
    slots: [
      { demarcacion: 'PORTERO', x: 50, y: 91 },
      { demarcacion: 'CENTRAL', x: 25, y: 77 },
      { demarcacion: 'CENTRAL', x: 50, y: 79 },
      { demarcacion: 'CENTRAL', x: 75, y: 77 },
      { demarcacion: 'EXTERIOR', x: 10, y: 50 },
      { demarcacion: 'INTERIOR', x: 32, y: 52 },
      { demarcacion: 'MEDIO CENTRO DEF.', x: 50, y: 58 },
      { demarcacion: 'INTERIOR', x: 68, y: 52 },
      { demarcacion: 'EXTERIOR', x: 90, y: 50 },
      { demarcacion: 'DELANTERO', x: 35, y: 16 },
      { demarcacion: 'DELANTERO', x: 65, y: 16 },
    ],
  },
]

/* ─────────────────────────  Nodo de posición  ───────────────────────── */

interface JugadoraRank {
  ficha: FichaJugadora
  puntuacion: number
}

function NodoPosicion({
  demarcacion,
  jugadoras,
  onSelect,
  onHover,
}: {
  demarcacion: Demarcacion
  jugadoras: JugadoraRank[]
  onSelect: (j: JugadoraRank, e: React.MouseEvent) => void
  onHover: (j: JugadoraRank | null, e?: React.MouseEvent) => void
}) {
  // Ancho responsive: con 108px fijos, en móvil los nodos de los extremos
  // (LAT/EXT) se salían del campo y se solapaban con los centrales.
  return (
    <div className="w-[80px] sm:w-[92px] lg:w-[108px] -translate-x-1/2 -translate-y-1/2">
      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg overflow-hidden border border-white/40">
        <div className="bg-rfpaf-blue text-white text-[10px] font-bold text-center py-0.5 tracking-wide">
          {ABREV[demarcacion]}
        </div>
        <div className="divide-y divide-gray-100">
          {jugadoras.length === 0 && (
            <div className="px-1.5 py-1.5 text-[9px] text-gray-400 text-center italic">Sin datos</div>
          )}
          {jugadoras.map((j, i) => (
            <button
              key={j.ficha.id}
              data-jugadora={j.ficha.id}
              onClick={(e) => onSelect(j, e)}
              onMouseEnter={(e) => onHover(j, e)}
              onMouseMove={(e) => onHover(j, e)}
              onMouseLeave={() => onHover(null)}
              // En móvil se oculta la 3ª opción: con tres filas el nodo crece
              // tanto que se solapa con el de al lado y bloquea la pulsación.
              className={`w-full items-center gap-1 px-1.5 py-1 hover:bg-rfpaf-blue/5 transition-colors text-left ${
                i === 2 ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <span
                className={`flex-shrink-0 w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center ${
                  i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-[9px] font-semibold text-gray-700 truncate leading-tight">
                {j.ficha.nombre} {j.ficha.primerApellido}
              </span>
              {/* En móvil el nodo es tan estrecho que la puntuación dejaba el
                  nombre en dos letras; el número de orden ya indica el ranking. */}
              <span className="flex-shrink-0 text-[8px] font-bold text-rfpaf-red hidden sm:inline">{j.puntuacion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────  Página  ───────────────────────── */

export default function Campograma() {
  const navigate = useNavigate()
  const { fichas, clubes } = useStore()

  const [categoria, setCategoria] = useState<CategoriaEdad>('sub14')
  const [sistemaId, setSistemaId] = useState('433')

  // Vista previa al pasar el ratón. Se guarda la posición del cursor porque la
  // tarjeta se pinta fuera del campo (que tiene overflow-hidden y la recortaría).
  const [preview, setPreview] = useState<{ j: JugadoraRank; x: number; y: number } | null>(null)

  // En táctil no existe "pasar por encima": el mismo gesto serviría para ver la
  // miniatura y para abrir la ficha. Por eso ahí la miniatura se controla con el
  // toque (1º toque = miniatura, 2º = ficha) y se ignoran los eventos de ratón,
  // que el navegador simula al tocar.
  const hayRaton = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

  const handleHover = (j: JugadoraRank | null, e?: React.MouseEvent) => {
    if (!hayRaton()) return
    if (!j || !e) { setPreview(null); return }
    setPreview({ j, x: e.clientX, y: e.clientY })
  }

  const handleSelect = (j: JugadoraRank, e: React.MouseEvent) => {
    if (hayRaton()) { navigate(`/ficha/${j.ficha.id}`); return }
    // Segundo toque sobre la misma jugadora: abrir su ficha.
    if (preview?.j.ficha.id === j.ficha.id) { navigate(`/ficha/${j.ficha.id}`); return }
    setPreview({ j, x: e.clientX, y: e.clientY })
  }

  // Tocar fuera de cualquier jugadora cierra la miniatura.
  useEffect(() => {
    if (!preview || hayRaton()) return
    const cerrarSiEsFuera = (ev: Event) => {
      const destino = ev.target as HTMLElement | null
      if (!destino?.closest('[data-jugadora]')) setPreview(null)
    }
    document.addEventListener('pointerdown', cerrarSiEsFuera)
    return () => document.removeEventListener('pointerdown', cerrarSiEsFuera)
  }, [preview])

  const sistema = SISTEMAS.find((s) => s.id === sistemaId) ?? SISTEMAS[0]

  // Ranking por demarcación, filtrado por categoría de edad
  const rankingPorDemarcacion = useMemo(() => {
    const map = new Map<Demarcacion, JugadoraRank[]>()
    const filtradas = fichas.filter((f) => perteneceCategoria(calcularEdad(f.fechaNacimiento), categoria))

    for (const f of filtradas) {
      const rank: JugadoraRank = { ficha: f, puntuacion: calcularPuntuacion(f) }
      const lista = map.get(f.demarcacion) ?? []
      lista.push(rank)
      map.set(f.demarcacion, lista)
    }
    for (const [, lista] of map) {
      lista.sort((a, b) => b.puntuacion - a.puntuacion)
    }
    return map
  }, [fichas, categoria])

  const totalJugadoras = useMemo(
    () => fichas.filter((f) => perteneceCategoria(calcularEdad(f.fechaNacimiento), categoria)).length,
    [fichas, categoria]
  )

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            Campograma · Once Ideal
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Las mejores jugadoras por puesto según puntuación · {totalJugadoras} jugadoras en {CATEGORIAS_EDAD.find((c) => c.id === categoria)?.label}
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Categoría de edad */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Categoría</p>
          <div className="flex gap-2">
            {CATEGORIAS_EDAD.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoria(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                  categoria === c.id
                    ? 'border-rfpaf-blue bg-rfpaf-blue text-white shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-rfpaf-blue/40'
                }`}
              >
                {c.label}
                <span className={`block text-[10px] font-normal ${categoria === c.id ? 'text-white/70' : 'text-gray-400'}`}>
                  {c.rango}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sistema táctico */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sistema</p>
          <div className="flex gap-2">
            {SISTEMAS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSistemaId(s.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                  sistemaId === s.id
                    ? 'border-rfpaf-red bg-rfpaf-red text-white shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-rfpaf-red/40'
                }`}
              >
                {s.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campo de fútbol */}
      <div className="flex justify-center">
        <div
          className="relative w-full max-w-[640px] rounded-2xl shadow-xl overflow-hidden border-4 border-white"
          style={{
            aspectRatio: '2 / 3',
            background:
              'repeating-linear-gradient(0deg, #15803d 0px, #15803d 60px, #16a34a 60px, #16a34a 120px)',
          }}
        >
          {/* Líneas del campo */}
          <FieldLines />

          {/* Nodos de jugadoras */}
          {sistema.slots.map((slot, i) => {
            const lista = rankingPorDemarcacion.get(slot.demarcacion) ?? []
            return (
              <div
                key={`${slot.demarcacion}-${i}`}
                className="absolute z-10"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                <NodoPosicion
                  demarcacion={slot.demarcacion}
                  jugadoras={lista.slice(0, 3)}
                  onSelect={handleSelect}
                  onHover={handleHover}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-yellow-500" /> 1ª opción
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-gray-400" /> 2ª opción
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-700" /> 3ª opción
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-rfpaf-red">00</span> Puntuación /100
        </div>
      </div>

      {/* Vista previa flotante. Va fuera del campo (position: fixed) para que no
          la recorte su overflow-hidden, y sin eventos para no robar el hover. */}
      {preview && (() => {
        const W = 208, H = 300, M = 12
        let left = preview.x + 18
        if (left + W + M > window.innerWidth) left = preview.x - W - 18
        left = Math.max(M, left)
        const top = Math.max(M, Math.min(preview.y - H / 2, window.innerHeight - H - M))
        return (
          <div className="fixed z-50 pointer-events-none" style={{ left, top }}>
            <FichaPreviewCard ficha={preview.j.ficha} clubes={clubes} puntuacion={preview.j.puntuacion} />
          </div>
        )
      })()}
    </div>
  )
}

/* ─────────────────────────  Líneas del campo  ───────────────────────── */

function FieldLines() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Borde exterior */}
      <div className="absolute inset-3 border-2 border-white/60 rounded" />
      {/* Línea de medio campo */}
      <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t-2 border-white/60" />
      {/* Círculo central */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/60 rounded-full" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full" />
      {/* Área grande inferior (portería propia) */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-1/2 h-[16%] border-2 border-b-0 border-white/60" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-1/4 h-[7%] border-2 border-b-0 border-white/60" />
      {/* Área grande superior (portería rival) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-3 w-1/2 h-[16%] border-2 border-t-0 border-white/60" />
      <div className="absolute left-1/2 -translate-x-1/2 top-3 w-1/4 h-[7%] border-2 border-t-0 border-white/60" />
    </div>
  )
}
