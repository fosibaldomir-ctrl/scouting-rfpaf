import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Shield, Users } from 'lucide-react'
import { useStore } from '../../store/useStore'

const EMPTY_PLAN = { explicacion: '', imagenUrl: '', variante1Url: '', variante2Url: '' }

export default function InformeDetailPage() {
  const { informeId } = useParams<{ informeId: string }>()
  const navigate = useNavigate()
  const {
    informes, updateInformeAction,
    partidosInforme, loadPartidosInforme, addPartidoInforme, deletePartidoInformeAction,
  } = useStore()

  const informe = informes.find((i) => i.id === informeId)
  const partidos = partidosInforme.filter((p) => p.informeId === informeId).sort((a, b) => a.jornada - b.jornada)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ jornada: partidos.length + 1, rivalNombre: '', fechaPartido: new Date().toISOString().slice(0, 10) })
  const [conclusiones, setConclusiones] = useState('')

  useEffect(() => { if (informeId) loadPartidosInforme(informeId) }, [informeId, loadPartidosInforme])
  useEffect(() => { setConclusiones(informe?.conclusiones ?? '') }, [informe?.conclusiones])
  useEffect(() => { setForm((f) => ({ ...f, jornada: partidos.length + 1 })) }, [partidos.length])

  if (!informeId) return null

  const handleCreatePartido = async () => {
    if (!form.rivalNombre.trim()) return
    const created = await addPartidoInforme({
      informeId,
      jornada: form.jornada,
      rivalNombre: form.rivalNombre.trim(),
      rivalEscudoUrl: '',
      resultadoLocal: 0,
      resultadoVisitante: 0,
      fechaPartido: form.fechaPartido,
      horaPartido: '',
      campoNombre: '',
      campoFotoUrl: '',
      condiciones: 'soleado',
      equipacionLocalUrl: '',
      equipacionVisitanteUrl: '',
      sistema: '',
      alineacionTitulares: [],
      alineacionSuplentes: [],
      planOfensivo: EMPTY_PLAN,
      planDefensivo: EMPTY_PLAN,
    })
    setShowForm(false)
    setForm({ jornada: partidos.length + 2, rivalNombre: '', fechaPartido: new Date().toISOString().slice(0, 10) })
    if (created) navigate(`/informes/${informeId}/partido/${created.id}`)
  }

  const handleDeletePartido = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este partido del informe?')) return
    deletePartidoInformeAction(id)
  }

  const saveConclusiones = () => {
    if (conclusiones !== informe?.conclusiones) updateInformeAction(informeId, { conclusiones })
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link to="/informes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rfpaf-blue transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Informes
      </Link>

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-rfpaf-blue">{informe?.titulo || 'Informe'}</h1>
          <p className="text-sm text-gray-500">{informe?.autor} · {informe?.fecha}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-rfpaf-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Añadir Partido
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-rfpaf-blue mb-4">Nuevo Partido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Jornada</label>
              <input
                type="number" min={1}
                value={form.jornada}
                onChange={(e) => setForm((f) => ({ ...f, jornada: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rival</label>
              <input
                value={form.rivalNombre}
                onChange={(e) => setForm((f) => ({ ...f, rivalNombre: e.target.value }))}
                placeholder="Ej: Cataluña"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha del partido</label>
              <input
                type="date"
                value={form.fechaPartido}
                onChange={(e) => setForm((f) => ({ ...f, fechaPartido: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreatePartido}
              disabled={!form.rivalNombre.trim()}
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

      {partidos.length === 0 ? (
        <div className="text-center py-16 text-gray-400 mb-8">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay partidos en este informe</p>
          <p className="text-sm mt-1">Añade el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {partidos.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/informes/${informeId}/partido/${p.id}`)}
              className="relative bg-white rounded-2xl shadow-sm border-2 border-gray-200 hover:border-rfpaf-blue/50 transition-all cursor-pointer overflow-hidden"
            >
              <button
                onClick={(e) => handleDeletePartido(e, p.id)}
                className="absolute top-3 right-3 z-10 text-gray-300 hover:text-rfpaf-red p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="px-5 pt-4 pb-2">
                <span className="inline-block text-[11px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-rfpaf-blue/10 text-rfpaf-blue">
                  Jornada {p.jornada}
                </span>
              </div>
              <div className="flex items-center justify-center gap-4 px-5 py-3">
                <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden p-1.5">
                  {p.rivalEscudoUrl ? <img src={p.rivalEscudoUrl} alt={p.rivalNombre} className="w-full h-full object-contain" /> : <Users className="w-6 h-6 text-gray-300" />}
                </div>
                <div className="text-2xl font-bold text-gray-700 tabular-nums">
                  {p.resultadoLocal} <span className="text-gray-300 font-light">–</span> {p.resultadoVisitante}
                </div>
              </div>
              <div className="px-5 pb-4 text-center">
                <p className="text-sm font-semibold text-gray-700 truncate">{p.rivalNombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.fechaPartido || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-rfpaf-blue mb-3">Conclusiones Generales</h2>
        <textarea
          rows={8}
          value={conclusiones}
          onChange={(e) => setConclusiones(e.target.value)}
          onBlur={saveConclusiones}
          placeholder="Conclusiones finales del informe…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-y"
        />
      </div>
    </div>
  )
}
