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
  | 'arrow-straight' | 'arrow-curved' | 'arrow-wave'
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
  sizeScale?: number   // tamaño individual del elemento (%, def. global)
  tilt?: number        // giro individual (conector)
  flatten?: number     // perspectiva individual (conector)
}

interface ArrowEl extends BaseEl {
  tool: 'arrow-straight' | 'arrow-curved' | 'arrow-wave'
  start: Pt; end: Pt
  dashed?: boolean   // trazo discontinuo
  curve?: number     // curvatura (curva): + un lado, − el otro
  ctrl?: Pt          // punto de control libre (curva en cualquier plano)
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

// Un "momento" guarda un instante del vídeo + una copia de los dibujos de ese instante
interface Moment {
  id: string
  time: number          // segundos en el vídeo
  label: string
  elements: DrawEl[]    // snapshot de los dibujos
  source: 'yt' | 'video'
}

function linePath(s: Pt, e: Pt) {
  return `M ${s.x} ${s.y} L ${e.x} ${e.y}`
}

// Punto de control por defecto (perpendicular a la línea) a partir del escalar k
function curveCtrl(s: Pt, e: Pt, k = 0.28): Pt {
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2
  const dx = e.x - s.x, dy = e.y - s.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: mx - (dy / len) * len * k, y: my + (dx / len) * len * k }
}

