import AnalisisSubPage from './AnalisisSubPage'
import ABPTab from './ABPTab'

export default function ABPPage() {
  return (
    <AnalisisSubPage
      title="ABP — Acciones a Balón Parado"
      render={(a) => <ABPTab analisis={a} />}
    />
  )
}
