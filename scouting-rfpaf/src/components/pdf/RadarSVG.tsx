interface RadarSVGProps {
  labels: string[]
  values: number[]
  max: number
  colorStart?: string
  colorEnd?: string
  size?: number
}

export default function RadarSVG({
  labels,
  values,
  max,
  colorStart = '#1a3a6b',
  colorEnd = '#c0392b',
  size = 300,
}: RadarSVGProps) {
  const n = labels.length
  if (n === 0) return null

  const pad = 55 // extra space so labels never get clipped
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * 0.60
  const levels = max

  const angle = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2

  const pt = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i)),
  })

  const gridPoly = (level: number) =>
    Array.from({ length: n }, (_, i) => pt(i, (level / levels) * r))
      .map((p) => `${p.x},${p.y}`)
      .join(' ')

  const dataPoints = values.map((v, i) => pt(i, Math.min(v / max, 1) * r))
  const dataPoly = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const id = `rsvg-${Math.random().toString(36).slice(2)}`

  return (
    <svg
      width={size + pad * 2}
      height={size + pad * 2}
      viewBox={`-${pad} -${pad} ${size + pad * 2} ${size + pad * 2}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f8faff" />
          <stop offset="100%" stopColor="#edf2ff" />
        </radialGradient>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorStart} stopOpacity="0.55" />
          <stop offset="100%" stopColor={colorEnd} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorStart} />
          <stop offset="100%" stopColor={colorEnd} />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx={cx} cy={cy} r={r * 1.12} fill={`url(#${id}-bg)`} />

      {/* Grid rings */}
      {Array.from({ length: levels }, (_, i) => i + 1).map((level) => (
        <polygon
          key={level}
          points={gridPoly(level)}
          fill={level % 2 === 0 ? 'rgba(219,234,254,0.45)' : 'rgba(239,246,255,0.45)'}
          stroke="rgba(148,163,184,0.5)"
          strokeWidth="0.6"
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const p = pt(i, r)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(148,163,184,0.6)"
            strokeWidth="0.8"
            strokeDasharray="3,2"
          />
        )
      })}

      {/* Data fill */}
      <polygon
        points={dataPoly}
        fill={`url(#${id}-fill)`}
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter={`url(#${id}-glow)`}
      />

      {/* Grid level numbers */}
      {Array.from({ length: levels }, (_, i) => i + 1).map((level) => {
        const p = pt(0, (level / levels) * r)
        return (
          <text
            key={level}
            x={p.x + 3}
            y={p.y}
            fontSize="7.5"
            fill="rgba(100,116,139,0.8)"
            dominantBaseline="middle"
          >
            {level}
          </text>
        )
      })}

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={6}
            fill={colorEnd}
            stroke="white"
            strokeWidth="2"
            filter={`url(#${id}-glow)`}
          />
          <circle cx={p.x} cy={p.y} r={2.5} fill="white" />
        </g>
      ))}

      {/* Labels */}
      {labels.map((label, i) => {
        const p = pt(i, r * 1.28)
        const anchor = p.x > cx + 8 ? 'start' : p.x < cx - 8 ? 'end' : 'middle'
        const words = label.split(' ')
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="9.5"
            fontWeight="700"
            fill="#1e293b"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {words.length > 2 ? (
              <>
                <tspan x={p.x} dy="-5">{words.slice(0, Math.ceil(words.length / 2)).join(' ')}</tspan>
                <tspan x={p.x} dy="12">{words.slice(Math.ceil(words.length / 2)).join(' ')}</tspan>
              </>
            ) : (
              label
            )}
          </text>
        )
      })}
    </svg>
  )
}
