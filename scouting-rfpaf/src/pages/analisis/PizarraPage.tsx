import { Target, AlertTriangle } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { useStore } from '../../store/useStore'
import PizarraTacticaTab from './PizarraTacticaTab'

// Safety net: a render error inside the board must NOT blank the whole app to a white screen.
class PizarraErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: unknown) { console.error('Pizarra crashed:', error) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <p className="text-sm font-semibold text-gray-700">La pizarra ha tenido un problema.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-rfpaf-blue hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            Recargar pizarra
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function PizarraPage() {
  const { pizarraLibre } = useStore()

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="bg-rfpaf-blue px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <Target className="w-4 h-4 text-white/70" />
        <p className="text-white font-semibold text-sm">Pizarra Táctica</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50">
        <PizarraErrorBoundary>
          <PizarraTacticaTab analisis={pizarraLibre} />
        </PizarraErrorBoundary>
      </div>
    </div>
  )
}
