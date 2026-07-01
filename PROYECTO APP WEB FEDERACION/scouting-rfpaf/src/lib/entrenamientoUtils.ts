import type { Sesion } from '../types'

/* URL Embedding Helper */
export function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
  return url
}

/* PDF Export */
export async function exportSesionPDF(sesion: Sesion) {
  const { default: html2pdf } = await import('html2pdf.js')

  const el = document.createElement('div')
  el.style.cssText = 'font-family:Arial,sans-serif;padding:20px;color:#111;background:#fff;max-width:800px'

  const h2Style = 'font-size:13px;color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;margin-top:0'

  const ejerciciosHTML = sesion.ejercicios.length > 0
    ? `<div style="margin-bottom:16px">
        <h2 style="${h2Style}">Ejercicios de la Sesión</h2>
        ${sesion.ejercicios.map(ej => `
          <div style="border:1px solid #dbeafe;border-radius:8px;overflow:hidden;margin-bottom:12px;page-break-inside:avoid">
            <div style="background:#eff6ff;padding:7px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #dbeafe">
              <span style="background:#1e40af;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-block;line-height:22px;text-align:center;font-weight:800;font-size:11px;flex-shrink:0;vertical-align:middle">${ej.orden}</span>
              <span style="font-weight:700;color:#1e293b;font-size:12px">${ej.tipo||'Ejercicio'}</span>
              <span style="margin-left:auto;font-size:10px;color:#64748b">
                ${ej.duracion?`${ej.duracion} min`:''}${ej.duracion&&ej.numJugadores?' · ':''}${ej.numJugadores?`${ej.numJugadores} jugadoras`:''}
              </span>
            </div>
            <div style="display:flex;min-height:90px">
              ${ej.imagen
                ? `<img src="${ej.imagen}" style="width:42%;object-fit:cover;flex-shrink:0;border-right:1px solid #e2e8f0;display:block"/>`
                : `<div style="width:42%;flex-shrink:0;background:#f8fafc;border-right:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:10px">Sin imagen</div>`}
              <div style="flex:1;padding:10px 12px">
                ${ej.material?`<div style="font-size:9.5px;color:#64748b;margin-bottom:5px;display:flex;gap:4px;align-items:center">Material: <strong>${ej.material}</strong></div>`:''}
                ${ej.descripcion?`<p style="font-size:11px;color:#374151;line-height:1.55;margin:0">${ej.descripcion}</p>`:''}
              </div>
            </div>
          </div>`).join('')}
      </div>`
    : ''

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:16px">
      <div style="flex:1">
        <h1 style="font-size:18px;font-weight:800;color:#1e40af;margin:0;text-transform:uppercase;letter-spacing:1px">Sesión de Entrenamiento</h1>
        <p style="font-size:11px;color:#6b7280;margin:4px 0 0">Real Federación de Fútbol del Principado de Asturias</p>
        ${sesion.numConvocatoria ? `<div style="display:inline-block;margin-top:6px;background:#1e40af;color:#fff;border-radius:6px;padding:3px 12px;font-size:12px;font-weight:700">Convocatoria Nº ${sesion.numConvocatoria}</div>` : ''}
      </div>
      <img src="https://files.asturfutbol.es/pnfg/img/web_responsive_2/ESP/logo(rffpa).png"
        alt="RFPAF" style="height:72px;width:auto;object-fit:contain;flex-shrink:0;margin-left:16px"/>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      ${[
        ['Fecha', sesion.fecha],
        ['Hora', sesion.hora],
        ['Campo', sesion.campo],
        ['Fase', sesion.fase],
        ['Entrenador/a', sesion.entrenador],
        ['Jugadoras convocadas', sesion.numJugadorasConvocadas],
      ].map(([k,v])=>`
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">${k}</div>
          <div style="font-size:12px;font-weight:600;color:#1e293b;margin-top:2px">${v||'—'}</div>
        </div>`).join('')}
    </div>

    ${sesion.objetivos ? `
      <div style="margin-bottom:14px">
        <h2 style="${h2Style}">Objetivos Generales de la Sesión</h2>
        <p style="font-size:12px;color:#374151;line-height:1.6;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin:0">${sesion.objetivos}</p>
      </div>` : ''}

    ${ejerciciosHTML}

    ${sesion.observaciones ? `
      <div style="margin-bottom:14px">
        <h2 style="${h2Style}">Observaciones</h2>
        <p style="font-size:12px;color:#374151;line-height:1.6;white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin:0">${sesion.observaciones}</p>
      </div>` : ''}

    <div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:8px;text-align:center;font-size:9px;color:#9ca3af">
      Documento generado por Staff Lab Scouting · ${new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'long',year:'numeric'})}
    </div>`

  document.body.appendChild(el)
  await html2pdf().set({
    margin:8, filename:`sesion-${sesion.fecha||'entrenamiento'}.pdf`,
    image:{type:'jpeg',quality:0.97}, html2canvas:{scale:2,useCORS:true,logging:false},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
  }).from(el).save()
  document.body.removeChild(el)
}
