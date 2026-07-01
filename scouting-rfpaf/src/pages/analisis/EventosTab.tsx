import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Play, Clock, Trash2, PlayCircle, BarChart2, List, Users, Download, FileDown, EyeOff, Eye, PenLine, Upload, Scissors, Video } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AnalisisPartido, EventoAnalisis, TipoEventoAnalisis } from '../../types'
import PintadoAcciones from '../PintadoAcciones'

interface Props { analisis: AnalisisPartido }

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

function extractYoutubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/embed\/([^?]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

function mmssToSeconds(mmss: string): number {
  const parts = mmss.split(':').map(Number)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return 0
}

function secondsToMmss(s: number): string {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function calcMatchMinute(videoSecs: number, tiempos: AnalisisPartido['tiempos']): number {
  const i1 = mmssToSeconds(tiempos.inicio1)
  const f1 = mmssToSeconds(tiempos.fin1)
  const i2 = mmssToSeconds(tiempos.inicio2)
  if (tiempos.inicio1 && videoSecs >= i1) {
    if (!tiempos.fin1 || videoSecs <= f1) return Math.floor((videoSecs - i1) / 60)
    if (tiempos.inicio2 && videoSecs >= i2) return 45 + Math.floor((videoSecs - i2) / 60)
  }
  return Math.floor(videoSecs / 60)
}

const EVENT_CONFIG: Record<TipoEventoAnalisis, { label: string; color: string; bg: string; emoji: string }> = {
  GOL:            { label: 'GOL',           color: '#dc2626', bg: '#fef2f2', emoji: '⚽' },
  OCASION:        { label: 'OCASIÓN',       color: '#d97706', bg: '#fffbeb', emoji: '🎯' },
  DUELO:          { label: 'DUELO',         color: '#7c3aed', bg: '#f5f3ff', emoji: '⚔️' },
  NOTA:           { label: 'NOTA',          color: '#64748b', bg: '#f8fafc', emoji: '📝' },
  TRANSICION_DEF: { label: 'TR. DEF.',      color: '#0d9488', bg: '#f0fdfa', emoji: '🛡️' },
  TRANSICION_OF:  { label: 'TR. OFENS.',    color: '#16a34a', bg: '#f0fdf4', emoji: '⚡' },
  SALIDA_BALON:   { label: 'SALIDA BALÓN',  color: '#4f46e5', bg: '#eef2ff', emoji: '🔵' },
  ABP:            { label: 'ABP',           color: '#b45309', bg: '#fefce8', emoji: '🎯' },
  PRESION:        { label: 'PRESIÓN',       color: '#db2777', bg: '#fdf2f8', emoji: '💪' },
}

const EVENT_TYPES = Object.keys(EVENT_CONFIG) as TipoEventoAnalisis[]

/* ── Football Pitch SVG (portrait) ── */
function FootballPitch({
  events, onPositionClick, onEventClick, selectMode = false, pendingPosition,
}: {
  events: EventoAnalisis[]
  onPositionClick?: (x: number, y: number) => void
  onEventClick?: (ev: EventoAnalisis) => void
  selectMode?: boolean
  pendingPosition?: { x: number; y: number } | null
}) {
  const eventsWithPos = events.filter(e => e.posicion)

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPositionClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    onPositionClick(x, y)
  }

  return (
    <svg
      viewBox="0 0 400 580"
      className={`w-full rounded-xl ${selectMode ? 'cursor-crosshair' : ''}`}
      style={{ background: '#2d7a3d' }}
      onClick={handleClick}
    >
      {/* Grass stripes */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x="0" y={i * 83} width="400" height="41"
          fill={i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'transparent'} />
      ))}
      {/* Outer */}
      <rect x="20" y="20" width="360" height="540" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Halfway line */}
      <line x1="20" y1="290" x2="380" y2="290" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Center circle */}
      <circle cx="200" cy="290" r="55" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      <circle cx="200" cy="290" r="3" fill="white" opacity="0.8" />
      {/* Top penalty area */}
      <rect x="80" y="20" width="240" height="110" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Top goal area */}
      <rect x="130" y="20" width="140" height="45" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Top goal */}
      <rect x="150" y="8" width="100" height="15" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Top penalty spot */}
      <circle cx="200" cy="97" r="2.5" fill="white" opacity="0.8" />
      {/* Bottom penalty area */}
      <rect x="80" y="450" width="240" height="110" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Bottom goal area */}
      <rect x="130" y="515" width="140" height="45" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Bottom goal */}
      <rect x="150" y="557" width="100" height="15" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Bottom penalty spot */}
      <circle cx="200" cy="483" r="2.5" fill="white" opacity="0.8" />

      {/* Event dots */}
      {eventsWithPos.map((ev) => {
        const cfg = EVENT_CONFIG[ev.tipo]
        const cx = (ev.posicion!.x / 100) * 400
        const cy = (ev.posicion!.y / 100) * 580
        return (
          <g key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick?.(ev) }} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={cy} r="13" fill={cfg.color} stroke="white" strokeWidth="2" opacity="0.92" />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize="7.5" fill="white" fontWeight="bold">
              {ev.minutoPartido}'
            </text>
          </g>
        )
      })}

      {/* Pending position marker */}
      {pendingPosition && (
        <g>
          <circle cx={(pendingPosition.x / 100) * 400} cy={(pendingPosition.y / 100) * 580}
            r="14" fill="white" opacity="0.4" />
          <circle cx={(pendingPosition.x / 100) * 400} cy={(pendingPosition.y / 100) * 580}
            r="6" fill="white" opacity="0.95" />
        </g>
      )}
    </svg>
  )
}

