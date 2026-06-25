import AnalisisSubPage from './AnalisisSubPage'
import PlanPartidoTab from './PlanPartidoTab'

export default function PlanPage() {
  return (
    <AnalisisSubPage
      title="Plan de Partido"
      render={(a) => <PlanPartidoTab analisis={a} />}
    />
  )
}
