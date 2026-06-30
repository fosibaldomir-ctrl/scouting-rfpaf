import { useState } from 'react'
import { PlayCircle, Image, FileText, Presentation } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AnalisisPartido, CaracteristicasRival, BloquePlan } from '../../types'

interface Props { analisis: AnalisisPartido }

const RIVAL_OPTS: { key: keyof CaracteristicasRival; label: string; opts: string[] }[] = [
  { key: 'salidaBalon',         label: 'Salida de Balón',       opts: ['EN CORTO', 'EN LARGO', 'MIXTO'] },
  { key: 'presion',             label: 'Presión',               opts: ['ALTA', 'MEDIA', 'BAJA'] },
  { key: 'bloque',              label: 'Bloque',                opts: ['ALTO', 'MEDIO', 'BAJO'] },
  { key: 'lineaDefensiva',      label: 'Línea Defensiva',       opts: ['ALTA', 'MEDIA', 'BAJA'] },
  { key: 'transicionOfensiva',  label: 'Transición Ofensiva',   opts: ['DIRECTA', 'POSESIÓN'] },
  { key: 'transicionDefensiva', label: 'Transición Defensiva',  opts: ['PRESIÓN INMEDIATA', 'REPLIEGUE'] },
]

const BLOQUES = [
  { key: 'bloqueAtaque'     as const, label: 'Ataque',       emoji: '⚡', color: '#dc2626', bg: '#fef2f2' },
  { key: 'bloqueDefensa'    as const, label: 'Defensa',      emoji: '🛡️', color: '#1d4ed8', bg: '#eff6ff' },
  { key: 'bloqueTransicion' as const, label: 'Transiciones', emoji: '🔄', color: '#7c3aed', bg: '#f5f3ff' },
]

function extractYoutubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/embed\/([^?]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

function YoutubeEmbed({ url }: { url: string }) {
  const id = extractYoutubeId(url)
  if (!id) return (
    <div className="flex items-center justify-center aspect-video bg-gray-100 rounded-xl text-gray-400 text-sm">
      URL de YouTube inválida
    </div>
  )
  return (
    <iframe
      src={`https://www.youtube.com/embed/${id}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="w-full aspect-video rounded-xl"
    />
  )
}

function EmptyPreview({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 h-48 text-gray-400 text-sm text-center px-4">
      {text}
    </div>
  )
}

export default function PlanPartidoTab({ analisis }: Props) {
  const { updateAnalisis } = useStore()
  const [activeBloque, setActiveBloque] = useState<'bloqueAtaque' | 'bloqueDefensa' | 'bloqueTransicion'>('bloqueAtaque')

  const toggleChar = (key: keyof CaracteristicasRival, value: string) => {
    const current = analisis.caracteristicasRival[key]
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    updateAnalisis(analisis.id, { caracteristicasRival: { ...analisis.caracteristicasRival, [key]: next } })
  }

  const updateBloque = (key: typeof activeBloque, patch: Partial<BloquePlan>) => {
    updateAnalisis(analisis.id, { [key]: { ...analisis[key], ...patch } })
  }

  const bloque = analisis[activeBloque]
  const bloqueInfo = BLOQUES.find((b) => b.key === activeBloque)!

  return (
    <div className="p-3 md:p-5 space-y-5">

      {/* ── CARACTERÍSTICAS DEL RIVAL ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
          Características del Rival
        </p>

        {/* All groups flow inline: red label pill + option pills */}
        <div className="flex flex-wrap gap-2 items-center">
          {RIVAL_OPTS.map(({ key, label, opts }) => (
            <div key={key} className="flex flex-wrap gap-1.5 items-center">
              {/* Category label — always red */}
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rfpaf-red text-white select-none">
                {label.toUpperCase()}
              </span>
              {/* Option pills */}
              {opts.map((opt) => {
                const active = analisis.caracteristicasRival[key].includes(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => toggleChar(key, opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      active
                        ? 'bg-rfpaf-blue border-rfpaf-blue text-white shadow-sm'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ── PRESENTACIÓN + VÍDEO (2 col) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Presentación Google Slides */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-rfpaf-blue" />
            <h3 className="font-bold text-sm text-gray-800">Presentación Google Slides</h3>
          </div>
          <input
            value={analisis.presentacionUrl}
            onChange={(e) => updateAnalisis(analisis.id, { presentacionUrl: e.target.value })}
            placeholder="Pega el enlace de Google Slides (compartir > publicar)..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          />
          {analisis.presentacionUrl ? (
            <iframe
              src={analisis.presentacionUrl}
              className="w-full h-48 rounded-xl border border-gray-100"
              allowFullScreen
            />
          ) : (
            <EmptyPreview text="Introduce el enlace de Google Slides para previsualizarlo aquí" />
          )}
          {analisis.presentacionUrl && (
            <a
              href={analisis.presentacionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-rfpaf-blue font-semibold hover:underline flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" /> Abrir presentación
            </a>
          )}
        </section>

        {/* Vídeo del Rival */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-rfpaf-blue" />
            <h3 className="font-bold text-sm text-gray-800">Vídeo del Rival</h3>
          </div>
          <input
            value={analisis.videoRivalUrl}
            onChange={(e) => updateAnalisis(analisis.id, { videoRivalUrl: e.target.value })}
            placeholder="Pega el enlace de YouTube (ej. https://youtube.com/watch?v=...)..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          />
          {analisis.videoRivalUrl
            ? <YoutubeEmbed url={analisis.videoRivalUrl} />
            : <EmptyPreview text="Introduce el enlace de YouTube para previsualizarlo aquí" />
          }
        </section>
      </div>

      {/* ── PLAN DE PARTIDO (bloques tácticos) ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue">
          <h2 className="text-white font-bold text-sm">Plan de Partido</h2>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-gray-100">
          {BLOQUES.map((b) => (
            <button
              key={b.key}
              onClick={() => setActiveBloque(b.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                activeBloque === b.key
                  ? 'border-rfpaf-blue text-rfpaf-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{b.emoji}</span>
              <span className="hidden sm:inline">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          <div
            className="rounded-xl p-3 font-bold text-sm flex items-center gap-2"
            style={{ background: bloqueInfo.bg, color: bloqueInfo.color }}
          >
            {bloqueInfo.emoji} {bloqueInfo.label}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notas</label>
            <textarea
              rows={5}
              value={bloque.notas}
              onChange={(e) => updateBloque(activeBloque, { notas: e.target.value })}
              placeholder={`Descripción del bloque de ${bloqueInfo.label.toLowerCase()}…`}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" /> Vídeo YouTube
              </label>
              <input
                value={bloque.videoUrl}
                onChange={(e) => updateBloque(activeBloque, { videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
              {bloque.videoUrl
                ? <div className="mt-3"><YoutubeEmbed url={bloque.videoUrl} /></div>
                : <div className="mt-3"><EmptyPreview text="Vídeo del bloque" /></div>
              }
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" /> Imagen táctica
              </label>
              <input
                value={bloque.imagenUrl}
                onChange={(e) => updateBloque(activeBloque, { imagenUrl: e.target.value })}
                placeholder="https://... (imagen o captura táctica)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
              {bloque.imagenUrl
                ? <img src={bloque.imagenUrl} alt="Táctica" className="mt-3 w-full rounded-xl border border-gray-100 object-contain max-h-48" />
                : <div className="mt-3"><EmptyPreview text="Imagen táctica del bloque" /></div>
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
