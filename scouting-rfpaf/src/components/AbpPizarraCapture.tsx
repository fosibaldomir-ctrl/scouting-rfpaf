import { useRef, useState } from 'react'
import { X, Pencil, ArrowRight, Spline, Eraser, Trash2, Camera, RefreshCw } from 'lucide-react'
import type { EquipoTactico } from '../types'

interface Props {
  equipoLocal: EquipoTactico
  equipoVisitante: EquipoTactico
  onCapture: (dataUrl: string) => void
  onClose: () => void
}

type Mode = 'move' | 'freehand' | 'arrow' | 'curve' | 'ball'
type ViewMode = 'completo' | 'area'
interface Pt { x: number; y: number }
interface Token { uid: string; team: 'local' | 'visit'; numero: number; x: number; y: number }
interface BallTok { uid: string; x: number; y: number }
interface DrawShape { uid: string; type: 'freehand' | 'arrow' | 'curve'; color: string; width: number; pts: Pt[] }

const VIEWS: Record<ViewMode, { w: number; h: number; label: string }> = {
  completo: { w: 105, h: 68, label: 'Campo completo' },
  area: { w: 68, h: 42, label: 'Área de portería' },
}

function defaultTokens(equipoLocal: EquipoTactico, equipoVisitante: EquipoTactico, view: ViewMode): Token[] {
  const { w, h } = VIEWS[view]
  const locals = equipoLocal.jugadoras.slice(0, 6)
  const visits = equipoVisitante.jugadoras.slice(0, 6)
  const tokens: Token[] = []
  if (view === 'area') {
    locals.forEach((j, i) => tokens.push({ uid: `L-${j.uid}`, team: 'local', numero: j.numero, x: w * (0.28 + (i % 3) * 0.16), y: h * (0.4 + Math.floor(i / 3) * 0.22) }))
    visits.forEach((j, i) => tokens.push({ uid: `V-${j.uid}`, team: 'visit', numero: j.numero, x: w * (0.34 + (i % 3) * 0.16), y: h * (0.28 + Math.floor(i / 3) * 0.22) }))
  } else {
    locals.forEach((j, i) => tokens.push({ uid: `L-${j.uid}`, team: 'local', numero: j.numero, x: w * 0.35, y: h * (0.12 + i * 0.14) }))
    visits.forEach((j, i) => tokens.push({ uid: `V-${j.uid}`, team: 'visit', numero: j.numero, x: w * 0.65, y: h * (0.12 + i * 0.14) }))
  }
  return tokens
}

function computeCurveCtrl(start: Pt, end: Pt): Pt {
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  const dx = end.x - start.x; const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: mx + (-dy / len) * len * 0.28, y: my + (dx / len) * len * 0.28 }
}

/* ── Markings shared by SVG (live) and Canvas (capture) ── */
function markingsCompleto(): { rects: number[][]; lines: number[][]; circles: number[][] } {
  return {
    rects: [
      [0, 0, 105, 68],
      [0, 13.84, 16.5, 40.32], [0, 24.84, 5.5, 18.32],
      [88.5, 13.84, 16.5, 40.32], [99.5, 24.84, 5.5, 18.32],
    ],
    lines: [[52.5, 0, 52.5, 68]],
    circles: [[52.5, 34, 9.15], [11, 34, 0.5], [94, 34, 0.5], [52.5, 34, 0.3]],
  }
}
function markingsArea(): { rects: number[][]; lines: number[][]; circles: number[][] } {
  return {
    rects: [
      [34 - 20.16, 0, 40.32, 16.5],
      [34 - 9.16, 0, 18.32, 5.5],
    ],
    lines: [[34 - 3.66, 0, 34 - 3.66, -2], [34 + 3.66, 0, 34 + 3.66, -2]],
    circles: [[34, 11, 9.15], [34, 11, 0.4]],
  }
}

