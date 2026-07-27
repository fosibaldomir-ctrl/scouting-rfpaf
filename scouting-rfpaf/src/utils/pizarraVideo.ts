// Codifica una secuencia de fotogramas (canvases ya rasterizados) a un vídeo
// .webm. La rasterización (lenta, con html2canvas) se hace ANTES en el llamante;
// aquí los fotogramas se reproducen a intervalos regulares mientras MediaRecorder
// graba, de modo que el vídeo sale fluido aunque el rasterizado no lo fuera.

export function soportaGrabacionVideo(): boolean {
  return typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

export async function codificarFotogramasWebm(
  frames: HTMLCanvasElement[],
  width: number,
  height: number,
  fps = 20,
): Promise<Blob> {
  if (frames.length === 0) throw new Error('No hay fotogramas que codificar')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(0)
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'
  const recorder = new MediaRecorder(stream, { mimeType: mime })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
  })

  recorder.start()
  const frameMs = 1000 / fps
  for (const frame of frames) {
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(frame, 0, 0, width, height)
    // Empuja este fotograma al stream con temporización regular.
    if (typeof track.requestFrame === 'function') track.requestFrame()
    await new Promise(r => setTimeout(r, frameMs))
  }
  // Deja el último fotograma un momento y cierra.
  await new Promise(r => setTimeout(r, 300))
  recorder.stop()
  return done
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
