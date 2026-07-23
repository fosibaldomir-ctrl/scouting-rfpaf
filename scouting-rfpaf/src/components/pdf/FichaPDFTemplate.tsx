import type { FichaJugadora, Observador, Valoracion } from '../../types'
import RadarSVG from './RadarSVG'
import { DEMARCACIONES_ITEMS } from '../../data/masterData'

interface Props {
  ficha: FichaJugadora
  obsNombre: string
  clubNombre: string
  valoraciones?: Valoracion[]
  currentValoracionId?: string
  observadores?: Observador[]
  fedLogoUrl?: string | null
  clubEscudoUrl?: string | null
}

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

const PROPUESTA_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  SELECCIÓN:  { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  INCORPORAR: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  SEGUIR:     { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  DESCARTAR:  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
}

const BAR_COLORS = ['#1a3a6b', '#c0392b', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4']

export default function FichaPDFTemplate({ ficha, obsNombre, clubNombre, valoraciones = [], currentValoracionId, observadores = [], fedLogoUrl, clubEscudoUrl }: Props) {
  const itemsDemarc = DEMARCACIONES_ITEMS.find((d) => d.posicion === ficha.demarcacion)?.items ?? []
  const tecValues = [
    ficha.evaluacionTecnica?.item1 ?? 0,
    ficha.evaluacionTecnica?.item2 ?? 0,
    ficha.evaluacionTecnica?.item3 ?? 0,
    ficha.evaluacionTecnica?.item4 ?? 0,
    ficha.evaluacionTecnica?.item5 ?? 0,
    ficha.evaluacionTecnica?.item6 ?? 0,
  ]
  const propStyle = PROPUESTA_STYLES[ficha.propuesta] ?? PROPUESTA_STYLES.SEGUIR
  const edad = calcularEdad(ficha.fechaNacimiento)
  // Con fechas de nacimiento ausentes o mal introducidas la edad sale 0/negativa:
  // mejor no mostrar un "0 años" que parece un dato real.
  const edadTexto = edad > 0 ? `${edad} años` : '—'

  // Puntuación media técnica
  const avgTec = tecValues.length ? tecValues.reduce((a, b) => a + b, 0) / tecValues.length : 0
  const avgFis = ((ficha.fuerza ?? 0) + (ficha.velocidad ?? 0) + (ficha.resistencia ?? 0)) / 3

  // La física, la técnica y la evaluación final de la ficha son SIEMPRE las de la
  // valoración más reciente (ver pickSnapshot), no un dato permanente de la jugadora.
  const fechaUltima = ficha.fechaPartido ? new Date(ficha.fechaPartido).toLocaleDateString('es-ES') : '—'
  // El historial llega ordenado de más reciente a más antiguo; la evolución se lee al revés.
  const valoracionesAsc = [...valoraciones].reverse()

  return (
    <div
      style={{
        width: '794px',
        fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
        background: '#ffffff',
        color: '#1e293b',
        lineHeight: 1.4,
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div
        data-pdf-block="header"
        style={{
          background: 'linear-gradient(135deg, #1a3a6b 0%, #2e4d8f 60%, #c0392b 100%)',
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '20px',
        }}
      >
        {/* Foto / Iniciales con escudo del club en esquina inferior izquierda */}
        <div style={{ position: 'relative', flexShrink: 0, width: 80, height: 100 }}>
          {ficha.foto ? (
            <img
              src={ficha.foto}
              alt={ficha.nombre}
              style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8, border: '3px solid rgba(255,255,255,0.4)', display: 'block' }}
            />
          ) : (
            <div style={{
              width: 80, height: 100, background: 'rgba(255,255,255,0.15)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 900, color: 'white', border: '2px solid rgba(255,255,255,0.3)',
            }}>
              {ficha.nombre?.charAt(0)}{ficha.primerApellido?.charAt(0)}
            </div>
          )}
          {/* Miniatura escudo club — dentro de la foto para evitar recorte de html2canvas */}
          {clubEscudoUrl && (
            <div style={{
              position: 'absolute', bottom: 4, left: 4,
              width: 30, height: 30,
              background: 'rgba(255,255,255,0.92)',
              borderRadius: '50%',
              padding: 3,
              boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src={clubEscudoUrl}
                alt={clubNombre}
                style={{ width: 22, height: 22, objectFit: 'contain' }}
              />
            </div>
          )}
        </div>

        {/* Nombre y datos clave */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 14 }}>
            {ficha.nombre} {ficha.primerApellido}
            {ficha.segundoApellido && <span style={{ fontWeight: 400, opacity: 0.85 }}> {ficha.segundoApellido}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            {[
              ficha.demarcacion,
              ficha.lateralidad,
              edadTexto,
              `${ficha.altura} m`,
              `#${ficha.dorsal}`,
            ].map((tag) => (
              <div
                key={tag}
                data-pdf-pill="white"
                style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.20)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                  paddingTop: 4,
                  paddingBottom: 4,
                  paddingLeft: 10,
                  paddingRight: 10,
                  borderRadius: 20,
                  border: '2px solid rgba(255,255,255,0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
            {clubNombre} · {ficha.categoria} · Obs: {obsNombre}
          </div>
        </div>

        {/* Logo Federación Asturiana — centro del header */}
        {fedLogoUrl && (
          <div style={{
            flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 12px',
          }}>
            <img
              src={fedLogoUrl}
              alt="RFPAF"
              style={{ width: 72, height: 72, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}
            />
          </div>
        )}

        {/* Valoración + Propuesta */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, minWidth: 130 }}>
          <div style={{ fontSize: 26, lineHeight: 1, color: '#fde68a', letterSpacing: 2 }}>
            {'★'.repeat(ficha.valoracionGeneral ?? 0)}
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>{'★'.repeat(5 - (ficha.valoracionGeneral ?? 0))}</span>
          </div>
          <div
            data-pdf-pill={propStyle.color}
            data-pdf-pill-bg={propStyle.bg}
            data-pdf-pill-border={propStyle.border}
            style={{
              display: 'inline-block',
              background: propStyle.bg, color: propStyle.color,
              border: `2px solid ${propStyle.border}`,
              lineHeight: 1,
              paddingTop: 4, paddingBottom: 4,
              paddingLeft: 12, paddingRight: 12,
              borderRadius: 20, fontWeight: 900, fontSize: 12,
              letterSpacing: 0.5, whiteSpace: 'nowrap',
            }}
          >
            {ficha.propuesta}
          </div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)' }}>
            Reg: {ficha.registro}
          </div>
        </div>
      </div>

      {/* ── CUERPO ──────────────────────────────────────────────── */}
      <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Fila 1: Datos personales + Contexto partido ──── */}
        <div data-pdf-block="datos" style={{ display: 'flex', gap: 16 }}>
          <SectionCard title="Datos Personales" style={{ flex: 1 }}>
            <DataTable rows={[
              ['Fecha Nacimiento', new Date(ficha.fechaNacimiento).toLocaleDateString('es-ES')],
              ['Edad', edadTexto],
              ['Lateralidad', ficha.lateralidad],
              ['Tipología', ficha.tipologia],
              ['Altura', `${ficha.altura} m`],
              ['Club', clubNombre],
            ]} />
          </SectionCard>
          <SectionCard title="Última Valoración" style={{ flex: 1 }}>
            <DataTable rows={[
              ['Fecha', fechaUltima],
              ['Categoría', ficha.categoria],
              ['Local', ficha.local],
              ['Visitante', ficha.visitante],
              ['Observador', obsNombre],
              ['Valoraciones', `${valoraciones.length}`],
            ]} />
          </SectionCard>
        </div>

        {/* ── Fila 2: Físico + Técnica con sus radares ──── */}
        <div data-pdf-block="fisico-tecnica" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Aviso de contexto: estos datos son de un partido concreto, no permanentes */}
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6,
            padding: '5px 10px', fontSize: 10, color: '#1e40af', lineHeight: 1.35,
          }}>
            <strong style={{ fontWeight: 800 }}>Física, técnica y evaluación final</strong> corresponden a la
            valoración más reciente · <strong style={{ fontWeight: 800 }}>{fechaUltima}</strong>
            {ficha.local && ficha.visitante ? ` · ${ficha.local} vs ${ficha.visitante}` : ''}
            {obsNombre ? ` · Obs: ${obsNombre}` : ''}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>

          {/* Físico */}
          <SectionCard title="Cualidades Físicas" style={{ flex: 0.85 }}>
            {[
              { label: 'Fuerza', value: ficha.fuerza ?? 0, color: '#1a3a6b', max: 10 },
              { label: 'Velocidad', value: ficha.velocidad ?? 0, color: '#c0392b', max: 10 },
              { label: 'Resistencia', value: ficha.resistencia ?? 0, color: '#16a34a', max: 10 },
            ].map(({ label, value, color, max }) => (
              <div key={label} style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color }}>{value}<span style={{ fontSize: 9, fontWeight: 400, color: '#9ca3af' }}>/{max}</span></span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(value / max) * 100}%`, height: '100%',
                    background: `linear-gradient(90deg, ${color}cc, ${color})`,
                    borderRadius: 8,
                  }} />
                </div>
              </div>
            ))}
            {/* Radar centrado en el espacio restante para equilibrar la altura con la técnica */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <RadarSVG
                labels={['Fuerza', 'Velocidad', 'Resistencia']}
                values={[ficha.fuerza ?? 0, ficha.velocidad ?? 0, ficha.resistencia ?? 0]}
                max={10}
                colorStart="#1a3a6b"
                colorEnd="#16a34a"
                size={110}
                pad={50}
              />
            </div>
            <div style={{
              textAlign: 'center', marginTop: 4,
              fontSize: 11, color: '#64748b', fontWeight: 600,
            }}>
              Promedio físico: <strong style={{ color: '#1a3a6b' }}>{avgFis.toFixed(1)}/10</strong>
            </div>
          </SectionCard>

          {/* Técnica */}
          <SectionCard
            title={`Evaluación Técnica · ${ficha.demarcacion}${ficha.otraDemarcacion ? ` / ${ficha.otraDemarcacion}` : ''}`}
            style={{ flex: 1.7 }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Barras */}
              <div style={{ flex: 1 }}>
                {itemsDemarc.map((item, i) => (
                  <div key={i} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#374151' }}>{item}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: BAR_COLORS[i] }}>
                        {tecValues[i]}<span style={{ fontSize: 9, fontWeight: 400, color: '#9ca3af' }}>/5</span>
                      </span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(tecValues[i] / 5) * 100}%`, height: '100%',
                        background: `linear-gradient(90deg, ${BAR_COLORS[i]}99, ${BAR_COLORS[i]})`,
                        borderRadius: 8,
                      }} />
                    </div>
                  </div>
                ))}
                <div style={{
                  textAlign: 'center', marginTop: 8,
                  fontSize: 11, color: '#64748b', fontWeight: 600,
                }}>
                  Promedio: <strong style={{ color: '#c0392b' }}>{avgTec.toFixed(1)}/5</strong>
                </div>
              </div>

              {/* Radar técnica */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RadarSVG
                  labels={itemsDemarc}
                  values={tecValues}
                  max={5}
                  colorStart="#1a3a6b"
                  colorEnd="#c0392b"
                  size={150}
                  pad={80}
                />
              </div>
            </div>
          </SectionCard>
          </div>
        </div>

        {/* ── Evaluación final ──── */}
        <SectionCard title={`Evaluación Final · ${fechaUltima}`} blockId="final">
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Valoración General</div>
              <div style={{ fontSize: 28, color: '#fbbf24', letterSpacing: 3, lineHeight: 1 }}>
                {'★'.repeat(ficha.valoracionGeneral ?? 0)}
                <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - (ficha.valoracionGeneral ?? 0))}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Propuesta</div>
              <div
                data-pdf-pill={propStyle.color}
                data-pdf-pill-bg={propStyle.bg}
                data-pdf-pill-border={propStyle.border}
                style={{
                  display: 'inline-block',
                  background: propStyle.bg, color: propStyle.color,
                  border: `2px solid ${propStyle.border}`,
                  lineHeight: 1,
                  paddingTop: 5, paddingBottom: 5,
                  paddingLeft: 14, paddingRight: 14,
                  borderRadius: 20, fontWeight: 900, fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                {ficha.propuesta}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Fecha Registro</div>
              <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                {new Date(ficha.creadoEn).toLocaleDateString('es-ES', { dateStyle: 'long' })}
              </div>
            </div>
          </div>

        </SectionCard>

        {/* Los textos van como bloques sueltos (no dentro de la tarjeta) para que la
            paginación pueda repartirlos y no deje media página vacía cuando son largos. */}
        {ficha.descripcionJugadora && (
          <TextBlock blockId="txt-descripcion" label="Descripción de la Jugadora" text={ficha.descripcionJugadora} />
        )}
        {ficha.observaciones && (
          <TextBlock blockId="txt-observaciones" label="Observaciones" text={ficha.observaciones} />
        )}
        {ficha.cierre && (
          <TextBlock blockId="txt-cierre" label="Cierre" text={ficha.cierre} />
        )}

        {/* ── Historial de observaciones ──── */}
        {valoraciones.length > 0 && (
          <SectionCard blockId="historial" title={`Historial de Observaciones · ${ficha.nombre} ${ficha.primerApellido} ${ficha.segundoApellido} · ${edadTexto} · ${clubNombre}`}>
            {valoracionesAsc.length >= 2 && <EvolucionChart valoraciones={valoracionesAsc} />}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  {['Fecha', 'Partido', 'Categoría', 'Observador', 'Físico', 'Técnica', 'Valoración', 'Propuesta'].map((h) => (
                    <th key={h} style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 9 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {valoraciones.map((v, idx) => {
                  const obsNom = observadores.find((o) => o.id === v.observador)?.nombre ?? v.observador
                  const propColors: Record<string, { bg: string; color: string }> = {
                    'SELECCIÓN':  { bg: '#dcfce7', color: '#166534' },
                    'INCORPORAR': { bg: '#dbeafe', color: '#1e40af' },
                    'SEGUIR':     { bg: '#fef9c3', color: '#854d0e' },
                    'DESCARTAR':  { bg: '#fee2e2', color: '#991b1b' },
                  }
                  const pc = propColors[v.propuesta] ?? { bg: '#f1f5f9', color: '#475569' }
                  const isCurrent = v.id === currentValoracionId
                  return (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', background: isCurrent ? '#eff6ff' : idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '5px 8px', color: '#374151', whiteSpace: 'nowrap' }}>
                        {new Date(v.fechaPartido).toLocaleDateString('es-ES')}
                      </td>
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: '#1e293b' }}>
                        {v.local} <span style={{ color: '#94a3b8', fontWeight: 400 }}>vs</span> {v.visitante}
                      </td>
                      <td style={{ padding: '5px 6px', color: '#64748b', whiteSpace: 'nowrap' }}>{v.categoria}</td>
                      <td style={{ padding: '5px 6px', color: '#64748b', whiteSpace: 'nowrap' }}>{obsNom}</td>
                      <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', fontWeight: 800, color: '#1a3a6b' }}>
                        {mediaFisica(v).toFixed(1)}<span style={{ fontSize: 8.5, fontWeight: 400, color: '#9ca3af' }}>/10</span>
                      </td>
                      <td style={{ padding: '5px 6px', whiteSpace: 'nowrap', fontWeight: 800, color: '#c0392b' }}>
                        {mediaTecnica(v).toFixed(1)}<span style={{ fontSize: 8.5, fontWeight: 400, color: '#9ca3af' }}>/5</span>
                      </td>
                      <td style={{ padding: '5px 6px', color: '#f59e0b', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {'★'.repeat(v.valoracionGeneral ?? 0)}
                        <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - (v.valoracionGeneral ?? 0))}</span>
                      </td>
                      <td style={{ padding: '5px 6px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: pc.bg,
                            color: pc.color,
                            lineHeight: '1.2',
                            padding: '3px 9px',
                            borderRadius: 20,
                            fontWeight: 800,
                            fontSize: 9.5,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {v.propuesta}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </SectionCard>
        )}

        {/* ── Footer ──── */}
        <div data-pdf-block="footer" style={{
          borderTop: '1px solid #e2e8f0', paddingTop: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>
            RFPAF · Sistema de Scouting · Real Federación de Fútbol del Principado de Asturias
          </span>
          <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
            Generado el {new Date().toLocaleDateString('es-ES')}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────── */

function mediaFisica(v: Valoracion): number {
  return ((v.fuerza ?? 0) + (v.velocidad ?? 0) + (v.resistencia ?? 0)) / 3
}

function mediaTecnica(v: Valoracion): number {
  const t = v.evaluacionTecnica
  if (!t) return 0
  return ((t.item1 ?? 0) + (t.item2 ?? 0) + (t.item3 ?? 0) + (t.item4 ?? 0) + (t.item5 ?? 0) + (t.item6 ?? 0)) / 6
}

// Evolución de la jugadora entre los partidos observados. Las tres métricas se
// normalizan a % sobre su propio máximo (valoración /5, físico /10, técnica /5)
// para poder compararlas en el mismo eje.
function EvolucionChart({ valoraciones }: { valoraciones: Valoracion[] }) {
  const W = 710, H = 132
  const padL = 32, padR = 14, padT = 28, padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = valoraciones.length
  const x = (i: number) => (n === 1 ? padL + innerW / 2 : padL + (i * innerW) / (n - 1))
  const y = (pct: number) => padT + (1 - Math.max(0, Math.min(1, pct))) * innerH

  const series = [
    { label: 'Valoración', color: '#f59e0b', pct: (v: Valoracion) => (v.valoracionGeneral ?? 0) / 5 },
    { label: 'Físico', color: '#1a3a6b', pct: (v: Valoracion) => mediaFisica(v) / 10 },
    { label: 'Técnica', color: '#c0392b', pct: (v: Valoracion) => mediaTecnica(v) / 5 },
  ]

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>
        Evolución entre partidos
      </div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize={8} fill="#94a3b8">{Math.round(g * 100)}%</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              points={valoraciones.map((v, i) => `${x(i)},${y(s.pct(v))}`).join(' ')}
              fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            />
            {valoraciones.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(s.pct(v))} r={3.2} fill="#ffffff" stroke={s.color} strokeWidth={2} />
            ))}
          </g>
        ))}
        {valoraciones.map((v, i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={8.5} fill="#64748b">
            {new Date(v.fechaPartido).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
          </text>
        ))}
        {series.map((s, i) => (
          <g key={`leg-${s.label}`}>
            <rect x={padL + i * 108} y={7} width={9} height={9} rx={2} fill={s.color} />
            <text x={padL + i * 108 + 14} y={15} fontSize={9} fontWeight={700} fill="#475569">{s.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function SectionCard({ title, children, style, blockId }: { title: string; children: React.ReactNode; style?: React.CSSProperties; blockId?: string }) {
  return (
    <div data-pdf-block={blockId} style={{
      border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>
      <div style={{
        background: 'linear-gradient(90deg, #1a3a6b, #2e4d8f)',
        padding: '6px 12px',
        fontSize: 11.5, fontWeight: 800, color: 'white', letterSpacing: 0.3,
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {title}
      </div>
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

function DataTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '3px 0', fontSize: 11, color: '#6b7280', fontWeight: 500, width: '50%' }}>{label}</td>
            <td style={{ padding: '3px 0', fontSize: 11, fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{value || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TextBlock({ label, text, blockId }: { label: string; text: string; blockId?: string }) {
  return (
    <div data-pdf-block={blockId} style={{ marginTop: blockId ? 0 : 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{ fontSize: 11.5, color: '#374151', background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
        {text}
      </div>
    </div>
  )
}
