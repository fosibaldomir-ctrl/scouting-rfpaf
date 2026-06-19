import { useState, useMemo } from 'react'
import { Video, Plus, Search, Trash2, X, CalendarDays, ChevronDown } from 'lucide-react'
import { useStore } from '../store/useStore'
import { createVideoSesion, deleteVideoSesion as deleteVideoSesionDB } from '../lib/supabase'
import { getEmbedUrl } from '../lib/entrenamientoUtils'
import type { SeleccionCategoria, VideoSesion } from '../types'

const SELECCIONES: SeleccionCategoria[] = ['SUB 12', 'SUB 14', 'SUB 16']

const SELECCION_COLORS: Record<SeleccionCategoria, string> = {
  'SUB 12': 'bg-green-100 text-green-800 border-green-300',
  'SUB 14': 'bg-blue-100 text-blue-800 border-blue-300',
  'SUB 16': 'bg-purple-100 text-purple-800 border-purple-300',
}

const EMPTY_FORM = {
  fecha: new Date().toISOString().split('T')[0],
  seleccion: 'SUB 14' as SeleccionCategoria,
  titulo: '',
  descripcion: '',
  url_video: '',
}

export default function VideotecaSesiones() {
  const { videosSesiones, addVideoSesion, deleteVideoSesion } = useStore()

  const [search, setSearch] = useState('')
  const [filtroSeleccion, setFiltroSeleccion] = useState<SeleccionCategoria | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const videosFiltrados = useMemo(() => {
    return videosSesiones.filter((v) => {
      const matchSel = !filtroSeleccion || v.seleccion === filtroSeleccion
      const q = search.toLowerCase()
      const matchSearch = !q ||
        v.titulo.toLowerCase().includes(q) ||
        v.descripcion.toLowerCase().includes(q) ||
        v.fecha.includes(q)
      return matchSel && matchSearch
    }).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [videosSesiones, filtroSeleccion, search])

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: false }))
  }

  const handleSave = async () => {
    const errs: Record<string, boolean> = {}
    if (!form.fecha) errs.fecha = true
    if (!form.titulo.trim()) errs.titulo = true
    if (!form.url_video.trim()) errs.url_video = true
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const saved = await createVideoSesion({
        fecha: form.fecha,
        seleccion: form.seleccion,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        url_video: form.url_video.trim(),
      })
      if (saved) {
        addVideoSesion(saved as VideoSesion)
        setForm(EMPTY_FORM)
        setModalOpen(false)
      } else {
        alert('❌ Error al guardar el vídeo')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (video: VideoSesion) => {
    if (!window.confirm(`¿Eliminar "${video.titulo}"?`)) return
    const ok = await deleteVideoSesionDB(video.id)
    if (ok) {
      deleteVideoSesion(video.id)
    } else {
      alert('❌ Error al eliminar. Verifica las políticas RLS en Supabase.')
    }
  }

  const formatFecha = (ymd: string) =>
    new Date(ymd + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Videoteca Sesiones</h2>
          <p className="text-sm text-gray-500 mt-1">Vídeos de sesiones de entrenamiento por selección y fecha</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors whitespace-nowrap shadow-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Añadir vídeo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descripción o fecha…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"
            />
          </div>

          {/* Filtro selección */}
          <div className="relative">
            <select
              value={filtroSeleccion}
              onChange={(e) => setFiltroSeleccion(e.target.value as SeleccionCategoria | '')}
              className="appearance-none w-full sm:w-44 pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"
            >
              <option value="">Todas las selecciones</option>
              {SELECCIONES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {(search || filtroSeleccion) && (
            <button
              onClick={() => { setSearch(''); setFiltroSeleccion('') }}
              className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Chips de selección rápida */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroSeleccion('')}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${!filtroSeleccion ? 'bg-rfpaf-blue text-white border-rfpaf-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
        >
          Todas ({videosSesiones.length})
        </button>
        {SELECCIONES.map((s) => {
          const count = videosSesiones.filter((v) => v.seleccion === s).length
          return (
            <button
              key={s}
              onClick={() => setFiltroSeleccion(filtroSeleccion === s ? '' : s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filtroSeleccion === s ? 'bg-rfpaf-blue text-white border-rfpaf-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              {s} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid de vídeos */}
      {videosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">
            {videosSesiones.length === 0 ? 'Sin vídeos añadidos aún' : 'Ningún vídeo coincide con los filtros'}
          </p>
          {videosSesiones.length === 0 && (
            <p className="text-xs mt-2 opacity-70">Pulsa "Añadir vídeo" para registrar el primero</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videosFiltrados.map((video) => (
            <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Video embed */}
              <div className="relative w-full aspect-video bg-gray-900">
                {getEmbedUrl(video.url_video) ? (
                  <iframe
                    src={getEmbedUrl(video.url_video)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.titulo}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    <Video className="w-10 h-10" />
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${SELECCION_COLORS[video.seleccion]}`}>
                        {video.seleccion}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{video.titulo}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(video)}
                    className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {video.descripcion && (
                  <p className="text-xs text-gray-500 line-clamp-2">{video.descripcion}</p>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-400 pt-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{formatFecha(video.fecha)}</span>
                </div>

                <a
                  href={video.url_video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-1.5 text-xs font-semibold text-rfpaf-blue hover:text-rfpaf-blue/70 border border-rfpaf-blue/30 rounded-lg hover:bg-rfpaf-blue/5 transition-colors"
                >
                  Ver en YouTube/Vimeo
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal añadir vídeo */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Añadir vídeo de sesión</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Fecha + Selección */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha entrenamiento *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => set('fecha', e.target.value)}
                    className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 ${errors.fecha ? 'border-red-400' : 'border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Selección *</label>
                  <div className="relative">
                    <select
                      value={form.seleccion}
                      onChange={(e) => set('seleccion', e.target.value)}
                      className="appearance-none w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"
                    >
                      {SELECCIONES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => set('titulo', e.target.value)}
                  placeholder="Ej: Sesión táctica defensiva…"
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 ${errors.titulo ? 'border-red-400' : 'border-gray-200'}`}
                />
              </div>

              {/* URL vídeo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">URL del vídeo (YouTube / Vimeo) *</label>
                <input
                  type="url"
                  value={form.url_video}
                  onChange={(e) => set('url_video', e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 ${errors.url_video ? 'border-red-400' : 'border-gray-200'}`}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción (opcional)</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => set('descripcion', e.target.value)}
                  placeholder="Objetivos de la sesión, notas…"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar vídeo'}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
