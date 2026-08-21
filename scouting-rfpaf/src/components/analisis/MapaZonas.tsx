import { ALTURAS, CARRILES, type CeldaZona } from '../../utils/analisisTactico'

/* Las nueve zonas del campo con cuánta gente hay de cada equipo. El local ataca
 * hacia arriba, así que la fila de arriba es su ataque y la de abajo su defensa.
 * El color dice quién manda en cada zona. */

interface Props {
  zonas: CeldaZona[]
  colorLocal: string
  colorVisitante: string
  alto?: number
}

export default function MapaZonas({ zonas, colorLocal, colorVisitante, alto = 240 }: Props) {
  const ancho = Math.round(alto * 0.7)
  const celdaW = ancho / 3
  const celdaH = alto / 3

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ height: alto }} className="w-full">
      <rect x={0} y={0} width={ancho} height={alto} rx={6} fill="#166534" />

      {zonas.map((c) => {
        const x = c.carril * celdaW
        const y = c.altura * celdaH
        const vacia = c.local === 0 && c.visitante === 0
        const manda = c.local > c.visitante ? 'local' : c.visitante > c.local ? 'visitante' : null
        const ventaja = Math.abs(c.local - c.visitante)
        const relleno = manda === 'local' ? colorLocal : manda === 'visitante' ? colorVisitante : '#ffffff'
        return (
          <g key={`${c.altura}-${c.carril}`}>
            <rect
              x={x} y={y} width={celdaW} height={celdaH}
              fill={vacia ? '#ffffff' : relleno}
              fillOpacity={vacia ? 0.05 : Math.min(0.28 + ventaja * 0.18, 0.82)}
            />
            <text
              x={x + celdaW / 2} y={y + celdaH / 2 + 4}
              textAnchor="middle" fontSize={Math.round(celdaH * 0.26)} fontWeight="bold"
              fill="#ffffff" fillOpacity={vacia ? 0.35 : 1}
            >
              {c.local}–{c.visitante}
            </text>
          </g>
        )
      })}

      {/* Líneas del campo por encima del color de las zonas */}
      <g stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.2} fill="none">
        <rect x={3} y={3} width={ancho - 6} height={alto - 6} rx={4} />
        <line x1={3} y1={alto / 2} x2={ancho - 3} y2={alto / 2} />
        <circle cx={ancho / 2} cy={alto / 2} r={alto * 0.11} />
        <rect x={ancho / 2 - celdaW * 0.55} y={3} width={celdaW * 1.1} height={alto * 0.12} />
        <rect x={ancho / 2 - celdaW * 0.55} y={alto - 3 - alto * 0.12} width={celdaW * 1.1} height={alto * 0.12} />
      </g>
      <g stroke="#ffffff" strokeOpacity={0.28} strokeWidth={1} strokeDasharray="3 3">
        <line x1={celdaW} y1={3} x2={celdaW} y2={alto - 3} />
        <line x1={celdaW * 2} y1={3} x2={celdaW * 2} y2={alto - 3} />
        <line x1={3} y1={celdaH} x2={ancho - 3} y2={celdaH} />
        <line x1={3} y1={celdaH * 2} x2={ancho - 3} y2={celdaH * 2} />
      </g>

      {/* Rótulos de las alturas, pegados al borde izquierdo */}
      {ALTURAS.map((a, i) => (
        <text key={a} x={7} y={celdaH * i + 13} fontSize={9} fill="#ffffff" fillOpacity={0.7}>
          {a.toUpperCase()}
        </text>
      ))}
      {CARRILES.map((c, i) => (
        <text key={c} x={celdaW * i + celdaW / 2} y={alto - 6} textAnchor="middle"
          fontSize={8} fill="#ffffff" fillOpacity={0.55}>
          {c.toUpperCase()}
        </text>
      ))}
    </svg>
  )
}
