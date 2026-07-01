import {
  useRef, useState, useCallback, useEffect,
  type MouseEvent as RME,
  type ChangeEvent,
} from 'react'
import { Navigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Move, Copy, Trash2, PenLine, Upload, Play } from 'lucide-react'
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
  variant?: 'jersey' | 'named' | 'photo'   // camiseta / con nombre / con foto
  name?: string
  photo?: string   // dataURL (variante foto)
}

type DorsalCfg = { number: number; variant: 'jersey' | 'named' | 'photo'; name: string; photo: string | null; color: string }

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

interface PintadoAccionesProps {
  embedded?: boolean
  initialYtUrl?: string
}

export default function PintadoAcciones({ embedded = false, initialYtUrl }: PintadoAccionesProps = {}) {
  const { currentObservador } = useStore()
  if (!embedded && !currentObservador) return <Navigate to="/login" replace />

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
  const [pendingDorsal, setPendingDorsal] = useState<DorsalCfg | null>(null)
  // Configuración del dorsal a colocar (panel)
  const [dorsalNumber, setDorsalNumber] = useState(1)
  const [dorsalVariant, setDorsalVariant] = useState<'jersey' | 'named' | 'photo'>('jersey')
  const [dorsalName, setDorsalName] = useState('')
  const [dorsalPhoto, setDorsalPhoto] = useState<string | null>(null)
  const [dorsalColor, setDorsalColor] = useState('#dc2626')
  const [elements, setElements] = useState<DrawEl[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Pt | null>(null)
  const [currentEl, setCurrentEl] = useState<DrawEl | null>(null)
  const [zonePoints, setZonePoints] = useState<Pt[]>([])
  const [ctrlDrag, setCtrlDrag] = useState<string | null>(null)  // id de flecha cuyo tirador se arrastra


  const [dragState, setDragState] = useState<{ elId: string; startPt: Pt; orig: DrawEl } | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const [bgImage, setBgImage] = useState<string | null>(null)
  const [ytUrl, setYtUrl] = useState(initialYtUrl ?? '')
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
  // Exportar vídeo anotado (Opción B 3/3)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportMsg, setExportMsg] = useState('')
  const [exportPre, setExportPre] = useState(5)    // s antes del momento
  const [exportPost, setExportPost] = useState(5)  // s después del momento
  const [exportHold, setExportHold] = useState(3)  // s de congelado con dibujos
  const exportingRef = useRef(false)
  const exportCancelRef = useRef(false)

  const [mobilePanel, setMobilePanel] = useState<'estilos' | 'lienzo' | 'herramientas'>('lienzo')

  const svgRef = useRef<SVGSVGElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fillInputRef = useRef<HTMLInputElement>(null)
  const strokeInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const dorsalPhotoInputRef = useRef<HTMLInputElement>(null)


  const getSvgPt = useCallback((e: RME): Pt => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  // Al seleccionar (o crear) un texto/etiqueta, enfocar el campo de edición del panel
  useEffect(() => {
    if (!selectedId) return
    const el = elements.find(e => e.id === selectedId)
    if (el && (el.tool === 'text' || el.tool === 'label')) {
      const t = setTimeout(() => {
        const inp = editInputRef.current
        if (inp) { inp.focus(); inp.select() }
      }, 30)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const handleMouseDown = useCallback((e: RME) => {
    const pt = getSvgPt(e)

    if (pendingDorsal !== null) {
      const el: DorsalEl = {
        id: uuidv4(), tool: 'dorsal', pos: pt, number: pendingDorsal.number,
        variant: pendingDorsal.variant,
        name: pendingDorsal.name || undefined,
        photo: pendingDorsal.photo || undefined,
        stroke: '#ffffff', fill: pendingDorsal.color, strokeWidth: 2, opacity: 100, sizeScale,
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
      setSelectedId(newEl.id)        // se edita en el panel "Texto del elemento"
      setMobilePanel('estilos')      // en móvil, salta al panel para escribir
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

  // Construye (sin tocar estado) el elemento de una zona/conector pendiente
  // a partir de los nodos en zonePoints. Devuelve null si no hay nada válido.
  const buildPendingEl = (): DrawEl | null => {
    if (zonePoints.length === 0) return null
    if (tool === 'connector') {
      const pts = zonePoints.filter((p, i) => {
        if (i === 0) return true
        const prev = zonePoints[i - 1]
        return Math.hypot(p.x - prev.x, p.y - prev.y) > 8
      })
      if (pts.length >= 2) {
        return {
          id: uuidv4(), tool: 'connector', points: pts,
          stroke: strokeColor, fill: strokeColor, strokeWidth, opacity,
          sizeScale, tilt: connectorTilt, flatten: connectorFlatten,
        }
      }
    } else if (tool === 'zone' && zonePoints.length >= 3) {
      return {
        id: uuidv4(), tool: 'zone', points: zonePoints,
        stroke: strokeColor, fill: fillColor + '40', strokeWidth, opacity, sizeScale,
      }
    }
    return null
  }

  // Finaliza una zona/conector pendiente (nodos en zonePoints) antes de
  // cambiar de contexto, para no perder la unión ya marcada.
  const finalizePending = () => {
    if (zonePoints.length === 0) return
    const pend = buildPendingEl()
    if (pend) setElements(prev => [...prev, pend])
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

  // Foto para el dorsal con foto
  const handleDorsalPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setDorsalPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Arma la colocación del dorsal con la configuración actual
  const armDorsal = () => {
    setPendingDorsal({ number: dorsalNumber, variant: dorsalVariant, name: dorsalName, photo: dorsalPhoto, color: dorsalColor })
    setTool('select')
    setMobilePanel('lienzo')
  }


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

  // Auto-cargar vídeo cuando se usa en modo embedded con URL inicial
  useEffect(() => {
    if (initialYtUrl) handleLoadVideo()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // YouTube: al pausar, intentar cargar el momento cercano (closure fresco vía deps)
  useEffect(() => {
    if (!ytEmbedUrl || ytPlaying) return
    maybeAutoLoadMoment(ytCurrent, 'yt')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytPlaying])

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
    // Incluir un conector/zona pendiente (aún sin doble-clic de cierre)
    const pend = buildPendingEl()
    const all = pend ? [...elements, pend] : elements
    if (all.length === 0) return  // nada que guardar
    const time = currentVideoTime()
    const m: Moment = {
      id: uuidv4(),
      time,
      label: `Momento ${moments.length + 1}`,
      elements: JSON.parse(JSON.stringify(all)),
      source: videoUrl ? 'video' : 'yt',
    }
    setMoments(prev => [...prev, m].sort((a, b) => a.time - b.time))
    // Limpiar el lienzo para la siguiente jugada (los dibujos quedan guardados en el momento)
    setElements([])
    setZonePoints([])
    setIsDrawing(false)
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

  // Al pausar/saltar cerca de un momento, si el lienzo está vacío, cargar sus dibujos
  const maybeAutoLoadMoment = (time: number, source: 'yt' | 'video') => {
    if (elements.length > 0 || zonePoints.length > 0) return
    const m = moments.find(x => x.source === source && Math.abs(x.time - time) < 0.6)
    if (m) {
      setElements(JSON.parse(JSON.stringify(m.elements)))
      setActiveMomentId(m.id)
    }
  }

  const updateMoment = (id: string) => {
    setMoments(prev => prev.map(m =>
      m.id === id ? { ...m, elements: JSON.parse(JSON.stringify(elements)), time: currentVideoTime() } : m
    ).sort((a, b) => a.time - b.time))
    setActiveMomentId(id)
  }

  // Exportar PNG: fusiona el frame del vídeo + los dibujos del lienzo (Opción B 2/3)
  const exportPNG = async () => {
    const svg = svgRef.current
    if (!svg) return
    setSelectedId(null)  // quitar resaltado/tiradores de la imagen
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    const W = svg.clientWidth, H = svg.clientHeight
    if (W === 0 || H === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fondo: frame del vídeo (object-contain) o blanco si no hay (YouTube)
    if (videoFrameCanvas) {
      await new Promise<void>(res => {
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight)
          const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
          res()
        }
        img.onerror = () => res()
        img.src = videoFrameCanvas
      })
    } else {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
    }

    // Dibujos: serializar el SVG y pintarlo encima
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(W))
    clone.setAttribute('height', String(H))
    clone.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const xml = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    await new Promise<void>(res => {
      const img = new Image()
      img.onload = () => { ctx.drawImage(img, 0, 0, W, H); res() }
      img.onerror = () => res()
      img.src = url
    })
    URL.revokeObjectURL(url)

    const a = document.createElement('a')
    a.download = `momento-${fmtTime(currentVideoTime()).replace(':', '-')}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  // Rasteriza el SVG del lienzo a una imagen W×H (para superponer en el vídeo exportado)
  const rasterizeSvg = (svg: SVGSVGElement, W: number, H: number): Promise<HTMLImageElement> =>
    new Promise(res => {
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('width', String(W))
      clone.setAttribute('height', String(H))
      clone.setAttribute('viewBox', `0 0 ${W} ${H}`)
      const xml = new XMLSerializer().serializeToString(clone)
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(url); res(img) }
      img.onerror = () => { URL.revokeObjectURL(url); res(img) }
      img.src = url
    })

  const pickRecorderMime = () => {
    const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    for (const c of cands) if (MediaRecorder.isTypeSupported(c)) return c
    return 'video/webm'
  }

  // Exporta un vídeo anotado: reproduce el MP4 y, al llegar a cada momento,
  // congela el frame y superpone los dibujos unos segundos (Opción B 3/3)
  const exportVideo = async () => {
    const video = videoRef.current
    const svg = svgRef.current
    if (!videoUrl || !video || !svg) { setExportMsg('Solo disponible con vídeo MP4 local'); return }
    const vids = moments.filter(m => m.source === 'video').sort((a, b) => a.time - b.time)
    if (vids.length === 0) { setExportMsg('Guarda al menos un momento antes de exportar'); return }

    const W = svg.clientWidth, H = svg.clientHeight
    if (W === 0 || H === 0) return
    const savedEls = elements

    setExporting(true); exportingRef.current = true; exportCancelRef.current = false
    setExportProgress(0); setExportMsg('Preparando dibujos…')

    try {
      // 1) Pre-rasterizar el overlay de cada momento usando el propio lienzo
      const overlays: { time: number; img: HTMLImageElement }[] = []
      for (const m of vids) {
        if (exportCancelRef.current) throw new Error('cancel')
        setElements(JSON.parse(JSON.stringify(m.elements)))
        setSelectedId(null)
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        const img = await rasterizeSvg(svg, W, H)
        overlays.push({ time: m.time, img })
      }
      setElements([])
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      // 2) Canvas + MediaRecorder
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')!
      const stream = canvas.captureStream(30)
      const rec = new MediaRecorder(stream, { mimeType: pickRecorderMime() })
      const chunks: BlobPart[] = []
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
      const stopped = new Promise<void>(res => { rec.onstop = () => res() })

      // Helpers de pintado/seek/reproducción por clips
      const dur = video.duration || 0
      const paint = (overlay: HTMLImageElement | null) => {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
        if (video.videoWidth) {
          const sc = Math.min(W / video.videoWidth, H / video.videoHeight)
          const dw = video.videoWidth * sc, dh = video.videoHeight * sc
          ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh)
        }
        if (overlay) ctx.drawImage(overlay, 0, 0, W, H)
      }
      const seekTo = (t: number) => new Promise<void>(res => {
        const h = () => { video.removeEventListener('seeked', h); res() }
        video.addEventListener('seeked', h)
        video.currentTime = t
      })
      const playUntil = (cond: () => boolean, overlay: HTMLImageElement | null) => new Promise<void>(async resolve => {
        await video.play().catch(() => {})
        const loop = () => {
          if (!exportingRef.current) { resolve(); return }
          paint(overlay)
          if (cond()) { resolve(); return }
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      })
      const freeze = (overlay: HTMLImageElement, ms: number) => new Promise<void>(resolve => {
        const end = performance.now() + ms
        const loop = () => {
          if (!exportingRef.current) { resolve(); return }
          paint(overlay)
          if (performance.now() >= end) { resolve(); return }
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      })

      // 3) Grabar un clip por momento: PRE s antes + congelado + POST s después
      const PRE = exportPre, POST = exportPost, HOLD_MS = Math.max(exportHold, 0.5) * 1000
      video.muted = true
      rec.start(100)
      for (let mi = 0; mi < overlays.length; mi++) {
        if (!exportingRef.current || exportCancelRef.current) break
        const m = overlays[mi]
        const startT = Math.max(0, m.time - PRE)
        const endT = dur > 0 ? Math.min(dur, m.time + POST) : m.time + POST
        setExportMsg(`Clip ${mi + 1}/${overlays.length}…`)
        video.pause()
        await seekTo(startT)
        // Fase A: reproducir hasta el instante del momento
        await playUntil(() => video.currentTime >= m.time || video.ended, null)
        video.pause()
        // Fase B: congelar el frame y mostrar los dibujos
        await freeze(m.img, HOLD_MS)
        // Fase C: reproducir hasta POST s después
        if (!video.ended && video.currentTime < endT) {
          await playUntil(() => video.currentTime >= endT || video.ended, null)
        }
        video.pause()
        setExportProgress((mi + 1) / overlays.length)
      }

      rec.stop()
      await stopped

      if (!exportCancelRef.current) {
        const blob = new Blob(chunks, { type: chunks.length ? (chunks[0] as Blob).type || 'video/webm' : 'video/webm' })
        const a = document.createElement('a')
        a.download = 'video-anotado.webm'
        a.href = URL.createObjectURL(blob)
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 4000)
        setExportMsg('¡Listo! Descargado video-anotado.webm')
      } else {
        setExportMsg('Exportación cancelada')
      }
    } catch {
      setExportMsg('Exportación cancelada')
    } finally {
      try { video.pause() } catch { /* noop */ }
      setElements(savedEls)
      setExporting(false); exportingRef.current = false
      setExportProgress(0)
      setTimeout(() => setExportMsg(''), 4000)
    }
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
      const k = elSize / 100
      const nameFs = 11 * k
      const fontFam = 'system-ui,-apple-system,Arial,sans-serif'

      // Variante FOTO: rectángulo con la imagen + dorsal en esquina + nombre debajo
      if (de.variant === 'photo' && de.photo) {
        const w = 40 * k, h = 50 * k
        const x = de.pos.x - w / 2, y = de.pos.y - h / 2
        const clipId = `dphoto-${el.id}`
        const badge = 10 * k
        return (
          <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
            <defs>
              <clipPath id={clipId}><rect x={x} y={y} width={w} height={h} rx={5} /></clipPath>
            </defs>
            <image href={de.photo} x={x} y={y} width={w} height={h}
              preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
            <rect x={x} y={y} width={w} height={h} rx={5} fill="none" stroke={de.fill} strokeWidth={2.5 * k} />
            <circle cx={x + w - badge * 0.3} cy={y + badge * 0.3} r={badge} fill={de.fill} stroke="white" strokeWidth={1.5 * k} />
            <text x={x + w - badge * 0.3} y={y + badge * 0.3} fill="white" fontSize={11 * k} fontWeight="bold"
              textAnchor="middle" dominantBaseline="central" fontFamily={fontFam}>{de.number}</text>
            {de.name && (
              <text x={de.pos.x} y={y + h + nameFs + 2} fill={de.fill} fontSize={nameFs} fontWeight="bold"
                textAnchor="middle" fontFamily={fontFam} stroke="white" strokeWidth={2.5 * k} paintOrder="stroke">{de.name}</text>
            )}
          </g>
        )
      }

      // Variantes CAMISETA y CON NOMBRE
      const sz = 32 * k
      const sc = sz / 40
      const tx = de.pos.x - sz / 2
      const ty = de.pos.y - sz / 2
      const numFs = (de.number >= 10 ? 11 : 13) * sc
      const numY = ty + sz * 0.675
      return (
        <g key={key} opacity={alpha} style={selStyle} onPointerDown={onElMouseDown} cursor="move">
          <g transform={`translate(${tx},${ty}) scale(${sc})`}>
            <path d={JERSEY_PATH} fill={de.fill} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5 / sc} strokeLinejoin="round"/>
          </g>
          <text x={de.pos.x} y={numY} fill="white" fontSize={numFs} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fontFamily={fontFam}>{de.number}</text>
          {de.variant === 'named' && de.name && (
            <text x={de.pos.x} y={ty + sz + nameFs} fill={de.fill} fontSize={nameFs} fontWeight="bold"
              textAnchor="middle" fontFamily={fontFam} stroke="white" strokeWidth={2.5 * k} paintOrder="stroke">{de.name}</text>
          )}
        </g>
      )
    }

    return null
  }

  const cursor = tool === 'select' ? (dragState ? 'grabbing' : 'default') : 'crosshair'
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Corporate Style — oculto en modo embedded */}
      {!embedded && <div className="bg-slate-100 text-gray-800 px-4 sm:px-6 py-2 sm:py-3 flex-shrink-0 border-b-4 border-rfpaf-blue">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-rfpaf-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <PenLine className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-rfpaf-blue">ANÁLISIS LAB</h1>
              <p className="text-gray-600 text-[10px] sm:text-xs mt-0.5">Herramienta de análisis visual</p>
            </div>
          </div>
          {/* Marca corporativa — oculta en móvil (ya está en la barra superior) */}
          <div className="hidden lg:flex items-center gap-3 border-l border-gray-300 pl-4">
            <RFPAFLogo />
            <div className="text-right leading-tight">
              <p className="text-gray-800 font-bold text-xs tracking-wide">STAFF LAB</p>
              <p className="text-gray-600 text-[8px] font-semibold uppercase leading-snug">Real Federación de Fútbol</p>
              <p className="text-gray-600 text-[8px] uppercase font-semibold">Principado de Asturias</p>
            </div>
          </div>
        </div>
      </div>}

      {/* Content */}
      <div className="p-2 sm:p-6 space-y-2 sm:space-y-5 flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 sm:gap-3 bg-white rounded-xl shadow-sm p-2.5 sm:p-4 flex-shrink-0 flex-wrap">
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
            <TimelineBar
              value={videoCurrentTime}
              max={videoDuration}
              disabled={!!videoError || videoDuration <= 0}
              onSeek={seekVideo}
              markers={moments.filter(m => m.source === 'video')}
              onMarker={id => { const m = moments.find(x => x.id === id); if (m) loadMoment(m) }}
              fmt={fmtTime}
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
              onClick={exportPNG}
              disabled={!!videoError || exporting}
              title="Descargar el frame actual + los dibujos como imagen PNG"
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white font-bold text-sm transition-colors whitespace-nowrap"
            >
              ⬇ PNG
            </button>
            <button
              onClick={exportVideo}
              disabled={!!videoError || exporting}
              title="Generar un vídeo con los dibujos incrustados en cada momento (necesita al menos un momento guardado)"
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-sm transition-colors whitespace-nowrap"
            >
              🎬 Exportar vídeo
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
          {!exporting && exportMsg && (
            <div className="bg-purple-50 border border-purple-300 text-purple-700 text-xs rounded-lg px-4 py-2 font-semibold">
              {exportMsg}
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
          <TimelineBar
            value={ytCurrent}
            max={ytDuration}
            disabled={ytDuration <= 0}
            onSeek={ytSeek}
            markers={moments.filter(m => m.source === 'yt')}
            onMarker={id => { const m = moments.find(x => x.id === id); if (m) loadMoment(m) }}
            fmt={fmtTime}
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
            onClick={exportPNG}
            title="Descargar los dibujos como PNG (YouTube no permite capturar el frame: fondo blanco)"
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-colors whitespace-nowrap"
          >
            ⬇ PNG
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
        <aside className={`${mobilePanel === 'estilos' ? 'flex' : 'hidden'} lg:flex w-full lg:w-56 bg-white rounded-xl shadow-sm p-4 flex-col overflow-y-auto flex-1 min-h-0 lg:flex-none`}>
          <h2 className="text-sm font-bold text-rfpaf-blue mb-4 uppercase tracking-wide">Estilos & Controles</h2>

          {/* Edición de texto del elemento seleccionado (texto/etiqueta) */}
          {(selectedEl?.tool === 'text' || selectedEl?.tool === 'label') && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-rfpaf-blue/30">
              <label className="text-xs font-bold text-rfpaf-blue mb-1.5 block uppercase tracking-wide">
                ✎ {selectedEl.tool === 'label' ? 'Etiqueta' : 'Texto'}
              </label>
              <input
                ref={editInputRef}
                type="text"
                value={(selectedEl as TextEl).text}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateSelected({ text: e.target.value })}
                placeholder="Escribe aquí…"
                className="w-full border-2 border-rfpaf-blue rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/40"
              />
              <p className="text-[10px] text-gray-500 mt-1">Se actualiza en el lienzo al escribir.</p>
            </div>
          )}

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

            {/* Tipo de dorsal */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {([
                ['jersey', 'Camiseta'],
                ['named', 'Con nombre'],
                ['photo', 'Con foto'],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setDorsalVariant(v)}
                  className={`px-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border-2 ${
                    dorsalVariant === v
                      ? 'border-rfpaf-red bg-red-50 text-rfpaf-red'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Número 1-23 */}
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Número</label>
            <select
              value={dorsalNumber}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setDorsalNumber(+e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm mb-2 bg-white focus:outline-none focus:ring-2 focus:ring-rfpaf-blue"
            >
              {Array.from({ length: 23 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Dorsal {n}</option>
              ))}
            </select>

            {/* Nombre (con nombre / con foto) */}
            {(dorsalVariant === 'named' || dorsalVariant === 'photo') && (
              <input
                type="text"
                value={dorsalName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDorsalName(e.target.value)}
                placeholder="Nombre (opcional)"
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue"
              />
            )}

            {/* Foto (con foto) */}
            {dorsalVariant === 'photo' && (
              <div className="mb-2">
                <button
                  onClick={() => dorsalPhotoInputRef.current?.click()}
                  className="w-full px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> {dorsalPhoto ? 'Cambiar foto' : 'Subir foto'}
                </button>
                <input ref={dorsalPhotoInputRef} type="file" accept="image/*" onChange={handleDorsalPhotoUpload} className="sr-only" />
                {dorsalPhoto && (
                  <img src={dorsalPhoto} alt="foto dorsal" className="mt-2 w-16 h-20 object-cover rounded-md border-2 border-rfpaf-red mx-auto" />
                )}
              </div>
            )}

            {/* Color de la camiseta (crea o edita el dorsal seleccionado) */}
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Color camiseta {selectedEl?.tool === 'dorsal' && <span className="text-rfpaf-blue normal-case">(elem.)</span>}
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={selectedEl?.tool === 'dorsal' ? selectedEl.fill : dorsalColor}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (selectedEl?.tool === 'dorsal') updateSelected({ fill: e.target.value })
                  else setDorsalColor(e.target.value)
                }}
                className="w-10 h-9 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <div className="flex gap-1">
                {['#dc2626', '#1d4ed8', '#16a34a', '#000000', '#ffffff', '#f59e0b'].map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      if (selectedEl?.tool === 'dorsal') updateSelected({ fill: c })
                      else setDorsalColor(c)
                    }}
                    title={c}
                    className="w-5 h-5 rounded-full border border-gray-300"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Vista previa + colocar */}
            <div className="flex items-center justify-center my-2">
              <JerseyIcon fill={dorsalColor} number={dorsalNumber} size={40} />
            </div>
            <button
              onClick={armDorsal}
              disabled={dorsalVariant === 'photo' && !dorsalPhoto}
              className="w-full px-3 py-2 rounded-lg bg-rfpaf-red hover:bg-rfpaf-red-dark disabled:opacity-40 text-white text-xs font-bold transition-colors"
            >
              {dorsalVariant === 'photo' && !dorsalPhoto ? 'Sube una foto primero' : '＋ Colocar en el campo'}
            </button>
            {pendingDorsal !== null && (
              <p className="text-xs text-rfpaf-red font-semibold mt-2">
                Dorsal {pendingDorsal.number} listo. Haz clic en el campo para colocarlo.
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

                {/* Exportar */}
                <div className="mt-3 space-y-2">
                  <button
                    onClick={exportPNG}
                    disabled={exporting || (!videoUrl && !ytEmbedUrl)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                  >
                    ⬇ Exportar PNG (vista actual)
                  </button>

                  {/* Duración de cada clip del vídeo anotado */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      ['Antes', exportPre, setExportPre],
                      ['Después', exportPost, setExportPost],
                      ['Congelado', exportHold, setExportHold],
                    ] as const).map(([label, val, setter]) => (
                      <label key={label} className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                          <input
                            type="number" min={0} max={60} step={1} value={val}
                            disabled={exporting}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const v = Math.max(0, Math.min(60, +e.target.value || 0))
                              setter(v)
                            }}
                            className="w-full text-xs px-1.5 py-1 outline-none disabled:opacity-40"
                          />
                          <span className="text-[9px] text-gray-400 pr-1.5">s</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={exportVideo}
                    disabled={exporting || !videoUrl || moments.filter(m => m.source === 'video').length === 0}
                    title={!videoUrl ? 'Solo disponible con vídeo MP4 local' : 'Generar un vídeo con los dibujos incrustados'}
                    className="w-full px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                  >
                    🎬 Exportar vídeo anotado
                  </button>
                  {!videoUrl && ytEmbedUrl && (
                    <p className="text-[10px] text-gray-400 leading-snug">
                      El vídeo anotado solo está disponible con MP4 local («Cargar vídeo»). YouTube no permite capturar los fotogramas.
                    </p>
                  )}
                  {!exporting && exportMsg && (
                    <p className="text-[10px] text-purple-600 font-semibold leading-snug">{exportMsg}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>

        {/* Center Canvas */}
        <div className={`${mobilePanel === 'lienzo' ? 'flex' : 'hidden'} lg:flex flex-1 min-h-0 bg-white rounded-xl shadow-sm overflow-hidden min-w-0 relative flex-col`} style={{ cursor }}>
          {/* Vídeo HTML5 — siempre en el DOM cuando hay videoUrl para que el ref no se pierda */}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              preload="auto"
              playsInline
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => { setIsVideoPlaying(false); captureFrame(); maybeAutoLoadMoment(videoRef.current?.currentTime ?? 0, 'video') }}
              onSeeked={() => { if (videoRef.current?.paused) { captureFrame(); maybeAutoLoadMoment(videoRef.current?.currentTime ?? 0, 'video') } }}
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

            {!mediaPlaying && zonePoints.length >= 1 && (
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

          {/* Overlay de exportación de vídeo */}
          {exporting && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="text-white text-base font-bold mb-1">🎬 Exportando vídeo anotado…</div>
              <div className="text-white/70 text-xs mb-4">{exportMsg || 'Procesando'}</div>
              <div className="w-2/3 max-w-sm h-3 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.round(exportProgress * 100)}%` }} />
              </div>
              <div className="text-white/80 text-xs mt-2 tabular-nums">{Math.round(exportProgress * 100)}%</div>
              <button
                onClick={() => { exportCancelRef.current = true; exportingRef.current = false }}
                className="mt-4 px-4 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <p className="text-white/50 text-[10px] mt-3 max-w-xs text-center leading-snug">
                No cierres la pestaña. Se graba un clip por momento ({exportPre} s antes + {exportHold} s dibujos + {exportPost} s después), en tiempo real.
              </p>
            </div>
          )}


        </div>

        {/* Right Panel - Tools */}
        <aside className={`${mobilePanel === 'herramientas' ? 'flex' : 'hidden'} lg:flex w-full lg:w-32 bg-white rounded-xl shadow-sm p-3 flex-col items-center gap-4 overflow-y-auto flex-1 min-h-0 lg:flex-none`}>
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

// Barra de tiempo con marcadores de momentos (Opción B)
function TimelineBar({ value, max, disabled, onSeek, markers, onMarker, fmt }: {
  value: number; max: number; disabled?: boolean
  onSeek: (t: number) => void
  markers: { id: string; time: number; label: string }[]
  onMarker: (id: string) => void
  fmt: (s: number) => string
}) {
  return (
    <div className="relative flex-1 min-w-[120px] flex items-center py-2">
      <input
        type="range" min={0} max={max > 0 ? max : 100} step={0.1} value={value} disabled={disabled}
        onChange={e => onSeek(parseFloat(e.target.value))}
        className="w-full lab-range text-rfpaf-blue cursor-pointer disabled:opacity-40"
      />
      {max > 0 && markers.map(m => (
        <button
          key={m.id}
          onClick={() => onMarker(m.id)}
          title={`${fmt(m.time)} · ${m.label}`}
          style={{ left: `${Math.min(100, Math.max(0, (m.time / max) * 100))}%` }}
          className="absolute top-0 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white shadow-md hover:scale-125 active:scale-110 transition-transform"
        />
      ))}
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
