import { Target } from 'lucide-react'
import { useStore } from '../../store/useStore'
import PizarraTacticaTab from './PizarraTacticaTab'

export default function PizarraPage() {
  const { pizarraLibre } = useStore()

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-rfpaf-blue px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Target className="w-4 h-4 text-white/70" />
        <p className="text-white font-semibold text-sm">Pizarra Táctica</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
        <PizarraTacticaTab analisis={pizarraLibre} />
      </div>
    </div>
  )
}
