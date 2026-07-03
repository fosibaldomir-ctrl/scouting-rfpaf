import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Trash2, CalendarDays, User } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function InformesPage() {
  const { informes, loadInformes, addInforme, deleteInformeAction } = useStore()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', autor: '', fecha: new Date().toISOString().slice(0, 10) })

  useEffect(() => { loadInformes() }, [loadInformes])

  const handleCreate = async () => {
    if (!form.titulo.trim()) return
    const created = await addInforme({ titulo: form.titulo.trim(), autor: form.autor.trim(), fecha: form.fecha, conclusiones: '' })
    setShowForm(false)
    setForm({ titulo: '', autor: '', fecha: new Date().toISOString().slice(0, 10) })
    if (created) navigate(`/informes/${created.id}`)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este informe y todos sus partidos?')) return
    deleteInformeAction(id)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rfpaf-blue rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-rfpaf-blue">Informes</h1>
            <p className="text-sm text-gray-500">Informes generales de fase / concentración</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-rfpaf-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Informe
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-rfpaf-blue mb-4">Nuevo Informe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
              <input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ej: CESA 2ª FASE"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Autor</label>
              <input
                value={form.autor}
                onChange={(e) => setForm((f) => ({ ...f, autor: e.target.value }))}
                placeholder="Ej: Alfonso Baldomir"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha del informe</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={!form.titulo.trim()}
              className="bg-rfpaf-blue text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Crear y abrir
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {informes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay informes creados</p>
          <p className="text-sm mt-1">Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {informes.map((i) => (
            <div
              key={i.id}
              onClick={() => navigate(`/informes/${i.id}`)}
              className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-200 hover:border-rfpaf-blue/50 transition-all cursor-pointer overflow-hidden"
            >
              <button
                onClick={(e) => handleDelete(e, i.id)}
                className="absolute top-3 right-3 z-10 text-gray-300 hover:text-rfpaf-red p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="px-5 pt-5 pb-4">
                <h3 className="font-bold text-rfpaf-blue text-base pr-6 leading-snug">{i.titulo || 'Informe sin título'}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <User className="w-3.5 h-3.5" />
                  <span>{i.autor || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{i.fecha || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
