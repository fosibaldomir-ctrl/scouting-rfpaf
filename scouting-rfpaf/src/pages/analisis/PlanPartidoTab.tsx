import { useState } from 'react'
import { PlayCircle, Image, FileText } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AnalisisPartido, CaracteristicasRival, BloquePlan } from '../../types'

interface Props { analisis: AnalisisPartido }

const RIVAL_OPTS: { key: keyof CaracteristicasRival; label: string; opts: string[] }[] = [
  { key: 'salidaBalon', label: 'Salida de Balón', opts: ['EN CORTO', 'EN LARGO', 'MIXTO'] },
  { key: 'presion', label: 'Presión', opts: ['ALTA', 'MEDIA', 'BAJA'] },
  { key: 'bloque', label: 'Bloque', opts: ['ALTO', 'MEDIO', 'BAJO'] },
  { key: 'lineaDefensiva', label: 'Línea Defensiva', opts: ['ALTA', 'MEDIA', 'BAJA'] },
  { key: 'transicionOfensiva', label: 'Transición Ofensiva', opts: ['DIRECTA', 'POSESIÓN'] },
  { key: 'transicionDefensiva', label: 'Transición Defensiva', opts: ['PRESIÓN INMEDIATA', 'REPLIEGUE'] },
]

const BLOQUES = [
  { key: 'bloqueAtaque' as const, label: 'Ataque', emoji: '⚡', color: '#dc2626', bg: '#fef2f2' },
  { key: 'bloqueDefensa' as const, label: 'Defensa', emoji: '🛡️', color: '#1d4ed8', bg: '#eff6ff' },
  { key: 'bloqueTransicion' as const, label: 'Transiciones', emoji: '🔄', color: '#7c3aed', bg: '#f5f3ff' },
]

function extractYoutubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/embed\/([^?]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

function YoutubeEmbed({ url }: { url: string }) {
  const id = extractYoutubeId(url)
  if (!id) return <div className="flex items-center justify-center aspect-video bg-gray-100 rounded-xl text-gray-400 text-sm">URL de YouTube inválida</div>
  return (
    <iframe
      src={`https://www.youtube.com/embed/${id}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="w-full aspect-video rounded-xl"
    />
  )
}

function TogglePill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
        active
          ? 'bg-rfpaf-blue border-rfpaf-blue text-white shadow-sm'
          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}

export default function PlanPartidoTab({ analisis }: Props) {
  const { updateAnalisis } = useStore()
  const [activeBloque, setActiveBloque] = useState<'bloqueAtaque' | 'bloqueDefensa' | 'bloqueTransicion'>('bloqueAtaque')

  const toggleChar = (key: keyof CaracteristicasRival, value: string) => {
    const current = analisis.caracteristicasRival[key]
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    updateAnalisis(analisis.id, {
      caracteristicasRival: { ...analisis.caracteristicasRival, [key]: next },
    })
  }

  const updateBloque = (key: 'bloqueAtaque' | 'bloqueDefensa' | 'bloqueTransicion', patch: Partial<BloquePlan>) => {
    updateAnalisis(analisis.id, { [key]: { ...analisis[key], ...patch } })
  }

  const bloque = analisis[activeBloque]
  const bloqueInfo = BLOQUES.find((b) => b.key === activeBloque)!

  return (
    <div className="p-3 md:p-5 space-y-5">

      {/* Características del Rival */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue">
          <h2 className="text-white font-bold text-sm">Características del Rival</h2>
        </div>
        <div className="p-4 space-y-4">
          {RIVAL_OPTS.map(({ key, label, opts }) => (
            <div key={key}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {opts.map((opt) => (
                  <TogglePill
                    key={opt}
                    label={opt}
                    active={analisis.caracteristicasRival[key].includes(opt)}
                    onClick={() => toggleChar(key, opt)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Video del Rival */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <PlayCircle className="w-4 h-4" /> Vídeo del Rival
          </h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={analisis.videoRivalUrl}
              onChange={(e) => updateAnalisis(analisis.id, { videoRivalUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
            />
          </div>
          {analisis.videoRivalUrl && <YoutubeEmbed url={analisis.videoRivalUrl} />}
        </div>
      </section>

      {/* Presentación */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> Presentación / Informe
          </h2>
        </div>
        <div className="p-4">
          <input
            value={analisis.presentacionUrl}
            onChange={(e) => updateAnalisis(analisis.id, { presentacionUrl: e.target.value })}
            placeholder="URL de presentación (Google Slides, PDF…)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          />
          {analisis.presentacionUrl && (
            <a
              href={analisis.presentacionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-rfpaf-blue font-medium hover:underline"
            >
              <FileText className="w-4 h-4" /> Abrir presentación
            </a>
          )}
        </div>
      </section>

      {/* Bloques tácticos */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-rfpaf-blue">
          <h2 className="text-white font-bold text-sm">Plan de Partido</h2>
        </div>

        {/* Bloque selector */}
        <div className="flex border-b border-gray-100">
          {BLOQUES.map((b) => (
            <button
              key={b.key}
              onClick={() => setActiveBloque(b.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                activeBloque === b.key ? 'border-rfpaf-blue text-rfpaf-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
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

          {/* Notes */}
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

          {/* Video */}
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
            {bloque.videoUrl && <div className="mt-3"><YoutubeEmbed url={bloque.videoUrl} /></div>}
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" /> URL de Imagen
            </label>
            <input
              value={bloque.imagenUrl}
              onChange={(e) => updateBloque(activeBloque, { imagenUrl: e.target.value })}
              placeholder="https://... (imagen o captura táctica)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
            />
            {bloque.imagenUrl && (
              <img
                src={bloque.imagenUrl}
                alt="Táctica"
                className="mt-3 w-full rounded-xl border border-gray-100 object-contain max-h-64"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
