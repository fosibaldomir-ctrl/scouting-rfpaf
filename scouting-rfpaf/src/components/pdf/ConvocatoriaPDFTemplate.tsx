import type { Convocatoria, JugadoraConvocada } from '../../types'

interface Props {
  convocatoria: Convocatoria
  clubEscudos: Record<string, string | null | undefined>
}

function formatFecha(fecha: string) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

function PlayerRow({ j, index, clubEscudo }: { j: JugadoraConvocada; index: number; clubEscudo?: string | null }) {
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#6b7280', fontWeight: 600, textAlign: 'center', width: 36 }}>
        {index + 1}
      </td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {j.foto ? (
            <img
              src={j.foto}
              alt={j.nombre}
              style={{ width: 32, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0, border: '1px solid #e5e7eb' }}
            />
          ) : (
            <div style={{
              width: 32, height: 40, borderRadius: 4, flexShrink: 0,
              background: '#e5e7eb', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#9ca3af',
            }}>
              {j.nombre?.charAt(0)}{j.primerApellido?.charAt(0)}
            </div>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            {j.nombre} {j.primerApellido} {j.segundoApellido}
          </span>
        </div>
      </td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#374151', textAlign: 'center' }}>
        {formatFecha(j.fechaNacimiento)}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: '#374151', textAlign: 'center' }}>
        {calcularEdad(j.fechaNacimiento)} años
      </td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {clubEscudo && (
            <img src={clubEscudo} alt={j.clubNombre} style={{ width: 20, height: 26, objectFit: 'contain' }} />
          )}
          <span style={{ fontSize: 13, color: '#374151' }}>{j.clubNombre || '—'}</span>
        </div>
      </td>
    </tr>
  )
}

export default function ConvocatoriaPDFTemplate({ convocatoria, clubEscudos }: Props) {
  return (
    <div style={{ width: 794, fontFamily: 'Arial, sans-serif', background: '#ffffff', padding: 0 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)',
        padding: '24px 40px',
        color: '#ffffff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          {/* Logo + texto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
            <img
              src="https://files.asturfutbol.es/pnfg/img/web_responsive_2/ESP/logo(rffpa).png"
              alt="RFPAF"
              crossOrigin="anonymous"
              style={{ width: 72, height: 90, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}
            />
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.75 }}>
                Real Federación de Fútbol · Principado de Asturias
              </p>
              <h1 style={{ margin: '5px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: 1 }}>
                CONVOCATORIA
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 15, opacity: 0.9, fontWeight: 500 }}>
                {convocatoria.nombre}
              </p>
            </div>
          </div>
          {/* Fecha / Hora */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '12px 22px',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              <p style={{ margin: 0, fontSize: 10, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1 }}>Fecha</p>
              <p style={{ margin: '3px 0 0', fontSize: 19, fontWeight: 700 }}>
                {formatFecha(convocatoria.fecha)}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, opacity: 0.9 }}>
                {convocatoria.hora} h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Players count badge */}
      <div style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', padding: '12px 40px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: '#1a3a6b', color: '#fff',
          borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
        }}>
          {convocatoria.jugadoras.length} / 22 jugadoras
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
          Generado el {new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}
        </p>
      </div>

      {/* Table */}
      <div style={{ padding: '0 40px 40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', width: 36 }}>#</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>Jugadora</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>F. Nacimiento</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>Edad</th>
              <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left' }}>Club Actual</th>
            </tr>
          </thead>
          <tbody>
            {convocatoria.jugadoras.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  Sin jugadoras convocadas.
                </td>
              </tr>
            ) : (
              convocatoria.jugadoras.map((j, i) => (
                <PlayerRow
                  key={j.fichaId}
                  j={j}
                  index={i}
                  clubEscudo={clubEscudos[j.clubId]}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '2px solid #e2e8f0',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8fafc',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>STAFF LAB · Real Federación de Fútbol del Principado de Asturias</p>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Documento confidencial</p>
      </div>
    </div>
  )
}
