import { FORMATION_PRESETS } from '../../utils/tactics'
import type { Informe, PartidoInforme, EvaluacionJugadora, FormacionFutbol } from '../../types'

interface Props {
  informe: Informe
  partidos: PartidoInforme[]
  evaluacionesByPartido: Record<string, EvaluacionJugadora[]>
}

const CONDICION_LABEL: Record<string, string> = {
  soleado: 'Soleado', nublado: 'Nublado', lluvia: 'Lluvia', tormenta: 'Tormenta',
}

function fmtFecha(f: string): string {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return y && m && d ? `${d}/${m}/${y}` : f
}

function Pill({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 14px', borderRadius: 999,
      background: bg, color, fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase',
    }}>
      {children}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px 0' }}>
      {children}
    </h3>
  )
}

function Escudo({ url, size = 44 }: { url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} style={{ display: 'block', width: size, height: size, objectFit: 'contain', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f3f4f6' }} />
  }
  return <div style={{ width: size, height: size, borderRadius: 10, background: '#f3f4f6', border: '1px solid #e5e7eb', flexShrink: 0 }} />
}

function MiniPitch({ titulares, sistemaRival }: { titulares: PartidoInforme['alineacionTitulares']; sistemaRival: string }) {
  const preset = sistemaRival ? FORMATION_PRESETS[sistemaRival as FormacionFutbol] : null
  const W = 260; const H = Math.round(W * 105 / 68)
  return (
    <div style={{ position: 'relative', width: W, height: H, background: '#2d6a27', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 6, border: '1px solid rgba(255,255,255,0.4)' }} />
      <div style={{ position: 'absolute', left: 6, right: 6, top: '50%', borderTop: '1px solid rgba(255,255,255,0.4)' }} />
      {preset?.map((pos, i) => (
        <div key={`r-${i}`} style={{
          position: 'absolute', left: `${pos.x}%`, top: `${100 - pos.y}%`, transform: 'translate(-50%,-50%)',
          width: 20, height: 20, borderRadius: '50%', background: '#c0392b', border: '1.5px solid white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white',
        }}>
          {i + 1}
        </div>
      ))}
      {titulares.map((t) => (
        <div key={t.uid} style={{ position: 'absolute', left: `${t.posX}%`, top: `${t.posY}%`, transform: 'translate(-50%,-50%)', width: 22, height: 22 }}>
          {t.foto ? (
            <img src={t.foto} style={{ display: 'block', width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1a3a6b' }} />
          ) : (
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: 'white', border: '2px solid #1a3a6b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#1a3a6b',
            }}>
              {t.numero}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#1a3a6b' }}>{value}</div>
    </div>
  )
}

function EvaluacionCard({ ev }: { ev: EvaluacionJugadora }) {
  return (
    <div style={{ display: 'flex', gap: 10, border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: 'white' }}>
      {ev.fotoUrl ? (
        <img src={ev.fotoUrl} style={{ display: 'block', width: 48, height: 48, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f3f4f6', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#1a3a6b', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {ev.dorsal ?? '–'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{ev.nombre} {ev.apellidos}</span>
        </div>
        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6 }}>
          {ev.lateralidad || '—'} · {ev.clubNombre || '—'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <StatBox label="MIN" value={ev.minutos} />
          <StatBox label="G" value={ev.goles} />
          <StatBox label="A" value={ev.asistencias} />
          <StatBox label="TA" value={ev.tarjetasAmarillas} />
          <StatBox label="TR" value={ev.tarjetasRojas} />
          <StatBox label="VAL" value={ev.valoracion === null ? 'SC' : ev.valoracion} />
        </div>
        {ev.comentario && (
          <p style={{ fontSize: 9.5, color: '#475569', lineHeight: 1.5, margin: 0 }}>{ev.comentario}</p>
        )}
      </div>
    </div>
  )
}

export default function InformePDFTemplate({ informe, partidos, evaluacionesByPartido }: Props) {
  return (
    <div style={{ width: '794px', fontFamily: 'system-ui, -apple-system, Arial, sans-serif', background: '#ffffff', color: '#1e293b', lineHeight: 1.4 }}>

      {/* Header / portada */}
      <div data-pdf-block="header" style={{
        background: 'linear-gradient(135deg, #1a3a6b 0%, #2e4d8f 60%, #c0392b 100%)',
        padding: '40px 32px', color: 'white',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8, marginBottom: 10 }}>
          Informe General
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 14px 0', lineHeight: 1.2 }}>{informe.titulo || 'Informe'}</h1>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, fontWeight: 600, opacity: 0.9 }}>
          <span>{informe.autor || '—'}</span>
          <span>·</span>
          <span>{fmtFecha(informe.fecha)}</span>
        </div>
      </div>

      {partidos.map((p) => {
        const evaluaciones = evaluacionesByPartido[p.id] ?? []
        return (
          <div key={p.id} style={{ padding: '0 28px' }}>

            {/* Match header */}
            <div data-pdf-block={`match-${p.id}`} style={{ padding: '24px 0 8px 0' }}>
              <Pill bg="#1a3a6b1a" color="#1a3a6b">Jornada {p.jornada}</Pill>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 14 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, margin: '0 auto 6px', borderRadius: 10, background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>RFPAF</div>
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#1e293b' }}>{p.resultadoLocal} – {p.resultadoVisitante}</div>
                <div style={{ textAlign: 'center' }}>
                  <Escudo url={p.rivalEscudoUrl} />
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginTop: 6 }}>{p.rivalNombre}</div>
                </div>
              </div>
            </div>

            {/* Datos del partido */}
            <div data-pdf-block={`datos-${p.id}`} style={{ padding: '18px 0', borderTop: '1px solid #e5e7eb' }}>
              <SectionTitle>Datos del Partido</SectionTitle>
              <div style={{ display: 'flex', gap: 24, fontSize: 11 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6 }}><b>Fecha:</b> {fmtFecha(p.fechaPartido)} {p.horaPartido && `— ${p.horaPartido}`}</div>
                  <div style={{ marginBottom: 6 }}><b>Campo:</b> {p.campoNombre || '—'}</div>
                  <div><b>Condiciones:</b> {CONDICION_LABEL[p.condiciones] ?? p.condiciones}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {p.equipacionLocalUrl && <img src={p.equipacionLocalUrl} style={{ width: 60, height: 60, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 8 }} />}
                  {p.equipacionVisitanteUrl && <img src={p.equipacionVisitanteUrl} style={{ width: 60, height: 60, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 8 }} />}
                </div>
              </div>
            </div>

            {/* Alineaciones */}
            <div data-pdf-block={`alineacion-${p.id}`} style={{ padding: '18px 0', borderTop: '1px solid #e5e7eb' }}>
              <SectionTitle>Alineaciones {p.sistema && `— ${p.sistema}`}{p.sistemaRival && ` vs ${p.sistemaRival}`}</SectionTitle>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <MiniPitch titulares={p.alineacionTitulares} sistemaRival={p.sistemaRival} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#1a3a6b', marginBottom: 6, textTransform: 'uppercase' }}>Titulares</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {p.alineacionTitulares.map((t) => (
                      <span key={t.uid} style={{ fontSize: 9.5, background: '#f0f7ff', color: '#1a3a6b', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {t.numero} {t.nombre}
                      </span>
                    ))}
                  </div>
                  {p.alineacionSuplentes.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Suplentes</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {p.alineacionSuplentes.map((s) => (
                          <span key={s.uid} style={{ fontSize: 9.5, background: '#f8fafc', color: '#475569', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                            {s.numero} {s.nombre}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Plan de partido */}
            {(p.planOfensivo.explicacion || p.planOfensivo.imagenUrl || p.planDefensivo.explicacion || p.planDefensivo.imagenUrl) && (
              <div data-pdf-block={`plan-${p.id}`} style={{ padding: '18px 0', borderTop: '1px solid #e5e7eb' }}>
                <SectionTitle>Plan de Partido</SectionTitle>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#1a3a6b', marginBottom: 6, textTransform: 'uppercase' }}>Fase Ofensiva</div>
                    {p.planOfensivo.explicacion && <p style={{ fontSize: 10, color: '#475569', margin: '0 0 8px 0', lineHeight: 1.5 }}>{p.planOfensivo.explicacion}</p>}
                    {p.planOfensivo.imagenUrl && <img src={p.planOfensivo.imagenUrl} style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#c0392b', marginBottom: 6, textTransform: 'uppercase' }}>Fase Defensiva</div>
                    {p.planDefensivo.explicacion && <p style={{ fontSize: 10, color: '#475569', margin: '0 0 8px 0', lineHeight: 1.5 }}>{p.planDefensivo.explicacion}</p>}
                    {p.planDefensivo.imagenUrl && <img src={p.planDefensivo.imagenUrl} style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />}
                  </div>
                </div>
              </div>
            )}

            {/* Valoraciones individuales */}
            {evaluaciones.length > 0 && (
              <div style={{ padding: '18px 0', borderTop: '1px solid #e5e7eb' }}>
                <div data-pdf-block={`val-title-${p.id}`}>
                  <SectionTitle>Valoración Individual</SectionTitle>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {evaluaciones.map((ev) => (
                    <div key={ev.id} data-pdf-block={`val-${ev.id}`}>
                      <EvaluacionCard ev={ev} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Conclusiones */}
      {informe.conclusiones && (
        <div data-pdf-block="conclusiones" style={{ padding: '24px 28px', background: '#f8fafc', marginTop: 12 }}>
          <SectionTitle>Conclusiones Generales</SectionTitle>
          <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{informe.conclusiones}</p>
        </div>
      )}

      <div data-pdf-block="footer" style={{ padding: '16px 28px', fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
        STAFF LAB · Real Federación de Fútbol del Principado de Asturias
      </div>
    </div>
  )
}
