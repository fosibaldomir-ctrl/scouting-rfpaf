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

  const pad = 64
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * 0.58
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

  // Interpolated mid-color for stroke (avoids url() gradient ref which can fail in html2canvas)
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }
  const c1 = hexToRgb(colorStart)
  const c2 = hexToRgb(colorEnd)
  const midColor = `rgb(${Math.round((c1.r + c2.r) / 2)},${Math.round((c1.g + c2.g) / 2)},${Math.round((c1.b + c2.b) / 2)})`

  return (
    <svg
      width={size + pad * 2}
      height={size + pad * 2}
      viewBox={`-${pad} -${pad} ${size + pad * 2} ${size + pad * 2}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0f5ff" />
          <stop offset="100%" stopColor="#dde8ff" />
        </radialGradient>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorStart} stopOpacity="0.70" />
          <stop offset="100%" stopColor={colorEnd} stopOpacity="0.70" />
        </linearGradient>
      </defs>

      {/* Background */}
      <circle cx={cx} cy={cy} r={r * 1.15} fill={`url(#${id}-bg)`} />

      {/* Grid rings */}
      {Array.from({ length: levels }, (_, i) => i + 1).map((level) => (
        <polygon
          key={level}
          points={gridPoly(level)}
          fill={level % 2 === 0 ? 'rgba(193,214,255,0.35)' : 'rgba(220,233,255,0.20)'}
          stroke="rgba(100,130,200,0.55)"
          strokeWidth="0.8"
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
            stroke="rgba(100,130,200,0.55)"
            strokeWidth="1"
            strokeDasharray="4,3"
          />
        )
      })}

      {/* Data fill — no url() filter, solid gradient */}
      <polygon
        points={dataPoly}
        fill={`url(#${id}-fill)`}
        stroke={midColor}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Data outline repeated as solid stroke for crispness */}
      <polygon
        points={dataPoly}
        fill="none"
        stroke={colorStart}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />

      {/* Grid level numbers */}
      {Array.from({ length: levels }, (_, i) => i + 1).map((level) => {
        const p = pt(0, (level / levels) * r)
        return (
          <text
            key={level}
            x={p.x + 4}
            y={p.y}
            fontSize="8"
            fill="rgba(80,100,150,0.85)"
            dominantBaseline="middle"
            fontWeight="600"
          >
            {level}
          </text>
        )
      })}

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={8} fill={colorEnd} opacity="0.20" />
          <circle cx={p.x} cy={p.y} r={5} fill={colorEnd} stroke="white" strokeWidth="2.5" />
          <circle cx={p.x} cy={p.y} r={2} fill="white" />
        </g>
      ))}

      {/* Labels */}
      {labels.map((label, i) => {
        const p = pt(i, r * 1.30)
        const anchor = p.x > cx + 10 ? 'start' : p.x < cx - 10 ? 'end' : 'middle'
        const words = label.split(' ')
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="10.5"
            fontWeight="800"
            fill="#1e293b"
            fontFamily="system-ui, -apple-system, Arial, sans-serif"
          >
            {words.length > 2 ? (
              <>
                <tspan x={p.x} dy="-6">{words.slice(0, Math.ceil(words.length / 2)).join(' ')}</tspan>
                <tspan x={p.x} dy="14">{words.slice(Math.ceil(words.length / 2)).join(' ')}</tspan>
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
