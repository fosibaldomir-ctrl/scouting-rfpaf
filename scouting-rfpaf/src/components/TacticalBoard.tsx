import { useRef, useCallback, useState, useEffect } from 'react'
import { ChevronDown, Camera, Eraser } from 'lucide-react'
import type { DrawTool, PitchType, Shape, TeamId, PlacedPlayer, SelPlayer, PlacedAccessory, SelAcc } from '../types'
import {
  PITCH_OPTIONS,
  ACCESSORY_LIST,
  GOAL_LIST,
  MUSHROOM_LIST,
  BALL_LIST,
  PALETTE,
  TEAMS,
  PLAYER_R,
} from '../lib/entrenamientoConstants'

interface TacticalBoardProps {
  onCapture?: (png: string) => void
  onRegisterCapture?: (fn: () => string | null) => void
}

export default function TacticalBoard({ onCapture, onRegisterCapture }: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // UI state
  const [tool, setTool] = useState<DrawTool>('freehand')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [dashed, setDashed] = useState(false)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [pitchType, setPitchType] = useState<PitchType>('full')
  const [ballMenuOpen, setBallMenuOpen] = useState(false)
  const [goalMenuOpen, setGoalMenuOpen] = useState(false)
  const [mushroomMenuOpen, setMushroomMenuOpen] = useState(false)
  const [placedPlayers] = useState<PlacedPlayer[]>([])
  const [selPlayer, setSelPlayer] = useState<SelPlayer | null>(null)
  const [placedAccessories] = useState<PlacedAccessory[]>([])
  const [selAcc, setSelAcc] = useState<SelAcc | null>(null)
  const [selectedAccUid] = useState<string | null>(null)
  const [openTeams, setOpenTeams] = useState<Set<TeamId>>(new Set())

  // Drawing refs — NOT state, so updates are synchronous and never stale in handlers
  const isDrawingRef = useRef(false)
  const currentShapeRef = useRef<Shape | null>(null)

  // Keep tool/color/width/dashed accessible in event handlers via refs
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const strokeWidthRef = useRef(strokeWidth)
  const dashedRef = useRef(dashed)
  const shapesRef = useRef(shapes)
  const pitchTypeRef = useRef(pitchType)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { strokeWidthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { dashedRef.current = dashed }, [dashed])
  useEffect(() => { shapesRef.current = shapes }, [shapes])
  useEffect(() => { pitchTypeRef.current = pitchType }, [pitchType])

  // Get canvas coordinates corrected for any CSS scaling
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // Draw a single shape onto a context
  const drawShape = (ctx: CanvasRenderingContext2D, s: Shape) => {
    ctx.save()
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = s.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash(s.dashed ? [6, 6] : [])

    if (s.type === 'freehand' && s.points && s.points.length > 1) {
      ctx.beginPath()
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
    } else if (s.type === 'line' && s.start && s.end) {
      ctx.beginPath()
      ctx.moveTo(s.start.x, s.start.y)
      ctx.lineTo(s.end.x, s.end.y)
      ctx.stroke()
    } else if (s.type === 'arrow' && s.start && s.end) {
      const dx = s.end.x - s.start.x
      const dy = s.end.y - s.start.y
      const angle = Math.atan2(dy, dx)
      const headLen = 14
      ctx.beginPath()
      ctx.moveTo(s.start.x, s.start.y)
      ctx.lineTo(s.end.x, s.end.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(s.end.x, s.end.y)
      ctx.lineTo(s.end.x - headLen * Math.cos(angle - Math.PI / 6), s.end.y - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(s.end.x - headLen * Math.cos(angle + Math.PI / 6), s.end.y - headLen * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
    } else if (s.type === 'circle' && s.start && s.end) {
      const r = Math.sqrt((s.end.x - s.start.x) ** 2 + (s.end.y - s.start.y) ** 2)
      ctx.beginPath()
      ctx.arc(s.start.x, s.start.y, r, 0, Math.PI * 2)
      ctx.stroke()
    } else if (s.type === 'rect' && s.start && s.end) {
      ctx.strokeRect(s.start.x, s.start.y, s.end.x - s.start.x, s.end.y - s.start.y)
    } else if (s.type === 'text' && s.start && s.text) {
      ctx.font = `bold ${s.width * 5 + 8}px Arial`
      ctx.fillText(s.text, s.start.x, s.start.y)
    }

    ctx.restore()
  }

  // Full repaint: field + saved shapes + in-progress shape
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    if (!w || !h) return

    // Background
    ctx.fillStyle = '#0f5132'
    ctx.fillRect(0, 0, w, h)

    // Field lines
    const pt = pitchTypeRef.current
    if (pt !== 'blank') {
      ctx.save()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.7

      if (pt === 'full') {
        ctx.strokeRect(40, 20, w - 80, h - 40)
        ctx.beginPath(); ctx.moveTo(w / 2, 20); ctx.lineTo(w / 2, h - 20); ctx.stroke()
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2); ctx.stroke()
      } else if (pt === 'half') {
        ctx.strokeRect(40, 20, w - 80, h - 40)
        ctx.beginPath(); ctx.moveTo(40, h / 2); ctx.lineTo(w - 40, h / 2); ctx.stroke()
      }
      ctx.restore()
    }

    // Saved shapes
    shapesRef.current.forEach(s => drawShape(ctx, s))

    // Placed players
    placedPlayers.forEach((p) => {
      const tc = TEAMS[p.team]
      ctx.fillStyle = tc.bg
      ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = tc.border; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = tc.text; ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.number.toString(), p.x, p.y)
    })

    // In-progress shape (from ref, always current)
    if (currentShapeRef.current) {
      drawShape(ctx, currentShapeRef.current)
    }
  }, [placedPlayers, placedAccessories, selectedAccUid])

  // Sync canvas pixel size to its CSS display size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sync = () => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      canvas.width = Math.round(rect.width)
      canvas.height = Math.round(rect.height)
      redraw()
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [redraw])

  // Redraw whenever saved shapes or pitch type change
  useEffect(() => { redraw() }, [shapes, pitchType, redraw])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoords(e)
    isDrawingRef.current = true
    const t = toolRef.current
    if (t === 'freehand') {
      currentShapeRef.current = {
        type: 'freehand', color: colorRef.current,
        width: strokeWidthRef.current, dashed: dashedRef.current,
        points: [{ x, y }],
      }
    } else {
      currentShapeRef.current = {
        type: t, color: colorRef.current,
        width: strokeWidthRef.current, dashed: dashedRef.current,
        start: { x, y },
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentShapeRef.current) return
    const { x, y } = getCoords(e)
    const s = currentShapeRef.current

    if (s.type === 'freehand' && s.points) {
      // Mutate directly — it's a ref, no async delay
      s.points.push({ x, y })
    } else {
      currentShapeRef.current = { ...s, end: { x, y } }
    }

    redraw()
  }

  const handleMouseUp = () => {
    if (!isDrawingRef.current || !currentShapeRef.current) return
    isDrawingRef.current = false
    const s = currentShapeRef.current

    const valid =
      s.type === 'freehand'
        ? s.points && s.points.length > 1
        : s.start && s.end

    if (valid) {
      setShapes(prev => [...prev, s])
    }
    currentShapeRef.current = null
    redraw()
  }

  const handleMouseLeave = () => {
    if (isDrawingRef.current) handleMouseUp()
  }

  const captureCanvas = useCallback(() => {
    try { return canvasRef.current?.toDataURL('image/png') ?? null } catch { return null }
  }, [])

  if (onRegisterCapture) onRegisterCapture(captureCanvas)

  return (
    <div className="flex flex-col gap-4 md:flex-row w-full">
      {/* LEFT: Tools */}
      <div className="hidden md:flex flex-col gap-3 w-44 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">Herramientas</p>
          {(['freehand', 'line', 'arrow', 'circle', 'rect', 'text'] as DrawTool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`w-full text-left text-xs px-3 py-2 rounded transition-colors ${
                tool === t ? 'bg-rfpaf-blue text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t === 'freehand' ? 'Dibujo libre' : t === 'line' ? 'Línea' : t === 'arrow' ? 'Flecha' : t === 'circle' ? 'Círculo' : t === 'rect' ? 'Rectángulo' : 'Texto'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">Color</p>
          <div className="grid grid-cols-4 gap-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-full h-6 rounded border-2 transition-all ${color === c ? 'border-gray-900' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Grosor: {strokeWidth}px</label>
            <input type="range" min="1" max="10" value={strokeWidth} onChange={(e) => setStrokeWidth(+e.target.value)} className="w-full" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={dashed} onChange={(e) => setDashed(e.target.checked)} />
            Punteado
          </label>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">Campo</p>
          {PITCH_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPitchType(p.id)}
              className={`w-full text-left text-xs px-3 py-2 rounded transition-colors ${
                pitchType === p.id ? 'bg-rfpaf-blue text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setShapes([]); currentShapeRef.current = null; redraw() }}
          className="w-full py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
        >
          <Eraser className="w-3 h-3" /> Limpiar
        </button>

        <button
          onClick={() => { const png = captureCanvas(); if (png && onCapture) onCapture(png) }}
          className="w-full py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
        >
          <Camera className="w-4 h-4" /> Capturar
        </button>
      </div>

      {/* CENTER: Canvas */}
      <div
        ref={containerRef}
        className="flex-1 bg-green-800 rounded-lg overflow-hidden border-2 border-gray-300 min-h-96"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* RIGHT: Players & Accessories */}
      <div className="hidden md:flex flex-col gap-3 w-44 flex-shrink-0 overflow-y-auto max-h-screen">
        {Object.entries(TEAMS).map(([id, tc]) => (
          <div key={id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => {
                const tid = parseInt(id) as TeamId
                setOpenTeams((t) => { const n = new Set(t); n.has(tid) ? n.delete(tid) : n.add(tid); return n })
              }}
              className="w-full px-3 py-2 text-xs font-semibold uppercase flex items-center justify-between hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: tc.bg, color: tc.text }}
            >
              {tc.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {openTeams.has(parseInt(id) as TeamId) && (
              <div className="p-2 border-t border-gray-100 space-y-1">
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setSelPlayer({ team: parseInt(id) as TeamId, number: n })}
                    className={`w-full py-1 px-2 text-xs rounded transition-colors ${
                      selPlayer?.team === parseInt(id) && selPlayer?.number === n ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Jugadora {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 space-y-1">
          <p className="text-xs font-semibold text-gray-600 uppercase">Accesorios</p>
          {ACCESSORY_LIST.map((a) => (
            <button
              key={a.type}
              onClick={() => setSelAcc({ type: a.type })}
              className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                selAcc?.type === a.type ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setGoalMenuOpen((o) => !o)}
            className="w-full px-3 py-2 text-xs font-semibold uppercase text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            Porterías
            <ChevronDown className={`w-3 h-3 transition-transform ${goalMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {goalMenuOpen && (
            <div className="p-2 border-t border-gray-100 space-y-1">
              {GOAL_LIST.map((g) => (
                <button
                  key={g.type}
                  onClick={() => setSelAcc({ type: g.type })}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                    selAcc?.type === g.type ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setMushroomMenuOpen((o) => !o)}
            className="w-full px-3 py-2 text-xs font-semibold uppercase text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            Setas
            <ChevronDown className={`w-3 h-3 transition-transform ${mushroomMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {mushroomMenuOpen && (
            <div className="p-2 border-t border-gray-100 space-y-1">
              {MUSHROOM_LIST.map((m) => (
                <button
                  key={m.type}
                  onClick={() => setSelAcc({ type: m.type })}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                    selAcc?.type === m.type ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setBallMenuOpen((o) => !o)}
            className="w-full px-3 py-2 text-xs font-semibold uppercase text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between"
          >
            Balones
            <ChevronDown className={`w-3 h-3 transition-transform ${ballMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {ballMenuOpen && (
            <div className="p-2 border-t border-gray-100 space-y-1">
              {BALL_LIST.map((b) => (
                <button
                  key={b.type}
                  onClick={() => setSelAcc({ type: b.type })}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                    selAcc?.type === b.type ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
