import { useState, useRef, useMemo } from 'react'
import { Plus, Trash2, Download, ArrowLeft, Search, X, Users, Calendar, Clock, ClipboardList } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Convocatoria, JugadoraConvocada } from '../types'
import ConvocatoriaPDFTemplate from '../components/pdf/ConvocatoriaPDFTemplate'
import { supabaseService } from '../services/supabaseService'

export default function Convocatorias() {
  const {
    convocatorias, fichas, clubes,
    addConvocatoria, updateConvocatoria, deleteConvocatoria,
    addJugadoraToConvocatoria, removeJugadoraFromConvocatoria,
  } = useStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [newFecha, setNewFecha] = useState('')
  const [newHora, setNewHora] = useState('')
  const [newNombre, setNewNombre] = useState('')

  const pdfRef = useRef<HTMLDivElement>(null)

  const selected = convocatorias.find((c) => c.id === selectedId)

  // Deduplicate fichas: one entry per player (latest ficha)
  const uniquePlayers = useMemo(() => {
    const map: Record<string, typeof fichas[0]> = {}
    for (const f of fichas) {
      const key = `${f.nombre}|${f.primerApellido}|${f.segundoApellido}|${f.fechaNacimiento}`
      if (!map[key] || new Date(f.creadoEn) > new Date(map[key].creadoEn)) {
        map[key] = f
      }
    }
    return Object.values(map)
  }, [fichas])

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return uniquePlayers
    return uniquePlayers.filter((f) =>
      `${f.nombre} ${f.primerApellido} ${f.segundoApellido}`.toLowerCase().includes(q)
    )
  }, [uniquePlayers, searchQuery])

  const convocadasIds = useMemo(
    () => new Set(selected?.jugadoras.map((j) => j.fichaId) ?? []),
    [selected]
  )

  const clubEscudos = useMemo(() => {
    const m: Record<string, string | null | undefined> = {}
    for (const c of clubes) m[c.id] = c.escudo
    return m
  }, [clubes])

  const handleCreate = () => {
    if (!newFecha || !newHora) return
    const c: Convocatoria = {
      id: crypto.randomUUID(),
      nombre: newNombre.trim() || `Convocatoria ${new Date(newFecha).toLocaleDateString('es-ES')}`,
      fecha: newFecha,
      hora: newHora,
      jugadoras: [],
      creadoEn: new Date().toISOString(),
    }
    addConvocatoria(c)
    setSelectedId(c.id)
    setShowNewModal(false)
    setNewFecha('')
    setNewHora('')
    setNewNombre('')
  }

  const handleAddJugadora = (ficha: typeof fichas[0]) => {
    if (!selectedId || !selected || selected.jugadoras.length >= 22) return
    const clubNombre = clubes.find((c) => c.id === ficha.club)?.nombre ?? ficha.club ?? ''
    const jugadora: JugadoraConvocada = {
      fichaId: ficha.id,
      nombre: ficha.nombre,
      primerApellido: ficha.primerApellido,
      segundoApellido: ficha.segundoApellido ?? '',
      fechaNacimiento: ficha.fechaNacimiento,
      clubId: ficha.club ?? '',
      clubNombre,
      foto: ficha.foto,
    }
    addJugadoraToConvocatoria(selectedId, jugadora)
  }

  const [uploadingPDF, setUploadingPDF] = useState(false)

  const handleExportPDF = async () => {
    if (!pdfRef.current || !selected) return
    const el = pdfRef.current
    const prevCss = el.style.cssText
    el.style.cssText = 'position:fixed;top:0;left:0;width:794px;z-index:99999;background:white;'
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff', allowTaint: true,
      })
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height / canvas.width) * pdfW
      const imgData = canvas.toDataURL('image/png', 1.0)
      let yOffset = 0
      let remaining = imgH
      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, imgH)
        yOffset += pdfH
        remaining -= pdfH
      }

      // Descarga en el navegador
      const filename = `convocatoria-${selected.fecha}-${selected.nombre.replace(/\s+/g, '_')}.pdf`
      pdf.save(filename)

      // Subir a Supabase Storage y guardar URL
      setUploadingPDF(true)
      const blob = pdf.output('blob')
      const pdfUrl = await supabaseService.uploadConvocatoriaPDF(selected.id, blob)
      if (pdfUrl) {
        await updateConvocatoria(selected.id, { pdfUrl })
      }
    } finally {
      el.style.cssText = prevCss
      setUploadingPDF(false)
    }
  }

  // ─── Detail view ────────────────────────────────────────────────────────────
  if (selectedId && selected) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-2 text-rfpaf-blue hover:underline text-sm flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a convocatorias
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={uploadingPDF}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-60"
            >
              <Download className={`w-4 h-4 ${uploadingPDF ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{uploadingPDF ? 'Guardando…' : 'Descargar PDF'}</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={() => setConfirmDeleteId(selectedId)}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          </div>
        </div>

        {/* Convocatoria fields */}
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Nombre / Descripción</label>
              <input
                type="text"
                className="form-input mt-1"
                value={selected.nombre}
                onChange={(e) => updateConvocatoria(selectedId, { nombre: e.target.value })}
                placeholder="Ej: Convocatoria Selección Sub-17"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Fecha</label>
              <input
                type="date"
                className="form-input mt-1"
                value={selected.fecha}
                onChange={(e) => updateConvocatoria(selectedId, { fecha: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Hora</label>
              <input
                type="time"
                className="form-input mt-1"
                value={selected.hora}
                onChange={(e) => updateConvocatoria(selectedId, { hora: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Player table */}
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-bold text-gray-800">Jugadoras convocadas</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className={selected.jugadoras.length >= 22 ? 'text-rfpaf-red font-semibold' : ''}>
                  {selected.jugadoras.length}
                </span>{' '}
                / 22 jugadoras
              </p>
            </div>
            <button
              onClick={() => { setSearchQuery(''); setShowAddModal(true) }}
              disabled={selected.jugadoras.length >= 22}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Añadir jugadora
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">F. Nacimiento</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Edad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Club Actual</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {selected.jugadoras.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-gray-400">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No hay jugadoras convocadas.</p>
                      <p className="text-xs mt-1">Añádelas desde aquí o desde la ficha individual de cada jugadora.</p>
                    </td>
                  </tr>
                ) : (
                  selected.jugadoras.map((j, i) => {
                    const club = clubes.find((c) => c.id === j.clubId)
                    const edad = calcularEdad(j.fechaNacimiento)
                    return (
                      <tr key={j.fichaId} className="border-b last:border-0 hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-500 font-semibold">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {j.foto ? (
                              <img src={j.foto} alt={j.nombre} className="w-9 h-11 object-cover rounded border border-gray-200 flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-11 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                                {j.nombre?.charAt(0)}{j.primerApellido?.charAt(0)}
                              </div>
                            )}
                            <span className="font-semibold text-gray-800 whitespace-nowrap">
                              {j.nombre} {j.primerApellido} {j.segundoApellido}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 whitespace-nowrap">
                          {j.fechaNacimiento ? new Date(j.fechaNacimiento).toLocaleDateString('es-ES') : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {edad > 0 ? `${edad} años` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex items-center gap-2">
                            {club?.escudo && (
                              <img src={club.escudo} alt={j.clubNombre} className="w-5 h-6 object-contain flex-shrink-0" />
                            )}
                            <span>{j.clubNombre || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeJugadoraFromConvocatoria(selectedId, j.fichaId)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Quitar de la convocatoria"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hidden PDF template */}
        <div
          ref={pdfRef}
          style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}
          aria-hidden="true"
        >
          <ConvocatoriaPDFTemplate convocatoria={selected} clubEscudos={clubEscudos} />
        </div>

        {/* Add player modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between p-5 border-b">
                <div>
                  <h3 className="font-bold text-gray-800">Añadir jugadora</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{selected.jugadoras.length} / 22 plazas ocupadas</p>
                </div>
                <button
                  onClick={() => { setShowAddModal(false); setSearchQuery('') }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar jugadora por nombre..."
                    className="form-input pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {searchResults.length === 0 ? (
                  <p className="text-center text-gray-400 py-10">No se encontraron jugadoras.</p>
                ) : (
                  searchResults.map((f) => {
                    const alreadyAdded = convocadasIds.has(f.id)
                    const clubNombre = clubes.find((c) => c.id === f.club)?.nombre ?? ''
                    return (
                      <button
                        key={f.id}
                        disabled={alreadyAdded}
                        onClick={() => { handleAddJugadora(f); setShowAddModal(false); setSearchQuery('') }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'
                        }`}
                      >
                        {f.foto ? (
                          <img src={f.foto} alt={f.nombre} className="w-10 h-12 object-cover rounded flex-shrink-0 border border-gray-200" />
                        ) : (
                          <div className="w-10 h-12 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                            {f.nombre?.charAt(0)}{f.primerApellido?.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 text-sm">
                            {f.nombre} {f.primerApellido} {f.segundoApellido}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {clubNombre || '—'} · {f.fechaNacimiento ? new Date(f.fechaNacimiento).toLocaleDateString('es-ES') : '—'}
                          </p>
                        </div>
                        {alreadyAdded && (
                          <span className="text-xs text-green-600 font-semibold flex-shrink-0">Ya añadida</span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete modal */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmar eliminación</h3>
              <p className="text-gray-600 text-sm mb-5">
                ¿Seguro que quieres eliminar esta convocatoria? No se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={() => {
                    deleteConvocatoria(confirmDeleteId)
                    setConfirmDeleteId(null)
                    setSelectedId(null)
                  }}
                  className="btn-danger"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue">Convocatorias</h1>
          <p className="text-gray-500 text-sm">
            {convocatorias.length} {convocatorias.length === 1 ? 'convocatoria' : 'convocatorias'}
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Convocatoria
        </button>
      </div>

      {/* Empty state */}
      {convocatorias.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">No hay convocatorias creadas.</p>
          <p className="text-gray-400 text-sm mt-1">
            Crea una nueva convocatoria para empezar a añadir jugadoras.
          </p>
          <button onClick={() => setShowNewModal(true)} className="btn-primary mt-5">
            Nueva Convocatoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...convocatorias].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="card text-left hover:border-rfpaf-blue hover:shadow-md transition-all group border border-transparent"
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <span className="font-bold text-gray-800 group-hover:text-rfpaf-blue transition-colors line-clamp-2 text-sm leading-snug">
                  {c.nombre}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  c.jugadoras.length >= 22
                    ? 'bg-rfpaf-red/10 text-rfpaf-red'
                    : 'bg-rfpaf-blue/10 text-rfpaf-blue'
                }`}>
                  {c.jugadoras.length}/22
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES') : '—'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {c.hora || '—'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New convocatoria modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">Nueva Convocatoria</h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre / Descripción</label>
                <input
                  type="text"
                  className="form-input mt-1"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej: Convocatoria Selección Sub-17"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Fecha <span className="text-rfpaf-red">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input mt-1"
                    value={newFecha}
                    onChange={(e) => setNewFecha(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Hora <span className="text-rfpaf-red">*</span>
                  </label>
                  <input
                    type="time"
                    className="form-input mt-1"
                    value={newHora}
                    onChange={(e) => setNewHora(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={() => setShowNewModal(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={!newFecha || !newHora}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Convocatoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}