function curvedPath(s: Pt, e: Pt, c: Pt) {
  return `M ${s.x} ${s.y} Q ${c.x} ${c.y} ${e.x} ${e.y}`
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

function curvedTip(e: Pt, c: Pt, size = 14): string {
  const tdx = e.x - c.x, tdy = e.y - c.y
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
  const [connectorTilt, setConnectorTilt] = useState(12)      // giro elipse conector (variable)
  const [connectorFlatten, setConnectorFlatten] = useState(40) // achatado % (variable)
  const [arrowDashed, setArrowDashed] = useState(false)        // flecha discontinua (por defecto)
  const [curveAmount, setCurveAmount] = useState(28)           // curvatura de la flecha curva (por defecto)

  const [tool, setTool] = useState<ToolType>('select')
  const [pendingDorsal, setPendingDorsal] = useState<number | null>(null)
  const [elements, setElements] = useState<DrawEl[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Pt | null>(null)
  const [currentEl, setCurrentEl] = useState<DrawEl | null>(null)
  const [zonePoints, setZonePoints] = useState<Pt[]>([])
  const [ctrlDrag, setCtrlDrag] = useState<string | null>(null)  // id de flecha cuyo tirador se arrastra

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
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoFrameCanvas, setVideoFrameCanvas] = useState<string | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoError, setVideoError] = useState<string | null>(null)
  const durationProbing = useRef(false)
  // YouTube IFrame API
  const ytPlayerRef = useRef<any>(null)
  const [ytPlaying, setYtPlaying] = useState(false)
  const [ytCurrent, setYtCurrent] = useState(0)
  const [ytDuration, setYtDuration] = useState(0)
  const ytPollRef = useRef<number | null>(null)
  // Momentos guardados (Opción B)
  const [moments, setMoments] = useState<Moment[]>([])
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null)
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null)

  const [mobilePanel, setMobilePanel] = useState<'estilos' | 'lienzo' | 'herramientas'>('lienzo')

  const svgRef = useRef<SVGSVGElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fillInputRef = useRef<HTMLInputElement>(null)
  const strokeInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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
        stroke: '#ffffff', fill: '#dc2626', strokeWidth: 2, opacity: 100, sizeScale,
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
        stroke: strokeColor, fill: fillColor, strokeWidth, opacity, sizeScale,
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
    if (ctrlDrag) {
      const pt = getSvgPt(e)
      setElements(prev => prev.map(el => el.id === ctrlDrag ? { ...el, ctrl: pt } as DrawEl : el))
      return
    }
    if (dragState && tool === 'select') {
      const pt = getSvgPt(e)
      const dx = pt.x - dragState.startPt.x
      const dy = pt.y - dragState.startPt.y
      const orig = dragState.orig
      setElements(prev => prev.map(el => {
        if (el.id !== dragState.elId) return el
        if (orig.tool === 'arrow-straight' || orig.tool === 'arrow-curved' || orig.tool === 'arrow-wave') {
          const ae = orig as ArrowEl
          return {
            ...ae,
            start: { x: ae.start.x + dx, y: ae.start.y + dy },
            end: { x: ae.end.x + dx, y: ae.end.y + dy },
            ctrl: ae.ctrl ? { x: ae.ctrl.x + dx, y: ae.ctrl.y + dy } : undefined,
          }
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

    if (tool === 'arrow-straight' || tool === 'arrow-curved' || tool === 'arrow-wave') {
      setCurrentEl({
        id: 'preview', tool: tool as ArrowEl['tool'],
        start: drawStart, end: pt,
        stroke: strokeColor, fill: strokeColor, strokeWidth, opacity,
        dashed: arrowDashed, curve: curveAmount,
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
  }, [isDrawing, drawStart, tool, dragState, ctrlDrag, getSvgPt, strokeColor, fillColor, strokeWidth, opacity])

  const handleMouseUp = useCallback(() => {
    if (ctrlDrag) { setCtrlDrag(null); return }
    if (dragState) { setDragState(null); return }
    // Zona y conector son multiclick: NO reiniciar isDrawing al soltar,
    // o cada nuevo click empezaría de cero en vez de añadir un nodo más.
    if (tool === 'zone' || tool === 'connector') return
    if (!isDrawing) return
    if (currentEl) {
      setElements(prev => [...prev, { ...currentEl, id: uuidv4(), sizeScale }])
      setCurrentEl(null)
    }
    setIsDrawing(false)
    setDrawStart(null)
  }, [isDrawing, currentEl, dragState, ctrlDrag, tool, sizeScale])

  const handleDblClick = useCallback(() => {
    if (tool === 'zone' && zonePoints.length >= 3) {
      setElements(prev => [...prev, {
        id: uuidv4(), tool: 'zone', points: zonePoints,
        stroke: strokeColor, fill: fillColor + '40', strokeWidth, opacity, sizeScale,
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
          sizeScale, tilt: connectorTilt, flatten: connectorFlatten,
        }])
      }
      setZonePoints([])
      setIsDrawing(false)
    }
  }, [tool, zonePoints, strokeColor, fillColor, strokeWidth, opacity, sizeScale, connectorTilt, connectorFlatten])

  const duplicateSelected = () => {
    if (!selectedId) return
    const el = elements.find(e => e.id === selectedId)
    if (!el) return
    const offset = 22
    let newEl: DrawEl
    if (el.tool === 'arrow-straight' || el.tool === 'arrow-curved' || el.tool === 'arrow-wave') {
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
          sizeScale, tilt: connectorTilt, flatten: connectorFlatten,
        }])
      }
    } else if (tool === 'zone' && zonePoints.length >= 3) {
      setElements(prev => [...prev, {
        id: uuidv4(), tool: 'zone', points: zonePoints,
        stroke: strokeColor, fill: fillColor + '40', strokeWidth, opacity, sizeScale,
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
      const params = `enablejsapi=1&controls=0&modestbranding=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
      setYtEmbedUrl(`https://www.youtube.com/embed/${match[1]}?${params}`)
      setBgImage(null)
      setVideoUrl(null)
    }
  }

  // Cargar la API de YouTube IFrame una sola vez
  useEffect(() => {
    const w = window as any
    if (w.YT && w.YT.Player) return
    if (document.getElementById('yt-iframe-api')) return
    const tag = document.createElement('script')
    tag.id = 'yt-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(tag)
  }, [])

  // Crear el reproductor cuando hay un embed de YouTube
  useEffect(() => {
    if (!ytEmbedUrl) {
      // limpiar
      if (ytPollRef.current) { clearInterval(ytPollRef.current); ytPollRef.current = null }
      ytPlayerRef.current = null
      setYtPlaying(false); setYtCurrent(0); setYtDuration(0)
      return
    }
    const w = window as any
    let cancelled = false

    const createPlayer = () => {
      if (cancelled) return
      ytPlayerRef.current = new w.YT.Player('yt-player', {
        events: {
          onReady: (e: any) => {
            setYtDuration(e.target.getDuration() || 0)
          },
          onStateChange: (e: any) => {
            const YT = w.YT
            setYtPlaying(e.data === YT.PlayerState.PLAYING)
            if (e.data === YT.PlayerState.PLAYING) {
              if (ytPollRef.current) clearInterval(ytPollRef.current)
              ytPollRef.current = window.setInterval(() => {
                const p = ytPlayerRef.current
                if (p && p.getCurrentTime) {
                  setYtCurrent(p.getCurrentTime() || 0)
                  if (!ytDuration && p.getDuration) setYtDuration(p.getDuration() || 0)
                }
              }, 200)
            } else {
              if (ytPollRef.current) { clearInterval(ytPollRef.current); ytPollRef.current = null }
              const p = ytPlayerRef.current
              if (p && p.getCurrentTime) setYtCurrent(p.getCurrentTime() || 0)
            }
          },
        },
      })
    }

    if (w.YT && w.YT.Player) {
      // pequeño retardo para asegurar que el iframe está en el DOM
      setTimeout(createPlayer, 50)
    } else {
      w.onYouTubeIframeAPIReady = createPlayer
    }

    return () => {
      cancelled = true
      if (ytPollRef.current) { clearInterval(ytPollRef.current); ytPollRef.current = null }
    }
  }, [ytEmbedUrl])

  const ytTogglePlay = () => {
    const p = ytPlayerRef.current
    if (!p) return
    if (ytPlaying) p.pauseVideo()
    else p.playVideo()
  }

  const ytSeek = (t: number) => {
    setYtCurrent(t)
    const p = ytPlayerRef.current
    if (p && p.seekTo) p.seekTo(t, true)
  }

  /* ─── Momentos guardados (Opción B) ─── */
  const currentVideoTime = () => (videoUrl ? videoCurrentTime : ytEmbedUrl ? ytCurrent : 0)

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const saveMoment = () => {
    if (!videoUrl && !ytEmbedUrl) return
    if (elements.length === 0) return  // nada que guardar
    const time = currentVideoTime()
    const m: Moment = {
      id: uuidv4(),
      time,
      label: `Momento ${moments.length + 1}`,
      elements: JSON.parse(JSON.stringify(elements)),
      source: videoUrl ? 'video' : 'yt',
    }
    setMoments(prev => [...prev, m].sort((a, b) => a.time - b.time))
    // Limpiar el lienzo para la siguiente jugada (los dibujos quedan guardados en el momento)
    setElements([])
    setSelectedId(null)
    setActiveMomentId(null)
  }

  const loadMoment = (m: Moment) => {
    // Saltar al instante y pausar
    if (videoUrl && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = m.time
      setVideoCurrentTime(m.time)
    } else if (ytEmbedUrl && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo?.(m.time, true)
      ytPlayerRef.current.pauseVideo?.()
      setYtCurrent(m.time)
    }
    // Cargar los dibujos del momento (copia para no mutar el guardado)
    setElements(JSON.parse(JSON.stringify(m.elements)))
    setSelectedId(null)
    setActiveMomentId(m.id)
  }

  const updateMoment = (id: string) => {
    setMoments(prev => prev.map(m =>
      m.id === id ? { ...m, elements: JSON.parse(JSON.stringify(elements)), time: currentVideoTime() } : m
    ).sort((a, b) => a.time - b.time))
    setActiveMomentId(id)
  }

  const deleteMoment = (id: string) => {
    setMoments(prev => prev.filter(m => m.id !== id))
    if (activeMomentId === id) setActiveMomentId(null)
  }

  const renameMoment = (id: string, label: string) => {
    setMoments(prev => prev.map(m => m.id === id ? { ...m, label } : m))
  }

  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Aviso temprano para formatos que Chrome no decodifica (HEVC .mov de iPhone, etc.)
    if (file.type && !document.createElement('video').canPlayType(file.type)) {
      // canPlayType devuelve '' si no puede; no bloqueamos (a veces miente), pero avisamos
      console.warn('Posible formato no compatible:', file.type)
    }
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setVideoFrameCanvas(null)
    setIsVideoPlaying(false)
    setVideoDuration(0)
    setVideoCurrentTime(0)
    setVideoError(null)
    durationProbing.current = false
    setYtEmbedUrl(null)
    setBgImage(null)
    e.target.value = ''
  }

  // duration === Infinity en muchos vídeos (WebM de grabación, MP4 fragmentado):
  // forzamos el cálculo haciendo un seek a un tiempo enorme y volviendo a 0.
  const handleLoadedMetadata = () => {
    const v = videoRef.current
    if (!v) return
    if (v.duration === Infinity || isNaN(v.duration)) {
      durationProbing.current = true
      v.currentTime = 1e101
    } else {
      setVideoDuration(v.duration)
      setVideoCurrentTime(0)
    }
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    if (durationProbing.current) {
      // Estamos sondeando la duración real
      durationProbing.current = false
      setVideoDuration(v.duration === Infinity || isNaN(v.duration) ? 0 : v.duration)
      v.currentTime = 0
      setVideoCurrentTime(0)
      return
    }
    setVideoCurrentTime(v.currentTime)
  }

  const captureFrame = () => {
    const v = videoRef.current
    if (!v) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = v.videoWidth || 640
    canvas.height = v.videoHeight || 360
    ctx.drawImage(v, 0, 0)
    setVideoFrameCanvas(canvas.toDataURL('image/png'))
  }

  const togglePlayPause = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      setVideoFrameCanvas(null)
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }

  const seekVideo = (t: number) => {
    setVideoCurrentTime(t)
    if (videoRef.current) videoRef.current.currentTime = t
  }

  function renderEl(el: DrawEl, key: string) {
    const isSelected = el.id === selectedId
    const alpha = el.opacity / 100
    const elSize = el.sizeScale ?? sizeScale          // tamaño individual del elemento
    const sw = el.strokeWidth * (elSize / 100)
    const selStyle = isSelected ? { filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.8))' } : undefined

    const onElMouseDown = (e: RME) => {
      e.stopPropagation()
      if (tool === 'select') {
        setSelectedId(el.id)
        setDragState({ elId: el.id, startPt: getSvgPt(e), orig: el })
      }
    }

    if (el.tool === 'arrow-straight' || el.tool === 'arrow-curved' || el.tool === 'arrow-wave') {
      const ae = el as ArrowEl
      const k = (ae.curve ?? 28) / 100
      const cpt = ae.ctrl ?? curveCtrl(ae.start, ae.end, k)   // punto de control (libre o calculado)
      const path = el.tool === 'arrow-curved' ? curvedPath(ae.start, ae.end, cpt)
        : el.tool === 'arrow-wave' ? wavePath(ae.start, ae.end)
        : linePath(ae.start, ae.end)
      const tip = el.tool === 'arrow-curved' ? curvedTip(ae.end, cpt)
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

      const dashArray = ae.dashed ? `${sw * 4} ${sw * 2.5}` : undefined
      const showHandle = isSelected && el.tool === 'arrow-curved' && tool === 'select'
      return (
        <g key={key} opacity={alpha} style={selStyle}>
          <path d={path} stroke={ae.stroke} strokeWidth={sw * 3} fill="none" opacity={0}
            onPointerDown={onElMouseDown} cursor="move" />
          <path d={path} stroke={ae.stroke} strokeWidth={sw} fill="none" strokeLinecap="round"
            strokeDasharray={dashArray} onPointerDown={onElMouseDown} cursor="move" />
          {tip && <path d={tip} fill={ae.stroke} stroke="none" onPointerDown={onElMouseDown} cursor="move" />}
          {showHandle && (
            <>
              <line x1={ae.start.x} y1={ae.start.y} x2={cpt.x} y2={cpt.y} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
              <line x1={ae.end.x} y1={ae.end.y} x2={cpt.x} y2={cpt.y} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
              {/* Área de toque amplia (invisible) para el dedo en tablet/móvil */}
              <circle cx={cpt.x} cy={cpt.y} r={26} fill="transparent" style={{ touchAction: 'none' }}
                cursor="grab"
                onPointerDown={(e: RME) => { e.stopPropagation(); setSelectedId(el.id); setCtrlDrag(el.id) }} />
              {/* Tirador visible */}
              <circle cx={cpt.x} cy={cpt.y} r={12} fill="#3b82f6" stroke="white" strokeWidth={2.5}
                pointerEvents="none" />
              <circle cx={cpt.x} cy={cpt.y} r={4} fill="white" pointerEvents="none" />
            </>
          )}
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
      const nr = Math.max(16 * (elSize / 100), sw * 1.5)
      const tilt = ce.tilt ?? connectorTilt
      const flatten = ce.flatten ?? connectorFlatten
      // La transparencia (propia del elemento) afecta SOLO a las elipses; la línea queda sólida
      const ellipseAlpha = ce.opacity / 100
      return (
        <g key={key} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <path d={d} stroke={ce.stroke} strokeWidth={sw} fill="none"
            strokeLinecap="round" strokeLinejoin="round" opacity={1} />
          {ce.points.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={nr} ry={nr * (flatten / 100)}
              transform={`rotate(${tilt} ${p.x} ${p.y})`}
              fill={ce.fill} fillOpacity={ellipseAlpha}
              stroke="white" strokeWidth={Math.max(sw * 0.4, 1)} strokeOpacity={ellipseAlpha} />
          ))}
        </g>
      )
    }

    if (el.tool === 'text') {
      const te = el as TextEl
      const fs = 16 * (elSize / 100)
      return (
        <text key={key} x={te.pos.x} y={te.pos.y}
          fill={te.stroke} fontSize={fs} fontWeight="bold"
          opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move"
        >{te.text}</text>
      )
    }

    if (el.tool === 'label') {
      const te = el as TextEl
      const fs = 14 * (elSize / 100)
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
      const sz = 32 * (elSize / 100)
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
  const selectedEl = selectedId ? elements.find(e => e.id === selectedId) ?? null : null
  // Mientras el vídeo se reproduce ocultamos los dibujos (solo se ven al pausar en su momento)
  const mediaPlaying = isVideoPlaying || ytPlaying
  const selIsConnector = selectedEl?.tool === 'connector'
  const selIsArrow = selectedEl?.tool === 'arrow-straight' || selectedEl?.tool === 'arrow-curved' || selectedEl?.tool === 'arrow-wave'
  const selIsCurvedArrow = selectedEl?.tool === 'arrow-curved'
  // Aplica un cambio de estilo al elemento seleccionado, o al valor por defecto si no hay selección
  const updateSelected = (patch: Partial<DrawEl>) => {
    if (!selectedId) return
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ...patch } as DrawEl : el))
  }

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
          <button
            onClick={() => videoInputRef.current?.click()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Cargar vídeo
          </button>
          <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="sr-only" />
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
            YouTube
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-rfpaf-red hover:bg-red-700 text-white text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Imagen
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

      {/* Barra controles vídeo — fuera del canvas, sin conflicto z-index */}
      {videoUrl && (
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-2.5 flex-wrap">
            <button
              onClick={togglePlayPause}
              disabled={!!videoError}
              className="px-4 py-1.5 rounded-lg bg-rfpaf-blue hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors whitespace-nowrap"
            >
              {isVideoPlaying ? '⏸ Pausar' : '▶ Reproducir'}
            </button>
            <input
              type="range"
              min="0"
              max={videoDuration > 0 ? videoDuration : 100}
              step="0.1"
              value={videoCurrentTime}
              disabled={!!videoError || videoDuration <= 0}
              onChange={e => seekVideo(parseFloat(e.target.value))}
              className="flex-1 min-w-[120px] lab-range text-rfpaf-blue cursor-pointer disabled:opacity-40"
            />
            <span className="text-white text-xs tabular-nums whitespace-nowrap">
              {videoCurrentTime.toFixed(1)}s{videoDuration > 0 ? ` / ${videoDuration.toFixed(1)}s` : ''}
            </span>
            {videoFrameCanvas && !videoError && (
              <span className="text-green-400 text-xs font-semibold whitespace-nowrap">⬛ Frame capturado — dibuja encima</span>
            )}
            <button
              onClick={saveMoment}
              disabled={!!videoError}
              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-sm transition-colors whitespace-nowrap"
            >
              ＋ Guardar momento
            </button>
            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.pause()
                setVideoFrameCanvas(null)
                setVideoUrl(null)
                setIsVideoPlaying(false)
                setVideoDuration(0)
                setVideoCurrentTime(0)
                setVideoError(null)
              }}
              className="px-3 py-1.5 rounded-lg bg-rfpaf-red hover:bg-red-700 text-white font-bold text-sm transition-colors whitespace-nowrap"
            >
              ✕ Cerrar vídeo
            </button>
          </div>
          {videoError && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-xs rounded-lg px-4 py-2 font-semibold">
              ⚠️ {videoError}
            </div>
          )}
        </div>
      )}

      {/* Barra controles YouTube — play/pausa propios (la API permite controlar el iframe) */}
      {ytEmbedUrl && (
        <div className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-2.5 flex-shrink-0 flex-wrap">
          <button
            onClick={ytTogglePlay}
            className="px-4 py-1.5 rounded-lg bg-rfpaf-blue hover:bg-blue-700 text-white font-bold text-sm transition-colors whitespace-nowrap"
          >
            {ytPlaying ? '⏸ Pausar' : '▶ Reproducir'}
          </button>
          <input
            type="range"
            min="0"
            max={ytDuration > 0 ? ytDuration : 100}
            step="0.1"
            value={ytCurrent}
            disabled={ytDuration <= 0}
            onChange={e => ytSeek(parseFloat(e.target.value))}
            className="flex-1 min-w-[120px] lab-range text-rfpaf-blue cursor-pointer disabled:opacity-40"
          />
          <span className="text-white text-xs tabular-nums whitespace-nowrap">
            {ytCurrent.toFixed(0)}s{ytDuration > 0 ? ` / ${ytDuration.toFixed(0)}s` : ''}
          </span>
          {!ytPlaying && (
            <span className="text-green-400 text-xs font-semibold whitespace-nowrap">⏸ Pausado — dibuja encima</span>
          )}
          <button
            onClick={saveMoment}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors whitespace-nowrap"
          >
            ＋ Guardar momento
          </button>
          <button
            onClick={() => { setYtEmbedUrl(null); setYtUrl('') }}
            className="px-3 py-1.5 rounded-lg bg-rfpaf-red hover:bg-red-700 text-white font-bold text-sm transition-colors whitespace-nowrap"
          >
            ✕ Cerrar vídeo
          </button>
        </div>
      )}

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

          {/* Thickness — individual del seleccionado o por defecto */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">
              Grosor: {selectedEl ? selectedEl.strokeWidth : strokeWidth}
              {selectedEl && <span className="ml-1 text-rfpaf-blue normal-case">(elem.)</span>}
            </label>
            <input type="range" min={1} max={14} value={selectedEl ? selectedEl.strokeWidth : strokeWidth}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const v = +e.target.value
                if (selectedId) updateSelected({ strokeWidth: v }); else setStrokeWidth(v)
              }}
              className="w-full lab-range text-rfpaf-red cursor-pointer" />
          </div>

          {/* Size — individual del seleccionado o por defecto */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">
              Tamaño: {selectedEl ? (selectedEl.sizeScale ?? sizeScale) : sizeScale}%
              {selectedEl && <span className="ml-1 text-rfpaf-blue normal-case">(elem.)</span>}
            </label>
            <input type="range" min={50} max={300} value={selectedEl ? (selectedEl.sizeScale ?? sizeScale) : sizeScale}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const v = +e.target.value
                if (selectedId) updateSelected({ sizeScale: v }); else setSizeScale(v)
              }}
              className="w-full lab-range text-rfpaf-red cursor-pointer" />
          </div>

          {/* Opacity — individual del elemento seleccionado, o por defecto para nuevos */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">
              Transparencia: {selectedEl ? selectedEl.opacity : opacity}%
              {selectedEl && <span className="ml-1 text-rfpaf-blue normal-case">(elem.)</span>}
            </label>
            <input type="range" min={10} max={100} value={selectedEl ? selectedEl.opacity : opacity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const v = +e.target.value
                if (selectedId) updateSelected({ opacity: v }); else setOpacity(v)
              }}
              className="w-full lab-range text-rfpaf-red cursor-pointer" />
          </div>

          {/* Connector ellipse: giro y achatado (perspectiva) — solo visibles al usar/seleccionar conector */}
          {(tool === 'connector' || selIsConnector) && (
            <>
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">
                  Giro elipse: {selIsConnector ? (selectedEl!.tilt ?? connectorTilt) : connectorTilt}°
                  {selIsConnector && <span className="ml-1 text-rfpaf-blue normal-case">(elem.)</span>}
                </label>
                <input type="range" min={-60} max={60} value={selIsConnector ? (selectedEl!.tilt ?? connectorTilt) : connectorTilt}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const v = +e.target.value
                    if (selIsConnector) updateSelected({ tilt: v }); else setConnectorTilt(v)
                  }}
                  className="w-full lab-range text-rfpaf-blue cursor-pointer" />
              </div>
              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">
                  Perspectiva elipse: {selIsConnector ? (selectedEl!.flatten ?? connectorFlatten) : connectorFlatten}%
                  {selIsConnector && <span className="ml-1 text-rfpaf-blue normal-case">(elem.)</span>}
                </label>
                <input type="range" min={15} max={100} value={selIsConnector ? (selectedEl!.flatten ?? connectorFlatten) : connectorFlatten}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const v = +e.target.value
                    if (selIsConnector) updateSelected({ flatten: v }); else setConnectorFlatten(v)
                  }}
                  className="w-full lab-range text-rfpaf-blue cursor-pointer" />
              </div>
            </>
          )}

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

          {/* Momentos guardados (Opción B) */}
          {(videoUrl || ytEmbedUrl || moments.length > 0) && (
            <>
              <hr className="my-4" />
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                  Momentos {moments.length > 0 && <span className="text-rfpaf-blue">({moments.length})</span>}
                </p>
                {moments.length === 0 && (
                  <p className="text-[11px] text-gray-400 mb-2 leading-snug">
                    Pausa el vídeo en una jugada, dibuja y pulsa <span className="font-semibold text-green-600">＋ Guardar momento</span> en la barra del vídeo.
                  </p>
                )}
                <div className="space-y-1.5">
                  {moments.map(m => (
                    <div
                      key={m.id}
                      className={`rounded-lg border-2 px-2 py-1.5 transition-all ${
                        activeMomentId === m.id
                          ? 'border-rfpaf-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => loadMoment(m)}
                          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                          title="Ir a este momento"
                        >
                          <span className="text-rfpaf-blue text-sm font-bold">▸</span>
                          <span className="text-xs font-mono font-bold text-gray-700 tabular-nums whitespace-nowrap">{fmtTime(m.time)}</span>
                          {editingMomentId === m.id ? (
                            <input
                              autoFocus
                              defaultValue={m.label}
                              onClick={e => e.stopPropagation()}
                              onBlur={e => { renameMoment(m.id, e.target.value || m.label); setEditingMomentId(null) }}
                              onKeyDown={e => { if (e.key === 'Enter') { renameMoment(m.id, (e.target as HTMLInputElement).value || m.label); setEditingMomentId(null) } }}
                              className="flex-1 min-w-0 text-xs border border-rfpaf-blue rounded px-1 py-0.5"
                            />
                          ) : (
                            <span className="text-xs text-gray-600 truncate">{m.label}</span>
                          )}
                        </button>
                        <button
                          onClick={() => setEditingMomentId(m.id)}
                          title="Renombrar"
                          className="text-gray-400 hover:text-rfpaf-blue text-xs p-1"
                        >✎</button>
                        <button
                          onClick={() => updateMoment(m.id)}
                          title="Actualizar con los dibujos actuales"
                          className="text-gray-400 hover:text-green-600 text-xs p-1"
                        >⟳</button>
                        <button
                          onClick={() => deleteMoment(m.id)}
                          title="Borrar momento"
                          className="text-gray-400 hover:text-rfpaf-red text-xs p-1"
                        >🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>

        {/* Center Canvas */}
        <div className={`${mobilePanel === 'lienzo' ? 'flex' : 'hidden'} lg:flex flex-1 bg-white rounded-xl shadow-sm overflow-hidden min-w-0 max-h-[calc(100vh-280px)] lg:max-h-none relative flex-col`} style={{ cursor }}>
          {/* Vídeo HTML5 — siempre en el DOM cuando hay videoUrl para que el ref no se pierda */}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              preload="auto"
              playsInline
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => { setIsVideoPlaying(false); captureFrame() }}
              onSeeked={() => { if (videoRef.current?.paused) captureFrame() }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onError={() => setVideoError('Este formato de vídeo no se puede reproducir en el navegador. Conviértelo a MP4 (H.264) — por ejemplo con HandBrake o exportando desde el móvil como "más compatible".')}
              className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-0 ${videoFrameCanvas ? 'invisible' : ''}`}
            />
          )}
          {/* Fotograma capturado — visible cuando está pausado, permite dibujar */}
          {videoFrameCanvas && (
            <img
              src={videoFrameCanvas} alt="video-frame"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-[1]"
            />
          )}
          {/* Fondo: imagen estática */}
          {bgImage && !videoUrl && (
            <img
              src={bgImage} alt="fondo"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
            />
          )}
          {/* Fondo: iframe YouTube */}
          {ytEmbedUrl && !videoUrl && (
            <iframe
              id="yt-player"
              src={ytEmbedUrl}
              className="absolute inset-0 w-full h-full border-0 z-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {/* Estado vacío */}
          {!bgImage && !ytEmbedUrl && !videoUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 z-0 pointer-events-none">
              <svg viewBox="0 0 64 64" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="32" cy="32" r="28" />
                <path d="M32 8 L32 12 M32 52 L32 56 M8 32 L12 32 M52 32 L56 32" />
                <path d="M20 20 Q32 14 44 20 Q50 32 44 44 Q32 50 20 44 Q14 32 20 20 Z" />
              </svg>
              <p className="text-sm mt-4">Carga un video o imagen para empezar</p>
            </div>
          )}

          {/* Lienzo SVG — siempre encima (z-10) capturando eventos (ratón + táctil).
              Mientras el vídeo se reproduce, ocultamos los dibujos para no taparlo. */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full z-10"
            style={{ touchAction: 'none', pointerEvents: mediaPlaying ? 'none' : 'auto' }}
            onPointerDown={handleMouseDown}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onDoubleClick={handleDblClick}
          >
            {!mediaPlaying && elements.map(el => renderEl(el, el.id))}
            {!mediaPlaying && currentEl && renderEl(currentEl, 'preview')}

            {zonePoints.length >= 1 && (
              <>
                <path
                  d={`M ${zonePoints[0].x} ${zonePoints[0].y} ${zonePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                  stroke={strokeColor} strokeWidth={strokeWidth} fill="none"
                  strokeDasharray={tool === 'connector' ? undefined : '5 3'}
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {zonePoints.map((p, i) => {
                  if (tool !== 'connector') return <circle key={i} cx={p.x} cy={p.y} r={3} fill={strokeColor} />
                  const r = Math.max(16 * (sizeScale / 100), strokeWidth * 1.5)
                  return (
                    <ellipse key={i} cx={p.x} cy={p.y} rx={r} ry={r * (connectorFlatten / 100)}
                      transform={`rotate(${connectorTilt} ${p.x} ${p.y})`}
                      fill={strokeColor} fillOpacity={opacity / 100}
                      stroke="white" strokeWidth={1} strokeOpacity={opacity / 100} />
                  )
                })}
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
                  className="w-24 lab-range text-green-400 cursor-pointer"
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
              </div>
              {/* Discontinua: aplica a cualquier flecha (seleccionada o nueva) */}
              <button
                onClick={() => {
                  if (selIsArrow) updateSelected({ dashed: !((selectedEl as ArrowEl).dashed) })
                  else setArrowDashed(d => !d)
                }}
                className={`mt-2 w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  (selIsArrow ? (selectedEl as ArrowEl).dashed : arrowDashed)
                    ? 'bg-rfpaf-blue text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {(selIsArrow ? (selectedEl as ArrowEl).dashed : arrowDashed) ? '┄ Discontinua: SÍ' : '── Discontinua: NO'}
              </button>
              {/* Curvatura: solo visible al usar/seleccionar la flecha curva */}
              {(tool === 'arrow-curved' || selIsCurvedArrow) && (
                <div className="mt-2">
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block uppercase tracking-wide">
                    Curvatura: {selIsCurvedArrow ? ((selectedEl as ArrowEl).curve ?? curveAmount) : curveAmount}
                  </label>
                  <input type="range" min={-100} max={100} value={selIsCurvedArrow ? ((selectedEl as ArrowEl).curve ?? curveAmount) : curveAmount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const v = +e.target.value
                      if (selIsCurvedArrow) updateSelected({ curve: v, ctrl: undefined }); else setCurveAmount(v)
                    }}
                    className="w-full lab-range text-rfpaf-blue cursor-pointer" />
                  {selIsCurvedArrow && (
                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">Arrastra el punto azul en el lienzo para curvar en cualquier dirección</p>
                  )}
                </div>
              )}
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
                <ToolBtn title="Rectángulo" active={tool === 'rect'} onClick={() => chooseTool('rect')}>
                  <IcoRect />
                </ToolBtn>
                <ToolBtn title="Círculo" active={tool === 'circle'} onClick={() => chooseTool('circle')}>
                  <IcoCircle />
                </ToolBtn>
                <ToolBtn title="Elipse discontinua" label="Discontinua" active={tool === 'circle-dashed'} onClick={() => chooseTool('circle-dashed')}>
                  <IcoCircleDashed />
                </ToolBtn>
                <ToolBtn title="Elipse punto-línea" label="Punto-línea" active={tool === 'circle-dotdash'} onClick={() => chooseTool('circle-dotdash')}>
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

function ToolBtn({ children, active, onClick, title, label }: {
  children: React.ReactNode; active?: boolean; onClick: () => void; title: string; label?: string
}) {
  return (
    <button
      title={title} onClick={onClick}
      className={`w-full py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition-all ${
        active
          ? 'bg-rfpaf-blue text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
      <span className="text-[8px] font-semibold leading-none text-center w-full truncate">{label ?? title}</span>
    </button>
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
