import AnalisisSubPage from './AnalisisSubPage'
import PizarraTacticaTab from './PizarraTacticaTab'

export default function PizarraPage() {
  return (
    <AnalisisSubPage
      title="Pizarra Táctica"
      render={(a) => <PizarraTacticaTab analisis={a} />}
    />
  )
}
