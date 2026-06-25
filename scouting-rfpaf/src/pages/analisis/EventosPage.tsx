import AnalisisSubPage from './AnalisisSubPage'
import EventosTab from './EventosTab'

export default function EventosPage() {
  return (
    <AnalisisSubPage
      title="Eventos del Partido"
      render={(a) => <EventosTab analisis={a} />}
    />
  )
}
