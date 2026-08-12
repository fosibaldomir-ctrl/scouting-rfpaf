/* Copia los datos y los ficheros del proyecto Supabase de origen al nuevo.
 *
 * Se ejecuta UNA sola vez, cuando el proyecto nuevo ya tiene el esquema puesto
 * (el paso 01). No borra nada en el origen: solo lee.
 *
 * Uso:
 *   npm install @supabase/supabase-js
 *   ORIGEN_URL=https://xxxx.supabase.co ORIGEN_KEY=<service_role del origen> \
 *   DESTINO_URL=https://yyyy.supabase.co DESTINO_KEY=<service_role del destino> \
 *   node 02-copiar-datos.mjs
 *
 * Las claves service_role son las llaves maestras de cada proyecto: se pasan por
 * línea de comandos y NO se guardan en ningún fichero ni se suben al repositorio.
 */
import { createClient } from '@supabase/supabase-js'

const { ORIGEN_URL, ORIGEN_KEY, DESTINO_URL, DESTINO_KEY } = process.env
if (!ORIGEN_URL || !ORIGEN_KEY || !DESTINO_URL || !DESTINO_KEY) {
  console.error('Faltan variables. Revisa el ejemplo de uso en la cabecera de este fichero.')
  process.exit(1)
}
if (ORIGEN_URL === DESTINO_URL) {
  console.error('El origen y el destino son el mismo proyecto. Abortado.')
  process.exit(1)
}

const opciones = { auth: { persistSession: false, autoRefreshToken: false } }
const origen = createClient(ORIGEN_URL, ORIGEN_KEY, opciones)
const destino = createClient(DESTINO_URL, DESTINO_KEY, opciones)

/* Orden que respeta las claves foráneas: los padres antes que los hijos.
 * `profiles` queda fuera a propósito: cuelga de las cuentas de acceso, que se
 * crean nuevas en el proyecto destino. */
const TABLAS = [
  'clubes',
  'categorias',
  'observadores',
  'fichas',
  'calendario_partidos',
  'convocatorias',
  'ejercicios',
  'videos_sesiones',
  'eventos_calendario',
  'objetivos_individuales',
  'historial_acciones',      // depende de objetivos_individuales
  'analisis_partidos',
  'abp_acciones',            // depende de analisis_partidos
  'informes',
  'informe_partidos',        // depende de informes
  'informe_evaluaciones',    // depende de informe_partidos
  'competicion_mapeos',
  'actas_procesadas',        // depende de competicion_mapeos
  'sync_runs',
]

const BUCKETS = ['analisis-archivos', 'informes-archivos', 'convocatorias-pdfs', 'ejercicios']

const PAGINA = 100   // filas que se leen de golpe
const LOTE = 5       // filas que se escriben de golpe (hay filas con imágenes muy pesadas)

let fallos = 0

async function copiarTabla(tabla) {
  let desde = 0, total = 0, escritas = 0
  for (;;) {
    const { data, error } = await origen.from(tabla).select('*').range(desde, desde + PAGINA - 1)
    if (error) { console.log(`  ✖ ${tabla}: no se puede leer — ${error.message}`); fallos++; return }
    if (!data || data.length === 0) break
    total += data.length

    for (let i = 0; i < data.length; i += LOTE) {
      const lote = data.slice(i, i + LOTE)
      const { error: e } = await destino.from(tabla).upsert(lote, { onConflict: 'id' })
      if (e) {
        // Si el lote falla (suele ser por tamaño), se reintenta fila a fila
        for (const fila of lote) {
          const { error: e2 } = await destino.from(tabla).upsert(fila, { onConflict: 'id' })
          if (e2) { console.log(`  ✖ ${tabla} fila ${fila.id}: ${e2.message}`); fallos++ }
          else escritas++
        }
      } else escritas += lote.length
    }

    if (data.length < PAGINA) break
    desde += PAGINA
  }
  const marca = escritas === total ? '✔' : '⚠'
  console.log(`  ${marca} ${tabla}: ${escritas}/${total} filas`)
}

async function copiarBucket(bucket) {
  // Asegurar que el bucket existe en destino (el esquema ya debería haberlo creado)
  const { data: existentes } = await destino.storage.listBuckets()
  if (!existentes?.some(b => b.name === bucket)) {
    const { error } = await destino.storage.createBucket(bucket, { public: true })
    if (error && !/already exists/i.test(error.message)) {
      console.log(`  ✖ ${bucket}: no se puede crear — ${error.message}`); fallos++; return
    }
  }

  // Los ficheros pueden estar en subcarpetas: se recorre en profundidad
  const rutas = []
  async function recorrer(prefijo) {
    const { data, error } = await origen.storage.from(bucket).list(prefijo, { limit: 1000 })
    if (error) { console.log(`  ✖ ${bucket}: ${error.message}`); fallos++; return }
    for (const item of data ?? []) {
      const ruta = prefijo ? `${prefijo}/${item.name}` : item.name
      if (item.id === null) await recorrer(ruta)   // es una carpeta
      else rutas.push(ruta)
    }
  }
  await recorrer('')

  let copiados = 0
  for (const ruta of rutas) {
    const { data: blob, error } = await origen.storage.from(bucket).download(ruta)
    if (error) { console.log(`  ✖ ${bucket}/${ruta}: ${error.message}`); fallos++; continue }
    const buf = Buffer.from(await blob.arrayBuffer())
    const { error: e } = await destino.storage.from(bucket).upload(ruta, buf, {
      contentType: blob.type || 'application/octet-stream',
      upsert: true,
    })
    if (e) { console.log(`  ✖ ${bucket}/${ruta}: ${e.message}`); fallos++ }
    else copiados++
  }
  console.log(`  ${copiados === rutas.length ? '✔' : '⚠'} ${bucket}: ${copiados}/${rutas.length} ficheros`)
}

console.log(`\nCopiando de ${ORIGEN_URL}\n           a ${DESTINO_URL}\n`)
console.log('Tablas:')
for (const t of TABLAS) await copiarTabla(t)
console.log('\nFicheros:')
for (const b of BUCKETS) await copiarBucket(b)

console.log(fallos === 0
  ? '\n✅ Copia terminada sin errores.'
  : `\n⚠ Copia terminada con ${fallos} fallo(s). Revisa las líneas marcadas con ✖ arriba.`)

/* Aviso: los enlaces a ficheros guardados en las tablas (imagen_url, pdf_url,
 * video_url…) apuntan al dominio del proyecto de ORIGEN. El paso 03 los reescribe
 * para que apunten al nuevo. */
