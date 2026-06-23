import {
  useRef, useState, useCallback, useEffect,
  type MouseEvent as RME,
  type ChangeEvent,
} from 'react'
import { Navigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Move, Copy, Trash2, PenLine, Upload, Play, RotateCcw, Clapperboard } from 'lucide-react'
import { useStore } from '../store/useStore'
import RFPAFLogo from '../components/RFPAFLogo'

/* ─── Jersey SVG component ─── */
const JERSEY_PATH = "M13 2 L6 2 L0 6 L0 16 L10 13 L10 38 L30 38 L30 13 L40 16 L40 6 L34 2 L27 2 Q23 8 20 7 Q17 8 13 2 Z"

function JerseyIcon({ fill, number, size = 44 }: { fill: string; number: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ display:'block' }}>
      <path d={JERSEY_PATH} fill={fill} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinejoin="round"/>
      <text x="20" y="27" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={number >= 10 ? 11 : 13} fontWeight="bold"
        fontFamily="system-ui,-apple-system,Arial,sans-serif">
        {number}
      </text>
    </svg>
  )
}

type ToolType =
  | 'select'
  | 'arrow-straight' | 'arrow-curved' | 'arrow-wave' | 'arrow-dashed'
  | 'text' | 'label'
  | 'rect' | 'circle' | 'circle-dashed' | 'circle-dotdash' | 'zone'
  | 'connector' | 'focus' | 'triangle' | 'cylinder' | 'cone'
  | 'dorsal'

interface Pt { x: number; y: number }

interface BaseEl {
  id: string
  tool: ToolType
  stroke: string
  fill: string
  strokeWidth: number
  opacity: number
}

interface ArrowEl extends BaseEl {
  tool: 'arrow-straight' | 'arrow-curved' | 'arrow-wave' | 'arrow-dashed'
  start: Pt; end: Pt
}

interface TextEl extends BaseEl {
  tool: 'text' | 'label'
  pos: Pt; text: string
}

interface ShapeEl extends BaseEl {
  tool: 'rect' | 'circle' | 'circle-dashed' | 'circle-dotdash' | 'focus' | 'triangle' | 'cylinder' | 'cone'
  x: number; y: number; w: number; h: number
}

interface ZoneEl extends BaseEl {
  tool: 'zone'
  points: Pt[]
}

interface ConnectorEl extends BaseEl {
  tool: 'connector'
  points: Pt[]
}

interface DorsalEl extends BaseEl {
  tool: 'dorsal'
  pos: Pt; number: number
}

type DrawEl = ArrowEl | TextEl | ShapeEl | ZoneEl | ConnectorEl | DorsalEl

function linePath(s: Pt, e: Pt) {
  return `M ${s.x} ${s.y} L ${e.x} ${e.y}`
}

function curvedPath(s: Pt, e: Pt) {
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2
  const dx = e.x - s.x, dy = e.y - s.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const cx = mx - (dy / len) * len * 0.28
  const cy = my + (dx / len) * len * 0.28
  return `M ${s.x} ${s.y} Q ${cx} ${cy} ${e.x} ${e.y}`
}

function wavePath(s: Pt, e: Pt) {
  const dx = e.x - s.x, dy = e.y - s.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const px = (-dy / len) * 14, py = (dx / len) * 14
  const n = 3
  let d = `M ${s.x} ${s.y}`
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const t1 = (i + 0.3) / n, t2 = (i + 0.7) / n, t3 = (i + 1) / n
    d += ` C ${s.x + dx * t1 + px * side} ${s.y + dy * t1 + py * side}`
    d += ` ${s.x + dx * t2 + px * side} ${s.y + dy * t2 + py * side}`
    d += ` ${s.x + dx * t3} ${s.y + dy * t3}`
  }
  return d
}

function arrowTip(from: Pt, to: Pt, size = 14): string {
  const dx = to.x - from.x, dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len, uy = dy / len
  const px = -uy, py = ux
  const ax1 = to.x - ux * size + px * size * 0.4
  const ay1 = to.y - uy * size + py * size * 0.4
  const ax2 = to.x - ux * size - px * size * 0.4
  const ay2 = to.y - uy * size - py * size * 0.4
  return `M ${to.x} ${to.y} L ${ax1} ${ay1} L ${ax2} ${ay2} Z`
}

function curvedTip(s: Pt, e: Pt, size = 14): string {
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2
  const dx = e.x - s.x, dy = e.y - s.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const cx = mx - (dy / len) * len * 0.28
  const cy = my + (dx / len) * len * 0.28
  const tdx = e.x - cx, tdy = e.y - cy
  const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1
  const pseudo = { x: e.x - (tdx / tlen), y: e.y - (tdy / tlen) }
  return arrowTip(pseudo, e, size)
}

