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

  // Puntuación media técnica
  const avgTec = tecValues.length ? tecValues.reduce((a, b) => a + b, 0) / tecValues.length : 0
  const avgFis = ((ficha.fuerza ?? 0) + (ficha.velocidad ?? 0) + (ficha.resistencia ?? 0)) / 3

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
          padding: '24px 28px',
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
              `${edad} años`,
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
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Fila 1: Datos personales + Contexto partido ──── */}
        <div data-pdf-block="datos" style={{ display: 'flex', gap: 16 }}>
          <SectionCard title="Datos Personales" style={{ flex: 1 }}>
            <DataTable rows={[
              ['Fecha Nacimiento', new Date(ficha.fechaNacimiento).toLocaleDateString('es-ES')],
              ['Edad', `${edad} años`],
              ['Lateralidad', ficha.lateralidad],
              ['Tipología', ficha.tipologia],
              ['Altura', `${ficha.altura} m`],
              ['Club', clubNombre],
            ]} />
          </SectionCard>
          <SectionCard title="Contexto del Partido" style={{ flex: 1 }}>
            <DataTable rows={[
              ['Fecha', new Date(ficha.fechaPartido).toLocaleDateString('es-ES')],
              ['Equipo observado', ficha.equipo],
              ['Categoría', ficha.categoria],
              ['Local', ficha.local],
              ['Visitante', ficha.visitante],
              ['Observador', obsNombre],
            ]} />
          </SectionCard>
        </div>

        {/* ── Fila 2: Físico + Técnica con sus radares ──── */}
        <div data-pdf-block="fisico-tecnica" style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>

          {/* Físico */}
          <SectionCard title="Cualidades Físicas" style={{ flex: 1 }}>
            {[
              { label: 'Fuerza', value: ficha.fuerza ?? 0, color: '#1a3a6b', max: 10 },
              { label: 'Velocidad', value: ficha.velocidad ?? 0, color: '#c0392b', max: 10 },
              { label: 'Resistencia', value: ficha.resistencia ?? 0, color: '#16a34a', max: 10 },
            ].map(({ label, value, color, max }) => (
              <div key={label} style={{ marginBottom: 10 }}>
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
                size={180}
                pad={44}
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
            style={{ flex: 1.4 }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Barras */}
              <div style={{ flex: 1 }}>
                {itemsDemarc.map((item, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
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
                  Promedio técnico: <strong style={{ color: '#c0392b' }}>{avgTec.toFixed(1)}/5</strong>
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
                  size={290}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Evaluación final ──── */}
        <SectionCard title="Evaluación Final" blockId="final">
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

          {ficha.descripcionJugadora && (
            <TextBlock label="Descripción de la Jugadora" text={ficha.descripcionJugadora} />
          )}
          {ficha.observaciones && (
            <TextBlock label="Observaciones" text={ficha.observaciones} />
          )}
          {ficha.cierre && (
            <TextBlock label="Cierre" text={ficha.cierre} />
          )}
        </SectionCard>

        {/* ── Historial de observaciones ──── */}
        {valoraciones.length > 0 && (
          <SectionCard blockId="historial" title={`Historial de Observaciones · ${ficha.nombre} ${ficha.primerApellido} ${ficha.segundoApellido} · ${edad} años · ${clubNombre}`}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  {['Fecha', 'Partido', 'Categoría', 'Observador', 'Valoración', 'Propuesta'].map((h) => (
                    <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, fontSize: 9.5 }}>
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
                      <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>{v.categoria}</td>
                      <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>{obsNom}</td>
                      <td style={{ padding: '5px 8px', color: '#f59e0b', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {'★'.repeat(v.valoracionGeneral ?? 0)}
                        <span style={{ color: '#e5e7eb' }}>{'★'.repeat(5 - (v.valoracionGeneral ?? 0))}</span>
                      </td>
                      <td style={{ padding: '5px 8px' }}>
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
          borderTop: '1px solid #e2e8f0', paddingTop: 10,
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
        padding: '7px 14px',
        fontSize: 11.5, fontWeight: 800, color: 'white', letterSpacing: 0.3,
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {title}
      </div>
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <td style={{ padding: '4px 0', fontSize: 11, color: '#6b7280', fontWeight: 500, width: '50%' }}>{label}</td>
            <td style={{ padding: '4px 0', fontSize: 11, fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{value || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{ fontSize: 11.5, color: '#374151', background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
        {text}
      </div>
    </div>
  )
}
