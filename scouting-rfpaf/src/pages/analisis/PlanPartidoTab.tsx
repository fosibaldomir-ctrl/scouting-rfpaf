import { FileText, Presentation } from 'lucide-react'
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

const BLOQUES: { key: 'bloqueAtaque' | 'bloqueDefensa' | 'bloqueTransicion'; label: string; icon: string }[] = [
  { key: 'bloqueAtaque',      label: 'ATAQUE',       icon: '⚽' },
  { key: 'bloqueDefensa',     label: 'DEFENSA',      icon: '🛡️' },
  { key: 'bloqueTransicion',  label: 'TRANSICIONES', icon: '⚡' },
]

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/|channels\/\w+\/)?(\d+)/)
  return m ? m[1] : null
}

function extractYoutubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/embed\/([^?]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

function VideoEmbed({ url }: { url: string }) {
  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video rounded-xl"
      />
    )
  }
  const ytId = extractYoutubeId(url)
  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video rounded-xl"
      />
    )
  }
  return (
    <div className="flex items-center justify-center aspect-video bg-gray-100 rounded-xl text-gray-400 text-sm">
      URL de vídeo inválida
    </div>
  )
}

function EmptyPreview({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 h-44 text-gray-400 text-sm text-center px-4">
      {text}
    </div>
  )
}

function BloqueCard({
  bloque: b,
  data,
  onChange,
}: {
  bloque: typeof BLOQUES[number]
  data: BloquePlan
  onChange: (patch: Partial<BloquePlan>) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none">{b.icon}</span>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Bloque</p>
          <p className="text-base font-extrabold text-gray-800 tracking-wide leading-none">{b.label}</p>
        </div>
      </div>

      {/* Notas */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Notas abiertas</p>
        <textarea
          rows={6}
          value={data.notas}
          onChange={(e) => onChange({ notas: e.target.value })}
          placeholder={`Descripción del bloque de ${b.label.toLowerCase()}…`}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none"
        />
      </div>

      {/* Vídeo Vimeo / YouTube */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Vídeo específico (YouTube)</p>
        <input
          value={data.videoUrl}
          onChange={(e) => onChange({ videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none mb-2"
        />
        {data.videoUrl
          ? <VideoEmbed url={data.videoUrl} />
          : <EmptyPreview text="Introduce el enlace de YouTube para previsualizarlo aquí" />
        }
      </div>

      {/* Imagen */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Imagen 1</p>
        <input
          value={data.imagenUrl}
          onChange={(e) => onChange({ imagenUrl: e.target.value })}
          placeholder="https://... (imagen o captura táctica)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none mb-2"
        />
        {data.imagenUrl
          ? <img src={data.imagenUrl} alt="Táctica" className="w-full rounded-xl border border-gray-100 object-contain max-h-64" />
          : <EmptyPreview text="Introduce la URL de la imagen para previsualizarla aquí" />
        }
      </div>
    </div>
  )
}

export default function PlanPartidoTab({ analisis }: Props) {
  const { updateAnalisis } = useStore()

  const toggleChar = (key: keyof CaracteristicasRival, value: string) => {
    const current = analisis.caracteristicasRival[key]
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    updateAnalisis(analisis.id, { caracteristicasRival: { ...analisis.caracteristicasRival, [key]: next } })
  }

  const updateBloque = (key: 'bloqueAtaque' | 'bloqueDefensa' | 'bloqueTransicion', patch: Partial<BloquePlan>) => {
    updateAnalisis(analisis.id, { [key]: { ...analisis[key], ...patch } })
  }

  return (
    <div className="p-3 md:p-5 space-y-5">

      {/* ── CARACTERÍSTICAS DEL RIVAL ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
          Características del Rival
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          {RIVAL_OPTS.map(({ key, label, opts }) => {
            const allSelected = opts.every((o) => analisis.caracteristicasRival[key].includes(o))
            const toggleAll = () => {
              const next = allSelected ? [] : [...opts]
              updateAnalisis(analisis.id, { caracteristicasRival: { ...analisis.caracteristicasRival, [key]: next } })
            }
            return (
              <div key={key} className="flex flex-wrap gap-1.5 items-center">
                <button
                  onClick={toggleAll}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    allSelected
                      ? 'bg-rfpaf-blue border-rfpaf-blue text-white shadow-sm'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {label.toUpperCase()}
                </button>
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
            )
          })}
        </div>
      </section>

      {/* ── PRESENTACIÓN + VÍDEO RIVAL (2 col) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <iframe src={analisis.presentacionUrl} className="w-full h-48 rounded-xl border border-gray-100" allowFullScreen />
          ) : (
            <EmptyPreview text="Introduce el enlace de Google Slides para previsualizarlo aquí" />
          )}
          {analisis.presentacionUrl && (
            <a href={analisis.presentacionUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-rfpaf-blue font-semibold hover:underline flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Abrir presentación
            </a>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎬</span>
            <h3 className="font-bold text-sm text-gray-800">Vídeo YouTube del Rival</h3>
          </div>
          <input
            value={analisis.videoRivalUrl}
            onChange={(e) => updateAnalisis(analisis.id, { videoRivalUrl: e.target.value })}
            placeholder="Pega el enlace de YouTube (ej. https://youtube.com/watch?v=...)..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          />
          {analisis.videoRivalUrl
            ? <VideoEmbed url={analisis.videoRivalUrl} />
            : <EmptyPreview text="Introduce el enlace de YouTube para previsualizarlo aquí" />
          }
        </section>
      </div>

      {/* ── PLAN DE PARTIDO — 3 bloques en paralelo ── */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Plan de Partido</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {BLOQUES.map((b) => (
            <BloqueCard
              key={b.key}
              bloque={b}
              data={analisis[b.key]}
              onChange={(patch) => updateBloque(b.key, patch)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
