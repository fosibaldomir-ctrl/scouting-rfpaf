import { Target, AlertTriangle } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { useStore } from '../../store/useStore'
import PizarraTacticaTab from './PizarraTacticaTab'

// Safety net: a render error inside the board must NOT blank the whole app to a white screen.
class PizarraErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; msg: string; stack: string }> {
  state = { hasError: false, msg: '', stack: '' }
  static getDerivedStateFromError(error: unknown) {
    const e = error as Error
    return { hasError: true, msg: e?.message || String(error), stack: (e?.stack || '').split('\n').slice(0, 6).join('\n') }
  }
  componentDidCatch(error: unknown) { console.error('Pizarra crashed:', error) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <p className="text-sm font-semibold text-gray-700">La pizarra ha tenido un problema.</p>
          {/* Temporary diagnostic: surfaces the real error so we can fix the root cause from a device screenshot */}
          <pre className="max-w-full overflow-auto text-left text-[11px] bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 whitespace-pre-wrap">
            {this.state.msg}
            {'\n\n'}
            {this.state.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, msg: '', stack: '' })}
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
