import { useState, useRef, useCallback, useEffect } from 'react'
import {
  RefreshCw, Sparkles, ChevronDown, Users, UserPlus,
  Pencil, ArrowRight, Eraser, Play, Square, Camera, Trash2, Plus,
  Spline, Link2, Download,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type {
  AnalisisPartido, FormacionFutbol, JugadoraTactica,
  EquipoTactico, Convocatoria, FichaJugadora,
} from '../../types'
import { buildTeamJugadoras } from '../../utils/tactics'

/* ── Types ───────────────────────────────────────────────────────── */

const FORMATIONS: FormacionFutbol[] = [
  '4-4-2', '4-3-3', '4-2-3-1', '4-3-2-1', '3-5-2',
  '3-4-3', '5-3-2', '5-4-1', '4-1-4-1', '4-5-1', '4-4-1-1',
]

interface Props { analisis: AnalisisPartido }
type DragState = { uid: string; team: 'local' | 'visit' } | null
type BenchItem = { numero: number; nombre: string; foto: string | null; fichaId: string }
type EditorMode = 'move' | 'freehand' | 'arrow' | 'curve' | 'ball' | 'anim' | 'connect'
interface SVGPt { x: number; y: number }
interface DrawShape { uid: string; type: 'freehand' | 'arrow' | 'curve'; color: string; width: number; pts: SVGPt[] }
interface BallToken { uid: string; posX: number; posY: number }
interface AnimFrame { local: JugadoraTactica[]; visit: JugadoraTactica[] }
interface Connector { uid: string; fromUid: string; toUid: string; color: string; dashed: boolean }

const fmtDate = (d: string) => {
  try { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` } catch { return d }
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function computeCurveCtrl(start: SVGPt, end: SVGPt): SVGPt {
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  const dx = end.x - start.x; const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  return { x: mx + (-dy / len) * len * 0.28, y: my + (dx / len) * len * 0.28 }
}

function buildPlayersFromConv(conv: Convocatoria, formation: FormacionFutbol, fichas: FichaJugadora[]): JugadoraTactica[] {
  const base = buildTeamJugadoras(formation, 'local')
  return base.map((pos, i) => {
    const j = conv.jugadoras[i]; if (!j) return pos
    const ficha = fichas.find(f => f.id === j.fichaId)
    return { ...pos, numero: ficha?.dorsal ?? (i + 1), nombre: `${j.nombre} ${j.primerApellido}`, foto: j.foto ?? ficha?.foto ?? null, fichaId: j.fichaId }
  })
}

function generateAnalysis(local: EquipoTactico, visit: EquipoTactico): string {
  const lf = local.formacion; const vf = visit.formacion
  const lP = lf.split('-').map(Number); const vP = vf.split('-').map(Number)
  const lDef = lP[0]; const lMid = lP.slice(1, -1).reduce((a, b) => a + b, 0); const lFwd = lP[lP.length - 1]
  const vDef = vP[0]; const vMid = vP.slice(1, -1).reduce((a, b) => a + b, 0); const vFwd = vP[vP.length - 1]
  const lines: string[] = [
    `ANÁLISIS TÁCTICO: ${local.nombre} (${lf}) vs ${visit.nombre} (${vf})`, '',
    '── EQUILIBRIO NUMÉRICO ──',
    `Defensa: ${lDef} vs ${vDef} → ${lDef > vDef ? `Superioridad defensiva local (+${lDef - vDef})` : lDef < vDef ? `Superioridad defensiva visitante (+${vDef - lDef})` : 'Igualdad numérica'}`,
    `Mediocampo: ${lMid} vs ${vMid} → ${lMid > vMid ? `Dominio local (+${lMid - vMid})` : lMid < vMid ? `Superioridad rival (+${vMid - lMid})` : 'Equilibrio'}`,
    `Ataque: ${lFwd} vs ${vFwd} → ${lFwd > vFwd ? `Mayor poder local (+${lFwd - vFwd})` : lFwd < vFwd ? `Rival más ofensivo (+${vFwd - lFwd})` : 'Igualdad en línea ofensiva'}`,
    '', '── PUNTOS CLAVE ──',
  ]
  const ins: string[] = []
  if (vf.startsWith('3') && !lf.startsWith('3')) ins.push(`El sistema ${vf} rival puede dejar espacios en las bandas.`)
  if (lMid < vMid) ins.push('Inferioridad en mediocampo: necesaria presión organizada.')
  if (lMid > vMid) ins.push('Dominio en el centro: controlar ritmo y temporizar.')
  if (lFwd === 1 && vFwd >= 2) ins.push('Con una punta, la eficacia en el área será determinante.')
  if (['4-3-3', '4-2-3-1', '3-4-3'].includes(lf)) ins.push(`El sistema ${lf} favorece la presión alta.`)
  if (ins.length === 0) ins.push('Partido equilibrado; los detalles y las ABP serán decisivas.')
  ins.forEach(i => lines.push(`• ${i}`))
  lines.push('', '── RECOMENDACIONES ──')
  if (lMid < vMid) lines.push('→ Presionar en bloque para compensar la inferioridad.')
  if (lFwd > vFwd) lines.push('→ Explotar la superioridad atacante en bandas.')
  lines.push('→ Preparar las ABP ofensivas y defensivas.')
  return lines.join('\n')
}

/* ── Frame download (canvas PNG) ─────────────────────────────────── */

function downloadFramePNG(frame: AnimFrame, idx: number, localColor: string, visitColor: string) {
  const W = 340; const H = Math.round(W * 105 / 68)
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#2d6a27'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5
  ctx.strokeRect(W * 0.03, H * 0.02, W * 0.94, H * 0.96)
  ctx.beginPath(); ctx.moveTo(W * 0.03, H * 0.5); ctx.lineTo(W * 0.97, H * 0.5); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * 0.13, H * 0.085, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill()
  const draw = (j: JugadoraTactica, color: string) => {
    const px = j.posX / 100 * W; const py = j.posY / 100 * H
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = 'white'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(j.numero), px, py)
  }
  frame.visit.forEach(j => draw(j, visitColor))
  frame.local.forEach(j => draw(j, localColor))
  canvas.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fotograma-${idx + 1}.png`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  })
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════ */

export default function PizarraTacticaTab({ analisis }: Props) {
  const { updateAnalisis, convocatorias, fichas } = useStore()

  const [localJugadoras, setLocalJugadoras] = useState<JugadoraTactica[]>(analisis.equipoLocal.jugadoras)
  const [visitJugadoras, setVisitJugadoras] = useState<JugadoraTactica[]>(analisis.equipoVisitante.jugadoras)
  const [selectedConvId, setSelectedConvId] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(!!analisis.analisisIA)
  const [editingLocal, setEditingLocal] = useState(false)
  const [editingVisit, setEditingVisit] = useState(false)

  // ── Tool state
  const [editorMode, setEditorMode] = useState<EditorMode>('move')
  const [penColor, setPenColor] = useState('#facc15')
  const [penWidth, setPenWidth] = useState(3)

  // ── Shapes
  const [shapes, setShapes] = useState<DrawShape[]>([])
  const [currentShape, setCurrentShape] = useState<DrawShape | null>(null)
  const isDrawingRef = useRef(false)
  const curveHandleDragRef = useRef<string | null>(null) // shape uid

  // ── Connectors
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [connDashed, setConnDashed] = useState(false)
  const [svgMousePos, setSvgMousePos] = useState<SVGPt | null>(null)

  // ── Ball tokens
  const [balls, setBalls] = useState<BallToken[]>([])
  const ballDragRef = useRef<{ uid: string } | null>(null)

  // ── Animation
  const [animFrames, setAnimFrames] = useState<AnimFrame[]>([])
  const [animIdx, setAnimIdx] = useState(0)
  const [animPlaying, setAnimPlaying] = useState(false)
  const [animTransition, setAnimTransition] = useState(false)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Drag refs
  const dragging = useRef<DragState>(null)
  const benchDragRef = useRef<BenchItem | null>(null)
  const listDragRef = useRef<string | null>(null)
  const pitchRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const selectedConv = convocatorias.find(c => c.id === selectedConvId) ?? null
  const onFieldFichaIds = new Set(localJugadoras.map(j => j.fichaId).filter(Boolean) as string[])
  const allJugadoras = [...localJugadoras, ...visitJugadoras]

  const allConvPlayers: (BenchItem & { onField: boolean })[] = (selectedConv?.jugadoras ?? []).map(j => {
    const ficha = fichas.find(f => f.id === j.fichaId)
    return { numero: ficha?.dorsal ?? 0, nombre: `${j.nombre} ${j.primerApellido}`, foto: j.foto ?? ficha?.foto ?? null, fichaId: j.fichaId, onField: onFieldFichaIds.has(j.fichaId) }
  })
  const benchPlayers = allConvPlayers.filter(p => !p.onField)

  const save = useCallback((newLocal?: JugadoraTactica[], newVisit?: JugadoraTactica[]) => {
    updateAnalisis(analisis.id, {
      equipoLocal: { ...analisis.equipoLocal, jugadoras: newLocal ?? localJugadoras },
      equipoVisitante: { ...analisis.equipoVisitante, jugadoras: newVisit ?? visitJugadoras },
    })
  }, [analisis, localJugadoras, visitJugadoras, updateAnalisis])

  // ── Coordinate helpers
  const getRelPos = (clientX: number, clientY: number) => {
    const rect = pitchRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    }
  }
  const getSVGPosXY = (clientX: number, clientY: number): SVGPt => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    }
  }
  const getSVGPos = (e: React.MouseEvent): SVGPt => getSVGPosXY(e.clientX, e.clientY)

  // ── Player drag
  const movePlayer = (clientX: number, clientY: number) => {
    if (!dragging.current) return
    didDragRef.current = true // suppress onClick-connect after a drag
    const { x, y } = getRelPos(clientX, clientY)
    const { uid, team } = dragging.current
    if (team === 'local') setLocalJugadoras(prev => prev.map(j => j.uid === uid ? { ...j, posX: x, posY: y } : j))
    else setVisitJugadoras(prev => prev.map(j => j.uid === uid ? { ...j, posX: x, posY: y } : j))
  }

  const moveBall = (clientX: number, clientY: number) => {
    if (!ballDragRef.current) return
    const rect = pitchRef.current!.getBoundingClientRect()
    const x = Math.max(1, Math.min(99, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(1, Math.min(99, ((clientY - rect.top) / rect.height) * 100))
    setBalls(prev => prev.map(b => b.uid === ballDragRef.current!.uid ? { ...b, posX: x, posY: y } : b))
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    movePlayer(e.clientX, e.clientY)
    moveBall(e.clientX, e.clientY)
    if (editorMode === 'connect' && connectFrom) {
      const { x, y } = getRelPos(e.clientX, e.clientY)
      setSvgMousePos({ x, y })
    }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!e.touches[0]) return
    e.preventDefault()
    movePlayer(e.touches[0].clientX, e.touches[0].clientY)
    moveBall(e.touches[0].clientX, e.touches[0].clientY)
  }
  const handleEnd = () => {
    if (dragging.current) { save(localJugadoras, visitJugadoras); dragging.current = null }
    ballDragRef.current = null
  }

  // ── SVG draw handlers
  const handleSVGDown = (e: React.MouseEvent) => {
    if (editorMode !== 'freehand' && editorMode !== 'arrow' && editorMode !== 'curve') return
    e.preventDefault()
    const pt = getSVGPos(e)
    isDrawingRef.current = true
    setCurrentShape({ uid: crypto.randomUUID(), type: editorMode as 'freehand' | 'arrow' | 'curve', color: penColor, width: penWidth, pts: [pt] })
  }

  const handleSVGMove = (e: React.MouseEvent) => {
    applyDrawMove(e.clientX, e.clientY)
  }

  const handleSVGUp = () => {
    curveHandleDragRef.current = null
    if (!isDrawingRef.current || !currentShape) return
    isDrawingRef.current = false
    const valid =
      (currentShape.type === 'freehand' && currentShape.pts.length >= 2) ||
      ((currentShape.type === 'arrow') && currentShape.pts.length >= 2) ||
      (currentShape.type === 'curve' && currentShape.pts.length === 3)
    if (valid) setShapes(prev => [...prev, currentShape])
    setCurrentShape(null)
  }

  // ── SVG touch handlers (drawing on tablet/mobile)
  const applyDrawMove = (clientX: number, clientY: number) => {
    if (curveHandleDragRef.current) {
      const pt = getSVGPosXY(clientX, clientY)
      setShapes(prev => prev.map(s => s.uid === curveHandleDragRef.current && s.type === 'curve' ? { ...s, pts: [s.pts[0], pt, s.pts[2]] } : s))
      return
    }
    if (!isDrawingRef.current) return
    const pt = getSVGPosXY(clientX, clientY)
    setCurrentShape(prev => {
      if (!prev) return prev
      if (prev.type === 'freehand') return { ...prev, pts: [...prev.pts, pt] }
      if (prev.type === 'arrow') return { ...prev, pts: [prev.pts[0], pt] }
      if (prev.type === 'curve') return { ...prev, pts: [prev.pts[0], computeCurveCtrl(prev.pts[0], pt), pt] }
      return prev
    })
  }

  const handleSVGTouchStart = (e: React.TouchEvent) => {
    if (editorMode !== 'freehand' && editorMode !== 'arrow' && editorMode !== 'curve') return
    if (!e.touches[0]) return
    e.preventDefault(); e.stopPropagation()
    const t = e.touches[0]
    const pt = getSVGPosXY(t.clientX, t.clientY)
    isDrawingRef.current = true
    setCurrentShape({ uid: crypto.randomUUID(), type: editorMode as 'freehand' | 'arrow' | 'curve', color: penColor, width: penWidth, pts: [pt] })
  }
  const handleSVGTouchMove = (e: React.TouchEvent) => {
    if (!e.touches[0]) return
    e.preventDefault(); e.stopPropagation()
    applyDrawMove(e.touches[0].clientX, e.touches[0].clientY)
  }
  const handleSVGTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation()
    handleSVGUp()
  }

  // Track if a player was dragged to suppress the onClick connect after a drag
  const didDragRef = useRef(false)

  // ── Connect mode
  const handlePlayerConnect = (uid: string) => {
    if (didDragRef.current) { didDragRef.current = false; return }
    if (!connectFrom) {
      setConnectFrom(uid)
    } else if (connectFrom === uid) {
      setConnectFrom(null); setSvgMousePos(null)
    } else {
      setConnectors(prev => [...prev, { uid: crypto.randomUUID(), fromUid: connectFrom, toUid: uid, color: penColor, dashed: connDashed }])
      setConnectFrom(null); setSvgMousePos(null)
    }
  }

  // ── Ball placement
  const handlePitchClick = (e: React.MouseEvent) => {
    if (editorMode !== 'ball') return
    if (ballDragRef.current) return
    const { x, y } = getRelPos(e.clientX, e.clientY)
    setBalls(prev => [...prev, { uid: crypto.randomUUID(), posX: x, posY: y }])
  }

  // ── Formation helpers
  const handleFormationChange = (team: 'local' | 'visit', formation: FormacionFutbol) => {
    if (team === 'local' && selectedConv) {
      const newJ = buildPlayersFromConv(selectedConv, formation, fichas)
      setLocalJugadoras(newJ)
      updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, formacion: formation, jugadoras: newJ } })
    } else {
      const newJ = buildTeamJugadoras(formation, team)
      if (team === 'local') { setLocalJugadoras(newJ); updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, formacion: formation, jugadoras: newJ } }) }
      else { setVisitJugadoras(newJ); updateAnalisis(analisis.id, { equipoVisitante: { ...analisis.equipoVisitante, formacion: formation, jugadoras: newJ } }) }
    }
  }

  const handleResetPositions = (team: 'local' | 'visit') => {
    if (team === 'local' && selectedConv) {
      const newJ = buildPlayersFromConv(selectedConv, analisis.equipoLocal.formacion, fichas)
      setLocalJugadoras(newJ); updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, jugadoras: newJ } })
    } else {
      const f = team === 'local' ? analisis.equipoLocal.formacion : analisis.equipoVisitante.formacion
      const newJ = buildTeamJugadoras(f, team)
      if (team === 'local') { setLocalJugadoras(newJ); updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, jugadoras: newJ } }) }
      else { setVisitJugadoras(newJ); updateAnalisis(analisis.id, { equipoVisitante: { ...analisis.equipoVisitante, jugadoras: newJ } }) }
    }
  }

  const handleGenerateAnalysis = () => {
    setGenerating(true)
    setTimeout(() => {
      const text = generateAnalysis({ ...analisis.equipoLocal, jugadoras: localJugadoras }, { ...analisis.equipoVisitante, jugadoras: visitJugadoras })
      updateAnalisis(analisis.id, { analisisIA: text }); setShowAnalysis(true); setGenerating(false)
    }, 800)
  }

  const handleNameEdit = (team: 'local' | 'visit', name: string) => {
    if (team === 'local') updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, nombre: name, jugadoras: localJugadoras } })
    else updateAnalisis(analisis.id, { equipoVisitante: { ...analisis.equipoVisitante, nombre: name, jugadoras: visitJugadoras } })
  }

  const handleLoadConvocatoria = () => {
    if (!selectedConv) return
    const newJ = buildPlayersFromConv(selectedConv, analisis.equipoLocal.formacion, fichas)
    setLocalJugadoras(newJ); updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, jugadoras: newJ } })
  }

  const handleAddBenchPlayer = (player: BenchItem, explicitX?: number, explicitY?: number) => {
    const genericIdx = localJugadoras.findIndex(j => !j.fichaId)
    const newPlayer: JugadoraTactica = {
      uid: crypto.randomUUID(), numero: player.numero, nombre: player.nombre, foto: player.foto, fichaId: player.fichaId,
      posX: explicitX ?? (genericIdx !== -1 ? localJugadoras[genericIdx].posX : 30 + Math.random() * 40),
      posY: explicitY ?? (genericIdx !== -1 ? localJugadoras[genericIdx].posY : 65 + Math.random() * 20),
    }
    const updated = genericIdx !== -1 && explicitX === undefined
      ? localJugadoras.map((j, i) => i === genericIdx ? newPlayer : j)
      : [...localJugadoras, newPlayer]
    setLocalJugadoras(updated); save(updated, visitJugadoras)
  }

  const handleRemoveLocal = (uid: string) => {
    const updated = localJugadoras.filter(j => j.uid !== uid)
    setLocalJugadoras(updated); save(updated, visitJugadoras)
    setConnectors(prev => prev.filter(c => c.fromUid !== uid && c.toUid !== uid))
  }

  const handleListSwap = (targetUid: string) => {
    const srcUid = listDragRef.current; listDragRef.current = null
    if (!srcUid || srcUid === targetUid) return
    const src = localJugadoras.find(j => j.uid === srcUid); const tgt = localJugadoras.find(j => j.uid === targetUid)
    if (!src || !tgt) return
    const updated = localJugadoras.map(j => {
      if (j.uid === srcUid) return { ...j, posX: tgt.posX, posY: tgt.posY }
      if (j.uid === targetUid) return { ...j, posX: src.posX, posY: src.posY }
      return j
    })
    setLocalJugadoras(updated); save(updated, visitJugadoras)
  }

  const handleBenchDragStart = (e: React.DragEvent, player: BenchItem) => { e.dataTransfer.effectAllowed = 'copy'; benchDragRef.current = player }
  const handlePitchDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
  const handlePitchDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!benchDragRef.current || !pitchRef.current) return
    const { x, y } = getRelPos(e.clientX, e.clientY)
    const player = benchDragRef.current

    // If dropped within 9% of an existing local player → substitute (keep UID so connectors follow)
    const near = localJugadoras.find(j => Math.sqrt((j.posX - x) ** 2 + (j.posY - y) ** 2) < 9)
    if (near) {
      const subst: JugadoraTactica = { uid: near.uid, numero: player.numero, nombre: player.nombre, foto: player.foto, fichaId: player.fichaId, posX: near.posX, posY: near.posY }
      const updated = localJugadoras.map(j => j.uid === near.uid ? subst : j)
      setLocalJugadoras(updated); save(updated, visitJugadoras)
    } else {
      handleAddBenchPlayer(player, x, y)
    }
    benchDragRef.current = null
  }

  // ── Animation
  const captureFrame = () => {
    const frame: AnimFrame = { local: JSON.parse(JSON.stringify(localJugadoras)), visit: JSON.parse(JSON.stringify(visitJugadoras)) }
    setAnimFrames(prev => {
      const next = [...prev.slice(0, animIdx + 1), frame, ...prev.slice(animIdx + 1)]
      setAnimIdx(next.length - 1); return next
    })
  }

  const stopAnimation = useCallback(() => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    setAnimPlaying(false); setAnimTransition(false)
  }, [])

  const playAnimation = useCallback(() => {
    if (animFrames.length < 2) return
    stopAnimation(); setAnimTransition(true); setAnimPlaying(true)
    let idx = 0
    const step = () => {
      idx++
      if (idx >= animFrames.length) {
        setLocalJugadoras(JSON.parse(JSON.stringify(animFrames[0].local)))
        setVisitJugadoras(JSON.parse(JSON.stringify(animFrames[0].visit)))
        animTimerRef.current = setTimeout(() => { setAnimPlaying(false); setAnimTransition(false) }, 800)
        return
      }
      setLocalJugadoras(JSON.parse(JSON.stringify(animFrames[idx].local)))
      setVisitJugadoras(JSON.parse(JSON.stringify(animFrames[idx].visit)))
      animTimerRef.current = setTimeout(step, 1000)
    }
    setLocalJugadoras(JSON.parse(JSON.stringify(animFrames[0].local)))
    setVisitJugadoras(JSON.parse(JSON.stringify(animFrames[0].visit)))
    animTimerRef.current = setTimeout(step, 1000)
  }, [animFrames, stopAnimation])

  const goToFrame = (idx: number) => {
    if (idx < 0 || idx >= animFrames.length) return
    setAnimIdx(idx)
    setLocalJugadoras(JSON.parse(JSON.stringify(animFrames[idx].local)))
    setVisitJugadoras(JSON.parse(JSON.stringify(animFrames[idx].visit)))
  }

  const downloadAllFrames = () => {
    animFrames.forEach((f, i) => setTimeout(() => downloadFramePNG(f, i, analisis.equipoLocal.color, analisis.equipoVisitante.color), i * 400))
  }

  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }, [])

  // ── Toolbar helpers
  const inDrawMode = editorMode === 'freehand' || editorMode === 'arrow' || editorMode === 'curve'
  const svgActive = inDrawMode // SVG captures pointer events only when drawing
  const tokensInteractive = editorMode === 'move' || editorMode === 'anim' || editorMode === 'ball' || editorMode === 'connect'

  const modeBtn = (mode: EditorMode, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => { stopAnimation(); setEditorMode(mode); setConnectFrom(null); setSvgMousePos(null) }}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${editorMode === mode ? 'bg-rfpaf-blue text-white shadow-sm' : 'bg-white/60 text-gray-600 hover:bg-white hover:text-rfpaf-blue border border-gray-200'}`}
    >{icon}{label}</button>
  )

  // ── Derived marker ID (for current shape preview)
  const previewMarkerId = 'arr-preview'

  return (
    <div className="p-3 md:p-5">

      {/* Convocatoria selector */}
      {convocatorias.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-rfpaf-blue/5 border border-rfpaf-blue/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Users className="w-4 h-4 text-rfpaf-blue" />
            <span className="text-xs font-semibold text-rfpaf-blue">Convocatoria</span>
          </div>
          <select value={selectedConvId} onChange={e => setSelectedConvId(e.target.value)}
            className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-rfpaf-blue">
            <option value="">Sin convocatoria</option>
            {convocatorias.map(c => <option key={c.id} value={c.id}>{c.nombre} — {fmtDate(c.fecha)}</option>)}
          </select>
          {selectedConv && (
            <button onClick={handleLoadConvocatoria}
              className="flex items-center gap-1.5 bg-rfpaf-blue hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              <UserPlus className="w-3.5 h-3.5" /> Cargar
            </button>
          )}
        </div>
      )}

      {/* Bench panel */}
      {benchPlayers.length > 0 && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Banquillo — arrastra sobre una jugadora del campo para sustituirla · pulsa para añadir</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {benchPlayers.map(player => (
              <BenchPlayerCard key={player.fichaId} player={player} onAdd={() => handleAddBenchPlayer(player)} onDragStart={e => handleBenchDragStart(e, player)} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 min-w-0">

          {/* Formation selectors */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mb-3">
            <FormationSelector label={analisis.equipoLocal.nombre} color="#1a3a6b"
              value={analisis.equipoLocal.formacion} onChange={f => handleFormationChange('local', f)}
              onReset={() => handleResetPositions('local')} onNameEdit={n => handleNameEdit('local', n)}
              editing={editingLocal} setEditing={setEditingLocal} />
            <div className="flex items-center justify-center text-gray-400 font-bold text-base pt-5">vs</div>
            <FormationSelector label={analisis.equipoVisitante.nombre} color="#c0392b"
              value={analisis.equipoVisitante.formacion} onChange={f => handleFormationChange('visit', f)}
              onReset={() => handleResetPositions('visit')} onNameEdit={n => handleNameEdit('visit', n)}
              editing={editingVisit} setEditing={setEditingVisit} />
          </div>

          {/* ── TOOLBAR ── */}
          <div className="mb-2 rounded-xl border border-gray-200 bg-gray-100 overflow-hidden">
            {/* Row 1: mode buttons + global undo */}
            <div className="flex flex-wrap gap-1 p-1.5 items-center">
              {modeBtn('move', 'Mover', <span className="text-sm leading-none">✋</span>)}
              {modeBtn('freehand', 'Trazar', <Pencil className="w-3 h-3" />)}
              {modeBtn('arrow', 'Flecha', <ArrowRight className="w-3 h-3" />)}
              {modeBtn('curve', 'Curva', <Spline className="w-3 h-3" />)}
              {modeBtn('ball', 'Balón', <span className="text-sm leading-none">⚽</span>)}
              {modeBtn('connect', 'Conectar', <Link2 className="w-3 h-3" />)}
              {modeBtn('anim', 'Animar', <span className="text-sm leading-none">🎬</span>)}
              <div className="w-px h-5 bg-gray-300 mx-0.5" />
              <button
                onClick={() => {
                  if (shapes.length > 0) setShapes(p => p.slice(0, -1))
                  else if (connectors.length > 0) setConnectors(p => p.slice(0, -1))
                }}
                disabled={shapes.length === 0 && connectors.length === 0}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  shapes.length > 0 || connectors.length > 0
                    ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                    : 'bg-white/20 text-gray-300 border-gray-100 cursor-not-allowed'
                }`}>
                <Eraser className="w-3 h-3" /> Deshacer
              </button>
            </div>

            {/* Row 2: mode-specific options */}
            {(inDrawMode || editorMode === 'connect' || editorMode === 'ball') && (
              <div className="flex flex-wrap items-center gap-2 px-2 pb-2 pt-1 border-t border-gray-200">
                {(inDrawMode || editorMode === 'connect') && (
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    Color
                    <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                  </label>
                )}
                {inDrawMode && (
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    Grosor
                    <input type="range" min={1} max={8} value={penWidth} onChange={e => setPenWidth(Number(e.target.value))}
                      className="w-20 accent-rfpaf-blue" />
                  </label>
                )}
                {inDrawMode && (
                  <>
                    <button onClick={() => setShapes(prev => prev.slice(0, -1))}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-white border border-gray-200 transition-colors">
                      <Eraser className="w-3 h-3" /> Deshacer
                    </button>
                    <button onClick={() => setShapes([])}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-white border border-gray-200 transition-colors">
                      <Trash2 className="w-3 h-3" /> Borrar
                    </button>
                  </>
                )}
                {editorMode === 'connect' && (
                  <>
                    <button onClick={() => setConnDashed(d => !d)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${connDashed ? 'bg-rfpaf-blue text-white border-rfpaf-blue' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                      - - Discontinuo
                    </button>
                    <button onClick={() => setConnectors(prev => prev.slice(0, -1))}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-white border border-gray-200 transition-colors">
                      <Eraser className="w-3 h-3" /> Deshacer
                    </button>
                    <button onClick={() => setConnectors([])}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-white border border-gray-200 transition-colors">
                      <Trash2 className="w-3 h-3" /> Borrar
                    </button>
                  </>
                )}
                {editorMode === 'ball' && (
                  <button onClick={() => setBalls([])}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-white border border-gray-200 transition-colors">
                    <Trash2 className="w-3 h-3" /> Quitar balones
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── ANIMATION BAR ── */}
          {editorMode === 'anim' && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={captureFrame}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  <Camera className="w-3.5 h-3.5" /> Capturar fotograma
                </button>
                <div className="flex gap-1 flex-wrap">
                  {animFrames.map((_, i) => (
                    <button key={i} onClick={() => goToFrame(i)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold border transition-colors ${animIdx === i ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                {animFrames.length >= 2 && (
                  <>
                    <div className="w-px h-5 bg-amber-200" />
                    {animPlaying ? (
                      <button onClick={stopAnimation}
                        className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        <Square className="w-3 h-3" /> Detener
                      </button>
                    ) : (
                      <button onClick={playAnimation}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        <Play className="w-3.5 h-3.5" /> Reproducir
                      </button>
                    )}
                    <button onClick={downloadAllFrames}
                      className="flex items-center gap-1 bg-white hover:bg-amber-100 text-amber-700 border border-amber-300 text-xs font-bold px-2 py-1.5 rounded-lg transition-colors ml-auto">
                      <Download className="w-3.5 h-3.5" /> Descargar todos
                    </button>
                  </>
                )}
                {animFrames.length === 0 && <span className="text-xs text-amber-700">Mueve jugadoras y captura fotogramas</span>}
                {animFrames.length > 0 && (
                  <button onClick={() => { setAnimFrames([]); setAnimIdx(0) }}
                    className="text-xs text-amber-600 hover:text-red-600 transition-colors ml-auto">
                    <Plus className="w-3 h-3 rotate-45 inline" /> Limpiar
                  </button>
                )}
              </div>

              {/* Frame strip with thumbnails */}
              {animFrames.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Vista de fotogramas</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {animFrames.map((frame, i) => (
                      <div key={i} className={`flex-shrink-0 text-center rounded-lg overflow-hidden transition-all ${animIdx === i ? 'ring-2 ring-amber-500 shadow-md' : 'opacity-75 hover:opacity-100'}`}>
                        <FrameThumb frame={frame} localColor={analisis.equipoLocal.color} visitColor={analisis.equipoVisitante.color} width={90} />
                        <div className="flex items-center justify-between gap-1 px-1 py-0.5 bg-white/80">
                          <button onClick={() => goToFrame(i)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${animIdx === i ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-100'}`}>
                            {i + 1}
                          </button>
                          <button
                            onClick={() => downloadFramePNG(frame, i, analisis.equipoLocal.color, analisis.equipoVisitante.color)}
                            className="p-0.5 text-amber-600 hover:text-amber-900 transition-colors" title="Descargar PNG">
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PITCH ── */}
          <div
            ref={pitchRef}
            className="relative w-full rounded-xl select-none"
            style={{
              aspectRatio: '68/105', background: '#2d6a27', touchAction: 'none', overflow: 'visible',
              cursor: editorMode === 'ball' ? 'crosshair' : inDrawMode ? 'crosshair' : editorMode === 'connect' ? 'cell' : 'default',
            }}
            onMouseMove={handleMouseMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
            onTouchMove={handleTouchMove} onTouchEnd={handleEnd}
            onDragOver={handlePitchDragOver} onDrop={handlePitchDrop}
            onClick={handlePitchClick}
          >
            <PitchMarkings />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-white/70 text-[10px] font-semibold tracking-wider z-10 pointer-events-none">
              {analisis.equipoVisitante.nombre.toUpperCase()}
            </div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/70 text-[10px] font-semibold tracking-wider z-10 pointer-events-none">
              {analisis.equipoLocal.nombre.toUpperCase()}
            </div>

            {/* SVG overlay: shapes + connectors + curve handles */}
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: svgActive ? 'all' : 'none', zIndex: 15, overflow: 'visible', touchAction: 'none' }}
              onMouseDown={handleSVGDown}
              onMouseMove={handleSVGMove}
              onMouseUp={handleSVGUp}
              onTouchStart={handleSVGTouchStart}
              onTouchMove={handleSVGTouchMove}
              onTouchEnd={handleSVGTouchEnd}
            >
              <defs>
                {/* Preview marker (current pen color) */}
                <marker id={previewMarkerId} markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L5,2.5 L0,5 L1.5,2.5 Z" fill={penColor} />
                </marker>
              </defs>

              {/* Committed shapes */}
              {shapes.map(s => {
                const mid = `m-${s.uid}`
                if (s.type === 'freehand') {
                  return (
                    <polyline key={s.uid}
                      points={s.pts.map(p => `${p.x},${p.y}`).join(' ')}
                      stroke={s.color} strokeWidth={s.width} fill="none"
                      strokeLinecap="round" strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke" />
                  )
                }
                if (s.type === 'arrow' && s.pts.length >= 2) {
                  return (
                    <g key={s.uid}>
                      <defs>
                        <marker id={mid} markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L5,2.5 L0,5 L1.5,2.5 Z" fill={s.color} />
                        </marker>
                      </defs>
                      <line x1={s.pts[0].x} y1={s.pts[0].y} x2={s.pts[s.pts.length - 1].x} y2={s.pts[s.pts.length - 1].y}
                        stroke={s.color} strokeWidth={s.width} strokeLinecap="round"
                        vectorEffect="non-scaling-stroke" markerEnd={`url(#${mid})`} />
                    </g>
                  )
                }
                if (s.type === 'curve' && s.pts.length === 3) {
                  const [p0, cp, p2] = s.pts
                  return (
                    <g key={s.uid}>
                      <defs>
                        <marker id={mid} markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L5,2.5 L0,5 L1.5,2.5 Z" fill={s.color} />
                        </marker>
                      </defs>
                      <path d={`M ${p0.x} ${p0.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`}
                        stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round"
                        vectorEffect="non-scaling-stroke" markerEnd={`url(#${mid})`} />
                      {/* Curve control handle — visible only in curve mode */}
                      {editorMode === 'curve' && (
                        <>
                          <line x1={p0.x} y1={p0.y} x2={cp.x} y2={cp.y} stroke={s.color} strokeWidth={0.5} strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" opacity={0.5} />
                          <line x1={cp.x} y1={cp.y} x2={p2.x} y2={p2.y} stroke={s.color} strokeWidth={0.5} strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" opacity={0.5} />
                          <circle cx={cp.x} cy={cp.y} r={3} fill="white" stroke={s.color} strokeWidth={1}
                            style={{ cursor: 'grab', pointerEvents: 'all' }}
                            vectorEffect="non-scaling-stroke"
                            onMouseDown={e => { e.stopPropagation(); curveHandleDragRef.current = s.uid }}
                            onTouchStart={e => { e.stopPropagation(); curveHandleDragRef.current = s.uid }} />
                        </>
                      )}
                    </g>
                  )
                }
                return null
              })}

              {/* Current (in-progress) shape */}
              {currentShape && (() => {
                const s = currentShape
                if (s.type === 'freehand') return (
                  <polyline points={s.pts.map(p => `${p.x},${p.y}`).join(' ')}
                    stroke={s.color} strokeWidth={s.width} fill="none"
                    strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                )
                if (s.type === 'arrow' && s.pts.length >= 2) return (
                  <line x1={s.pts[0].x} y1={s.pts[0].y} x2={s.pts[s.pts.length - 1].x} y2={s.pts[s.pts.length - 1].y}
                    stroke={s.color} strokeWidth={s.width} strokeLinecap="round"
                    vectorEffect="non-scaling-stroke" markerEnd={`url(#${previewMarkerId})`} />
                )
                if (s.type === 'curve' && s.pts.length === 3) {
                  const [p0, cp, p2] = s.pts
                  return (
                    <path d={`M ${p0.x} ${p0.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`}
                      stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round"
                      vectorEffect="non-scaling-stroke" markerEnd={`url(#${previewMarkerId})`} />
                  )
                }
                return null
              })()}

              {/* Connectors */}
              {connectors.map(conn => {
                const from = allJugadoras.find(j => j.uid === conn.fromUid)
                const to = allJugadoras.find(j => j.uid === conn.toUid)
                if (!from || !to) return null
                const mid = `conn-${conn.uid}`
                return (
                  <g key={conn.uid}>
                    <defs>
                      <marker id={mid} markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L5,2.5 L0,5 L1.5,2.5 Z" fill={conn.color} />
                      </marker>
                    </defs>
                    <line x1={from.posX} y1={from.posY} x2={to.posX} y2={to.posY}
                      stroke={conn.color} strokeWidth={2.5}
                      strokeDasharray={conn.dashed ? '4 2.5' : undefined}
                      markerEnd={`url(#${mid})`}
                      vectorEffect="non-scaling-stroke" />
                  </g>
                )
              })}

              {/* Connector preview line */}
              {editorMode === 'connect' && connectFrom && svgMousePos && (() => {
                const from = allJugadoras.find(j => j.uid === connectFrom)
                if (!from) return null
                return (
                  <line x1={from.posX} y1={from.posY} x2={svgMousePos.x} y2={svgMousePos.y}
                    stroke={penColor} strokeWidth={2} strokeDasharray="4 2" opacity={0.7}
                    vectorEffect="non-scaling-stroke" />
                )
              })()}
            </svg>

            {/* Ball tokens */}
            {balls.map(b => (
              <div key={b.uid}
                style={{
                  position: 'absolute', left: `${b.posX}%`, top: `${b.posY}%`, transform: 'translate(-50%, -50%)',
                  zIndex: 18, cursor: editorMode === 'ball' ? 'grab' : 'default', fontSize: 22, lineHeight: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))', pointerEvents: editorMode === 'ball' ? 'all' : 'none', userSelect: 'none',
                }}
                onMouseDown={e => {
                  if (editorMode !== 'ball') return
                  e.preventDefault(); e.stopPropagation()
                  ballDragRef.current = { uid: b.uid }
                }}
                onTouchStart={e => {
                  if (editorMode !== 'ball') return
                  e.stopPropagation()
                  ballDragRef.current = { uid: b.uid }
                }}
                onContextMenu={e => { e.preventDefault(); if (editorMode === 'ball') setBalls(prev => prev.filter(x => x.uid !== b.uid)) }}
                title="Arrastrar · clic derecho para quitar"
              >⚽</div>
            ))}

            {/* Visitor tokens */}
            {visitJugadoras.map(j => (
              <PlayerToken key={j.uid} player={j} color={analisis.equipoVisitante.color}
                interactive={tokensInteractive} animTransition={animTransition}
                isConnectSource={connectFrom === j.uid}
                onDragStart={() => { if (editorMode === 'move' || editorMode === 'anim' || editorMode === 'connect') dragging.current = { uid: j.uid, team: 'visit' } }}
                onConnect={editorMode === 'connect' ? () => handlePlayerConnect(j.uid) : undefined}
              />
            ))}
            {/* Local tokens */}
            {localJugadoras.map(j => (
              <PlayerToken key={j.uid} player={j} color={analisis.equipoLocal.color}
                interactive={tokensInteractive} animTransition={animTransition}
                isConnectSource={connectFrom === j.uid}
                onDragStart={() => { if (editorMode === 'move' || editorMode === 'anim' || editorMode === 'connect') dragging.current = { uid: j.uid, team: 'local' } }}
                onConnect={editorMode === 'connect' ? () => handlePlayerConnect(j.uid) : undefined}
              />
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-1">
            {editorMode === 'move' && 'Arrastra para mover · quitar jugadora desde el panel'}
            {editorMode === 'freehand' && 'Dibuja trazos libres sobre el campo'}
            {editorMode === 'arrow' && 'Arrastra para dibujar una flecha de movimiento'}
            {editorMode === 'curve' && 'Arrastra para dibujar · arrastra el punto blanco para curvar 360°'}
            {editorMode === 'ball' && 'Pulsa para colocar · arrastra · clic derecho para quitar'}
            {editorMode === 'connect' && (connectFrom ? 'Pulsa la jugadora de destino · arrastra para moverla' : 'Pulsa para conectar · arrastra para mover con la línea')}
            {editorMode === 'anim' && 'Captura fotogramas en distintas posiciones y reproduce'}
          </p>
        </div>

        {/* Right panel */}
        <div className="xl:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-rfpaf-blue px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Sparkles className="w-4 h-4" /> Análisis IA
              </div>
              <button onClick={handleGenerateAnalysis} disabled={generating}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Analizando...' : 'Generar'}
              </button>
            </div>
            {showAnalysis && analisis.analisisIA ? (
              <div className="p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{analisis.analisisIA}</pre>
                <button onClick={() => { updateAnalisis(analisis.id, { analisisIA: '' }); setShowAnalysis(false) }}
                  className="mt-3 text-xs text-gray-400 hover:text-rfpaf-red transition-colors">Borrar análisis</button>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 text-sm">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Pulsa <strong>Generar</strong> para obtener un análisis táctico</p>
              </div>
            )}
          </div>

          <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Jugadoras</p>
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              <p className="text-xs font-bold text-rfpaf-blue mb-1">{analisis.equipoLocal.nombre}</p>
              {selectedConv ? (
                allConvPlayers.map(player => {
                  const onFieldPlayer = localJugadoras.find(j => j.fichaId === player.fichaId)
                  if (onFieldPlayer) {
                    return (
                      <PlayerNameRow key={player.fichaId} player={onFieldPlayer} color={analisis.equipoLocal.color}
                        onDragStart={() => { listDragRef.current = onFieldPlayer.uid }}
                        onDrop={() => handleListSwap(onFieldPlayer.uid)}
                        onRemove={() => handleRemoveLocal(onFieldPlayer.uid)}
                        onChange={name => {
                          const updated = localJugadoras.map(p => p.uid === onFieldPlayer.uid ? { ...p, nombre: name } : p)
                          setLocalJugadoras(updated); updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, jugadoras: updated } })
                        }} />
                    )
                  }
                  return (
                    <button key={player.fichaId} onClick={() => handleAddBenchPlayer(player)}
                      className="w-full flex items-center gap-2 rounded px-1 py-0.5 hover:bg-green-50 group text-left transition-colors">
                      <span className="w-4 flex-shrink-0" />
                      <div style={{ opacity: 0.45, flexShrink: 0 }}><PlayerAvatar foto={player.foto} numero={player.numero} color={analisis.equipoLocal.color} size={20} /></div>
                      <span className="flex-1 text-xs text-gray-400 truncate group-hover:text-gray-700 transition-colors">{player.nombre}</span>
                      <span className="text-green-500 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pr-1">+</span>
                    </button>
                  )
                })
              ) : (
                localJugadoras.map(j => (
                  <PlayerNameRow key={j.uid} player={j} color={analisis.equipoLocal.color}
                    onDragStart={() => { listDragRef.current = j.uid }}
                    onDrop={() => handleListSwap(j.uid)}
                    onRemove={() => handleRemoveLocal(j.uid)}
                    onChange={name => {
                      const updated = localJugadoras.map(p => p.uid === j.uid ? { ...p, nombre: name } : p)
                      setLocalJugadoras(updated); updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, jugadoras: updated } })
                    }} />
                ))
              )}
              <p className="text-xs font-bold text-rfpaf-red mt-3 mb-1">{analisis.equipoVisitante.nombre}</p>
              {visitJugadoras.map(j => (
                <PlayerNameRow key={j.uid} player={j} color={analisis.equipoVisitante.color}
                  onChange={name => {
                    const updated = visitJugadoras.map(p => p.uid === j.uid ? { ...p, nombre: name } : p)
                    setVisitJugadoras(updated); updateAnalisis(analisis.id, { equipoVisitante: { ...analisis.equipoVisitante, jugadoras: updated } })
                  }} />
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 leading-snug">⠿ Arrastra las filas para intercambiar posiciones</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════════════════════════════ */

function PlayerAvatar({ foto, numero, color, size = 32 }: { foto?: string | null; numero: number; color: string; size?: number }) {
  if (foto) {
    const badge = Math.round(size * 0.38); const fs = Math.max(6, Math.round(size * 0.22))
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', border: `2.5px solid ${color}`, boxShadow: '0 2px 6px rgba(0,0,0,0.45)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        <img src={foto} alt={String(numero)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, background: color, color: 'white', fontSize: fs, fontWeight: 'bold', width: badge, height: badge, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: `${badge * 0.5}px 0 ${badge * 0.2}px 0`, lineHeight: 1 }}>{numero}</div>
      </div>
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, border: '2px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: Math.max(7, Math.round(size * 0.3)), fontWeight: '800', boxShadow: '0 2px 6px rgba(0,0,0,0.5)', flexShrink: 0 }}>
      {numero}
    </div>
  )
}

function BenchPlayerCard({ player, onAdd, onDragStart }: { player: BenchItem; onAdd: () => void; onDragStart: (e: React.DragEvent) => void }) {
  return (
    <button draggable onDragStart={onDragStart} onClick={onAdd}
      className="flex-shrink-0 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none hover:scale-105 transition-transform"
      title={`Añadir ${player.nombre} al campo`}>
      <div className="relative">
        <PlayerAvatar foto={player.foto} numero={player.numero} color="#1a3a6b" size={42} />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md leading-none pointer-events-none">+</div>
      </div>
      <span className="text-[9px] text-gray-600 text-center max-w-[48px] leading-tight truncate font-medium">{player.nombre.split(' ')[0]}</span>
    </button>
  )
}

function PlayerToken({ player, color, onDragStart, onRemove, onConnect, interactive, animTransition, isConnectSource }: {
  player: JugadoraTactica; color: string; onDragStart: () => void; onRemove?: () => void
  onConnect?: () => void; interactive: boolean; animTransition: boolean; isConnectSource?: boolean
}) {
  return (
    <div
      style={{
        position: 'absolute', left: `${player.posX}%`, top: `${player.posY}%`, transform: 'translate(-50%, -50%)',
        cursor: onConnect ? 'pointer' : interactive ? 'grab' : 'default',
        touchAction: 'none', zIndex: 20, userSelect: 'none',
        pointerEvents: interactive ? 'all' : 'none',
        transition: animTransition ? 'left 0.8s ease-in-out, top 0.8s ease-in-out' : undefined,
      }}
      onMouseDown={e => {
        e.preventDefault(); onDragStart()
      }}
      onTouchStart={e => { e.preventDefault(); onDragStart() }}
      onClick={onConnect}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {isConnectSource && (
          <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #facc15', animation: 'pulse 1s infinite', zIndex: 1 }} />
        )}
        <PlayerAvatar foto={player.foto} numero={player.numero} color={color} size={34} />
        {onRemove && (
          <button
            style={{ position: 'absolute', top: -4, right: -4, width: 15, height: 15, borderRadius: '50%', background: 'rgba(160,0,0,0.92)', color: 'white', border: '1.5px solid rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 30, padding: 0 }}
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onRemove() }}
            onTouchStart={e => { e.stopPropagation(); e.preventDefault(); onRemove() }}
          >×</button>
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: 8, color: 'white', fontWeight: '700', textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: 2, maxWidth: 50, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
        {player.nombre !== String(player.numero) ? player.nombre.split(' ')[0] : ''}
      </div>
    </div>
  )
}

function PlayerNameRow({ player, color, onChange, onDragStart, onDrop, onRemove }: {
  player: JugadoraTactica; color: string; onChange: (n: string) => void
  onDragStart?: () => void; onDrop?: () => void; onRemove?: () => void
}) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.() }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
      onDrop={e => { e.preventDefault(); onDrop?.() }}
      className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50 transition-colors group"
    >
      {onDragStart && <span className="text-gray-400 hover:text-gray-600 cursor-grab text-base select-none leading-none flex-shrink-0">⠿</span>}
      <PlayerAvatar foto={player.foto} numero={player.numero} color={color} size={20} />
      <input value={player.nombre} onChange={e => onChange(e.target.value)}
        className="flex-1 text-xs border-b border-gray-200 focus:border-rfpaf-blue outline-none py-0.5 bg-transparent"
        placeholder={`Jugadora ${player.numero}`} />
      {onRemove && (
        <button onClick={onRemove} title="Sacar del campo"
          className="flex-shrink-0 w-5 h-5 rounded-full bg-red-50 hover:bg-red-200 text-red-400 hover:text-red-700 text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          ×
        </button>
      )}
    </div>
  )
}

function FrameThumb({ frame, localColor, visitColor, width }: { frame: AnimFrame; localColor: string; visitColor: string; width: number }) {
  const h = Math.round(width * 105 / 68)
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ display: 'block' }}>
      <rect width={width} height={h} fill="#2d6a27" />
      <rect x={width * 0.03} y={h * 0.02} width={width * 0.94} height={h * 0.96} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={0.8} />
      <line x1={width * 0.03} y1={h * 0.5} x2={width * 0.97} y2={h * 0.5} stroke="rgba(255,255,255,0.6)" strokeWidth={0.8} />
      <ellipse cx={width / 2} cy={h / 2} rx={width * 0.13} ry={h * 0.085} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={0.8} />
      {frame.visit.map(j => <circle key={j.uid} cx={j.posX / 100 * width} cy={j.posY / 100 * h} r={3.5} fill={visitColor} stroke="white" strokeWidth={0.6} />)}
      {frame.local.map(j => <circle key={j.uid} cx={j.posX / 100 * width} cy={j.posY / 100 * h} r={3.5} fill={localColor} stroke="white" strokeWidth={0.6} />)}
    </svg>
  )
}

function PitchMarkings() {
  return (
    <>
      <div style={{ position: 'absolute', inset: '2% 3%', border: '2px solid rgba(255,255,255,0.7)', borderRadius: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '3%', right: '3%', top: '50%', height: 2, background: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: '26%', height: '17%', transform: 'translate(-50%, -50%)', border: '2px solid rgba(255,255,255,0.7)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '20%', right: '20%', top: '2%', height: '16%', border: '2px solid rgba(255,255,255,0.7)', borderTop: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '33%', right: '33%', top: '2%', height: '6%', border: '2px solid rgba(255,255,255,0.7)', borderTop: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '39%', right: '39%', top: '0%', height: '2.5%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '50%', top: '12.5%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '20%', right: '20%', bottom: '2%', height: '16%', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '33%', right: '33%', bottom: '2%', height: '6%', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '39%', right: '39%', bottom: '0%', height: '2.5%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.7)', borderTop: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: '12.5%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
    </>
  )
}

function FormationSelector({ label, color, value, onChange, onReset, onNameEdit, editing, setEditing }: {
  label: string; color: string; value: FormacionFutbol; onChange: (f: FormacionFutbol) => void
  onReset: () => void; onNameEdit: (n: string) => void; editing: boolean; setEditing: (v: boolean) => void
}) {
  return (
    <div className="flex-1 min-w-0">
      {editing ? (
        <input autoFocus defaultValue={label}
          className="w-full text-sm font-bold border-b-2 outline-none mb-1" style={{ color, borderColor: color }}
          onBlur={e => { onNameEdit(e.target.value); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onNameEdit(e.currentTarget.value); setEditing(false) } }} />
      ) : (
        <button onClick={() => setEditing(true)} className="text-sm font-bold truncate block w-full text-left mb-1" style={{ color }}>{label} ✏️</button>
      )}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <select value={value} onChange={e => onChange(e.target.value as FormacionFutbol)}
            className="w-full appearance-none border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 pr-6" style={{ color }}>
            {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={onReset} title="Restablecer posiciones"
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
