import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, FileText, Star, Eye } from 'lucide-react'
import { useRef } from 'react'
import { useStore } from '../store/useStore'
import RadarChart from '../components/charts/RadarChart'
import FichaPDFTemplate from '../components/pdf/FichaPDFTemplate'
import { DEMARCACIONES_ITEMS } from '../data/masterData'

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value ?? '—'}</span>
    </div>
  )
}

function PropuestaBadge({ propuesta }: { propuesta: string }) {
  const map: Record<string, string> = {
    'SELECCIÓN': 'bg-green-100 text-green-800 border border-green-300',
    'INCORPORAR': 'bg-blue-100 text-blue-800 border border-blue-300',
    'SEGUIR': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    'DESCARTAR': 'bg-red-100 text-red-800 border border-red-300',
  }
  return (
    <span className={`px-4 py-2 rounded-full text-sm font-bold ${map[propuesta] ?? 'badge-seguir'}`}>
      {propuesta}
    </span>
  )
}

export default function FichaJugadora() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fichas: allFichas, getFicha, observadores, clubes } = useStore()
  const contentRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<HTMLDivElement>(null)

  const ficha = getFicha(id ?? '')

  const handleExportPDF = async () => {
    if (!pdfRef.current || !ficha) return
    const el = pdfRef.current
    const prevCss = el.style.cssText

    // Traer al viewport — html2canvas no captura elementos fuera de pantalla
    el.style.cssText = 'position:fixed;top:0;left:0;width:794px;z-index:99999;background:white;'
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    try {
      // Pre-convertir pills a <canvas> con textBaseline='middle' para garantizar centrado vertical
      const pills = Array.from(el.querySelectorAll<HTMLElement>('[data-pdf-pill]'))
      for (const pill of pills) {
        const w = pill.offsetWidth || 80
        const h = pill.offsetHeight || 22
        const text = pill.textContent?.trim() ?? ''
        const textColor = pill.dataset.pdfPill ?? 'white'
        const bgColor = pill.dataset.pdfPillBg ?? 'rgba(255,255,255,0.20)'
        const borderColor = pill.dataset.pdfPillBorder ?? 'rgba(255,255,255,0.35)'
        const isColored = pill.dataset.pdfPillBg !== undefined
        const scale = 3
        const c = document.createElement('canvas')
        c.width = w * scale; c.height = h * scale
        c.style.width = `${w}px`; c.style.height = `${h}px`
        const ctx = c.getContext('2d')!
        ctx.scale(scale, scale)
        // Fondo pill con esquinas redondeadas
        const radius = h / 2
        ctx.beginPath()
        ctx.moveTo(radius, 0); ctx.arcTo(w, 0, w, h, radius)
        ctx.arcTo(w, h, 0, h, radius); ctx.arcTo(0, h, 0, 0, radius)
        ctx.arcTo(0, 0, w, 0, radius); ctx.closePath()
        ctx.fillStyle = bgColor
        ctx.fill()
        ctx.strokeStyle = borderColor
        ctx.lineWidth = isColored ? 2 : 1.5
        ctx.stroke()
        // Texto centrado verticalmente
        ctx.font = `700 ${isColored ? 12 : 11}px system-ui, -apple-system, Arial, sans-serif`
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, w / 2, h / 2)
        pill.parentNode?.replaceChild(c, pill)
      }

      // Pre-convertir SVGs a <canvas> para evitar limitaciones de html2canvas con gradientes y filtros SVG
      const svgEls = Array.from(el.querySelectorAll('svg'))
      for (const svg of svgEls) {
        try {
          const w = svg.clientWidth || Number(svg.getAttribute('width')) || 220
          const h = svg.clientHeight || Number(svg.getAttribute('height')) || 220
          const svgStr = new XMLSerializer().serializeToString(svg)
          const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          await new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              const c = document.createElement('canvas')
              c.width = w * 3; c.height = h * 3
              c.style.width = `${w}px`; c.style.height = `${h}px`
              const ctx = c.getContext('2d')!
              ctx.scale(3, 3)
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, w, h)
              ctx.drawImage(img, 0, 0, w, h)
              svg.parentNode?.replaceChild(c, svg)
              URL.revokeObjectURL(url)
              resolve()
            }
            img.onerror = () => { URL.revokeObjectURL(url); resolve() }
            img.src = url
          })
        } catch { /* skip if SVG conversion fails */ }
      }

      // Capturar el template completo
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      })

      // Crear PDF A4 con jsPDF directamente
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()   // 210 mm
      const pdfH = pdf.internal.pageSize.getHeight()  // 297 mm
      const imgH = (canvas.height / canvas.width) * pdfW
      const imgData = canvas.toDataURL('image/png', 1.0)

      // Soporte multi-página si el contenido supera una hoja
      let yOffset = 0
      let remaining = imgH
      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, imgH)
        yOffset += pdfH
        remaining -= pdfH
      }

      pdf.save(`ficha-${ficha.nombre}-${ficha.primerApellido}.pdf`)
    } finally {
      el.style.cssText = prevCss
    }
  }

  if (!ficha) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64">
        <p className="text-gray-500 mb-4">Ficha no encontrada.</p>
        <button onClick={() => navigate('/base-datos')} className="btn-primary">Volver</button>
      </div>
    )
  }

  const obsNombre = observadores.find((o) => o.id === ficha.observador)?.nombre ?? ficha.observador
  const clubNombre = clubes.find((c) => c.id === ficha.club)?.nombre ?? ficha.club

  const fichasJugadora = allFichas
    .filter(
      (f) =>
        f.nombre === ficha.nombre &&
        f.primerApellido === ficha.primerApellido &&
        f.segundoApellido === ficha.segundoApellido,
    )
    .sort((a, b) => new Date(b.fechaPartido).getTime() - new Date(a.fechaPartido).getTime())
  const itemsDemarc = DEMARCACIONES_ITEMS.find((d) => d.posicion === ficha.demarcacion)?.items ?? []
  const tecValues = [
    ficha.evaluacionTecnica?.item1 ?? 0,
    ficha.evaluacionTecnica?.item2 ?? 0,
    ficha.evaluacionTecnica?.item3 ?? 0,
    ficha.evaluacionTecnica?.item4 ?? 0,
    ficha.evaluacionTecnica?.item5 ?? 0,
    ficha.evaluacionTecnica?.item6 ?? 0,
  ]

  return (
    <div ref={contentRef} className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-rfpaf-blue hover:underline text-sm flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button onClick={() => navigate(`/editar/${ficha.id}`)} className="btn-primary flex items-center gap-2 text-sm">
            <Edit className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="card bg-gradient-to-r from-rfpaf-blue to-rfpaf-blue-light text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            {ficha.foto ? (
              <div className="w-16 h-20 rounded overflow-hidden flex-shrink-0 border-2 border-white/30">
                <img src={ficha.foto} alt={ficha.nombre} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-20 bg-white/20 rounded flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {ficha.nombre?.charAt(0)}{ficha.primerApellido?.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {ficha.nombre} {ficha.primerApellido} {ficha.segundoApellido}
              </h1>
              <p className="text-white/80 text-sm">
                {clubNombre} · #{ficha.dorsal} · {ficha.demarcacion}
              </p>
              <p className="text-white/70 text-xs mt-0.5">
                Registro: {ficha.registro}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-yellow-300 text-2xl mb-1">
              {'★'.repeat(ficha.valoracionGeneral ?? 0)}{'☆'.repeat(5 - (ficha.valoracionGeneral ?? 0))}
            </div>
            <PropuestaBadge propuesta={ficha.propuesta} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos personales */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-3">Datos Personales</h2>
          <DataRow label="Fecha de Nacimiento" value={new Date(ficha.fechaNacimiento).toLocaleDateString('es-ES')} />
          <DataRow label="Edad" value={`${calcularEdad(ficha.fechaNacimiento)} años`} />
          <DataRow label="Lateralidad" value={ficha.lateralidad} />
          <DataRow label="Tipología" value={ficha.tipologia} />
          <DataRow label="Altura" value={`${ficha.altura} m`} />
          <div className="flex justify-between py-2 border-b">
            <span className="text-sm text-gray-500">Club</span>
            <div className="flex items-center gap-2">
              {clubes.find((c) => c.id === ficha.club)?.escudo && (
                <img src={clubes.find((c) => c.id === ficha.club)?.escudo!} alt={clubNombre} className="w-6 h-8 object-contain" />
              )}
              <span className="text-sm font-semibold text-gray-800">{clubNombre}</span>
            </div>
          </div>
        </div>

        {/* Datos partido */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-3">Contexto del Partido</h2>
          <DataRow label="Fecha" value={new Date(ficha.fechaPartido).toLocaleDateString('es-ES')} />
          <DataRow label="Equipo" value={ficha.equipo} />
          <DataRow label="Categoría" value={ficha.categoria} />
          <DataRow label="Local" value={ficha.local} />
          <DataRow label="Visitante" value={ficha.visitante} />
          <DataRow label="Observador" value={obsNombre} />
        </div>

        {/* Físico */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-3">Cualidades Físicas</h2>
          {[
            { label: 'Fuerza', value: ficha.fuerza ?? 0, color: '#1a3a6b' },
            { label: 'Velocidad', value: ficha.velocidad ?? 0, color: '#c0392b' },
            { label: 'Resistencia', value: ficha.resistencia ?? 0, color: '#16a34a' },
          ].map(({ label, value, color }) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-bold" style={{ color }}>{value}/10</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
          <div className="mt-3 h-36">
            <RadarChart
              labels={['Fuerza', 'Velocidad', 'Resistencia']}
              values={[ficha.fuerza ?? 0, ficha.velocidad ?? 0, ficha.resistencia ?? 0]}
              max={10}
              color="#1a3a6b"
            />
          </div>
        </div>
      </div>

      {/* Evaluación técnica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-bold text-gray-700 mb-3">
            Evaluación Técnica · {ficha.demarcacion}
            {ficha.otraDemarcacion && <span className="text-gray-400 font-normal ml-2 text-sm">/ {ficha.otraDemarcacion}</span>}
          </h2>
          {itemsDemarc.map((item, i) => {
            const colors = ['#1a3a6b', '#c0392b', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4']
            const color = colors[i % colors.length]
            return (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item}</span>
                  <span className="font-bold" style={{ color }}>{tecValues[i]}/5</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(tecValues[i] / 5) * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="card flex flex-col items-center justify-center">
          <h2 className="text-base font-bold text-gray-700 mb-3 self-start">{ficha.demarcacion} — Radar</h2>
          <div className="w-full max-w-xs">
            <RadarChart
              labels={itemsDemarc}
              values={tecValues}
              max={5}
              color="#c0392b"
              label={ficha.demarcacion}
            />
          </div>
        </div>
      </div>

      {/* Evaluación final */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-700 mb-4">Evaluación Final</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Valoración General</p>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} className={`w-6 h-6 ${n <= (ficha.valoracionGeneral ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Propuesta</p>
            <PropuestaBadge propuesta={ficha.propuesta} />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Registrado</p>
            <p className="text-sm font-medium text-gray-700">
              {new Date(ficha.creadoEn).toLocaleDateString('es-ES', { dateStyle: 'long' })}
            </p>
          </div>
        </div>

        {ficha.descripcionJugadora && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-600 mb-1">Descripción</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{ficha.descripcionJugadora}</p>
          </div>
        )}
        {ficha.observaciones && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-gray-600 mb-1">Observaciones</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{ficha.observaciones}</p>
          </div>
        )}
        {ficha.cierre && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-gray-600 mb-1">Cierre</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{ficha.cierre}</p>
          </div>
        )}
      </div>

      {/* Historial de observaciones */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-700 mb-1">Historial de Observaciones</h2>
        <p className="text-xs text-gray-400 mb-4">
          {ficha.nombre} {ficha.primerApellido} {ficha.segundoApellido} ·{' '}
          {calcularEdad(ficha.fechaNacimiento)} años · {clubNombre}
        </p>
        {fichasJugadora.length === 0 ? (
          <p className="text-sm text-gray-400">Sin observaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Partido</th>
                  <th className="px-3 py-2 text-left font-semibold">Categoría</th>
                  <th className="px-3 py-2 text-left font-semibold">Observador</th>
                  <th className="px-3 py-2 text-left font-semibold">Valoración</th>
                  <th className="px-3 py-2 text-left font-semibold">Propuesta</th>
                  <th className="px-3 py-2 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {fichasJugadora.map((f) => {
                  const obsNom = observadores.find((o) => o.id === f.observador)?.nombre ?? f.observador
                  const propMap: Record<string, string> = {
                    'SELECCIÓN': 'bg-green-100 text-green-800',
                    'INCORPORAR': 'bg-blue-100 text-blue-800',
                    'SEGUIR': 'bg-yellow-100 text-yellow-800',
                    'DESCARTAR': 'bg-red-100 text-red-800',
                  }
                  return (
                    <tr key={f.id} className={`border-b last:border-0 hover:bg-blue-50/30 transition-colors ${f.id === ficha.id ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {new Date(f.fechaPartido).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">
                        {f.local} <span className="text-gray-400 font-normal">vs</span> {f.visitante}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{f.categoria}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{obsNom}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-yellow-500">{'★'.repeat(f.valoracionGeneral ?? 0)}</span>
                        <span className="text-gray-300">{'★'.repeat(5 - (f.valoracionGeneral ?? 0))}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${propMap[f.propuesta] ?? 'bg-gray-100 text-gray-600'}`}>
                          {f.propuesta}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {f.id !== ficha.id && (
                          <button
                            onClick={() => navigate(`/ficha/${f.id}`)}
                            className="text-rfpaf-blue hover:text-rfpaf-blue-light"
                            title="Ver ficha"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Template oculto para exportar PDF */}
      <div
        ref={pdfRef}
        style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}
        aria-hidden="true"
      >
        <FichaPDFTemplate
          ficha={ficha}
          obsNombre={obsNombre}
          clubNombre={clubNombre}
          fichasJugadora={fichasJugadora}
          observadores={observadores}
        />
      </div>
    </div>
  )
}
