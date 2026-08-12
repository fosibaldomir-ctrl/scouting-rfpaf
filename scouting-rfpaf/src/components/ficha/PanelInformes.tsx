import type { Observador, Propuesta, Valoracion } from '../../types'
import {
  aCien, conSinBalonDe, mediaConSinBalon, periodoObservacion, repartoPor,
} from '../../utils/valoracionStats'

/* Bloques de análisis de la ficha: resumen de todos los informes de una jugadora.
 * Todo sale de lo que el observador ya rellena; nada está inventado ni relleno
 * con datos de ejemplo. */

const PROPUESTAS: readonly Propuesta[] = ['SELECCIÓN', 'INCORPORAR', 'SEGUIR', 'DESCARTAR']

const COLOR_PROPUESTA: Record<Propuesta, string> = {
  'SELECCIÓN': '#16a34a',
  'INCORPORAR': '#0891b2',
  'SEGUIR': '#d97706',
  'DESCARTAR': '#dc2626',
}

/** Color de una nota de 0 a 100, igual criterio en todo el panel. */
export function colorNota(n: number): string {
  if (n >= 85) return '#15803d'
  if (n >= 70) return '#16a34a'
  if (n >= 55) return '#ca8a04'
  if (n >= 40) return '#ea580c'
  return '#dc2626'
}

const fmtFecha = (f: string) =>
  f ? new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

/* ─── Barra de atributo ─────────────────────────────────────────────────── */

export function BarraAtributo({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-600 flex-1 min-w-0 truncate">{etiqueta}</span>
      <div className="h-2.5 w-20 sm:w-24 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${valor}%`, backgroundColor: colorNota(valor) }} />
      </div>
      <span className="text-[11px] font-bold text-white rounded px-1.5 py-0.5 w-8 text-center flex-shrink-0"
        style={{ backgroundColor: colorNota(valor) }}>
        {valor}
      </span>
    </div>
  )
}

/* ─── Evolución de la valoración a lo largo del tiempo ──────────────────── */

function GraficoEvolucion({ valoraciones }: { valoraciones: Valoracion[] }) {
  const puntos = [...valoraciones]
    .sort((a, b) => a.fechaPartido.localeCompare(b.fechaPartido))
    .map(v => ({ fecha: v.fechaPartido, valor: aCien(v.valoracionGeneral ?? 0, 5) }))

  if (puntos.length < 2) {
    return <p className="text-xs text-gray-400 py-6 text-center">Hacen falta al menos dos informes para ver la evolución.</p>
  }

  const W = 320, H = 90, m = 18
  const min = Math.min(...puntos.map(p => p.valor)) - 8
  const max = Math.max(...puntos.map(p => p.valor)) + 8
  const x = (i: number) => m + (i * (W - m * 2)) / (puntos.length - 1)
  const y = (v: number) => H - m - ((v - min) / Math.max(max - min, 1)) * (H - m * 2)
  const d = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.valor)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      <path d={d} fill="none" stroke="#1a3a6b" strokeWidth={2} strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valor)} r={3.5} fill="#dc2626" />
          <text x={x(i)} y={y(p.valor) - 8} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#374151">
            {p.valor}
          </text>
          <text x={x(i)} y={H - 4} textAnchor="middle" fontSize={7} fill="#9ca3af">
            {fmtFecha(p.fecha)}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ─── Cuadrante con balón / sin balón ───────────────────────────────────── */

function Cuadrante({ valoraciones, conBalon }: { valoraciones: Valoracion[]; conBalon: boolean[] }) {
  const puntos = valoraciones.map((v, i) => ({ ...conSinBalonDe(v, conBalon), n: i + 1 }))
  if (puntos.length === 0) return null

  const W = 300, H = 220, m = 30
  const x = (v: number) => m + (v / 100) * (W - m * 2)
  const y = (v: number) => H - m - (v / 100) * (H - m * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      <rect x={m} y={m} width={W - m * 2} height={H - m * 2} fill="#f8fafc" stroke="#e5e7eb" />
      {/* Ejes de referencia en la mitad de cada escala */}
      <line x1={x(50)} y1={m} x2={x(50)} y2={H - m} stroke="#cbd5e1" strokeDasharray="3 3" />
      <line x1={m} y1={y(50)} x2={W - m} y2={y(50)} stroke="#cbd5e1" strokeDasharray="3 3" />
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.con)} cy={y(p.sin)} r={5} fill="#dc2626" fillOpacity={0.85} />
          <text x={x(p.con)} y={y(p.sin) - 8} textAnchor="middle" fontSize={8} fill="#374151">
            Informe {p.n}
          </text>
        </g>
      ))}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#6b7280">Total · Con Balón →</text>
      <text x={10} y={H / 2} textAnchor="middle" fontSize={9} fill="#6b7280"
        transform={`rotate(-90 10 ${H / 2})`}>Total · Sin Balón →</text>
    </svg>
  )
}

/* ─── Panel completo ────────────────────────────────────────────────────── */

