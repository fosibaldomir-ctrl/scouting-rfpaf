import { useRef, useState, useEffect } from 'react'
import { ChevronDown, Camera, Eraser } from 'lucide-react'
import type { DrawTool, PitchType, Shape, TeamId, PlacedPlayer, SelPlayer, PlacedAccessory, SelAcc } from '../types'
import {
  PITCH_OPTIONS, ACCESSORY_LIST, GOAL_LIST, MUSHROOM_LIST, BALL_LIST,
  PALETTE, TEAMS, PLAYER_R,
} from '../lib/entrenamientoConstants'

// Fixed canvas resolution — CSS scales this to fit the container.
// getCoords applies the inverse scale so clicks always land in the right place.
const CW = 800
const CH = 530

interface TacticalBoardProps {
  onCapture?: (png: string) => void
  onRegisterCapture?: (fn: () => string | null) => void
}

export default function TacticalBoard({ onCapture, onRegisterCapture }: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ── React state (UI only) ────────────────────────────────────────
  const [tool, setTool]               = useState<DrawTool>('freehand')
  const [color, setColor]             = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [dashed, setDashed]           = useState(false)
  const [pitchType, setPitchType]     = useState<PitchType>('full')
  const [shapes, setShapes]           = useState<Shape[]>([])
  const [ballMenuOpen, setBallMenuOpen]         = useState(false)
  const [goalMenuOpen, setGoalMenuOpen]         = useState(false)
  const [mushroomMenuOpen, setMushroomMenuOpen] = useState(false)
  const [openTeams, setOpenTeams]   = useState<Set<TeamId>>(new Set())
  const [placedPlayers]             = useState<PlacedPlayer[]>([])
  const [selPlayer, setSelPlayer]   = useState<SelPlayer | null>(null)
  const [placedAccessories]         = useState<PlacedAccessory[]>([])
  const [selAcc, setSelAcc]         = useState<SelAcc | null>(null)
  const [selectedAccUid]            = useState<string | null>(null)

  // ── Refs for everything that drawing event handlers touch ────────
  // (refs are synchronous — no stale-closure or async-state issues)
  const shapesRef      = useRef<Shape[]>([])
  const pitchTypeRef   = useRef<PitchType>('full')
  const isDrawing      = useRef(false)
  const currentShape   = useRef<Shape | null>(null)
  const settingsRef    = useRef({ tool: 'freehand' as DrawTool, color: '#ffffff', strokeWidth: 3, dashed: false })

  // ── Helpers to update both state AND ref at the same time ────────
  const changeTool = (t: DrawTool)       => { settingsRef.current.tool        = t; setTool(t) }
  const changeColor = (c: string)        => { settingsRef.current.color       = c; setColor(c) }
  const changeWidth = (w: number)        => { settingsRef.current.strokeWidth = w; setStrokeWidth(w) }
  const changeDashed = (d: boolean)      => { settingsRef.current.dashed      = d; setDashed(d) }
  const changePitch = (p: PitchType)     => { pitchTypeRef.current = p; setPitchType(p); redraw() }

  // ── Convert mouse offsetX/Y (CSS pixels relative to element)
  //    to canvas buffer coordinates ─────────────────────────────────
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: e.nativeEvent.offsetX * (CW / rect.width),
      y: e.nativeEvent.offsetY * (CH / rect.height),
    }
  }

  // ── Draw one shape onto the context ─────────────────────────────
  const drawShape = (ctx: CanvasRenderingContext2D, s: Shape) => {
    ctx.save()
    ctx.strokeStyle = s.color
    ctx.fillStyle   = s.color
    ctx.lineWidth   = s.width
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.setLineDash(s.dashed ? [8, 8] : [])

    if (s.type === 'freehand' && s.points && s.points.length > 1) {
      ctx.beginPath()
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()

    } else if (s.type === 'line' && s.start && s.end) {
      ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y); ctx.lineTo(s.end.x, s.end.y); ctx.stroke()

    } else if (s.type === 'arrow' && s.start && s.end) {
      const dx = s.end.x - s.start.x, dy = s.end.y - s.start.y
      const angle = Math.atan2(dy, dx), L = 16
      ctx.beginPath(); ctx.moveTo(s.start.x, s.start.y); ctx.lineTo(s.end.x, s.end.y); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(s.end.x, s.end.y)
      ctx.lineTo(s.end.x - L * Math.cos(angle - Math.PI / 6), s.end.y - L * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(s.end.x - L * Math.cos(angle + Math.PI / 6), s.end.y - L * Math.sin(angle + Math.PI / 6))
      ctx.closePath(); ctx.fill()

    } else if (s.type === 'circle' && s.start && s.end) {
      const r = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y)
      ctx.beginPath(); ctx.arc(s.start.x, s.start.y, r, 0, Math.PI * 2); ctx.stroke()

    } else if (s.type === 'rect' && s.start && s.end) {
      ctx.strokeRect(s.start.x, s.start.y, s.end.x - s.start.x, s.end.y - s.start.y)
    }
    ctx.restore()
  }

  // ── Full canvas repaint ──────────────────────────────────────────
  // Plain function (not useCallback) — reads directly from refs so always current
  const redraw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#0f5132'
    ctx.fillRect(0, 0, CW, CH)

    // Field lines
    const pt = pitchTypeRef.current
    if (pt !== 'blank') {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 2.5
      if (pt === 'full') {
        ctx.strokeRect(30, 18, CW - 60, CH - 36)
        ctx.beginPath(); ctx.moveTo(CW / 2, 18);       ctx.lineTo(CW / 2, CH - 18); ctx.stroke()
        ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 50, 0, Math.PI * 2); ctx.stroke()
        // penalty areas
        ctx.strokeRect(30, CH / 2 - 88, 150, 176)
        ctx.strokeRect(CW - 180, CH / 2 - 88, 150, 176)
        // goal areas
        ctx.strokeRect(30, CH / 2 - 44, 60, 88)
        ctx.strokeRect(CW - 90, CH / 2 - 44, 60, 88)
        // centre spot
        ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill()
      } else if (pt === 'half') {
        ctx.strokeRect(30, 18, CW - 60, CH - 36)
        ctx.beginPath(); ctx.moveTo(30, CH / 2); ctx.lineTo(CW - 30, CH / 2); ctx.stroke()
        ctx.strokeRect(30, 18, 150, 176)
        ctx.strokeRect(30, 18, 60, 88)
      }
      ctx.restore()
    }

    // Saved shapes
    shapesRef.current.forEach(s => drawShape(ctx, s))

    // Placed players
    placedPlayers.forEach(p => {
      const tc = TEAMS[p.team]
      ctx.save()
      ctx.fillStyle = tc.bg
      ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = tc.border; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = tc.text; ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.number.toString(), p.x, p.y)
      ctx.restore()
    })

    // In-progress shape (from ref — always the latest point)
    if (currentShape.current) drawShape(ctx, currentShape.current)
  }

  // Initial draw after mount
  useEffect(() => { redraw() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw when saved shapes or pitch type change
  // (These are triggered by React state, so we use useEffect to catch them)
  useEffect(() => {
    shapesRef.current = shapes
    redraw()
  }, [shapes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    pitchTypeRef.current = pitchType
    redraw()
  }, [pitchType]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mouse handlers ───────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoords(e)
    const { tool: t, color: c, strokeWidth: w, dashed: d } = settingsRef.current
    isDrawing.current = true
    currentShape.current = t === 'freehand'
      ? { type: 'freehand', color: c, width: w, dashed: d, points: [{ x, y }] }
      : { type: t,          color: c, width: w, dashed: d, start: { x, y } }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !currentShape.current) return
    const { x, y } = getCoords(e)
    const s = currentShape.current
    if (s.type === 'freehand' && s.points) {
      s.points.push({ x, y })          // direct mutation — synchronous, no React involved
    } else {
      currentShape.current = { ...s, end: { x, y } }
    }
    redraw()
  }

  const handleMouseUp = () => {
    if (!isDrawing.current || !currentShape.current) return
    isDrawing.current = false
    const s = currentShape.current
    const valid = s.type === 'freehand'
      ? (s.points && s.points.length > 1)
      : (s.start && s.end)
    if (valid) {
      const next = [...shapesRef.current, s]
      shapesRef.current = next       // update ref synchronously BEFORE redraw
      setShapes(next)                // keep React state in sync (for Clear etc.)
    }
    currentShape.current = null
    redraw()
  }

  const handleMouseLeave = () => {
    if (isDrawing.current) handleMouseUp()
  }

  // ── Capture ──────────────────────────────────────────────────────
  const captureCanvas = () => {
    try { return canvasRef.current?.toDataURL('image/png') ?? null } catch { return null }
  }
  if (onRegisterCapture) onRegisterCapture(captureCanvas)

  const handleClear = () => {
    shapesRef.current = []
    setShapes([])
    currentShape.current = null
    isDrawing.current = false
    redraw()
  }

  // ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 md:flex-row flex-1 min-w-0">

      {/* LEFT PANEL: tools */}
      <div className="hidden md:flex flex-col gap-3 w-44 flex-shrink-0">

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Herramientas</p>
          {(['freehand', 'line', 'arrow', 'circle', 'rect'] as DrawTool[]).map((t) => (
            <button key={t} onClick={() => changeTool(t)}
              className={`w-full text-left text-xs px-3 py-2 rounded transition-colors ${
                tool === t ? 'bg-rfpaf-blue text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}>
              {t === 'freehand' ? 'Dibujo libre' : t === 'line' ? 'Línea' : t === 'arrow' ? 'Flecha' : t === 'circle' ? 'Círculo' : 'Rectángulo'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">Color</p>
          <div className="grid grid-cols-4 gap-1">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => changeColor(c)}
                className={`w-full h-6 rounded border-2 transition-all ${color === c ? 'border-gray-900 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Grosor: {strokeWidth}px</label>
            <input type="range" min="1" max="10" value={strokeWidth}
              onChange={(e) => changeWidth(+e.target.value)} className="w-full" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={dashed} onChange={(e) => changeDashed(e.target.checked)} />
            Punteado
          </label>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Campo</p>
          {PITCH_OPTIONS.map((p) => (
            <button key={p.id} onClick={() => changePitch(p.id)}
              className={`w-full text-left text-xs px-3 py-2 rounded transition-colors ${
                pitchType === p.id ? 'bg-rfpaf-blue text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <button onClick={handleClear}
          className="w-full py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1">
          <Eraser className="w-3 h-3" /> Limpiar
        </button>

        <button onClick={() => { const png = captureCanvas(); if (png && onCapture) onCapture(png) }}
          className="w-full py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1">
          <Camera className="w-4 h-4" /> Capturar
        </button>
      </div>

      {/* CENTER: Canvas — fixed resolution 800×530, CSS scales it */}
      <div className="flex-1 min-w-0 rounded-lg overflow-hidden border-2 border-gray-300 bg-[#0f5132]">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="w-full block cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* RIGHT PANEL: players & accessories */}
      <div className="hidden md:flex flex-col gap-3 w-44 flex-shrink-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>

        {Object.entries(TEAMS).map(([id, tc]) => (
          <div key={id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => {
                const tid = parseInt(id) as TeamId
                setOpenTeams((prev) => { const n = new Set(prev); n.has(tid) ? n.delete(tid) : n.add(tid); return n })
              }}
              className="w-full px-3 py-2 text-xs font-semibold uppercase flex items-center justify-between"
              style={{ backgroundColor: tc.bg, color: tc.text }}>
              {tc.label} <ChevronDown className="w-3 h-3" />
            </button>
            {openTeams.has(parseInt(id) as TeamId) && (
              <div className="p-2 border-t border-gray-100 space-y-1">
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setSelPlayer({ team: parseInt(id) as TeamId, number: n })}
                    className={`w-full py-1 px-2 text-xs rounded transition-colors ${
                      selPlayer?.team === parseInt(id) && selPlayer?.number === n ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
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
            <button key={a.type} onClick={() => setSelAcc({ type: a.type })}
              className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                selAcc?.type === a.type ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}>
              {a.label}
            </button>
          ))}
        </div>

        {[
          { label: 'Porterías', open: goalMenuOpen, toggle: () => setGoalMenuOpen(o => !o), list: GOAL_LIST },
          { label: 'Setas',     open: mushroomMenuOpen, toggle: () => setMushroomMenuOpen(o => !o), list: MUSHROOM_LIST },
          { label: 'Balones',   open: ballMenuOpen,     toggle: () => setBallMenuOpen(o => !o),     list: BALL_LIST },
        ].map(({ label, open, toggle, list }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button onClick={toggle}
              className="w-full px-3 py-2 text-xs font-semibold uppercase text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between">
              {label} <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="p-2 border-t border-gray-100 space-y-1">
                {list.map((item) => (
                  <button key={item.type} onClick={() => setSelAcc({ type: item.type })}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                      selAcc?.type === item.type ? 'bg-rfpaf-blue text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* suppress unused ref warning */}
        <span className="hidden">{selectedAccUid}{placedAccessories.length}</span>
      </div>

    </div>
  )
}
