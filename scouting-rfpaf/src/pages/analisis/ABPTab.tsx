import { useEffect, useState } from 'react'
import { Plus, Trash2, PlayCircle, Image, Layers, Pencil, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { uploadAnalisisArchivo } from '../../lib/supabase'
import AbpPizarraCapture from '../../components/AbpPizarraCapture'
import type { AnalisisPartido, AccionBalonParado } from '../../types'

interface Props { analisis: AnalisisPartido }

type ABPMode = 'ofensivo' | 'defensivo'

function extractYoutubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?]+)/, /youtube\.com\/embed\/([^?]+)/]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}
function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

function VideoEmbed({ url }: { url: string }) {
  const yt = extractYoutubeId(url)
  if (yt) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${yt}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video rounded-xl"
      />
    )
  }
  const vimeo = extractVimeoId(url)
  if (vimeo) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${vimeo}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video rounded-xl"
      />
    )
  }
  return (
    <div className="flex items-center justify-center aspect-video bg-gray-100 rounded-xl text-gray-400 text-xs">
      URL inválida
    </div>
  )
}

function ABPCard({ action, index, onUpdate, onDelete, color, analisisId }: {
  action: AccionBalonParado
  index: number
  onUpdate: (patch: Partial<AccionBalonParado>) => void
  onDelete: () => void
  color: string
  analisisId: string
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(action.titulo)
  const [showCapture, setShowCapture] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { analisis } = useStore()
  const parent = analisis.find(a => a.id === analisisId)

  const handleCapture = async (dataUrl: string) => {
    setShowCapture(false)
    setUploading(true)
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `abp-${action.id}-${Date.now()}.png`, { type: 'image/png' })
    const url = await uploadAnalisisArchivo(file, analisisId)
    setUploading(false)
    if (url) onUpdate({ imagenUrl: url })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: color }}>
        {editingTitle ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ titulo: titleDraft }); setEditingTitle(false) } }}
              className="flex-1 bg-white/20 text-white placeholder-white/60 rounded-lg px-2 py-1 text-sm font-bold outline-none"
            />
            <button onClick={() => { onUpdate({ titulo: titleDraft }); setEditingTitle(false) }} className="text-white/80 hover:text-white">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => { setTitleDraft(action.titulo); setEditingTitle(true) }} className="flex items-center gap-1.5 text-white font-bold text-sm">
            {action.titulo || `ABP ${index + 1}`}
            <Pencil className="w-3 h-3 opacity-60" />
          </button>
        )}
        <button onClick={onDelete} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Tactical diagram */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Diagrama de pizarra
          </label>
          {action.imagenUrl ? (
            <div className="relative group">
              <img src={action.imagenUrl} alt="Diagrama táctico" className="w-full rounded-xl border border-gray-100 object-cover" style={{ aspectRatio: '16/9' }} />
              <button
                onClick={() => setShowCapture(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
              >
                <span className="text-white text-xs font-bold bg-rfpaf-blue px-3 py-1.5 rounded-lg">Rehacer captura</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCapture(true)}
              disabled={uploading || !parent}
              className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-rfpaf-blue hover:text-rfpaf-blue transition-colors disabled:opacity-50"
              style={{ aspectRatio: '16/9' }}
            >
              <Layers className="w-6 h-6" />
              <span className="text-xs font-semibold">{uploading ? 'Subiendo…' : 'Abrir pizarra táctica'}</span>
            </button>
          )}
        </div>

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

        {/* Video 1 */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5" /> Vídeo
          </label>
          <input
            value={action.videoUrl}
            onChange={(e) => onUpdate({ videoUrl: e.target.value })}
            placeholder="https://vimeo.com/... o https://youtube.com/..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          />
          {action.videoUrl && <div className="mt-3"><VideoEmbed url={action.videoUrl} /></div>}
        </div>

        <div className="h-px bg-gray-100" />

        {/* Slot 2: detail + second video */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5" /> Detalle 2
          </label>
          <textarea
            rows={2}
            value={action.notas2}
            onChange={(e) => onUpdate({ notas2: e.target.value })}
            placeholder="Detalle adicional…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none"
          />
        </div>
        <div>
          <input
            value={action.video2Url}
            onChange={(e) => onUpdate({ video2Url: e.target.value })}
            placeholder="URL vídeo 2 (Vimeo o YouTube)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          />
          {action.video2Url && <div className="mt-3"><VideoEmbed url={action.video2Url} /></div>}
        </div>
      </div>

      {showCapture && parent && (
        <AbpPizarraCapture
          equipoLocal={parent.equipoLocal}
          equipoVisitante={parent.equipoVisitante}
          onCapture={handleCapture}
          onClose={() => setShowCapture(false)}
        />
      )}
    </div>
  )
}

export default function ABPTab({ analisis }: Props) {
  const { abpAcciones, loadAbpAcciones, addAbpAccion, updateAbpAccion, deleteAbpAccion } = useStore()
  const [mode, setMode] = useState<ABPMode>('ofensivo')

  useEffect(() => { loadAbpAcciones(analisis.id) }, [analisis.id, loadAbpAcciones])

  const actions = abpAcciones
    .filter(a => a.analisisId === analisis.id && a.tipo === mode)
    .sort((a, b) => a.orden - b.orden)
  const color = mode === 'ofensivo' ? '#1a3a6b' : '#c0392b'

  const addAction = () => {
    addAbpAccion({
      analisisId: analisis.id,
      tipo: mode,
      orden: actions.length,
      titulo: `${mode === 'ofensivo' ? 'Córner' : 'Defensa'} ${actions.length + 1}`,
      notas: '',
      imagenUrl: '',
      videoUrl: '',
      notas2: '',
      imagen2Url: '',
      video2Url: '',
    })
  }

  const deleteAction = (id: string) => {
    if (!confirm('¿Eliminar esta acción?')) return
    deleteAbpAccion(id)
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

      {/* Cards row — horizontal scroll on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {actions.map((action, i) => (
          <ABPCard
            key={action.id}
            action={action}
            index={i}
            color={color}
            analisisId={analisis.id}
            onUpdate={(patch) => updateAbpAccion(action.id, patch)}
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