export default function PanelInformes({
  valoraciones, conBalon, observadores,
}: {
  valoraciones: Valoracion[]
  conBalon: boolean[]
  observadores: Observador[]
}) {
  const periodo = periodoObservacion(valoraciones)
  const medias = mediaConSinBalon(valoraciones, conBalon)
  const reparto = repartoPor(valoraciones, PROPUESTAS, v => v.propuesta)
  const visionado = repartoPor(valoraciones, ['directo', 'video'] as const, v => v.tipoVisionado)
  const sinVisionado = valoraciones.filter(v => !v.tipoVisionado).length

  const top = [...valoraciones]
    .sort((a, b) => (b.valoracionGeneral ?? 0) - (a.valoracionGeneral ?? 0))
    .slice(0, 5)

  const nombreObs = (id: string) => observadores.find(o => o.id === id)?.nombre ?? id

  // Reparto porcentual entre lo que hace con balón y sin balón
  const sumaMedias = medias ? medias.con + medias.sin : 0
  const pctCon = sumaMedias ? Math.round((medias!.con / sumaMedias) * 100) : 50

  return (
    <div className="space-y-4">
      {/* Evolución en el tiempo */}
      <div className="card">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-gray-700">Nº Informes disponibles: {valoraciones.length}</h3>
          {periodo && (
            <span className="text-[11px] text-gray-400">
              {fmtFecha(periodo.desde)} – {fmtFecha(periodo.hasta)} · {periodo.texto}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mb-2">Cómo ha evolucionado a lo largo del tiempo observado</p>
        <GraficoEvolucion valoraciones={valoraciones} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Mejores informes */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Mejores informes por valoración</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 uppercase tracking-wide">
                  <th className="px-2 py-1.5 text-left font-semibold">Fecha</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Partido</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Observador</th>
                  <th className="px-2 py-1.5 text-center font-semibold">V</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Propuesta</th>
                </tr>
              </thead>
              <tbody>
                {top.map(v => {
                  const nota = aCien(v.valoracionGeneral ?? 0, 5)
                  return (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="px-2 py-1.5 whitespace-nowrap">{fmtFecha(v.fechaPartido)}</td>
                      <td className="px-2 py-1.5 truncate max-w-[120px]">{v.local} – {v.visitante}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{nombreObs(v.observador)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="font-bold text-white rounded px-1.5 py-0.5"
                          style={{ backgroundColor: colorNota(nota) }}>{nota}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="font-bold" style={{ color: COLOR_PROPUESTA[v.propuesta] }}>
                          {v.propuesta}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reparto por propuesta y por tipo de visionado */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Según la propuesta de cada informe</h3>
          <table className="w-full text-[11px] mb-4">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 uppercase tracking-wide">
                <th className="px-2 py-1.5 text-left font-semibold">Propuesta</th>
                <th className="px-2 py-1.5 text-center font-semibold">Nº</th>
                <th className="px-2 py-1.5 text-center font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {reparto.map(r => (
                <tr key={r.clave} className="border-b last:border-0">
                  <td className="px-2 py-1.5">
                    <span className="font-bold" style={{ color: COLOR_PROPUESTA[r.clave] }}>{r.clave}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center">{r.n}</td>
                  <td className="px-2 py-1.5 text-center font-semibold">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-sm font-bold text-gray-700 mb-2">Cómo se observaron</h3>
          <div className="space-y-1.5">
            {visionado.map(r => (
              <BarraAtributo
                key={r.clave}
                etiqueta={`${r.clave === 'directo' ? 'En directo / TV' : 'Vídeo'} (${r.n})`}
                valor={r.pct}
              />
            ))}
            {sinVisionado > 0 && (
              <p className="text-[10px] text-gray-400 pt-1">
                {sinVisionado} informe{sinVisionado === 1 ? '' : 's'} sin especificar (anteriores a este dato)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Con balón y sin balón */}
      {medias && (
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-1">Con balón y sin balón</h3>
          <p className="text-[11px] text-gray-400 mb-3">
            Cada informe se divide en lo que hace con el balón en los pies y lo que hace sin él,
            para ver en qué faceta destaca la jugadora.
          </p>

          <div className="flex h-6 rounded-lg overflow-hidden mb-3 text-[10px] font-bold text-white">
            <div className="flex items-center justify-center bg-rfpaf-blue" style={{ width: `${pctCon}%` }}>
              {pctCon}%
            </div>
            <div className="flex items-center justify-center bg-rfpaf-red" style={{ width: `${100 - pctCon}%` }}>
              {100 - pctCon}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Promedio con balón</p>
              <p className="text-2xl font-black" style={{ color: colorNota(medias.con) }}>{medias.con}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Promedio sin balón</p>
              <p className="text-2xl font-black" style={{ color: colorNota(medias.sin) }}>{medias.sin}</p>
            </div>
          </div>

          <Cuadrante valoraciones={valoraciones} conBalon={conBalon} />
        </div>
      )}
    </div>
  )
}
