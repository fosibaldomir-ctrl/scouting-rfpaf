import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Users, Upload } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { uploadInformeArchivo } from '../../lib/supabase'
import DatosPartidoSection from './sections/DatosPartidoSection'
import AlineacionesSection from './sections/AlineacionesSection'
import PlanPartidoSection from './sections/PlanPartidoSection'
import ValoracionesSection from './sections/ValoracionesSection'

export default function PartidoInformePage() {
  const { informeId, partidoId } = useParams<{ informeId: string; partidoId: string }>()
  const { informes, partidosInforme, loadPartidosInforme, updatePartidoInformeAction } = useStore()
  const escudoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingEscudo, setUploadingEscudo] = useState(false)

  useEffect(() => { if (informeId) loadPartidosInforme(informeId) }, [informeId, loadPartidosInforme])

  const informe = informes.find((i) => i.id === informeId)
  const partido = partidosInforme.find((p) => p.id === partidoId)

  if (!partido || !informeId || !partidoId) {
    return <div className="p-6 text-center text-gray-400">Cargando partido…</div>
  }

  const onUpdate = (patch: Partial<typeof partido>) => updatePartidoInformeAction(partido.id, patch)

  const handleEscudoUpload = async (file: File) => {
    setUploadingEscudo(true)
    const url = await uploadInformeArchivo(file, informeId)
    setUploadingEscudo(false)
    if (url) onUpdate({ rivalEscudoUrl: url })
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <Link to={`/informes/${informeId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rfpaf-blue transition-colors">
        <ArrowLeft className="w-4 h-4" /> {informe?.titulo || 'Informe'}
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-rfpaf-blue bg-rfpaf-blue/10 px-3 py-1 rounded-full">
            Jornada {partido.jornada}
          </span>
          <span className="text-xs text-gray-400">Informe: {informe?.fecha || '—'}</span>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden p-1.5">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-xs font-extrabold text-gray-700 uppercase">RFPAF</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number" value={partido.resultadoLocal}
              onChange={(e) => onUpdate({ resultadoLocal: Number(e.target.value) })}
              className="w-14 text-center text-3xl font-bold text-gray-700 border-b-2 border-gray-200 focus:border-rfpaf-blue outline-none"
            />
            <span className="text-2xl text-gray-300 font-light">–</span>
            <input
              type="number" value={partido.resultadoVisitante}
              onChange={(e) => onUpdate({ resultadoVisitante: Number(e.target.value) })}
              className="w-14 text-center text-3xl font-bold text-gray-700 border-b-2 border-gray-200 focus:border-rfpaf-blue outline-none"
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => escudoInputRef.current?.click()}
              disabled={uploadingEscudo}
              className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 hover:border-rfpaf-blue transition-colors flex items-center justify-center overflow-hidden p-1.5 disabled:opacity-50"
            >
              {partido.rivalEscudoUrl
                ? <img src={partido.rivalEscudoUrl} alt={partido.rivalNombre} className="w-full h-full object-contain" />
                : <Upload className="w-5 h-5 text-gray-300" />}
            </button>
            <input ref={escudoInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleEscudoUpload(f) }} />
            <input
              value={partido.rivalNombre}
              onChange={(e) => onUpdate({ rivalNombre: e.target.value })}
              className="text-xs font-extrabold text-gray-700 uppercase text-center bg-transparent border-b border-transparent hover:border-gray-200 focus:border-rfpaf-blue outline-none w-24"
            />
          </div>
        </div>
      </div>

      <DatosPartidoSection partido={partido} onUpdate={onUpdate} />
      <AlineacionesSection partido={partido} onUpdate={onUpdate} />
      <PlanPartidoSection partido={partido} onUpdate={onUpdate} />
      <ValoracionesSection partido={partido} />
    </div>
  )
}
