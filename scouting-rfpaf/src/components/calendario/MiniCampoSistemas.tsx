import { buildTeamJugadoras } from '../../utils/tactics'
import type { FormacionFutbol } from '../../types'

/* Campito con los dos dibujos enfrentados. Reutiliza las mismas posiciones que
 * la pizarra táctica, así que un 4-3-3 se ve igual aquí que allí. */

interface Props {
  sistemaLocal?: string
  sistemaVisitante?: string
  nombreLocal: string
  nombreVisitante: string
}

const AZUL = '#1a3a6b'
const ROJO = '#c0392b'

export default function MiniCampoSistemas({
  sistemaLocal, sistemaVisitante, nombreLocal, nombreVisitante,
}: Props) {
  const local = sistemaLocal ? buildTeamJugadoras(sistemaLocal as FormacionFutbol, 'local') : []
  const visit = sistemaVisitante ? buildTeamJugadoras(sistemaVisitante as FormacionFutbol, 'visit') : []
  if (local.length === 0 && visit.length === 0) return null

  const W = 220, H = 320

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340 }}>
        {/* Césped */}
        <rect x={0} y={0} width={W} height={H} rx={8} fill="#15803d" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={0} y={(H / 6) * i} width={W} height={H / 6}
            fill={i % 2 === 0 ? '#16a34a' : '#15803d'} />
        ))}
        {/* Líneas */}
        <g stroke="#ffffff" strokeOpacity={0.75} strokeWidth={1.5} fill="none">
          <rect x={6} y={6} width={W - 12} height={H - 12} rx={4} />
          <line x1={6} y1={H / 2} x2={W - 6} y2={H / 2} />
          <circle cx={W / 2} cy={H / 2} r={30} />
          <rect x={W / 2 - 46} y={6} width={92} height={40} />
          <rect x={W / 2 - 46} y={H - 46} width={92} height={40} />
          <rect x={W / 2 - 22} y={6} width={44} height={16} />
          <rect x={W / 2 - 22} y={H - 22} width={44} height={16} />
        </g>

        {/* Jugadoras: el local abajo, el visitante arriba */}
        {[{ eq: visit, color: ROJO }, { eq: local, color: AZUL }].map(({ eq, color }, k) =>
          eq.map((j) => (
            <g key={`${k}-${j.uid}`}>
              <circle cx={(j.posX / 100) * W} cy={(j.posY / 100) * H} r={7}
                fill={color} stroke="#ffffff" strokeWidth={1.5} />
              <text x={(j.posX / 100) * W} y={(j.posY / 100) * H + 3}
                textAnchor="middle" fontSize={7.5} fontWeight="bold" fill="#ffffff">
                {j.numero}
              </text>
            </g>
          )),
        )}
      </svg>

      <div className="flex items-center justify-between gap-2 mt-2 text-[11px]">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: AZUL }} />
          <span className="truncate text-gray-600">{nombreLocal}</span>
          <strong className="text-gray-800">{sistemaLocal || '—'}</strong>
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
          <strong className="text-gray-800">{sistemaVisitante || '—'}</strong>
          <span className="truncate text-gray-600">{nombreVisitante}</span>
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ROJO }} />
        </span>
      </div>
    </div>
  )
}
