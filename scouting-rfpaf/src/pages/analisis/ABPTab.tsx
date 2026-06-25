import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash2, PlayCircle, Image, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AnalisisPartido, AccionBalonParado } from '../../types'

interface Props { analisis: AnalisisPartido }

type ABPMode = 'ofensivo' | 'defensivo'

function extractYoutubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/embed\/([^?]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

function YoutubeEmbed({ url }: { url: string }) {
  const id = extractYoutubeId(url)
  if (!id) return (
    <div className="flex items-center justify-center aspect-video bg-gray-100 rounded-xl text-gray-400 text-xs">
      URL inválida
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

function ABPCard({ action, index, onUpdate, onDelete, color }: {
  action: AccionBalonParado
  index: number
  onUpdate: (patch: Partial<AccionBalonParado>) => void
  onDelete: () => void
  color: string
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: color }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-white font-bold text-sm">ABP {index + 1}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/80" /> : <ChevronDown className="w-4 h-4 text-white/80" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Descripción / Notas</label>
            <textarea
              rows={3}
              value={action.notas}
              onChange={(e) => onUpdate({ notas: e.target.value })}
              placeholder="Describe la acción a balón parado…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" /> Imagen / Diagrama
            </label>
            <input
              value={action.imagenUrl}
              onChange={(e) => onUpdate({ imagenUrl: e.target.value })}
              placeholder="URL de imagen o diagrama táctico"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
            />
            {action.imagenUrl && (
              <img
                src={action.imagenUrl}
                alt="Diagrama ABP"
                className="mt-3 w-full rounded-xl border border-gray-100 object-contain max-h-48"
              />
            )}
          </div>

          {/* Video */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5" /> Vídeo YouTube
            </label>
            <input
              value={action.videoUrl}
              onChange={(e) => onUpdate({ videoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
            />
            {action.videoUrl && <div className="mt-3"><YoutubeEmbed url={action.videoUrl} /></div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ABPTab({ analisis }: Props) {
  const { updateAnalisis } = useStore()
  const [mode, setMode] = useState<ABPMode>('ofensivo')

  const actions = mode === 'ofensivo' ? analisis.abpOfensivo : analisis.abpDefensivo
  const storeKey = mode === 'ofensivo' ? 'abpOfensivo' : 'abpDefensivo'
  const color = mode === 'ofensivo' ? '#1a3a6b' : '#c0392b'

  const addAction = () => {
    const newAction: AccionBalonParado = { id: uuidv4(), notas: '', videoUrl: '', imagenUrl: '' }
    updateAnalisis(analisis.id, { [storeKey]: [...actions, newAction] })
  }

  const updateAction = (id: string, patch: Partial<AccionBalonParado>) => {
    updateAnalisis(analisis.id, {
      [storeKey]: actions.map((a) => a.id === id ? { ...a, ...patch } : a),
    })
  }

  const deleteAction = (id: string) => {
    if (!confirm('¿Eliminar esta acción?')) return
    updateAnalisis(analisis.id, { [storeKey]: actions.filter((a) => a.id !== id) })
  }

  return (
    <div className="p-3 md:p-5">
      {/* Mode toggle */}
      <div className="flex bg-white rounded-2xl border border-gray-200 shadow-sm p-1 mb-5 max-w-sm mx-auto">
        <button
          onClick={() => setMode('ofensivo')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === 'ofensivo'
              ? 'bg-rfpaf-blue text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚡ Ofensivo
        </button>
        <button
          onClick={() => setMode('defensivo')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            mode === 'defensivo'
              ? 'bg-rfpaf-red text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🛡️ Defensivo
        </button>
      </div>

      {/* Category label */}
      <div className="text-center mb-4">
        <span
          className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white"
          style={{ background: color }}
        >
          {mode === 'ofensivo' ? 'ABP OFENSIVO' : 'ABP DEFENSIVO'} — {actions.length} acción{actions.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {actions.map((action, i) => (
          <ABPCard
            key={action.id}
            action={action}
            index={i}
            color={color}
            onUpdate={(patch) => updateAction(action.id, patch)}
            onDelete={() => deleteAction(action.id)}
          />
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={addAction}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-semibold transition-colors"
        style={{ borderColor: color, color }}
      >
        <Plus className="w-4 h-4" />
        Añadir acción {mode}
      </button>
    </div>
  )
}