/* Ease-in-out (aprox. cubic-bezier 0.42 0 0.58 1) para la animación JS */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export default function PintadoAcciones() {
  const { currentObservador } = useStore()
  if (!currentObservador) return <Navigate to="/login" replace />

  const [strokeColor, setStrokeColor] = useState('#dc2626')
  const [fillColor, setFillColor] = useState('#dc2626')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [sizeScale, setSizeScale] = useState(100)
  const [opacity, setOpacity] = useState(100)

  const [tool, setTool] = useState<ToolType>('select')
  const [pendingDorsal, setPendingDorsal] = useState<number | null>(null)
  const [elements, setElements] = useState<DrawEl[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Pt | null>(null)
  const [currentEl, setCurrentEl] = useState<DrawEl | null>(null)
  const [zonePoints, setZonePoints] = useState<Pt[]>([])

  const [animMode, setAnimMode] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [animDuration, setAnimDuration] = useState(2)
  const [animProgress, setAnimProgress] = useState(0)   // 0..1 reloj de animación (JS rAF)
  const rafRef = useRef<number | null>(null)
  const animStartRef = useRef<number>(0)
  const animPathRefs = useRef<Record<string, SVGPathElement | null>>({})

  const [dragState, setDragState] = useState<{ elId: string; startPt: Pt; orig: DrawEl } | null>(null)
  const [editText, setEditText] = useState<{ id: string; x: number; y: number } | null>(null)

  const [bgImage, setBgImage] = useState<string | null>(null)
  const [ytUrl, setYtUrl] = useState('')
  const [ytEmbedUrl, setYtEmbedUrl] = useState<string | null>(null)

  const [mobilePanel, setMobilePanel] = useState<'estilos' | 'lienzo' | 'herramientas'>('lienzo')

  const svgRef = useRef<SVGSVGElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fillInputRef = useRef<HTMLInputElement>(null)
  const strokeInputRef = useRef<HTMLInputElement>(null)

  const getSvgPt = useCallback((e: RME): Pt => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseDown = useCallback((e: RME) => {
    if (animMode) return
    const pt = getSvgPt(e)

    if (pendingDorsal !== null) {
      const el: DorsalEl = {
        id: uuidv4(), tool: 'dorsal', pos: pt, number: pendingDorsal,
        stroke: '#ffffff', fill: '#dc2626', strokeWidth: 2, opacity: 100,
      }
      setElements(prev => [...prev, el])
      setPendingDorsal(null)
      return
    }

    if (tool === 'select') {
      setSelectedId(null)
      setDragState(null)
      return
    }

    if (tool === 'zone' || tool === 'connector') {
      if (!isDrawing) {
        setIsDrawing(true)
        setZonePoints([pt])
      } else {
        setZonePoints(prev => [...prev, pt])
      }
      return
    }

    if (tool === 'text' || tool === 'label') {
      const newEl: TextEl = {
        id: uuidv4(), tool, pos: pt, text: tool === 'label' ? 'Etiqueta' : 'Texto',
        stroke: strokeColor, fill: fillColor, strokeWidth, opacity,
      }
      setElements(prev => [...prev, newEl])
      const svg = svgRef.current
      if (svg) {
        const rect = svg.getBoundingClientRect()
        setEditText({ id: newEl.id, x: rect.left + pt.x, y: rect.top + pt.y })
      }
      return
    }

    setIsDrawing(true)
    setDrawStart(pt)
  }, [tool, pendingDorsal, isDrawing, getSvgPt, strokeColor, fillColor, strokeWidth, opacity])

  const handleMouseMove = useCallback((e: RME) => {
    if (dragState && tool === 'select') {
      const pt = getSvgPt(e)
      const dx = pt.x - dragState.startPt.x
      const dy = pt.y - dragState.startPt.y
      const orig = dragState.orig
      setElements(prev => prev.map(el => {
        if (el.id !== dragState.elId) return el
        if (orig.tool === 'arrow-straight' || orig.tool === 'arrow-curved' || orig.tool === 'arrow-wave' || orig.tool === 'arrow-dashed') {
          const ae = orig as ArrowEl
          return { ...ae, start: { x: ae.start.x + dx, y: ae.start.y + dy }, end: { x: ae.end.x + dx, y: ae.end.y + dy } }
        }
        if (orig.tool === 'connector') {
          const ce = orig as ConnectorEl
          return { ...ce, points: ce.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }
        }
        if (orig.tool === 'text' || orig.tool === 'label') {
          const te = orig as TextEl
          return { ...te, pos: { x: te.pos.x + dx, y: te.pos.y + dy } }
        }
        if (orig.tool === 'rect' || orig.tool === 'circle' || orig.tool === 'circle-dashed' || orig.tool === 'circle-dotdash' || orig.tool === 'focus' || orig.tool === 'triangle' || orig.tool === 'cylinder' || orig.tool === 'cone') {
          const se = orig as ShapeEl
          return { ...se, x: se.x + dx, y: se.y + dy }
        }
        if (orig.tool === 'zone') {
          const ze = orig as ZoneEl
          return { ...ze, points: ze.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }
        }
        if (orig.tool === 'dorsal') {
          const de = orig as DorsalEl
          return { ...de, pos: { x: de.pos.x + dx, y: de.pos.y + dy } }
        }
        return el
      }))
      return
    }

    if (!isDrawing || !drawStart || tool === 'select' || tool === 'zone' || tool === 'connector') return
    const pt = getSvgPt(e)

    if (tool === 'arrow-straight' || tool === 'arrow-curved' || tool === 'arrow-wave' || tool === 'arrow-dashed') {
      setCurrentEl({
        id: 'preview', tool: tool as ArrowEl['tool'],
        start: drawStart, end: pt,
        stroke: strokeColor, fill: strokeColor, strokeWidth, opacity,
      })
    } else if (tool === 'rect' || tool === 'focus') {
      setCurrentEl({
        id: 'preview', tool: tool as ShapeEl['tool'],
        x: Math.min(drawStart.x, pt.x), y: Math.min(drawStart.y, pt.y),
        w: Math.abs(pt.x - drawStart.x), h: Math.abs(pt.y - drawStart.y),
        stroke: strokeColor, fill: fillColor,
        strokeWidth, opacity,
      })
    } else if (tool === 'circle' || tool === 'circle-dashed' || tool === 'circle-dotdash' || tool === 'triangle' || tool === 'cylinder' || tool === 'cone') {
      setCurrentEl({
        id: 'preview', tool,
        x: Math.min(drawStart.x, pt.x), y: Math.min(drawStart.y, pt.y),
        w: Math.abs(pt.x - drawStart.x), h: Math.abs(pt.y - drawStart.y),
        stroke: strokeColor, fill: fillColor, strokeWidth, opacity,
      })
    }
  }, [isDrawing, drawStart, tool, dragState, getSvgPt, strokeColor, fillColor, strokeWidth, opacity])

  const handleMouseUp = useCallback(() => {
    if (dragState) { setDragState(null); return }
    // Zona y conector son multiclick: NO reiniciar isDrawing al soltar,
    // o cada nuevo click empezaría de cero en vez de añadir un nodo más.
    if (tool === 'zone' || tool === 'connector') return
    if (!isDrawing) return
    if (currentEl) {
      setElements(prev => [...prev, { ...currentEl, id: uuidv4() }])
      setCurrentEl(null)
    }
    setIsDrawing(false)
    setDrawStart(null)
  }, [isDrawing, currentEl, dragState, tool])

  const handleDblClick = useCallback(() => {
    if (tool === 'zone' && zonePoints.length >= 3) {
      setElements(prev => [...prev, {
        id: uuidv4(), tool: 'zone', points: zonePoints,
        stroke: strokeColor, fill: fillColor + '40', strokeWidth, opacity,
      }])
      setZonePoints([])
      setIsDrawing(false)
    }
    if (tool === 'connector') {
      // Elimina nodos consecutivos casi idénticos (el doble-tap final
      // suele colocar dos en el mismo punto, sobre todo en táctil).
      const pts = zonePoints.filter((p, i) => {
        if (i === 0) return true
        const prev = zonePoints[i - 1]
        return Math.hypot(p.x - prev.x, p.y - prev.y) > 8
      })
      if (pts.length >= 2) {
        setElements(prev => [...prev, {
          id: uuidv4(), tool: 'connector', points: pts,
          stroke: strokeColor, fill: strokeColor, strokeWidth, opacity,
        }])
      }
      setZonePoints([])
      setIsDrawing(false)
    }
  }, [tool, zonePoints, strokeColor, fillColor, strokeWidth, opacity])

  const duplicateSelected = () => {
    if (!selectedId) return
    const el = elements.find(e => e.id === selectedId)
    if (!el) return
    const offset = 22
    let newEl: DrawEl
    if (el.tool === 'arrow-straight' || el.tool === 'arrow-curved' || el.tool === 'arrow-wave' || el.tool === 'arrow-dashed') {
      const ae = el as ArrowEl
      newEl = { ...ae, id: uuidv4(), start: { x: ae.start.x + offset, y: ae.start.y + offset }, end: { x: ae.end.x + offset, y: ae.end.y + offset } }
    } else if (el.tool === 'connector') {
      const ce = el as ConnectorEl
      newEl = { ...ce, id: uuidv4(), points: ce.points.map(p => ({ x: p.x + offset, y: p.y + offset })) }
    } else if (el.tool === 'text' || el.tool === 'label') {
      const te = el as TextEl
      newEl = { ...te, id: uuidv4(), pos: { x: te.pos.x + offset, y: te.pos.y + offset } }
    } else if (el.tool === 'rect' || el.tool === 'circle' || el.tool === 'circle-dashed' || el.tool === 'circle-dotdash' || el.tool === 'focus' || el.tool === 'triangle' || el.tool === 'cylinder' || el.tool === 'cone') {
      const se = el as ShapeEl
      newEl = { ...se, id: uuidv4(), x: se.x + offset, y: se.y + offset }
    } else if (el.tool === 'zone') {
      const ze = el as ZoneEl
      newEl = { ...ze, id: uuidv4(), points: ze.points.map(p => ({ x: p.x + offset, y: p.y + offset })) }
    } else {
      const de = el as DorsalEl
      newEl = { ...de, id: uuidv4(), pos: { x: de.pos.x + offset, y: de.pos.y + offset } }
    }
    setElements(prev => [...prev, newEl])
    setSelectedId(newEl.id)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setElements(prev => prev.filter(e => e.id !== selectedId))
    setSelectedId(null)
  }

  // Finaliza una zona/conector pendiente (nodos en zonePoints) antes de
  // cambiar de contexto, para no perder la unión ya marcada.
  const finalizePending = () => {
    if (zonePoints.length === 0) return
    if (tool === 'connector') {
      const pts = zonePoints.filter((p, i) => {
        if (i === 0) return true
        const prev = zonePoints[i - 1]
        return Math.hypot(p.x - prev.x, p.y - prev.y) > 8
      })
      if (pts.length >= 2) {
        setElements(prev => [...prev, {
          id: uuidv4(), tool: 'connector', points: pts,
          stroke: strokeColor, fill: strokeColor, strokeWidth, opacity,
        }])
      }
    } else if (tool === 'zone' && zonePoints.length >= 3) {
      setElements(prev => [...prev, {
        id: uuidv4(), tool: 'zone', points: zonePoints,
        stroke: strokeColor, fill: fillColor + '40', strokeWidth, opacity,
      }])
    }
    setZonePoints([])
    setIsDrawing(false)
  }

  // Selecciona herramienta y, en móvil/tablet, salta al lienzo para poder usarla
  const chooseTool = (t: ToolType) => {
    if (t !== tool) finalizePending()
    setTool(t)
    setPendingDorsal(null)
    setMobilePanel('lienzo')
  }

  // Motor de animación por JS (requestAnimationFrame) — funciona igual en
  // escritorio, tablet y móvil. Sustituye a SMIL (<animate>/<animateMotion>),
  // que iOS/Safari no reproduce de forma fiable.
  useEffect(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (!animMode) { setAnimProgress(0); return }
    animStartRef.current = performance.now()
    const dur = Math.max(animDuration, 0.1) * 1000
    const tick = (now: number) => {
      const t = Math.min((now - animStartRef.current) / dur, 1)
      setAnimProgress(t)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else rafRef.current = null
    }
    setAnimProgress(0)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [animMode, animKey, animDuration])

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setBgImage(ev.target?.result as string); setYtEmbedUrl(null) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleLoadVideo = () => {
    const match = ytUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (match) {
      setYtEmbedUrl(`https://www.youtube.com/embed/${match[1]}?enablejsapi=1`)
      setBgImage(null)
    }
  }

  function renderEl(el: DrawEl, key: string) {
    const isSelected = el.id === selectedId
    const alpha = el.opacity / 100
    const sw = el.strokeWidth * (sizeScale / 100)
    const selStyle = isSelected ? { filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.8))' } : undefined

    const onElMouseDown = (e: RME) => {
      e.stopPropagation()
      if (tool === 'select') {
        setSelectedId(el.id)
        setDragState({ elId: el.id, startPt: getSvgPt(e), orig: el })
      }
    }

    if (el.tool === 'arrow-straight' || el.tool === 'arrow-curved' || el.tool === 'arrow-wave' || el.tool === 'arrow-dashed') {
      const ae = el as ArrowEl
      const path = el.tool === 'arrow-curved' ? curvedPath(ae.start, ae.end)
        : el.tool === 'arrow-wave' ? wavePath(ae.start, ae.end)
        : linePath(ae.start, ae.end)
      const tip = el.tool === 'arrow-curved' ? curvedTip(ae.start, ae.end)
        : arrowTip(ae.start, ae.end)

      if (animMode) {
        const ballR = Math.max(sw * 2.5, 7)
        const p = easeInOut(animProgress)            // progreso suavizado 0..1
        const dashOffset = 1 - p                      // dibuja el trazo (pathLength=1)
        const tipOpacity = animProgress >= 0.92 ? 1 : 0
        // Posición del balón a lo largo del trazo real (getPointAtLength)
        let ballPt: Pt = ae.start
        const node = animPathRefs.current[el.id]
        if (node) {
          try {
            const total = node.getTotalLength()
            const pt = node.getPointAtLength(p * total)
            ballPt = { x: pt.x, y: pt.y }
          } catch { /* nodo aún no medible */ }
        }
        return (
          <g key={key} opacity={alpha}>
            {/* Trazo fantasma */}
            <path d={path} stroke={ae.stroke} strokeWidth={sw} fill="none" strokeLinecap="round" opacity={0.15} />
            {/* Trazo que se dibuja */}
            <path ref={n => { animPathRefs.current[el.id] = n }}
              d={path} pathLength="1"
              stroke={ae.stroke} strokeWidth={sw} fill="none" strokeLinecap="round"
              strokeDasharray="1" strokeDashoffset={dashOffset} />
            {/* Punta de flecha al final */}
            {tip && <path d={tip} fill={ae.stroke} stroke="none" opacity={tipOpacity} />}
            {/* Balón en movimiento */}
            <circle cx={ballPt.x} cy={ballPt.y} r={ballR} fill={ae.stroke} opacity={0.9} />
          </g>
        )
      }

      const dashArray = el.tool === 'arrow-dashed' ? `${sw * 4} ${sw * 2.5}` : undefined
      return (
        <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <path d={path} stroke={ae.stroke} strokeWidth={sw * 3} fill="none" opacity={0} />
          <path d={path} stroke={ae.stroke} strokeWidth={sw} fill="none" strokeLinecap="round"
            strokeDasharray={dashArray} />
          {tip && <path d={tip} fill={ae.stroke} stroke="none" />}
        </g>
      )
    }

    if (el.tool === 'rect') {
      const se = el as ShapeEl
      return (
        <rect key={key} x={se.x} y={se.y} width={se.w} height={se.h}
          stroke={se.stroke} strokeWidth={sw} fill={se.fill} fillOpacity={0.25}
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move" />
      )
    }

    if (el.tool === 'circle') {
      const se = el as ShapeEl
      return (
        <ellipse key={key} cx={se.x + se.w / 2} cy={se.y + se.h / 2}
          rx={Math.abs(se.w / 2)} ry={Math.abs(se.h / 2)}
          stroke={se.stroke} strokeWidth={sw} fill={se.fill} fillOpacity={0.25}
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move" />
      )
    }

    if (el.tool === 'circle-dashed') {
      const se = el as ShapeEl
      return (
        <ellipse key={key} cx={se.x + se.w / 2} cy={se.y + se.h / 2}
          rx={Math.abs(se.w / 2)} ry={Math.abs(se.h / 2)}
          stroke={se.stroke} strokeWidth={sw} strokeDasharray={`${sw * 3} ${sw * 2}`}
          fill={se.fill} fillOpacity={0.15}
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move" />
      )
    }

    if (el.tool === 'circle-dotdash') {
      const se = el as ShapeEl
      return (
        <ellipse key={key} cx={se.x + se.w / 2} cy={se.y + se.h / 2}
          rx={Math.abs(se.w / 2)} ry={Math.abs(se.h / 2)}
          stroke={se.stroke} strokeWidth={sw} strokeDasharray={`${sw * 5} ${sw * 2} ${sw * 0.5} ${sw * 2}`}
          strokeLinecap="round"
          fill={se.fill} fillOpacity={0.15}
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move" />
      )
    }

    if (el.tool === 'focus') {
      const se = el as ShapeEl
      return (
        <ellipse key={key} cx={se.x + se.w / 2} cy={se.y + se.h / 2}
          rx={Math.abs(se.w / 2)} ry={Math.abs(se.h / 2)}
          fill={se.fill} fillOpacity={0.55} stroke={se.stroke} strokeWidth={sw}
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move" />
      )
    }

    if (el.tool === 'triangle') {
      const se = el as ShapeEl
      const pts = `${se.x + se.w / 2},${se.y} ${se.x},${se.y + se.h} ${se.x + se.w},${se.y + se.h}`
      return (
        <polygon key={key} points={pts}
          stroke={se.stroke} strokeWidth={sw} fill={se.fill} fillOpacity={0.25}
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move" />
      )
    }

    if (el.tool === 'cylinder') {
      const se = el as ShapeEl
      const cx = se.x + se.w / 2
      const rx = Math.max(Math.abs(se.w / 2), 1)
      const ryE = Math.max(Math.abs(se.w) * 0.22, 4)
      const topCy = se.y + ryE
      const botCy = se.y + se.h - ryE
      const bodyPath = `M ${se.x},${topCy} L ${se.x},${botCy} A ${rx},${ryE} 0 0 0 ${se.x + se.w},${botCy} L ${se.x + se.w},${topCy}`
      return (
        <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <path d={bodyPath} stroke={se.stroke} strokeWidth={sw} fill={se.fill} fillOpacity={0.35} />
          <ellipse cx={cx} cy={botCy} rx={rx} ry={ryE}
            stroke={se.stroke} strokeWidth={sw} fill={se.fill} fillOpacity={0.55} />
        </g>
      )
    }

    if (el.tool === 'cone') {
      const se = el as ShapeEl
      const cx = se.x + se.w / 2
      const rx = Math.max(Math.abs(se.w / 2), 1)
      const ryE = Math.max(Math.abs(se.w) * 0.22, 4)
      const botCy = se.y + se.h - ryE
      const gradId = `cone-grad-${el.id}`
      const bodyPath = `M ${cx},${se.y} L ${se.x},${botCy} A ${rx},${ryE} 0 0 0 ${se.x + se.w},${botCy} L ${cx},${se.y}`
      return (
        <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={se.fill} stopOpacity="0" />
              <stop offset="100%" stopColor={se.fill} stopOpacity="0.65" />
            </linearGradient>
          </defs>
          <path d={bodyPath} stroke="none" fill={`url(#${gradId})`} />
          <ellipse cx={cx} cy={botCy} rx={rx} ry={ryE}
            stroke={se.stroke} strokeWidth={sw} fill={se.fill} fillOpacity={0.6} />
        </g>
      )
    }

    if (el.tool === 'zone') {
      const ze = el as ZoneEl
      const pts = ze.points.map(p => `${p.x},${p.y}`).join(' ')
      return (
        <polygon key={key} points={pts}
          stroke={ze.stroke} strokeWidth={sw} fill={ze.fill}
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move" />
      )
    }

    if (el.tool === 'connector') {
      const ce = el as ConnectorEl
      if (ce.points.length < 2) return null
      const d = ce.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      const nr = Math.max(16 * (sizeScale / 100), sw * 1.5)
      return (
        <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <path d={d} stroke={ce.stroke} strokeWidth={sw} fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
          {ce.points.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={nr} ry={nr * 0.65}
              fill={ce.fill} fillOpacity={0.85}
              stroke="white" strokeWidth={Math.max(sw * 0.4, 1)} />
          ))}
        </g>
      )
    }

    if (el.tool === 'text') {
      const te = el as TextEl
      const fs = 16 * (sizeScale / 100)
      return (
        <text key={key} x={te.pos.x} y={te.pos.y}
          fill={te.stroke} fontSize={fs} fontWeight="bold"
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move"
        >{te.text}</text>
      )
    }

    if (el.tool === 'label') {
      const te = el as TextEl
      const fs = 14 * (sizeScale / 100)
      const pw = te.text.length * fs * 0.65 + 16
      const ph = fs + 12
      return (
        <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <rect x={te.pos.x} y={te.pos.y - ph + 4} width={pw} height={ph} rx={3} fill={te.fill} />
          <polygon points={`${te.pos.x + 8},${te.pos.y + 4} ${te.pos.x + 18},${te.pos.y + 4} ${te.pos.x + 13},${te.pos.y + 14}`} fill={te.fill} />
          <text x={te.pos.x + 8} y={te.pos.y - 3} fill="white" fontSize={fs} fontWeight="bold">{te.text}</text>
        </g>
      )
    }

    if (el.tool === 'dorsal') {
      const de = el as DorsalEl
      const sz = 32 * (sizeScale / 100)
      const sc = sz / 40
      const tx = de.pos.x - sz / 2
      const ty = de.pos.y - sz / 2
      const numFs = (de.number >= 10 ? 11 : 13) * sc
      const numY = ty + sz * 0.675
      if (animMode) {
        // Parpadeo 1→0.5→1 durante las 3 primeras "pulsaciones" (0.8s c/u)
        const elapsed = animProgress * Math.max(animDuration, 0.1)
        let jerseyOpacity = 1
        if (elapsed < 2.4) {
          const phase = (elapsed % 0.8) / 0.8
          const tri = 1 - Math.abs(2 * phase - 1)   // 0 en extremos, 1 en el centro
          jerseyOpacity = 1 - 0.5 * tri
        }
        return (
          <g key={key} opacity={alpha}>
            <g transform={`translate(${tx},${ty}) scale(${sc})`}>
              <path d={JERSEY_PATH} fill={de.fill} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5 / sc} strokeLinejoin="round" opacity={jerseyOpacity}/>
            </g>
            <text x={de.pos.x} y={numY} fill="white" fontSize={numFs} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui,-apple-system,Arial,sans-serif">{de.number}</text>
          </g>
        )
      }
      return (
        <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <g transform={`translate(${tx},${ty}) scale(${sc})`}>
            <path d={JERSEY_PATH} fill={de.fill} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5 / sc} strokeLinejoin="round"/>
          </g>
          <text x={de.pos.x} y={numY} fill="white" fontSize={numFs} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui,-apple-system,Arial,sans-serif">{de.number}</text>
        </g>
      )
    }

    return null
  }

  const cursor = animMode ? 'default' : tool === 'select' ? (dragState ? 'grabbing' : 'default') : 'crosshair'

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Corporate Style */}
      <div className="bg-slate-100 text-gray-800 px-4 sm:px-6 py-3 flex-shrink-0 border-b-4 border-rfpaf-blue">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rfpaf-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <PenLine className="w-7 h-7 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-2xl font-black tracking-tight text-rfpaf-blue">ANÁLISIS LAB</h1>
              <p className="text-gray-600 text-xs mt-0.5">Herramienta de análisis visual</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-l border-gray-300 pl-4">
            <RFPAFLogo />
            <div className="text-right leading-tight">
              <p className="text-gray-800 font-bold text-xs tracking-wide">STAFF LAB</p>
              <p className="text-gray-600 text-[8px] font-semibold uppercase leading-snug">Real Federación de Fútbol</p>
              <p className="text-gray-600 text-[8px] uppercase font-semibold">Principado de Asturias</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-5 flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-4 flex-shrink-0 flex-wrap">
          <span className="text-gray-600 text-sm font-semibold whitespace-nowrap">Fondo:</span>
          <input
            type="text"
            placeholder="Pega URL de YouTube"
            value={ytUrl}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setYtUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoadVideo()}
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue"
          />
          <button
            onClick={handleLoadVideo}
            className="px-4 py-2 bg-rfpaf-blue hover:bg-blue-700 text-white text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Cargar video
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-rfpaf-red hover:bg-red-700 text-white text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Subir imagen
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
        </div>

      {/* Mobile/Tablet Tabs */}
      <div className="lg:hidden flex gap-2 flex-shrink-0 px-2">
        {(['estilos', 'lienzo', 'herramientas'] as const).map(panel => (
          <button key={panel} onClick={() => setMobilePanel(panel)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              mobilePanel === panel
                ? 'bg-rfpaf-blue text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
            {panel === 'estilos' ? 'Estilos' : panel === 'lienzo' ? 'Lienzo' : 'Herramientas'}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-4 min-h-0 flex-col lg:flex-row overflow-hidden">
        {/* Left Panel */}
        <aside className={`${mobilePanel === 'estilos' ? 'flex' : 'hidden'} lg:flex w-full lg:w-56 bg-white rounded-xl shadow-sm p-4 flex-col overflow-y-auto flex-shrink-0 max-h-[calc(100vh-280px)] lg:max-h-none`}>
          <h2 className="text-sm font-bold text-rfpaf-blue mb-4 uppercase tracking-wide">Estilos & Controles</h2>

          {/* Fill */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">Relleno</label>
            <input ref={fillInputRef} type="color" value={fillColor}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFillColor(e.target.value)}
              className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer" />
          </div>

          {/* Stroke */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">Trazo</label>
            <input ref={strokeInputRef} type="color" value={strokeColor}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStrokeColor(e.target.value)}
              className="w-full h-10 rounded-lg border-2 border-gray-300 cursor-pointer" />
          </div>

          {/* Thickness */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">Grosor: {strokeWidth}</label>
            <input type="range" min={1} max={14} value={strokeWidth}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStrokeWidth(+e.target.value)}
              className="w-full accent-rfpaf-red cursor-pointer" />
          </div>

          {/* Size */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">Tamaño: {sizeScale}%</label>
            <input type="range" min={50} max={300} value={sizeScale}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSizeScale(+e.target.value)}
              className="w-full accent-rfpaf-red cursor-pointer" />
          </div>

          {/* Opacity */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">Transparencia: {opacity}%</label>
            <input type="range" min={10} max={100} value={opacity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setOpacity(+e.target.value)}
              className="w-full accent-rfpaf-red cursor-pointer" />
          </div>

          <hr className="my-4" />

          {/* Dorsales */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Dorsales</p>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => (
                <button
                  key={n}
                  onClick={() => {
                    const v = pendingDorsal === n ? null : n
                    setPendingDorsal(v)
                    if (v !== null) setMobilePanel('lienzo')
                  }}
                  title={`Dorsal ${n}`}
                  className={`flex items-center justify-center rounded-lg p-1 transition-all border-2 ${
                    pendingDorsal === n
                      ? 'border-rfpaf-red bg-red-50 shadow-md scale-105'
                      : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <JerseyIcon
                    fill={pendingDorsal === n ? '#dc2626' : fillColor}
                    number={n}
                    size={40}
                  />
                </button>
              ))}
            </div>
            {pendingDorsal !== null && (
              <p className="text-xs text-rfpaf-red font-semibold">
                Dorsal {pendingDorsal} seleccionado. Click en el campo para colocar.
              </p>
            )}
          </div>
        </aside>

        {/* Center Canvas */}
        <div className={`${mobilePanel === 'lienzo' ? 'flex' : 'hidden'} lg:flex flex-1 bg-white rounded-xl shadow-sm overflow-hidden min-w-0 max-h-[calc(100vh-280px)] lg:max-h-none relative`} style={{ cursor }}>
          {/* Fondo: imagen estática */}
          {bgImage && (
            <img
              src={bgImage} alt="fondo"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
            />
          )}
          {/* Fondo: iframe YouTube */}
          {ytEmbedUrl && (
            <iframe
              src={ytEmbedUrl}
              className="absolute inset-0 w-full h-full border-0 z-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {/* Estado vacío */}
          {!bgImage && !ytEmbedUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 z-0 pointer-events-none">
              <svg viewBox="0 0 64 64" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="32" cy="32" r="28" />
                <path d="M32 8 L32 12 M32 52 L32 56 M8 32 L12 32 M52 32 L56 32" />
                <path d="M20 20 Q32 14 44 20 Q50 32 44 44 Q32 50 20 44 Q14 32 20 20 Z" />
              </svg>
              <p className="text-sm mt-4">Carga un video o imagen para empezar</p>
            </div>
          )}

          {/* Lienzo SVG — siempre encima (z-10) capturando eventos (ratón + táctil) */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full z-10"
            style={{ touchAction: 'none' }}
            onPointerDown={handleMouseDown}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onDoubleClick={handleDblClick}
          >
            {elements.map(el => renderEl(el, el.id))}
            {currentEl && renderEl(currentEl, 'preview')}

            {zonePoints.length >= 1 && (
              <>
                <path
                  d={`M ${zonePoints[0].x} ${zonePoints[0].y} ${zonePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                  stroke={strokeColor} strokeWidth={strokeWidth} fill="none"
                  strokeDasharray={tool === 'connector' ? undefined : '5 3'}
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {zonePoints.map((p, i) =>
                  tool === 'connector'
                    ? <ellipse key={i} cx={p.x} cy={p.y}
                        rx={Math.max(16 * (sizeScale / 100), strokeWidth * 1.5)}
                        ry={Math.max(16 * (sizeScale / 100), strokeWidth * 1.5) * 0.65}
                        fill={strokeColor} fillOpacity={0.85} stroke="white" strokeWidth={1} />
                    : <circle key={i} cx={p.x} cy={p.y} r={3} fill={strokeColor} />
                )}
              </>
            )}
          </svg>

          {/* Animation overlay controls */}
          {animMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-gray-900/90 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-xl">
              <button
                onClick={() => { setAnimProgress(0); setAnimKey(k => k + 1) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reproducir
              </button>
              <div className="flex items-center gap-2 text-white text-xs">
                <span className="opacity-60 whitespace-nowrap">Velocidad</span>
                <input
                  type="range" min="0.5" max="5" step="0.5"
                  value={animDuration}
                  onChange={e => setAnimDuration(+e.target.value)}
                  className="w-20 accent-green-400 cursor-pointer"
                />
                <span className="opacity-80 w-8">{animDuration}s</span>
              </div>
              <div className="w-px h-5 bg-white/20" />
              <button
                onClick={() => setAnimMode(false)}
                className="text-xs text-gray-400 hover:text-white font-semibold transition-colors"
              >
                Salir
              </button>
            </div>
          )}

          {editText && (() => {
            const el = elements.find(e => e.id === editText.id) as TextEl | undefined
            if (!el) return null
            return (
              <input
                autoFocus
                defaultValue={el.text}
                onChange={(ev: ChangeEvent<HTMLInputElement>) => {
                  setElements(prev => prev.map(e =>
                    e.id === editText.id ? { ...e, text: ev.target.value } as DrawEl : e
                  ))
                }}
                onBlur={() => setEditText(null)}
                onKeyDown={ev => { if (ev.key === 'Enter') setEditText(null) }}
                style={{
                  position: 'absolute',
                  left: editText.x - (svgRef.current?.getBoundingClientRect().left ?? 0),
                  top: editText.y - (svgRef.current?.getBoundingClientRect().top ?? 0) - 26,
                  background: 'white',
                  color: '#1f2937',
                  border: '2px solid #dc2626',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  minWidth: '100px',
                  outline: 'none',
                  zIndex: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
            )
          })()}
        </div>

        {/* Right Panel - Tools */}
        <aside className={`${mobilePanel === 'herramientas' ? 'flex' : 'hidden'} lg:flex w-full lg:w-32 bg-white rounded-xl shadow-sm p-3 flex-col items-center gap-4 overflow-y-auto flex-shrink-0 max-h-[calc(100vh-280px)] lg:max-h-none`}>
          {/* Actions */}
          <div className="flex gap-2 flex-col w-full">
            <button
              title="Mover"
              onClick={() => chooseTool('select')}
              className={`w-full px-2 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                tool === 'select'
                  ? 'bg-rfpaf-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Move className="w-4 h-4" />
              <span className="text-xs font-semibold">Mover</span>
            </button>
            <button
              title="Duplicar"
              onClick={duplicateSelected}
              className="w-full px-2 py-2 rounded-lg flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            >
              <Copy className="w-4 h-4" />
              <span className="text-xs font-semibold">Duplicar</span>
            </button>
            <button
              title="Borrar"
              onClick={deleteSelected}
              className="w-full px-2 py-2 rounded-lg flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Borrar</span>
            </button>
            <button
              title="Modo Animación"
              onClick={() => { setAnimProgress(0); setAnimMode(m => !m); setAnimKey(k => k + 1); setMobilePanel('lienzo') }}
              className={`w-full px-2 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${animMode ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Clapperboard className="w-4 h-4" />
              <span className="text-xs font-semibold">{animMode ? 'Animando' : 'Animar'}</span>
            </button>
          </div>

          <hr className="w-full" />

          {/* Tools */}
          <div className="w-full space-y-3">
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider text-center">Flechas</p>
              <div className="grid grid-cols-2 gap-2">
                <ToolBtn title="Recta" active={tool === 'arrow-straight'} onClick={() => chooseTool('arrow-straight')}>
                  <IcoStraightArrow />
                </ToolBtn>
                <ToolBtn title="Curva" active={tool === 'arrow-curved'} onClick={() => chooseTool('arrow-curved')}>
                  <IcoCurvedArrow />
                </ToolBtn>
                <ToolBtn title="Onda" active={tool === 'arrow-wave'} onClick={() => chooseTool('arrow-wave')}>
                  <IcoWaveArrow />
                </ToolBtn>
                <ToolBtn title="Discontinua" active={tool === 'arrow-dashed'} onClick={() => chooseTool('arrow-dashed')}>
                  <IcoDashedArrow />
                </ToolBtn>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider text-center">Textos</p>
              <div className="grid grid-cols-2 gap-2">
                <ToolBtn title="Texto" active={tool === 'text'} onClick={() => chooseTool('text')}>
                  <span className="text-xs font-bold">T</span>
                </ToolBtn>
                <ToolBtn title="Etiqueta" active={tool === 'label'} onClick={() => chooseTool('label')}>
                  <IcoLabel />
                </ToolBtn>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider text-center">Zonas</p>
              <div className="grid grid-cols-2 gap-2">
                <ToolBtn title="Rect" active={tool === 'rect'} onClick={() => chooseTool('rect')}>
                  <IcoRect />
                </ToolBtn>
                <ToolBtn title="Círculo" active={tool === 'circle'} onClick={() => chooseTool('circle')}>
                  <IcoCircle />
                </ToolBtn>
                <ToolBtn title="Elipse discontinua" active={tool === 'circle-dashed'} onClick={() => chooseTool('circle-dashed')}>
                  <IcoCircleDashed />
                </ToolBtn>
                <ToolBtn title="Elipse punto-línea" active={tool === 'circle-dotdash'} onClick={() => chooseTool('circle-dotdash')}>
                  <IcoCircleDotDash />
                </ToolBtn>
                <ToolBtn title="Triángulo" active={tool === 'triangle'} onClick={() => chooseTool('triangle')}>
                  <IcoTriangle />
                </ToolBtn>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider text-center">Otros</p>
              <div className="grid grid-cols-2 gap-2">
                <ToolBtn title="Conector" active={tool === 'connector'} onClick={() => chooseTool('connector')}>
                  <IcoConnector />
                </ToolBtn>
                <ToolBtn title="Foco" active={tool === 'focus'} onClick={() => chooseTool('focus')}>
                  <IcoFocus />
                </ToolBtn>
                <ToolBtn title="Cilindro" active={tool === 'cylinder'} onClick={() => chooseTool('cylinder')}>
                  <IcoCylinder />
                </ToolBtn>
                <ToolBtn title="Cono" active={tool === 'cone'} onClick={() => chooseTool('cone')}>
                  <IcoCone />
                </ToolBtn>
              </div>
            </div>
          </div>
        </aside>
      </div>
      </div>
    </div>
  )
}

function ToolBtn({ children, active, onClick, title }: {
  children: React.ReactNode; active?: boolean; onClick: () => void; title: string
}) {
  return (
    <button
      title={title} onClick={onClick}
      className={`w-full h-8 rounded flex items-center justify-center transition-all ${
        active
          ? 'bg-rfpaf-blue text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function IcoDashedArrow() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="3" y1="15" x2="14" y2="4" strokeDasharray="3 2" />
      <path d="M14 4 L9.5 4.5 L13.5 8.5" strokeLinejoin="round" />
    </svg>
  )
}

function IcoStraightArrow() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="3" y1="15" x2="14" y2="4" />
      <path d="M14 4 L9.5 4.5 L13.5 8.5" strokeLinejoin="round" />
    </svg>
  )
}

function IcoCurvedArrow() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M3 15 Q4 5 14 4" />
      <path d="M14 4 L9.5 4.5 L13.5 8.5" strokeLinejoin="round" />
    </svg>
  )
}

function IcoWaveArrow() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M2 12 C3.5 7 5.5 7 7 11 C8.5 15 10.5 15 12 11 C13.5 7 15 5.5 16 4.5" />
      <path d="M16 4.5 L12 5 L15 8.5" strokeLinejoin="round" />
    </svg>
  )
}

function IcoLabel() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14">
      <rect x="1" y="3" width="16" height="10" rx="2" fill="currentColor" fillOpacity="0.4" />
      <text x="9" y="10.5" textAnchor="middle" fill="currentColor" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">ABC</text>
    </svg>
  )
}

function IcoRect() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2" y="4" width="14" height="10" rx="1" />
    </svg>
  )
}

function IcoCircle() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="9" cy="9" rx="7" ry="5" />
    </svg>
  )
}

function IcoCircleDashed() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="9" cy="9" rx="7" ry="5" strokeDasharray="3.5 2.5" />
    </svg>
  )
}

function IcoCircleDotDash() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="9" cy="9" rx="7" ry="5" strokeDasharray="5 2 0.5 2" strokeLinecap="round" />
    </svg>
  )
}


function IcoConnector() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <line x1="4" y1="4" x2="14" y2="14" strokeDasharray="2.5 2" />
      <circle cx="4" cy="4" r="2" fill="currentColor" stroke="none" />
      <circle cx="14" cy="14" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IcoFocus() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14">
      <ellipse cx="9" cy="11" rx="8" ry="5" fill="currentColor" fillOpacity="0.45" />
    </svg>
  )
}

function IcoTriangle() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <polygon points="9,2 17,16 1,16" />
    </svg>
  )
}

function IcoCylinder() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2,5 L2,13 A7,3 0 0 0 16,13 L16,5" fill="currentColor" fillOpacity="0.15" />
      <ellipse cx="9" cy="13" rx="7" ry="3" fill="currentColor" fillOpacity="0.25" />
      <ellipse cx="9" cy="5" rx="7" ry="3" fill="currentColor" fillOpacity="0.5" />
    </svg>
  )
}

function IcoCone() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="9" cy="13" rx="7" ry="3" fill="currentColor" fillOpacity="0.55" />
    </svg>
  )
}
