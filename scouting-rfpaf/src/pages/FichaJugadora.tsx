import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, FileText, Star, ClipboardList, Check, X, PlusCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Fragment, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { JugadoraConvocada } from '../types'
import RadarChart from '../components/charts/RadarChart'
import FichaPDFTemplate from '../components/pdf/FichaPDFTemplate'
import { DEMARCACIONES_ITEMS } from '../data/masterData'
import { mediaFisicaDe, mediaTecnicaDe, fmtMedia, aCien, mediaValoracionGeneralDe } from '../utils/valoracionStats'
import PanelInformes, { BarraAtributo, colorNota } from '../components/ficha/PanelInformes'

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

// Muchos clubes aún no tienen escudo cargado: en ese caso simplemente no se
// pinta nada y queda el nombre solo.
function EscudoMini({ url }: { url?: string | null }) {
  if (!url) return null
  return <img src={url} alt="" className="w-4 h-5 object-contain flex-shrink-0" />
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
  const { getFicha, observadores, clubes, convocatorias, addJugadoraToConvocatoria, deleteValoracion } = useStore()
  const contentRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<HTMLDivElement>(null)
  const [showConvModal, setShowConvModal] = useState(false)
  const [addedToId, setAddedToId] = useState<string | null>(null)
  const [pdfImgs, setPdfImgs] = useState<{ fed: string | null; escudo: string | null }>({ fed: null, escudo: null })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const ficha = getFicha(id ?? '')

  const handleAddToConvocatoria = (convocatoriaId: string) => {
    if (!ficha) return
    const clubNombre = clubes.find((c) => c.id === ficha.club)?.nombre ?? ficha.club ?? ''
    const jugadora: JugadoraConvocada = {
      fichaId: ficha.id,
      nombre: ficha.nombre,
      primerApellido: ficha.primerApellido,
      segundoApellido: ficha.segundoApellido ?? '',
      fechaNacimiento: ficha.fechaNacimiento,
      clubId: ficha.club ?? '',
      clubNombre,
      foto: ficha.foto,
    }
    addJugadoraToConvocatoria(convocatoriaId, jugadora)
    setAddedToId(convocatoriaId)
    setTimeout(() => { setShowConvModal(false); setAddedToId(null) }, 900)
  }

  const handleExportPDF = async () => {
    if (!pdfRef.current || !ficha) return

    // Pre-cargar imágenes como dataURL para que html2canvas las renderice sin problemas CORS
    const toDataURL = (url?: string | null): Promise<string | null> => {
      if (!url) return Promise.resolve(null)
      // Si ya es un dataURL (base64), devolverlo tal cual — añadir query lo corrompería
      if (url.startsWith('data:')) return Promise.resolve(url)
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth; c.height = img.naturalHeight
          c.getContext('2d')!.drawImage(img, 0, 0)
          try {
            resolve(c.toDataURL('image/png'))
          } catch {
            // Si el canvas queda "tainted" por CORS, usar la URL original directamente
            resolve(url)
          }
        }
        img.onerror = () => resolve(null)
        img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
      })
    }

    const escudoUrl = clubes.find((c) => c.id === ficha.club)?.escudo
      ?? clubes.find((c) => c.nombre === ficha.equipo)?.escudo
      ?? null

    const [fedData, escudoData] = await Promise.all([
      toDataURL('https://files.asturfutbol.es/pnfg/img/web_responsive_2/ESP/logo(rffpa).png'),
      toDataURL(escudoUrl),
    ])

    setPdfImgs({ fed: fedData, escudo: escudoData })
    // Esperar a que React renderice con las nuevas imágenes
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    const el = pdfRef.current!
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

      // Capturar BLOQUE A BLOQUE para que ninguna tarjeta se corte entre páginas
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()   // 210 mm
      const pdfH = pdf.internal.pageSize.getHeight()  // 297 mm

      const SIDE = (28 / 794) * pdfW   // margen lateral equivalente al padding del cuerpo (28px)
      const TOP = 8                     // margen superior en páginas nuevas
      const BOTTOM = 8                  // margen inferior
      const GAP = (12 / 794) * pdfW     // separación entre bloques (gap:12px del cuerpo)

      const blocks = Array.from(el.querySelectorAll<HTMLElement>('[data-pdf-block]'))
      let y = 0

      for (const block of blocks) {
        const isHeader = block.dataset.pdfBlock === 'header'
        const c = await html2canvas(block, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: isHeader ? null : '#ffffff',
          allowTaint: true,
        })
        const blockW = isHeader ? pdfW : pdfW - SIDE * 2
        const x = isHeader ? 0 : SIDE
        const imgH = (c.height / c.width) * blockW
        const imgData = c.toDataURL('image/jpeg', 0.95)

        // Si el bloque no cabe en lo que queda de página, pasar a la siguiente entero
        if (y > 0 && y + imgH > pdfH - BOTTOM) {
          pdf.addPage()
          y = TOP
        }

        pdf.addImage(imgData, 'JPEG', x, y, blockW, imgH)
        y += imgH + (isHeader ? GAP * 0.7 : GAP)
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

  const obsFicha = observadores.find((o) => o.id === ficha.observador)
  const obsNombre = obsFicha?.nombre ?? ficha.observador
  const clubNombre = clubes.find((c) => c.id === ficha.club)?.nombre ?? ficha.club
  // local/visitante guardan el NOMBRE del club (no el id), así que se busca por nombre.
  const escudoDeClub = (nombre: string) => clubes.find((c) => c.nombre === nombre)?.escudo ?? null

  const historial = [...ficha.valoraciones].sort((a, b) => {
    const byFecha = new Date(b.fechaPartido).getTime() - new Date(a.fechaPartido).getTime()
    if (byFecha !== 0) return byFecha
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
  })
  const tieneValoraciones = historial.length > 0
  const itemsDemarc = DEMARCACIONES_ITEMS.find((d) => d.posicion === ficha.demarcacion)?.items ?? []

  // El perfil físico y técnico de la ficha es la media de TODAS las valoraciones,
  // no la del último partido (una sola actuación no representa a la jugadora).
  const fisicoMedio = mediaFisicaDe(historial) ?? { fuerza: 0, velocidad: 0, resistencia: 0 }
  const tecnicaMedia = mediaTecnicaDe(historial)
  const tecValues = [
    tecnicaMedia?.item1 ?? 0,
    tecnicaMedia?.item2 ?? 0,
    tecnicaMedia?.item3 ?? 0,
    tecnicaMedia?.item4 ?? 0,
    tecnicaMedia?.item5 ?? 0,
    tecnicaMedia?.item6 ?? 0,
  ]
  const edadTexto = calcularEdad(ficha.fechaNacimiento) > 0 ? `${calcularEdad(ficha.fechaNacimiento)} años` : '—'
  const sufijoMedia = historial.length > 1 ? `Media de ${historial.length} valoraciones` : 'Una valoración'
  const escudoClub = clubes.find((c) => c.id === ficha.club)?.escudo ?? null
  // Nota global de la jugadora, llevada a 0-100 como el resto del panel
  const mediaTotal = aCien(mediaValoracionGeneralDe(historial) ?? 0, 5)
  // Qué ítems de su posición se valoran con el balón en los pies
  const conBalonFicha =
    DEMARCACIONES_ITEMS.find((d) => d.posicion === ficha.demarcacion)?.conBalon
    ?? [true, true, true, false, false, false]

  return (
    <div ref={contentRef} className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-rfpaf-blue hover:underline text-sm flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConvModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Añadir a convocatoria"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Convocar</span>
          </button>
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

      {/* Panel: a la izquierda quién es y cómo puntúa; a la derecha, qué dicen
          sus informes en conjunto. Todo en escala 0-100 para poder comparar. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-4 items-start">
        {/* Columna de la jugadora. Se queda pegada arriba al bajar por el
            análisis: siempre se ve de quién estamos hablando. */}
        <div className="card lg:sticky lg:top-4">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {ficha.foto ? (
                <img src={ficha.foto} alt={ficha.nombre}
                  className="w-28 h-32 rounded-xl object-cover object-top border-2 border-gray-100" />
              ) : (
                <div className="w-28 h-32 rounded-xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-300">
                  {ficha.nombre?.charAt(0)}{ficha.primerApellido?.charAt(0)}
                </div>
              )}
              {escudoClub && (
                <img src={escudoClub} alt={clubNombre}
                  className="absolute -top-2 -left-2 w-9 h-9 object-contain bg-white rounded-full shadow p-0.5" />
              )}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-rfpaf-red rounded-full px-2 py-0.5 whitespace-nowrap">
                {ficha.demarcacion}
              </span>
            </div>

            <h1 className="text-lg font-bold text-rfpaf-blue mt-4 leading-tight">
              {ficha.nombre} {ficha.primerApellido} {ficha.segundoApellido}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {[clubNombre, `#${ficha.dorsal}`, ficha.altura ? `${ficha.altura} m` : null,
                edadTexto !== '—' ? edadTexto : null].filter(Boolean).join(' · ')}
            </p>

            {tieneValoraciones ? (
              <div className="w-full mt-3 rounded-xl py-2 text-white"
                style={{ backgroundColor: colorNota(mediaTotal) }}>
                <p className="text-[10px] uppercase tracking-wide opacity-90 font-semibold">Valoración promedio total</p>
                <p className="text-3xl font-black leading-none mt-0.5">{mediaTotal}</p>
              </div>
            ) : (
              <span className="mt-3 px-4 py-2 rounded-full text-xs font-bold bg-gray-100 text-gray-400">
                Sin valorar todavía
              </span>
            )}
            {tieneValoraciones && <div className="mt-2"><PropuestaBadge propuesta={ficha.propuesta} /></div>}
          </div>

          {tieneValoraciones && (
            <div className="mt-5 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Físico</p>
              <BarraAtributo etiqueta="Fuerza" valor={aCien(fisicoMedio.fuerza, 10)} />
              <BarraAtributo etiqueta="Velocidad" valor={aCien(fisicoMedio.velocidad, 10)} />
              <BarraAtributo etiqueta="Resistencia" valor={aCien(fisicoMedio.resistencia, 10)} />

              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide pt-3">
                Técnica · {ficha.demarcacion}
              </p>
              {itemsDemarc.map((item, i) => (
                <BarraAtributo
                  key={item}
                  etiqueta={`${item}${conBalonFicha[i] ? '' : ' ·'}`}
                  valor={aCien(tecValues[i] ?? 0, 5)}
                />
              ))}
              <p className="text-[9px] text-gray-400 pt-1">
                Los ítems marcados con · se valoran sin balón
              </p>
            </div>
          )}

          {/* Los datos de quién es la jugadora, junto a su foto y sus notas */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Datos Personales</h2>
            <DataRow label="Fecha de Nacimiento" value={new Date(ficha.fechaNacimiento).toLocaleDateString('es-ES')} />
            <DataRow label="Edad" value={edadTexto} />
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
        </div>

        {/* Bloques de análisis de los informes */}
        {tieneValoraciones ? (
          <PanelInformes
            valoraciones={historial}
            conBalon={conBalonFicha}
            observadores={observadores}
          />
        ) : (
          <div className="card flex flex-col items-center justify-center text-center py-12">
            <p className="text-sm text-gray-400 mb-3">
              Cuando haya informes de esta jugadora, aquí verás su evolución y el análisis del conjunto.
            </p>
            <button onClick={() => navigate(`/ficha/${ficha.id}/valorar`)} className="btn-primary text-sm">
              Añadir la primera valoración
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Datos partido (última valoración) */}
        <div className="card flex flex-col">
          <h2 className="text-base font-bold text-gray-700 mb-3">Última Valoración</h2>
          {tieneValoraciones ? (
            <>
              <DataRow label="Fecha" value={new Date(ficha.fechaPartido).toLocaleDateString('es-ES')} />
              <DataRow label="Categoría" value={ficha.categoria} />
              <DataRow label="Local" value={ficha.local} />
              <DataRow label="Visitante" value={ficha.visitante} />
              <div className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm text-gray-500">Observador</span>
                <div className="flex items-center gap-2">
                  {obsFicha?.foto ? (
                    <img src={obsFicha.foto} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center">
                      {obsNombre.charAt(0)}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-800">{obsNombre}</span>
                </div>
              </div>

              {/* Veredicto de este partido, anclado abajo para rellenar la
                  altura que impone la tarjeta de físico (más alta por el radar). */}
              <div className="mt-auto pt-4">
                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-4 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Veredicto de este partido</p>
                  <div className="flex justify-center gap-1 mb-3">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} className={`w-6 h-6 ${n <= (ficha.valoracionGeneral ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <PropuestaBadge propuesta={ficha.propuesta} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm text-gray-400 mb-3">Sin valoraciones registradas todavía.</p>
              <button
                onClick={() => navigate(`/ficha/${ficha.id}/valorar`)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Añadir valoración
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Estadísticas de temporada */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-700 mb-3">Estadísticas de Temporada</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Minutos', value: ficha.minutosJugados ?? 0 },
            { label: 'Titular', value: ficha.partidosTitular ?? 0 },
            { label: 'Suplente', value: ficha.partidosSuplente ?? 0 },
            { label: 'Goles', value: ficha.goles ?? 0 },
            { label: 'T. Amarillas', value: ficha.tarjetasAmarillas ?? 0 },
            { label: 'T. Rojas', value: ficha.tarjetasRojas ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-gray-50 rounded-xl py-3">
              <p className="text-xl font-bold text-rfpaf-blue">{value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluación técnica y final (última valoración) */}
      {tieneValoraciones && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-bold text-gray-700">
            Evaluación Técnica · {ficha.demarcacion}
            {ficha.otraDemarcacion && <span className="text-gray-400 font-normal ml-2 text-sm">/ {ficha.otraDemarcacion}</span>}
          </h2>
          <p className="text-xs text-gray-400 mb-3">{sufijoMedia}</p>
          {itemsDemarc.map((item, i) => {
            const colors = ['#1a3a6b', '#c0392b', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4']
            const color = colors[i % colors.length]
            return (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item}</span>
                  <span className="font-bold" style={{ color }}>{fmtMedia(tecValues[i])}/5</span>
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

        <div className="card flex flex-col">
          <h2 className="text-base font-bold text-gray-700">{ficha.demarcacion} — Radar</h2>
          <p className="text-xs text-gray-400 mb-3">{sufijoMedia}</p>
          <div className="flex-1 min-h-[22rem]">
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
      </>
      )}

      {/* Historial de valoraciones */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-gray-700">Historial de Observaciones</h2>
          <button
            onClick={() => navigate(`/ficha/${ficha.id}/valorar`)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva valoración
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {ficha.nombre} {ficha.primerApellido} {ficha.segundoApellido} ·{' '}
          {edadTexto} · {clubNombre}
        </p>
        {historial.length === 0 ? (
          <p className="text-sm text-gray-400">Sin valoraciones aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-semibold"></th>
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
                {historial.map((v) => {
                  const obs = observadores.find((o) => o.id === v.observador)
                  const obsNom = obs?.nombre ?? v.observador
                  const propMap: Record<string, string> = {
                    'SELECCIÓN': 'bg-green-100 text-green-800',
                    'INCORPORAR': 'bg-blue-100 text-blue-800',
                    'SEGUIR': 'bg-yellow-100 text-yellow-800',
                    'DESCARTAR': 'bg-red-100 text-red-800',
                  }
                  const isExpanded = expandedId === v.id
                  const vTecValues = [
                    v.evaluacionTecnica?.item1 ?? 0,
                    v.evaluacionTecnica?.item2 ?? 0,
                    v.evaluacionTecnica?.item3 ?? 0,
                    v.evaluacionTecnica?.item4 ?? 0,
                    v.evaluacionTecnica?.item5 ?? 0,
                    v.evaluacionTecnica?.item6 ?? 0,
                  ]
                  return (
                    <Fragment key={v.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                        className={`border-b last:border-0 hover:bg-blue-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-3 py-2 text-gray-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                          {new Date(v.fechaPartido).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">
                          {/* Un escudo en cada extremo: se lee como un marcador. */}
                          <span className="inline-flex items-center gap-1.5">
                            <EscudoMini url={escudoDeClub(v.local)} />
                            {v.local}
                            <span className="text-gray-400 font-normal">vs</span>
                            {v.visitante}
                            <EscudoMini url={escudoDeClub(v.visitante)} />
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{v.categoria}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            {obs?.foto ? (
                              <img src={obs.foto} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                {obsNom.charAt(0)}
                              </span>
                            )}
                            {obsNom}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-yellow-500">{'★'.repeat(v.valoracionGeneral ?? 0)}</span>
                          <span className="text-gray-300">{'★'.repeat(5 - (v.valoracionGeneral ?? 0))}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${propMap[v.propuesta] ?? 'bg-gray-100 text-gray-600'}`}>
                            {v.propuesta}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/ficha/${ficha.id}/valorar/${v.id}`)}
                              className="text-rfpaf-blue hover:text-rfpaf-blue-light"
                              title="Editar valoración"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('¿Eliminar esta valoración? Esta acción no se puede deshacer.')) {
                                  deleteValoracion(ficha.id, v.id)
                                }
                              }}
                              className="text-red-400 hover:text-red-600"
                              title="Eliminar valoración"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/60 border-b">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Valoración Física</p>
                                {[
                                  { label: 'Fuerza', value: v.fuerza ?? 0, color: '#1a3a6b' },
                                  { label: 'Velocidad', value: v.velocidad ?? 0, color: '#c0392b' },
                                  { label: 'Resistencia', value: v.resistencia ?? 0, color: '#16a34a' },
                                ].map(({ label, value, color }) => (
                                  <div key={label} className="mb-2">
                                    <div className="flex justify-between text-xs mb-0.5">
                                      <span className="text-gray-600">{label}</span>
                                      <span className="font-bold" style={{ color }}>{value}/10</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div className="h-1.5 rounded-full" style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }} />
                                    </div>
                                  </div>
                                ))}
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-4">
                                  Evaluación Técnica · {ficha.demarcacion}
                                </p>
                                {itemsDemarc.map((item, i) => {
                                  const colors = ['#1a3a6b', '#c0392b', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4']
                                  const color = colors[i % colors.length]
                                  return (
                                    <div key={i} className="mb-2">
                                      <div className="flex justify-between text-xs mb-0.5">
                                        <span className="text-gray-600">{item}</span>
                                        <span className="font-bold" style={{ color }}>{vTecValues[i]}/5</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full" style={{ width: `${(vTecValues[i] / 5) * 100}%`, backgroundColor: color }} />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="space-y-3">
                                {v.descripcionJugadora && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Descripción</p>
                                    <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">{v.descripcionJugadora}</p>
                                  </div>
                                )}
                                {v.observaciones && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones</p>
                                    <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">{v.observaciones}</p>
                                  </div>
                                )}
                                {v.cierre && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cierre</p>
                                    <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">{v.cierre}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Añadir a convocatoria */}
      {showConvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-gray-800">Añadir a convocatoria</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ficha.nombre} {ficha.primerApellido}
                </p>
              </div>
              <button onClick={() => setShowConvModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 max-h-72 overflow-y-auto">
              {convocatorias.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  No hay convocatorias creadas.<br />
                  <span className="text-xs">Ve a Scouting → Convocatorias para crear una.</span>
                </p>
              ) : (
                convocatorias.map((c) => {
                  const alreadyIn = c.jugadoras.some((j) => j.fichaId === ficha.id)
                  const full = c.jugadoras.length >= 22
                  const added = addedToId === c.id
                  return (
                    <button
                      key={c.id}
                      disabled={alreadyIn || full}
                      onClick={() => handleAddToConvocatoria(c.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left transition-colors mb-1 ${
                        alreadyIn || full ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{c.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES') : '—'} · {c.hora || '—'} · {c.jugadoras.length}/22
                        </p>
                      </div>
                      {added ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : alreadyIn ? (
                        <span className="text-xs text-green-600 font-semibold flex-shrink-0">Ya añadida</span>
                      ) : full ? (
                        <span className="text-xs text-red-500 flex-shrink-0">Completa</span>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

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
          valoraciones={historial}
          currentValoracionId={historial[0]?.id}
          escudosPorClub={Object.fromEntries(
            clubes.filter((c) => c.escudo).map((c) => [c.nombre, c.escudo as string])
          )}
          observadores={observadores}
          fedLogoUrl={pdfImgs.fed}
          clubEscudoUrl={pdfImgs.escudo}
        />
      </div>
    </div>
  )
}
