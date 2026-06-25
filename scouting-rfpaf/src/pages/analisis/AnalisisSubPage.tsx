import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, BarChart2, PlusCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AnalisisPartido } from '../../types'

interface Props {
  title: string
  render: (analisis: AnalisisPartido) => ReactNode
}

export default function AnalisisSubPage({ title, render }: Props) {
  const { analisis, activeAnalisisId, setActiveAnalisisId } = useStore()
  const active = analisis.find((a) => a.id === activeAnalisisId)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compact selector bar */}
      <div className="bg-rfpaf-blue px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <BarChart2 className="w-4 h-4 text-white/70 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider leading-none mb-1">
            {title}
          </p>
          <div className="relative">
            <select
              value={activeAnalisisId || ''}
              onChange={(e) => setActiveAnalisisId(e.target.value || null)}
              className="w-full appearance-none bg-white/15 text-white text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
            >
              <option value="" className="text-gray-800 bg-white font-normal">— Seleccionar análisis —</option>
              {analisis.map((a) => (
                <option key={a.id} value={a.id} className="text-gray-800 bg-white font-normal">
                  {a.nombre} (vs {a.rival || '?'} · {a.fecha})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
        {active ? (
          render(active)
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
            <div className="w-16 h-16 bg-rfpaf-blue/10 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 className="w-8 h-8 text-rfpaf-blue/40" />
            </div>
            {analisis.length === 0 ? (
              <>
                <p className="font-bold text-gray-600 mb-2">No hay análisis creados</p>
                <p className="text-sm text-gray-400 mb-5">Crea un análisis para empezar a trabajar</p>
                <Link
                  to="/analisis-global"
                  className="flex items-center gap-2 bg-rfpaf-blue text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-rfpaf-blue-light transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Crear análisis
                </Link>
              </>
            ) : (
              <>
                <p className="font-bold text-gray-600 mb-2">Selecciona un análisis</p>
                <p className="text-sm text-gray-400 mb-5">
                  Elige un análisis en el selector de arriba o desde{' '}
                  <Link to="/analisis-global" className="text-rfpaf-blue font-semibold hover:underline">
                    Mis Análisis
                  </Link>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