/* ── Bar chart ── */
function BarChart({
  data, maxVal, colorFn,
}: {
  data: { label: string; count: number }[]
  maxVal: number
  colorFn?: (label: string) => string
}) {
  return (
    <div className="space-y-2">
      {data.map(({ label, count }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 w-24 shrink-0 truncate font-medium">{label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 rounded-full transition-all duration-500"
              style={{
                width: maxVal > 0 ? `${(count / maxVal) * 100}%` : '0%',
                background: colorFn ? colorFn(label) : '#5b21b6',
                minWidth: count > 0 ? '16px' : '0',
              }}
            />
          </div>
          <span className="text-xs font-bold text-gray-800 w-5 text-right">{count}</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-xs text-gray-400">Sin datos</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function EventosTab({ analisis }: Props) {
  const { updateAnalisis, convocatorias } = useStore()

  const [videoUrl, setVideoUrl] = useState(analisis.videoPartidoUrl)
  const [tiempos, setTiempos] = useState(analisis.tiempos)
  const [tiemposVisible, setTiemposVisible] = useState(true)
  const [ytReady, setYtReady] = useState(false)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)

  // Modal
  const [modal, setModal] = useState<{ tipo: TipoEventoAnalisis; videoSeconds: number; minuto: number } | null>(null)
  const [modalDesc, setModalDesc] = useState('')
  const [modalJugadora, setModalJugadora] = useState('')
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)

  // History
  const [historialTab, setHistorialTab] = useState<'lista' | 'campo' | 'graficas' | 'pizarra'>('lista')
  const [filterTipo, setFilterTipo] = useState<string>('TODOS')
  const [filterJugadora, setFilterJugadora] = useState<string>('TODOS')
  const [convocatoriaId, setConvocatoriaId] = useState<string>('')

  // Local video state
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [downloadingClip, setDownloadingClip] = useState<string | null>(null)
  const [downloadAllActive, setDownloadAllActive] = useState(false)
  const [downloadAllProgress, setDownloadAllProgress] = useState(0)
  const [clipPre, setClipPre] = useState(5)
  const [clipPost, setClipPost] = useState(5)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localFileInputRef = useRef<HTMLInputElement>(null)
  const localDurationProbingRef = useRef(false)

  const playerRef = useRef<ReturnType<typeof window.YT.Player> | null>(null)
  const playerDivId = useRef(`yt-${uuidv4()}`)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const videoId = extractYoutubeId(videoUrl)

  /* ── YouTube IFrame API ── */
  useEffect(() => {
    if (window.YT && window.YT.Player) { setYtReady(true); return }
    if (!document.getElementById('yt-api-script')) {
      const script = document.createElement('script')
      script.id = 'yt-api-script'
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); setYtReady(true) }
  }, [])

  useEffect(() => {
    if (!ytReady || !videoId) return
    const el = document.getElementById(playerDivId.current)
    if (!el) return
    if (playerRef.current) { try { playerRef.current.destroy() } catch { /* ignore */ } ; playerRef.current = null }
    playerRef.current = new window.YT.Player(playerDivId.current, {
      videoId,
      playerVars: { rel: 0, modestbranding: 1 },
    })
    return () => { if (playerRef.current) { try { playerRef.current.destroy() } catch { /* ignore */ } ; playerRef.current = null } }
  }, [ytReady, videoId])

  /* Poll current video time — works for both YouTube and local video */
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const t = localVideoRef.current?.currentTime ?? playerRef.current?.getCurrentTime?.() ?? 0
      setCurrentVideoTime(Math.floor(t))
    }, 500)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [])

  const currentMatchMinute = calcMatchMinute(currentVideoTime, tiempos)

  /* ── Handlers ── */
  const syncVideoUrl = useCallback(() => {
    updateAnalisis(analisis.id, { videoPartidoUrl: videoUrl })
  }, [analisis.id, videoUrl, updateAnalisis])

  const syncTiempos = useCallback((key: keyof typeof tiempos, val: string) => {
    const next = { ...tiempos, [key]: val }
    setTiempos(next)
    updateAnalisis(analisis.id, { tiempos: next })
  }, [analisis.id, tiempos, updateAnalisis])

  const getVideoSecs = useCallback(() =>
    localVideoRef.current?.currentTime ?? playerRef.current?.getCurrentTime?.() ?? 0
  , [])

  const handleSetTime = (key: keyof typeof tiempos) => {
    syncTiempos(key, secondsToMmss(getVideoSecs()))
  }

  const handleEventButton = (tipo: TipoEventoAnalisis) => {
    const secs = getVideoSecs()
    setModalDesc(''); setModalJugadora(''); setModalPosition(null)
    setModal({ tipo, videoSeconds: secs, minuto: calcMatchMinute(secs, tiempos) })
  }

  const confirmEvent = () => {
    if (!modal) return
    const evento: EventoAnalisis = {
      id: uuidv4(),
      tipo: modal.tipo,
      minutoPartido: modal.minuto,
      descripcion: modalDesc,
      videoSeconds: modal.videoSeconds,
      jugadora: modalJugadora || undefined,
      posicion: modalPosition || undefined,
    }
    updateAnalisis(analisis.id, { eventosPartido: [...analisis.eventosPartido, evento] })
    setModal(null)
  }

  const deleteEvento = (id: string) => {
    updateAnalisis(analisis.id, { eventosPartido: analisis.eventosPartido.filter(e => e.id !== id) })
  }

  const jumpToEvent = (ev: EventoAnalisis) => {
    if (localVideoRef.current) {
      localVideoRef.current.currentTime = ev.videoSeconds
      localVideoRef.current.pause()
    } else {
      playerRef.current?.seekTo(ev.videoSeconds, true)
    }
  }

  /* ── Convocatoria players ── */
  const selectedConv = convocatorias.find(c => c.id === convocatoriaId)
  const convPlayers = selectedConv
    ? selectedConv.jugadoras.map(j => `${j.nombre} ${j.primerApellido}`.trim())
    : []

  /* ── Filters ── */
  const allEventPlayers = [...new Set(analisis.eventosPartido.filter(e => e.jugadora).map(e => e.jugadora!))]

  const filteredEvents = analisis.eventosPartido
    .filter(ev => {
      if (filterTipo !== 'TODOS' && ev.tipo !== filterTipo) return false
      if (filterJugadora !== 'TODOS' && ev.jugadora !== filterJugadora) return false
      return true
    })
    .sort((a, b) => a.videoSeconds - b.videoSeconds)

  const eventsWithPos = filteredEvents.filter(e => e.posicion)
  const eventsWithoutPos = filteredEvents.filter(e => !e.posicion)

  /* ── Local video upload ── */
  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setLocalVideoUrl(url)
    e.target.value = ''
  }

  const closeLocalVideo = () => {
    if (localVideoRef.current) localVideoRef.current.pause()
    setLocalVideoUrl(null)
  }

  /* ── Clip download ── */
  const pickMime = () => {
    const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    for (const c of cands) if (MediaRecorder.isTypeSupported(c)) return c
    return 'video/webm'
  }

  const seekLocalTo = (t: number) => new Promise<void>(resolve => {
    const v = localVideoRef.current!
    const h = () => { v.removeEventListener('seeked', h); resolve() }
    v.addEventListener('seeked', h)
    v.currentTime = t
  })

  const recordClip = async (startT: number, endT: number): Promise<Blob> => {
    const v = localVideoRef.current!
    const W = v.videoWidth || 1280, H = v.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!
    const stream = canvas.captureStream(30)
    const rec = new MediaRecorder(stream, { mimeType: pickMime() })
    const chunks: BlobPart[] = []
    rec.ondataavailable = ev => { if (ev.data?.size) chunks.push(ev.data) }
    const stopped = new Promise<void>(r => { rec.onstop = () => r() })
    v.muted = true
    await seekLocalTo(Math.max(0, startT))
    rec.start(100)
    await new Promise<void>(resolve => {
      v.play().catch(() => {})
      const loop = () => {
        ctx.drawImage(v, 0, 0, W, H)
        if (v.currentTime >= endT || v.ended) { resolve(); return }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    })
    v.pause()
    rec.stop()
    await stopped
    return new Blob(chunks, { type: 'video/webm' })
  }

  const downloadClip = async (ev: EventoAnalisis) => {
    if (!localVideoRef.current) return
    setDownloadingClip(ev.id)
    try {
      const blob = await recordClip(ev.videoSeconds - clipPre, ev.videoSeconds + clipPost)
      const a = document.createElement('a')
      a.download = `${ev.minutoPartido}min-${EVENT_CONFIG[ev.tipo].label}${ev.jugadora ? '-' + ev.jugadora.replace(/\s+/g, '_') : ''}.webm`
      a.href = URL.createObjectURL(blob)
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } finally {
      setDownloadingClip(null)
    }
  }

  const downloadAllClips = async () => {
    if (!localVideoRef.current || filteredEvents.length === 0) return
    setDownloadAllActive(true)
    setDownloadAllProgress(0)
    const v = localVideoRef.current
    const sorted = [...filteredEvents].sort((a, b) => a.videoSeconds - b.videoSeconds)
    const W = v.videoWidth || 1280, H = v.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!
    const stream = canvas.captureStream(30)
    const rec = new MediaRecorder(stream, { mimeType: pickMime() })
    const chunks: BlobPart[] = []
    rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data) }
    const stopped = new Promise<void>(r => { rec.onstop = () => r() })
    v.muted = true
    rec.start(100)
    try {
      for (let i = 0; i < sorted.length; i++) {
        const ev = sorted[i]
        await seekLocalTo(Math.max(0, ev.videoSeconds - clipPre))
        await new Promise<void>(resolve => {
          v.play().catch(() => {})
          const endT = ev.videoSeconds + clipPost
          const loop = () => {
            ctx.drawImage(v, 0, 0, W, H)
            if (v.currentTime >= endT || v.ended) { resolve(); return }
            requestAnimationFrame(loop)
          }
          requestAnimationFrame(loop)
        })
        v.pause()
        setDownloadAllProgress((i + 1) / sorted.length)
      }
    } finally {
      rec.stop()
      await stopped
      const blob = new Blob(chunks, { type: 'video/webm' })
      const a = document.createElement('a')
      a.download = `todos-los-cortes-${analisis.nombre.replace(/\s+/g, '_')}.webm`
      a.href = URL.createObjectURL(blob)
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      setDownloadAllActive(false)
      setDownloadAllProgress(0)
    }
  }

  /* ── Export ── */
  const exportCSV = () => {
    const header = 'Minuto,Tipo,Jugadora,Descripción,Tiempo Video,X,Y'
    const rows = filteredEvents.map(ev =>
      [ev.minutoPartido, EVENT_CONFIG[ev.tipo].label, ev.jugadora || '', ev.descripcion,
        secondsToMmss(ev.videoSeconds), ev.posicion?.x ?? '', ev.posicion?.y ?? ''].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `eventos-${analisis.nombre}.csv`; a.click()
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `eventos-${analisis.nombre}.json`; a.click()
  }

  /* ── Charts data ── */
  const chartTipo = EVENT_TYPES
    .map(t => ({ label: EVENT_CONFIG[t].label, count: analisis.eventosPartido.filter(e => e.tipo === t).length }))
    .filter(d => d.count > 0)

  const PERIODOS = ["0-15'", "16-30'", "31-45'", "46-60'", "61-75'", "76-90+'"]
  const chartPeriodo = PERIODOS.map((label, i) => {
    const min = i * 15; const max = i === 5 ? Infinity : (i + 1) * 15
    return { label, count: analisis.eventosPartido.filter(e => e.minutoPartido >= min && e.minutoPartido < max).length }
  })

  const chartJugadora = allEventPlayers.map(j => ({
    label: j, count: analisis.eventosPartido.filter(e => e.jugadora === j).length,
  }))

  const maxTipo = Math.max(...chartTipo.map(d => d.count), 1)
  const maxPeriodo = Math.max(...chartPeriodo.map(d => d.count), 1)
  const maxJugadora = Math.max(...chartJugadora.map(d => d.count), 1)

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 md:p-5 min-h-0">

      {/* ─────────────── LEFT PANEL ─────────────── */}
      <div className="w-full lg:w-[370px] shrink-0 space-y-3">

        {/* URL del Partido */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-rfpaf-blue flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-white" />
            <h2 className="text-white font-bold text-sm">Vídeo del Partido</h2>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onBlur={syncVideoUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
              <button onClick={syncVideoUrl} className="bg-rfpaf-blue text-white px-3 py-2 rounded-xl hover:bg-rfpaf-blue-light transition-colors" title="Cargar YouTube">
                <Play className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => localFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                Cargar vídeo local
              </button>
              {localVideoUrl && (
                <>
                  <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                    <Video className="w-3.5 h-3.5" /> Cargado
                  </span>
                  <button
                    onClick={closeLocalVideo}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200 transition-colors"
                  >
                    ✕ Cerrar
                  </button>
                </>
              )}
            </div>
            <input ref={localFileInputRef} type="file" accept="video/*" onChange={handleLocalVideoUpload} className="sr-only" />
          </div>
        </div>

        {/* Tiempos de Partido */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rfpaf-blue" />
              <h2 className="font-bold text-sm text-gray-800">Tiempos de Partido</h2>
            </div>
            <button onClick={() => setTiemposVisible(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
              {tiemposVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {tiemposVisible && (
            <div className="p-3 space-y-2">
              {(['inicio1', 'fin1', 'inicio2', 'fin2'] as const).map((key, i) => {
                const labels = ['Inicio 1ª Parte', 'Fin 1ª Parte', 'Inicio 2ª Parte', 'Fin 2ª Parte']
                return (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-28 shrink-0">{labels[i]}</label>
                    <input
                      value={tiempos[key]}
                      onChange={(e) => syncTiempos(key, e.target.value)}
                      placeholder="MM:SS"
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none font-mono"
                    />
                    <button
                      onClick={() => handleSetTime(key)}
                      disabled={!videoId && !localVideoUrl}
                      className="bg-rfpaf-blue text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-rfpaf-blue-light disabled:opacity-40"
                    >
                      SET
                    </button>
                  </div>
                )
              })}
              <p className="text-[10px] text-gray-400 pt-1">
                Pulsa <strong>SET</strong> mientras el video está en el instante correcto para sincronizar con el minuto de partido.
              </p>
            </div>
          )}
        </div>

        {/* Registrar Evento */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-rfpaf-blue">
            <h2 className="text-white font-bold text-sm">Registrar Evento</h2>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((tipo) => {
                const cfg = EVENT_CONFIG[tipo]
                return (
                  <button
                    key={tipo}
                    onClick={() => handleEventButton(tipo)}
                    className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl font-bold text-[11px] transition-all border-2 hover:scale-105 active:scale-95 leading-tight text-center"
                    style={{ borderColor: cfg.color, color: cfg.color, background: cfg.bg }}
                  >
                    <span className="text-xl leading-none">{cfg.emoji}</span>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 text-center text-xs text-gray-400 font-mono bg-gray-50 rounded-xl py-2">
              Tiempo video: <strong className="text-rfpaf-blue">{secondsToMmss(currentVideoTime)}</strong>
              {' · '}
              Partido: <strong className="text-rfpaf-blue">{currentMatchMinute}'</strong>
            </div>
          </div>
        </div>

        {/* Jugadoras del Partido */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-rfpaf-blue" />
            <h2 className="font-bold text-sm text-gray-800">Jugadoras del Partido</h2>
          </div>
          <div className="p-3">
            <select
              value={convocatoriaId}
              onChange={(e) => setConvocatoriaId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
            >
              <option value="">Enlazar convocatoria...</option>
              {convocatorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} — {c.fecha}</option>
              ))}
            </select>
            {convPlayers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {convPlayers.map(p => (
                  <span key={p} className="px-2 py-0.5 bg-blue-50 rounded-lg text-xs text-blue-700 font-medium">{p}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Historial compact */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 space-y-2">
            <h2 className="font-bold text-sm text-gray-800">Historial</h2>
            {/* Type filters */}
            <div className="flex flex-wrap gap-1">
              {['TODOS', ...EVENT_TYPES].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterTipo(t)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${filterTipo === t ? 'bg-rfpaf-blue text-white border-rfpaf-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {t === 'TODOS' ? 'Todos' : EVENT_CONFIG[t as TipoEventoAnalisis].label}
                </button>
              ))}
            </div>
            {/* Export */}
            <div className="flex gap-1.5">
              <button onClick={exportCSV} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-gray-200 text-gray-500 hover:bg-gray-50">
                <Download className="w-3 h-3" /> Exportar CSV
              </button>
              <button onClick={exportJSON} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-gray-200 text-gray-500 hover:bg-gray-50">
                <FileDown className="w-3 h-3" /> Descargar JSON
              </button>
            </div>
            {/* Player filter */}
            {allEventPlayers.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Jugador</p>
                <div className="flex flex-wrap gap-1">
                  {['TODOS', ...allEventPlayers].map(j => (
                    <button
                      key={j}
                      onClick={() => setFilterJugadora(j)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${filterJugadora === j ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {j === 'TODOS' ? 'Todos' : j}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Compact event list */}
          <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="px-4 py-6 text-xs text-gray-400 text-center">Sin eventos registrados</p>
            ) : filteredEvents.map((ev) => {
              const cfg = EVENT_CONFIG[ev.tipo]
              return (
                <div key={ev.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[10px] font-bold text-gray-400 w-6 shrink-0">{ev.minutoPartido}'</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shrink-0" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                  <span className="text-xs text-gray-700 truncate flex-1">{ev.jugadora || ev.descripcion || <em className="text-gray-400 not-italic">—</em>}</span>
                  <button onClick={() => jumpToEvent(ev)} className="text-rfpaf-blue hover:text-rfpaf-blue-light shrink-0 transition-colors">
                    <Play className="w-3 h-3" />
                  </button>
                  {localVideoUrl && (
                    <button
                      onClick={() => downloadClip(ev)}
                      disabled={downloadingClip === ev.id || downloadAllActive}
                      title="Descargar corte de este evento"
                      className="text-gray-300 hover:text-purple-600 shrink-0 disabled:opacity-40 transition-colors"
                    >
                      {downloadingClip === ev.id
                        ? <span className="text-[9px] animate-pulse">…</span>
                        : <Scissors className="w-3 h-3" />}
                    </button>
                  )}
                  <button onClick={() => deleteEvento(ev.id)} className="text-gray-300 hover:text-red-500 shrink-0 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─────────────── RIGHT PANEL ─────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Local video player */}
        {localVideoUrl && (
          <div className="bg-black rounded-2xl overflow-hidden shadow-lg relative">
            <video
              ref={localVideoRef}
              src={localVideoUrl}
              className="w-full aspect-video"
              controls
              playsInline
              onLoadedMetadata={() => {
                const v = localVideoRef.current
                if (!v) return
                if (v.duration === Infinity || isNaN(v.duration)) {
                  localDurationProbingRef.current = true
                  v.currentTime = 1e101
                }
              }}
              onSeeked={() => {
                if (localDurationProbingRef.current && localVideoRef.current) {
                  localDurationProbingRef.current = false
                  localVideoRef.current.currentTime = 0
                }
              }}
            />
            {/* Clip config bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 bg-gray-900/90">
              <div className="flex items-center gap-2 flex-wrap">
                <Scissors className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-[11px] text-gray-400 font-semibold whitespace-nowrap">Corte:</span>
                <label className="flex items-center gap-1 text-[11px] text-gray-300">
                  Antes
                  <input
                    type="number" min={0} max={60} step={1} value={clipPre}
                    onChange={e => setClipPre(Math.max(0, Math.min(60, +e.target.value || 0)))}
                    className="w-10 text-center bg-gray-800 text-white rounded px-1 py-0.5 text-xs border border-gray-600 outline-none"
                  />s
                </label>
                <label className="flex items-center gap-1 text-[11px] text-gray-300">
                  Después
                  <input
                    type="number" min={0} max={60} step={1} value={clipPost}
                    onChange={e => setClipPost(Math.max(0, Math.min(60, +e.target.value || 0)))}
                    className="w-10 text-center bg-gray-800 text-white rounded px-1 py-0.5 text-xs border border-gray-600 outline-none"
                  />s
                </label>
              </div>
              <button
                onClick={downloadAllClips}
                disabled={downloadAllActive || filteredEvents.length === 0}
                className="sm:ml-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold transition-colors w-full sm:w-auto"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {downloadAllActive
                    ? `Generando… ${Math.round(downloadAllProgress * 100)}%`
                    : `Descargar ${filteredEvents.length} corte${filteredEvents.length !== 1 ? 's' : ''}`}
                </span>
              </button>
            </div>
            {/* Progress bar */}
            {downloadAllActive && (
              <div className="w-full h-1.5 bg-gray-700">
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.round(downloadAllProgress * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {/* YouTube player */}
        {videoId && !localVideoUrl && (
          <div className="bg-black rounded-2xl overflow-hidden shadow-lg">
            <div id={playerDivId.current} className="w-full aspect-video" />
          </div>
        )}

        {/* History visualization */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs header */}
          <div className="flex items-center border-b border-gray-100">
            {([
              { id: 'lista' as const,    label: 'Lista',    icon: <List className="w-3.5 h-3.5" /> },
              { id: 'campo' as const,    label: 'Campo',    icon: <span className="text-sm leading-none">⚽</span> },
              { id: 'graficas' as const, label: 'Gráficas', icon: <BarChart2 className="w-3.5 h-3.5" /> },
              { id: 'pizarra' as const,  label: 'Pizarra',  icon: <PenLine className="w-3.5 h-3.5" /> },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setHistorialTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${historialTab === tab.id ? 'border-rfpaf-blue text-rfpaf-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <span className="ml-auto pr-4 text-xs text-gray-400">{analisis.eventosPartido.length} eventos en total</span>
          </div>

          {/* ── LISTA ── */}
          {historialTab === 'lista' && (
            <div className="p-4">
              <p className="text-sm font-bold text-gray-700 mb-3">
                Vista del listado
                <span className="ml-2 text-xs font-normal text-gray-400">{eventsWithPos.length} eventos con posición registrada</span>
              </p>
              {filteredEvents.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">Sin eventos para mostrar</p>
              ) : (
                <>
                  <div className="divide-y divide-gray-50">
                    {eventsWithPos.map(ev => {
                      const cfg = EVENT_CONFIG[ev.tipo]
                      return (
                        <div key={ev.id} className="flex items-center gap-3 py-2.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                          <span className="text-xs font-bold text-gray-500 w-8 shrink-0">{ev.minutoPartido}'</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                          {ev.jugadora && <span className="text-sm font-semibold text-gray-800">{ev.jugadora}</span>}
                          {ev.descripcion
                            ? <span className="text-sm text-gray-500 italic flex-1 truncate">{ev.descripcion}</span>
                            : !ev.jugadora && <span className="text-sm text-gray-300 italic flex-1">Sin descripción</span>
                          }
                          {ev.posicion && <span className="text-[10px] text-gray-300 shrink-0">({ev.posicion.x},{ev.posicion.y})</span>}
                          <button onClick={() => jumpToEvent(ev)} className="text-rfpaf-blue hover:text-rfpaf-blue-light shrink-0">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          {localVideoUrl && (
                            <button
                              onClick={() => downloadClip(ev)}
                              disabled={downloadingClip === ev.id || downloadAllActive}
                              title="Descargar corte"
                              className="text-gray-300 hover:text-purple-600 disabled:opacity-40 shrink-0 transition-colors"
                            >
                              {downloadingClip === ev.id ? <span className="text-[9px] animate-pulse">…</span> : <Scissors className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {eventsWithoutPos.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-5 mb-2">Sin Posición Registrada</p>
                      <div className="divide-y divide-gray-50">
                        {eventsWithoutPos.map(ev => {
                          const cfg = EVENT_CONFIG[ev.tipo]
                          return (
                            <div key={ev.id} className="flex items-center gap-3 py-2.5 opacity-70">
                              <span className="text-xs font-bold text-gray-500 w-8 shrink-0">{ev.minutoPartido}'</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                              {ev.jugadora && <span className="text-sm font-semibold text-gray-800">{ev.jugadora}</span>}
                              {ev.descripcion
                                ? <span className="text-sm text-gray-500 italic flex-1 truncate">{ev.descripcion}</span>
                                : !ev.jugadora && <span className="text-sm text-gray-300 italic flex-1">Sin descripción</span>
                              }
                              <button onClick={() => jumpToEvent(ev)} className="text-rfpaf-blue hover:text-rfpaf-blue-light shrink-0">
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              {localVideoUrl && (
                                <button
                                  onClick={() => downloadClip(ev)}
                                  disabled={downloadingClip === ev.id || downloadAllActive}
                                  title="Descargar corte"
                                  className="text-gray-300 hover:text-purple-600 disabled:opacity-40 shrink-0 transition-colors"
                                >
                                  {downloadingClip === ev.id ? <span className="text-[9px] animate-pulse">…</span> : <Scissors className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── CAMPO ── */}
          {historialTab === 'campo' && (
            <div className="p-4">
              <p className="text-sm font-bold text-gray-700 mb-3">
                Vista del campo
                <span className="ml-2 text-xs font-normal text-gray-400">{eventsWithPos.length} eventos con posición registrada</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FootballPitch events={filteredEvents} onEventClick={jumpToEvent} />
                <div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {EVENT_TYPES.filter(t => filteredEvents.some(e => e.tipo === t)).map(t => (
                      <div key={t} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: EVENT_CONFIG[t].color }} />
                        <span className="text-xs text-gray-600">{EVENT_CONFIG[t].label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Events with position */}
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {eventsWithPos.map(ev => {
                      const cfg = EVENT_CONFIG[ev.tipo]
                      return (
                        <div key={ev.id} className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-50 rounded px-1" onClick={() => jumpToEvent(ev)}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                          <span className="text-xs font-bold text-gray-500 w-6 shrink-0">{ev.minutoPartido}'</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                          <span className="text-xs text-gray-700 truncate flex-1">{ev.jugadora || ev.descripcion || 'Sin descripción'}</span>
                          <span className="text-[9px] text-gray-300 shrink-0">({ev.posicion!.x},{ev.posicion!.y})</span>
                        </div>
                      )
                    })}
                    {eventsWithPos.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-6">Los eventos con posición aparecerán en el campo</p>
                    )}
                  </div>
                  {eventsWithoutPos.length > 0 && (
                    <>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1">Sin Posición Registrada</p>
                      {eventsWithoutPos.map(ev => {
                        const cfg = EVENT_CONFIG[ev.tipo]
                        return (
                          <div key={ev.id} className="flex items-center gap-2 py-1.5 opacity-60">
                            <span className="text-xs font-bold text-gray-500 w-6 shrink-0">{ev.minutoPartido}'</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                            <span className="text-xs text-gray-700 truncate">{ev.jugadora || ev.descripcion || 'Sin descripción'}</span>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PIZARRA / ANÁLISIS LAB ── */}
          {historialTab === 'pizarra' && (
            <div className="h-[calc(100svh-200px)] min-h-[480px] lg:h-[700px]">
              <PintadoAcciones embedded initialYtUrl={analisis.videoPartidoUrl} />
            </div>
          )}

          {/* ── GRÁFICAS ── */}
          {historialTab === 'graficas' && (
            <div className="p-4">
              <p className="text-sm font-bold text-gray-700 mb-4">
                Gráficas
                <span className="ml-2 text-xs font-normal text-gray-400">{analisis.eventosPartido.length} eventos en total</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Por Tipo</p>
                  <BarChart
                    data={chartTipo}
                    maxVal={maxTipo}
                    colorFn={(label) => {
                      const t = EVENT_TYPES.find(k => EVENT_CONFIG[k].label === label)
                      return t ? EVENT_CONFIG[t].color : '#6b7280'
                    }}
                  />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Por Periodo (Min)</p>
                  <BarChart data={chartPeriodo} maxVal={maxPeriodo} colorFn={() => '#7c3aed'} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Por Jugador</p>
                  {chartJugadora.length > 0
                    ? <BarChart data={chartJugadora} maxVal={maxJugadora} colorFn={() => '#059669'} />
                    : <p className="text-xs text-gray-400 pt-1">Registra eventos con jugadora asignada para ver estadísticas</p>
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────── MODAL ─────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 font-bold text-white flex items-center gap-2" style={{ background: EVENT_CONFIG[modal.tipo].color }}>
              <span className="text-xl">{EVENT_CONFIG[modal.tipo].emoji}</span>
              {EVENT_CONFIG[modal.tipo].label} — min. {modal.minuto}'
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

              {/* Player */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Jugadora</label>
                {convPlayers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {convPlayers.map(p => (
                      <button key={p}
                        onClick={() => setModalJugadora(p === modalJugadora ? '' : p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${modalJugadora === p ? 'bg-rfpaf-blue text-white border-rfpaf-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  value={modalJugadora}
                  onChange={e => setModalJugadora(e.target.value)}
                  placeholder={convPlayers.length > 0 ? 'O escribe el nombre...' : 'Nombre de la jugadora (opcional)'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea rows={2} value={modalDesc} onChange={e => setModalDesc(e.target.value)}
                  placeholder="Describe el evento…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none"
                />
              </div>

              {/* Position on pitch */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Posición en el campo
                  <span className="text-gray-400 font-normal ml-1">(pulsa para marcar)</span>
                  {modalPosition && <span className="text-rfpaf-blue ml-2">({modalPosition.x}, {modalPosition.y})</span>}
                </label>
                <div className="rounded-xl overflow-hidden border border-gray-200 max-h-64">
                  <FootballPitch events={[]} onPositionClick={(x, y) => setModalPosition({ x, y })} selectMode pendingPosition={modalPosition} />
                </div>
                {modalPosition && (
                  <button onClick={() => setModalPosition(null)} className="mt-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors">
                    ✕ Quitar posición
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={confirmEvent}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                  style={{ background: EVENT_CONFIG[modal.tipo].color }}
                >
                  Guardar evento
                </button>
                <button onClick={() => setModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
