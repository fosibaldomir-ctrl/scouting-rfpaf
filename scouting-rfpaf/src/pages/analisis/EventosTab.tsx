import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Play, Clock, Trash2, PlayCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AnalisisPartido, EventoAnalisis, TipoEventoAnalisis } from '../../types'

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
    if (!tiempos.fin1 || videoSecs <= f1) {
      return Math.floor((videoSecs - i1) / 60)
    }
    if (tiempos.inicio2 && videoSecs >= i2) {
      return 45 + Math.floor((videoSecs - i2) / 60)
    }
  }
  return Math.floor(videoSecs / 60)
}

const EVENT_CONFIG: Record<TipoEventoAnalisis, { label: string; color: string; bg: string; emoji: string }> = {
  GOL: { label: 'GOL', color: '#dc2626', bg: '#fef2f2', emoji: '⚽' },
  OCASION: { label: 'OCASIÓN', color: '#d97706', bg: '#fffbeb', emoji: '🎯' },
  DUELO: { label: 'DUELO', color: '#7c3aed', bg: '#f5f3ff', emoji: '⚔️' },
  NOTA: { label: 'NOTA', color: '#0369a1', bg: '#f0f9ff', emoji: '📝' },
}

export default function EventosTab({ analisis }: Props) {
  const { updateAnalisis } = useStore()
  const [videoUrl, setVideoUrl] = useState(analisis.videoPartidoUrl)
  const [tiempos, setTiempos] = useState(analisis.tiempos)
  const [modal, setModal] = useState<{ tipo: TipoEventoAnalisis; videoSeconds: number; minuto: number } | null>(null)
  const [modalDesc, setModalDesc] = useState('')
  const [ytReady, setYtReady] = useState(false)
  const playerRef = useRef<ReturnType<typeof window.YT.Player> | null>(null)
  const playerDivId = useRef(`yt-${uuidv4()}`)

  const videoId = extractYoutubeId(videoUrl)

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT && window.YT.Player) { setYtReady(true); return }
    if (!document.getElementById('yt-api-script')) {
      const script = document.createElement('script')
      script.id = 'yt-api-script'
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev()
      setYtReady(true)
    }
  }, [])

  // Create/destroy player when videoId or YT ready changes
  useEffect(() => {
    if (!ytReady || !videoId) return
    const el = document.getElementById(playerDivId.current)
    if (!el) return

    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
      playerRef.current = null
    }

    playerRef.current = new window.YT.Player(playerDivId.current, {
      videoId,
      playerVars: { rel: 0, modestbranding: 1 },
    })
    return () => {
      if (playerRef.current) { try { playerRef.current.destroy() } catch {} ; playerRef.current = null }
    }
  }, [ytReady, videoId])

  const syncVideoUrl = useCallback(() => {
    updateAnalisis(analisis.id, { videoPartidoUrl: videoUrl })
  }, [analisis.id, videoUrl, updateAnalisis])

  const syncTiempos = useCallback((key: keyof typeof tiempos, val: string) => {
    const next = { ...tiempos, [key]: val }
    setTiempos(next)
    updateAnalisis(analisis.id, { tiempos: next })
  }, [analisis.id, tiempos, updateAnalisis])

  const handleSetTime = (key: keyof typeof tiempos) => {
    const secs = playerRef.current?.getCurrentTime() ?? 0
    syncTiempos(key, secondsToMmss(secs))
  }

  const handleEventButton = (tipo: TipoEventoAnalisis) => {
    const secs = playerRef.current?.getCurrentTime() ?? 0
    const minuto = calcMatchMinute(secs, tiempos)
    setModalDesc('')
    setModal({ tipo, videoSeconds: secs, minuto })
  }

  const confirmEvent = () => {
    if (!modal) return
    const evento: EventoAnalisis = {
      id: uuidv4(),
      tipo: modal.tipo,
      minutoPartido: modal.minuto,
      descripcion: modalDesc,
      videoSeconds: modal.videoSeconds,
    }
    updateAnalisis(analisis.id, { eventosPartido: [...analisis.eventosPartido, evento] })
    setModal(null)
  }

  const deleteEvento = (id: string) => {
    updateAnalisis(analisis.id, { eventosPartido: analisis.eventosPartido.filter((e) => e.id !== id) })
  }

  const sortedEvents = [...analisis.eventosPartido].sort((a, b) => a.videoSeconds - b.videoSeconds)

  return (
    <div className="p-3 md:p-5 space-y-5">

      {/* YouTube URL */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-white" />
          <h2 className="text-white font-bold text-sm">Vídeo del Partido (YouTube)</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
            />
            <button
              onClick={syncVideoUrl}
              className="bg-rfpaf-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-rfpaf-blue-light transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Cargar
            </button>
          </div>
        </div>
      </div>

      {/* Player */}
      {videoId && (
        <div className="bg-black rounded-2xl overflow-hidden shadow-lg">
          <div id={playerDivId.current} className="w-full aspect-video" />
        </div>
      )}

      {/* Time markers */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> Tiempos de Partido
          </h2>
          {!videoId && <p className="text-white/60 text-xs mt-0.5">Carga el vídeo y pulsa SET en el momento correcto</p>}
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            ['inicio1', 'Inicio 1ª Parte'],
            ['fin1', 'Fin 1ª Parte'],
            ['inicio2', 'Inicio 2ª Parte'],
            ['fin2', 'Fin 2ª Parte'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <div className="flex gap-1">
                <input
                  value={tiempos[key]}
                  onChange={(e) => syncTiempos(key, e.target.value)}
                  placeholder="MM:SS"
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none font-mono"
                />
                <button
                  onClick={() => handleSetTime(key)}
                  disabled={!videoId}
                  className="bg-rfpaf-blue text-white px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-rfpaf-blue-light transition-colors disabled:opacity-40"
                >
                  SET
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event registration */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue">
          <h2 className="text-white font-bold text-sm">Registrar Evento</h2>
          {!videoId && <p className="text-white/60 text-xs mt-0.5">Carga el vídeo para activar el registro de eventos</p>}
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(EVENT_CONFIG) as [TipoEventoAnalisis, typeof EVENT_CONFIG[TipoEventoAnalisis]][]).map(([tipo, cfg]) => (
            <button
              key={tipo}
              onClick={() => handleEventButton(tipo)}
              disabled={!videoId}
              className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl font-bold text-sm transition-all border-2 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: cfg.color, color: cfg.color, background: cfg.bg }}
            >
              <span className="text-2xl">{cfg.emoji}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events list + timeline */}
      {sortedEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-rfpaf-blue">
            <h2 className="text-white font-bold text-sm">{sortedEvents.length} Eventos Registrados</h2>
          </div>

          {/* Timeline bar */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
              {sortedEvents.map((ev) => {
                const maxSecs = playerRef.current?.getDuration() || 5400
                const pct = Math.min(100, (ev.videoSeconds / maxSecs) * 100)
                const cfg = EVENT_CONFIG[ev.tipo]
                return (
                  <div
                    key={ev.id}
                    title={`${ev.tipo} — ${ev.minutoPartido}'`}
                    style={{
                      position: 'absolute', left: `${pct}%`, top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 16, height: 16, borderRadius: '50%',
                      background: cfg.color, border: '2px solid white',
                      cursor: 'pointer', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 'bold', zIndex: 10,
                    }}
                  >
                    {ev.minutoPartido}'
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0'</span>
              <span>45'</span>
              <span>90'</span>
            </div>
          </div>

          {/* Events list */}
          <div className="divide-y divide-gray-50">
            {sortedEvents.map((ev) => {
              const cfg = EVENT_CONFIG[ev.tipo]
              return (
                <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-xs text-gray-400">{ev.minutoPartido}'</span>
                      <span className="text-xs text-gray-300">({secondsToMmss(ev.videoSeconds)} vídeo)</span>
                    </div>
                    {ev.descripcion && <p className="text-sm text-gray-700 mt-0.5 truncate">{ev.descripcion}</p>}
                  </div>
                  <button
                    onClick={() => deleteEvento(ev.id)}
                    className="text-gray-300 hover:text-rfpaf-red p-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Event modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 font-bold text-white flex items-center gap-2"
              style={{ background: EVENT_CONFIG[modal.tipo].color }}
            >
              <span className="text-xl">{EVENT_CONFIG[modal.tipo].emoji}</span>
              {EVENT_CONFIG[modal.tipo].label} — min. {modal.minuto}'
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Descripción (opcional)</label>
                <textarea
                  autoFocus
                  rows={3}
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  placeholder="Describe el evento…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmEvent}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                  style={{ background: EVENT_CONFIG[modal.tipo].color }}
                >
                  Guardar evento
                </button>
                <button
                  onClick={() => setModal(null)}
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