export default function AbpPizarraCapture({ equipoLocal, equipoVisitante, onCapture, onClose }: Props) {
  const [view, setView] = useState<ViewMode>('area')
  const [mode, setMode] = useState<Mode>('move')
  const [penColor, setPenColor] = useState('#facc15')
  const [tokens, setTokens] = useState<Token[]>(() => defaultTokens(equipoLocal, equipoVisitante, 'area'))
  const [balls, setBalls] = useState<BallTok[]>([])
  const [shapes, setShapes] = useState<DrawShape[]>([])
  const [currentShape, setCurrentShape] = useState<DrawShape | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ kind: 'token' | 'ball'; uid: string } | null>(null)
  const drawingRef = useRef(false)

  const { w, h } = VIEWS[view]
  const marks = view === 'completo' ? markingsCompleto() : markingsArea()

  const resetView = (v: ViewMode) => {
    setView(v)
    setTokens(defaultTokens(equipoLocal, equipoVisitante, v))
    setBalls([])
    setShapes([])
  }

  const getPt = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(w, ((clientX - rect.left) / rect.width) * w)),
      y: Math.max(0, Math.min(h, ((clientY - rect.top) / rect.height) * h)),
    }
  }

  const handlePitchDown = (e: React.MouseEvent) => {
    if (mode === 'ball') {
      const pt = getPt(e.clientX, e.clientY)
      setBalls(prev => [...prev, { uid: crypto.randomUUID(), x: pt.x, y: pt.y }])
      return
    }
    if (mode !== 'freehand' && mode !== 'arrow' && mode !== 'curve') return
    const pt = getPt(e.clientX, e.clientY)
    drawingRef.current = true
    setCurrentShape({ uid: crypto.randomUUID(), type: mode, color: penColor, width: 0.6, pts: [pt] })
  }
  const handlePitchMove = (e: React.MouseEvent) => {
    if (dragRef.current) {
      const pt = getPt(e.clientX, e.clientY)
      if (dragRef.current.kind === 'token') {
        setTokens(prev => prev.map(t => t.uid === dragRef.current!.uid ? { ...t, x: pt.x, y: pt.y } : t))
      } else {
        setBalls(prev => prev.map(b => b.uid === dragRef.current!.uid ? { ...b, x: pt.x, y: pt.y } : b))
      }
      return
    }
    if (!drawingRef.current || !currentShape) return
    const pt = getPt(e.clientX, e.clientY)
    setCurrentShape(prev => {
      if (!prev) return prev
      if (prev.type === 'freehand') return { ...prev, pts: [...prev.pts, pt] }
      if (prev.type === 'arrow') return { ...prev, pts: [prev.pts[0], pt] }
      return { ...prev, pts: [prev.pts[0], computeCurveCtrl(prev.pts[0], pt), pt] }
    })
  }
  const handlePitchUp = () => {
    dragRef.current = null
    if (drawingRef.current && currentShape) {
      drawingRef.current = false
      const valid = currentShape.pts.length >= 2
      if (valid) setShapes(prev => [...prev, currentShape])
      setCurrentShape(null)
    }
  }

  const undo = () => {
    if (shapes.length > 0) { setShapes(p => p.slice(0, -1)); return }
    if (balls.length > 0) setBalls(p => p.slice(0, -1))
  }
  const clearAll = () => { setShapes([]); setBalls([]) }

  /* ── Canvas capture ── */
  const capture = () => {
    const SCALE = 9
    const W = Math.round(w * SCALE); const H = Math.round(h * SCALE)
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#2d6a27'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2

    marks.rects.forEach(([x, y, rw, rh]) => ctx.strokeRect(x * SCALE, y * SCALE, rw * SCALE, rh * SCALE))
    marks.lines.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1 * SCALE, y1 * SCALE); ctx.lineTo(x2 * SCALE, y2 * SCALE); ctx.stroke()
    })
    marks.circles.forEach(([cx, cy, r]) => {
      ctx.beginPath(); ctx.arc(cx * SCALE, cy * SCALE, r * SCALE, 0, Math.PI * 2)
      if (r < 1) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill() } else { ctx.stroke() }
    })

    // Shapes (arrows/curves/freehand)
    shapes.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width * SCALE; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      if (s.type === 'freehand') {
        ctx.beginPath()
        s.pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x * SCALE, p.y * SCALE) : ctx.lineTo(p.x * SCALE, p.y * SCALE))
        ctx.stroke()
      } else if (s.type === 'arrow' && s.pts.length >= 2) {
        const a = s.pts[0]; const b = s.pts[s.pts.length - 1]
        ctx.beginPath(); ctx.moveTo(a.x * SCALE, a.y * SCALE); ctx.lineTo(b.x * SCALE, b.y * SCALE); ctx.stroke()
        const angle = Math.atan2((b.y - a.y), (b.x - a.x))
        const headLen = 3.2 * SCALE
        ctx.beginPath()
        ctx.moveTo(b.x * SCALE, b.y * SCALE)
        ctx.lineTo(b.x * SCALE - headLen * Math.cos(angle - Math.PI / 7), b.y * SCALE - headLen * Math.sin(angle - Math.PI / 7))
        ctx.lineTo(b.x * SCALE - headLen * Math.cos(angle + Math.PI / 7), b.y * SCALE - headLen * Math.sin(angle + Math.PI / 7))
        ctx.closePath(); ctx.fillStyle = s.color; ctx.fill()
      } else if (s.type === 'curve' && s.pts.length === 3) {
        const [a, c, b] = s.pts
        ctx.beginPath(); ctx.moveTo(a.x * SCALE, a.y * SCALE)
        ctx.quadraticCurveTo(c.x * SCALE, c.y * SCALE, b.x * SCALE, b.y * SCALE)
        ctx.stroke()
        const angle = Math.atan2((b.y - c.y), (b.x - c.x))
        const headLen = 3.2 * SCALE
        ctx.beginPath()
        ctx.moveTo(b.x * SCALE, b.y * SCALE)
        ctx.lineTo(b.x * SCALE - headLen * Math.cos(angle - Math.PI / 7), b.y * SCALE - headLen * Math.sin(angle - Math.PI / 7))
        ctx.lineTo(b.x * SCALE - headLen * Math.cos(angle + Math.PI / 7), b.y * SCALE - headLen * Math.sin(angle + Math.PI / 7))
        ctx.closePath(); ctx.fillStyle = s.color; ctx.fill()
      }
    })

    // Balls
    balls.forEach(b => {
      ctx.beginPath(); ctx.arc(b.x * SCALE, b.y * SCALE, 1.1 * SCALE, 0, Math.PI * 2)
      ctx.fillStyle = 'white'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke()
    })

    // Player tokens
    tokens.forEach(t => {
      const color = t.team === 'local' ? equipoLocal.color : equipoVisitante.color
      ctx.beginPath(); ctx.arc(t.x * SCALE, t.y * SCALE, 2.4 * SCALE, 0, Math.PI * 2)
      ctx.fillStyle = t.team === 'local' ? 'white' : color
      ctx.fill()
      ctx.strokeStyle = t.team === 'local' ? color : 'white'; ctx.lineWidth = 0.4 * SCALE; ctx.stroke()
      ctx.fillStyle = t.team === 'local' ? color : 'white'
      ctx.font = `bold ${1.9 * SCALE}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(t.numero), t.x * SCALE, t.y * SCALE)
    })

    onCapture(canvas.toDataURL('image/png'))
  }

  const modeBtn = (m: Mode, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setMode(m)}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === m ? 'bg-rfpaf-blue text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
    >{icon}{label}</button>
  )

  const inDrawMode = mode === 'freehand' || mode === 'arrow' || mode === 'curve'

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#101a2c] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <span className="text-white font-bold text-sm">Capturar movimiento de la pizarra</span>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4">
          {/* View toggle */}
          <div className="flex gap-2 mb-3">
            {(Object.keys(VIEWS) as ViewMode[]).map(v => (
              <button key={v} onClick={() => resetView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === v ? 'bg-rfpaf-blue text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                {VIEWS[v].label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {modeBtn('move', 'Mover', <span className="leading-none">✋</span>)}
            {modeBtn('freehand', 'Trazar', <Pencil className="w-3 h-3" />)}
            {modeBtn('arrow', 'Flecha', <ArrowRight className="w-3 h-3" />)}
            {modeBtn('curve', 'Curva', <Spline className="w-3 h-3" />)}
            {modeBtn('ball', 'Balón', <span className="leading-none">⚽</span>)}
            {inDrawMode && (
              <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 p-0 ml-1" />
            )}
            <div className="w-px h-5 bg-white/15 mx-1" />
            <button onClick={undo} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20">
              <Eraser className="w-3 h-3" /> Deshacer
            </button>
            <button onClick={clearAll} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20">
              <Trash2 className="w-3 h-3" /> Borrar
            </button>
            <button onClick={() => resetView(view)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20">
              <RefreshCw className="w-3 h-3" /> Reiniciar
            </button>
          </div>

          {/* Pitch */}
          <div className="flex justify-center bg-black/30 rounded-xl p-3">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${w} ${h}`}
              className="w-full rounded-lg select-none"
              style={{ background: '#2d6a27', maxHeight: '52vh', touchAction: 'none', cursor: mode === 'move' ? 'default' : 'crosshair' }}
              onMouseDown={handlePitchDown}
              onMouseMove={handlePitchMove}
              onMouseUp={handlePitchUp}
              onMouseLeave={handlePitchUp}
            >
              {marks.rects.map((r, i) => <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill="none" stroke="white" strokeWidth={0.3} opacity={0.85} />)}
              {marks.lines.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="white" strokeWidth={0.3} opacity={0.85} />)}
              {marks.circles.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r={c[2]} fill={c[2] < 1 ? 'white' : 'none'} stroke="white" strokeWidth={0.3} opacity={0.85} />)}

              {[...shapes, currentShape].filter((s): s is DrawShape => !!s).map(s => {
                if (s.type === 'freehand') return <polyline key={s.uid} points={s.pts.map(p => `${p.x},${p.y}`).join(' ')} stroke={s.color} strokeWidth={0.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                if (s.type === 'arrow' && s.pts.length >= 2) {
                  const a = s.pts[0]; const b = s.pts[s.pts.length - 1]
                  return <line key={s.uid} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={s.color} strokeWidth={0.6} strokeLinecap="round" markerEnd="url(#abp-arrowhead)" style={{ color: s.color }} />
                }
                if (s.type === 'curve' && s.pts.length === 3) {
                  const [a, c, b] = s.pts
                  return <path key={s.uid} d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`} stroke={s.color} strokeWidth={0.6} fill="none" markerEnd="url(#abp-arrowhead)" style={{ color: s.color }} />
                }
                return null
              })}
              <defs>
                <marker id="abp-arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
                  <path d="M0,0 L4,2 L0,4 Z" fill="currentColor" />
                </marker>
              </defs>

              {balls.map(b => (
                <circle key={b.uid} cx={b.x} cy={b.y} r={1.1} fill="white" stroke="#333" strokeWidth={0.15}
                  style={{ cursor: mode === 'move' ? 'grab' : 'default' }}
                  onMouseDown={e => { if (mode !== 'move') return; e.stopPropagation(); dragRef.current = { kind: 'ball', uid: b.uid } }} />
              ))}

              {tokens.map(t => {
                const color = t.team === 'local' ? equipoLocal.color : equipoVisitante.color
                return (
                  <g key={t.uid}
                    style={{ cursor: mode === 'move' ? 'grab' : 'default' }}
                    onMouseDown={e => { if (mode !== 'move') return; e.stopPropagation(); dragRef.current = { kind: 'token', uid: t.uid } }}>
                    <circle cx={t.x} cy={t.y} r={2.4} fill={t.team === 'local' ? 'white' : color} stroke={t.team === 'local' ? color : 'white'} strokeWidth={0.4} />
                    <text x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" fontSize={2} fontWeight="bold" fill={t.team === 'local' ? color : 'white'}>{t.numero}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          <p className="text-[10px] text-white/40 mt-2 text-center">
            Arrastra jugadoras y balón · dibuja flechas o curvas para representar los movimientos
          </p>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-white/10">
          <button onClick={capture}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-rfpaf-blue hover:bg-blue-700 transition-colors">
            <Camera className="w-4 h-4" /> Usar esta captura
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 border border-white/15 hover:bg-white/10 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
