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
  const [tool, setTool] = useState<DrawTool>('freehand')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [dashed, setDashed] = useState(false)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)
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

  const captureCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    try {
      return canvas.toDataURL('image/png')
    } catch {
      return null
    }
  }, [])

  if (onRegisterCapture) onRegisterCapture(captureCanvas)

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height

    if (w === 0 || h === 0) return

    // Background
    ctx.fillStyle = '#0f5132'
    ctx.fillRect(0, 0, w, h)

    // Field lines
    if (pitchType !== 'blank') {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6

      if (pitchType === 'full') {
        ctx.strokeRect(40, 20, w - 80, h - 40)
        ctx.beginPath()
        ctx.moveTo(w / 2, 20)
        ctx.lineTo(w / 2, h - 20)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2)
        ctx.stroke()
      } else if (pitchType === 'half') {
        ctx.strokeRect(40, 20, w - 80, h - 40)
        ctx.beginPath()
        ctx.moveTo(40, h / 2)
        ctx.lineTo(w - 40, h / 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // Shapes
    shapes.forEach((s) => {
      ctx.strokeStyle = s.color
      ctx.fillStyle = s.color
      ctx.lineWidth = s.width
      if (s.dashed) {
        ctx.setLineDash([5, 5])
      }

      if (s.type === 'freehand' && s.points) {
        ctx.beginPath()
        s.points.forEach((p, i) => {
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
      } else if (s.type === 'line' && s.start && s.end) {
        ctx.beginPath()
        ctx.moveTo(s.start.x, s.start.y)
        ctx.lineTo(s.end.x, s.end.y)
        ctx.stroke()
      } else if (s.type === 'arrow' && s.start && s.end) {
        const dx = s.end.x - s.start.x
        const dy = s.end.y - s.start.y
        ctx.beginPath()
        ctx.moveTo(s.start.x, s.start.y)
        ctx.lineTo(s.end.x, s.end.y)
        ctx.stroke()
        const angle = Math.atan2(dy, dx)
        ctx.beginPath()
        ctx.moveTo(s.end.x, s.end.y)
        ctx.lineTo(s.end.x - 10 * Math.cos(angle - Math.PI / 6), s.end.y - 10 * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(s.end.x - 10 * Math.cos(angle + Math.PI / 6), s.end.y - 10 * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
      } else if (s.type === 'circle' && s.start && s.end) {
        const r = Math.sqrt((s.end.x - s.start.x) ** 2 + (s.end.y - s.start.y) ** 2)
        ctx.beginPath()
        ctx.arc(s.start.x, s.start.y, r, 0, Math.PI * 2)
        ctx.stroke()
      } else if (s.type === 'rect' && s.start && s.end) {
        ctx.strokeRect(s.start.x, s.start.y, s.end.x - s.start.x, s.end.y - s.start.y)
      }
      ctx.setLineDash([])
    })

    // Placed accessories
    placedAccessories.forEach((a) => {
      drawAccessory(ctx, a)
    })

    // Text shapes
    shapes
      .filter((s) => s.type === 'text')
      .forEach((s) => {
        if (s.start && s.text) {
          ctx.fillStyle = s.color
          ctx.font = 'bold 16px Arial'
          ctx.fillText(s.text, s.start.x, s.start.y)
        }
      })

    // Placed players
    placedPlayers.forEach((p) => {
      const tc = TEAMS[p.team]
      ctx.fillStyle = tc.bg
      ctx.beginPath()
      ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = tc.border
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = tc.text
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.number.toString(), p.x, p.y)
    })
  }, [shapes, placedPlayers, placedAccessories, selectedAccUid, pitchType])

  // Sync canvas backing buffer to its CSS pixel dimensions
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const sync = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      // Set backing buffer = CSS size → coordinates map 1:1, no scaling math needed
      canvas.width = Math.round(rect.width)
      canvas.height = Math.round(rect.height)
      redrawCanvas()
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [redrawCanvas])

  // Draw on mouse move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (!isDrawing || !currentShape) {
      redrawCanvas()
      return
    }

    if (tool === 'freehand' && currentShape.points) {
      const updated = { ...currentShape }
      updated.points = [...(currentShape.points || []), { x, y }]
      setCurrentShape(updated)
    } else {
      const updated = { ...currentShape }
      updated.end = { x, y }
      setCurrentShape(updated)
    }

    redrawCanvas()
    // Draw preview
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = currentShape.color
    ctx.fillStyle = currentShape.color
    ctx.lineWidth = currentShape.width
    if (tool === 'freehand' && currentShape.points && currentShape.points.length > 0) {
      ctx.beginPath()
      currentShape.points.forEach((p, i) => {
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
      })
      ctx.stroke()
    } else if (tool === 'line' && currentShape.start) {
      ctx.beginPath()
      ctx.moveTo(currentShape.start.x, currentShape.start.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (tool === 'arrow' && currentShape.start) {
      ctx.beginPath()
      ctx.moveTo(currentShape.start.x, currentShape.start.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      const dx = x - currentShape.start.x
      const dy = y - currentShape.start.y
      const angle = Math.atan2(dy, dx)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 10 * Math.cos(angle - Math.PI / 6), y - 10 * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(x - 10 * Math.cos(angle + Math.PI / 6), y - 10 * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setIsDrawing(true)
    if (tool === 'freehand') {
      setCurrentShape({ type: 'freehand', color, width: strokeWidth, dashed, points: [{ x, y }] })
    } else {
      setCurrentShape({ type: tool, color, width: strokeWidth, dashed, start: { x, y } })
    }
  }

  const handleCanvasMouseUp = () => {
    if (!isDrawing || !currentShape) return
    setIsDrawing(false)
    if (currentShape.start && currentShape.end) {
      setShapes([...shapes, currentShape])
    }
    setCurrentShape(null)
    redrawCanvas()
  }

  const handleCapture = () => {
    const png = captureCanvas()
    if (png && onCapture) {
      onCapture(png)
    }
  }

  // Redraw when shapes change
  const canvasContainer = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col gap-4 md:flex-row w-full">
      {/* LEFT: Tools */}
      <div className="hidden md:flex flex-col gap-3 w-44 flex-shrink-0">
        {/* Tool Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase">Herramientas</p>
          {['freehand', 'line', 'arrow', 'circle', 'rect', 'text'].map((t) => (
            <button
              key={t}
              onClick={() => setTool(t as DrawTool)}
              className={`w-full text-left text-xs px-3 py-2 rounded transition-colors ${
                tool === t ? 'bg-rfpaf-blue text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t === 'freehand' ? 'Dibujo libre' : t === 'line' ? 'Línea' : t === 'arrow' ? 'Flecha' : t === 'circle' ? 'Círculo' : t === 'rect' ? 'Rectángulo' : 'Texto'}
            </button>
          ))}
        </div>

        {/* Color & Stroke */}
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

        {/* Pitch Type */}
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

        {/* Clear button */}
        <button onClick={() => { setShapes([]) }} className="w-full py-2 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1">
          <Eraser className="w-3 h-3" /> Limpiar
        </button>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          className="w-full py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
        >
          <Camera className="w-4 h-4" /> Capturar
        </button>
      </div>

      {/* CENTER: Canvas */}
      <div
        ref={canvasContainer}
        className="flex-1 bg-green-800 rounded-lg overflow-hidden border-2 border-gray-300 min-h-96"
        onMouseLeave={() => setIsDrawing(false)}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair block"
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
        />
      </div>

      {/* RIGHT: Players & Accessories */}
      <div className="hidden md:flex flex-col gap-3 w-44 flex-shrink-0 overflow-y-auto max-h-screen">
        {/* Teams */}
        {Object.entries(TEAMS).map(([id, tc]) => (
          <div key={id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => {
                const tid = parseInt(id) as TeamId
                setOpenTeams((t) => {
                  const n = new Set(t)
                  n.has(tid) ? n.delete(tid) : n.add(tid)
                  return n
                })
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

        {/* Accessories */}
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

        {/* Goals */}
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

        {/* Mushrooms */}
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

        {/* Balls */}
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

// Helper function to draw accessories
function drawAccessory(ctx: CanvasRenderingContext2D, a: PlacedAccessory) {
  // Simplified version - full implementation would include all the complex 3D goal rendering
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.scale(a.scale, a.scale)
  
  // Just draw a simple colored circle for now
  const colors: Record<string, string> = {
    cone: '#FFA500',
    goal_front: '#FFFFFF',
    goal_mini: '#CCCCCC',
    ladder: '#FFFF00',
    hurdle: '#FF0000',
    mushroom_blue: '#0000FF',
    mushroom_red: '#FF0000',
    mushroom_yellow: '#FFFF00',
    ball_bw: '#000000',
    ball_blue: '#0000FF',
    ball_red: '#FF0000',
    barrier: '#888888',
    mannequin: '#CCCCCC',
  }
  
  ctx.fillStyle = a.color || colors[a.type] || '#CCCCCC'
  ctx.beginPath()
  ctx.arc(0, 0, 10, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
}
