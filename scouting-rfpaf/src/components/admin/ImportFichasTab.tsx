import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Upload, Trash2, AlertTriangle, CheckCircle2, Loader2, RefreshCw, FilePlus2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { DEMARCACIONES_ITEMS } from '../../data/masterData'
import { defaultFichaFields } from '../../utils/fichaDefaults'
import { genRegistro } from '../../utils/registro'
import { parseFichasFile, buildImportRows, cabecerasDelUltimoFichero, diagnosticoDelUltimoFichero, type DiagnosticoLectura, type ImportRow } from '../../utils/csvImport'
import type { FichaJugadora } from '../../types'

const ETIQUETA_COLUMNA: Record<string, string> = {
  nombreCompleto: 'nombre de la jugadora',
  apellidos: 'apellidos',
  primerApellido: 'primer apellido',
  segundoApellido: 'segundo apellido',
  fechaNacimiento: 'fecha de nacimiento',
  posicion: 'demarcación',
  dorsal: 'dorsal',
  minutosJugados: 'minutos',
  partidosTitular: 'partidos de titular',
  partidosSuplente: 'partidos de suplente',
  goles: 'goles',
  tarjetasAmarillas: 'tarjetas amarillas',
  tarjetasRojas: 'tarjetas rojas',
}

interface BatchFields {
  categoria: string
  clubId: string
}

export default function ImportFichasTab() {
  const { fichas, addFicha, updateFicha, categorias, clubes } = useStore()

  const [batch, setBatch] = useState<BatchFields>({
    categoria: categorias[0]?.nombre ?? '1ª REF',
    clubId: '',
  })

  const [rows, setRows] = useState<ImportRow[]>([])
  // Cabeceras que traía el fichero cuando no se reconoce ninguna: sin esto, el
  // usuario solo ve filas en blanco y no hay forma de saber qué ha fallado
  const [cabecerasSinReconocer, setCabecerasSinReconocer] = useState<string[]>([])
  const [sinFilas, setSinFilas] = useState(false)
  // Qué ha entendido la app del fichero. Se enseña siempre: si algo no encaja,
  // se ve de un vistazo sin tener que abrir la consola ni adivinar
  const [diagnostico, setDiagnostico] = useState<DiagnosticoLectura | null>(null)
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; motivos: string[] } | null>(null)

  const clubNombre = clubes.find((c) => c.id === batch.clubId)?.nombre ?? ''

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!batch.clubId) { alert('Selecciona primero el club de la plantilla que vas a importar.'); e.target.value = ''; return }
    setParsing(true)
    setResult(null)
    setCabecerasSinReconocer([])
    setSinFilas(false)
    setDiagnostico(null)
    try {
      const raw = await parseFichasFile(file)
      const filas = buildImportRows(raw, batch.clubId, fichas)
      // Si ninguna fila trae nombre, el fichero se ha leído pero sus columnas
      // no se han entendido
      // Dos casos que hay que explicar: que no salga ninguna fila, o que salgan
      // pero todas en blanco porque no se han entendido las columnas
      const ningunNombre = filas.length > 0 && filas.every((f) => !f.nombre && !f.primerApellido)
      setCabecerasSinReconocer(ningunNombre || filas.length === 0 ? cabecerasDelUltimoFichero() : [])
      setSinFilas(filas.length === 0)
      setDiagnostico(diagnosticoDelUltimoFichero())
      setRows(filas)
      setFileName(file.name)
    } catch (err) {
      console.error('Error al leer el archivo:', err)
      alert('No se ha podido leer el archivo. Comprueba que sea un CSV o Excel válido.')
    } finally {
      setParsing(false)
      e.target.value = ''
    }
  }

  const updateRow = (rowIndex: number, patch: Partial<ImportRow>) => {
    setRows((prev) => prev.map((r) => (r.rowIndex === rowIndex ? { ...r, ...patch } : r)))
  }

  const removeRow = (rowIndex: number) => {
    setRows((prev) => prev.filter((r) => r.rowIndex !== rowIndex))
  }

  const includedRows = rows.filter((r) => r.included)
  const includedCount = includedRows.length
  const updateCount = includedRows.filter((r) => r.action === 'update' && r.matchingFichaIds.length > 0).length
  const createCount = includedCount - updateCount

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.included)
    if (toImport.length === 0) return
    if (!batch.clubId) { alert('Selecciona el club de la plantilla.'); return }

    setImporting(true)
    setProgress({ done: 0, total: toImport.length })
    let created = 0
    let updated = 0
    let failed = 0
    const motivos: string[] = []
    let fichasCount = fichas.length

    for (const row of toImport) {
      try {
        if (row.action === 'update' && row.matchingFichaIds.length > 0) {
          const statsPatch = {
            minutosJugados: row.minutosJugados,
            partidosTitular: row.partidosTitular,
            partidosSuplente: row.partidosSuplente,
            goles: row.goles,
            tarjetasAmarillas: row.tarjetasAmarillas,
            tarjetasRojas: row.tarjetasRojas,
          }
          for (const fichaId of row.matchingFichaIds) {
            await updateFicha(fichaId, statsPatch)
          }
          updated++
        } else {
          const now = new Date().toISOString()
          const ficha: FichaJugadora = {
            ...defaultFichaFields(),
            fechaPartido: now.split('T')[0],
            categoria: batch.categoria as FichaJugadora['categoria'],
            observador: '',
            equipo: clubNombre,
            local: '',
            visitante: '',
            nombre: row.nombre,
            primerApellido: row.primerApellido,
            segundoApellido: row.segundoApellido,
            fechaNacimiento: row.fechaNacimiento,
            dorsal: row.dorsal,
            club: batch.clubId,
            categoriaEquipo: batch.categoria,
            demarcacion: (row.demarcacion || 'CENTRAL') as FichaJugadora['demarcacion'],
            minutosJugados: row.minutosJugados,
            partidosTitular: row.partidosTitular,
            partidosSuplente: row.partidosSuplente,
            goles: row.goles,
            tarjetasAmarillas: row.tarjetasAmarillas,
            tarjetasRojas: row.tarjetasRojas,
            id: uuidv4(),
            registro: genRegistro(clubNombre, fichasCount),
            creadoEn: now,
            actualizadoEn: now,
          } as FichaJugadora
          await addFicha(ficha)
          fichasCount++
          created++
        }
        removeRow(row.rowIndex)
      } catch (err) {
        console.error(`Error al importar fila ${row.rowIndex}:`, err)
        failed++
        // Guardamos el motivo para poder enseñarlo: mandar a la consola a quien
        // usa la app es como no avisar
        const motivo = `${row.nombre} ${row.primerApellido}: ${err instanceof Error ? err.message : 'error desconocido'}`
        if (!motivos.includes(motivo)) motivos.push(motivo)
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setImporting(false)
    setResult({ created, updated, failed, motivos })
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-700">Importar plantilla desde CSV/Excel</h2>
        <p className="text-xs text-gray-500 mt-1">
          Crea una ficha por jugadora de la plantilla del club elegido abajo, lista para que luego, desde Scouting,
          se rellene la evaluación técnica y la valoración del partido concreto que se vea de cada una. Si una
          jugadora ya tiene ficha en ese club (mismo nombre), en vez de crear un duplicado se actualizan solo sus
          estadísticas de temporada — pulsa la etiqueta "Estado" de la fila para forzar una ficha nueva si lo
          prefieres.
        </p>
      </div>

      {/* Batch fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Club (plantilla a importar)</label>
          <select className="form-select" value={batch.clubId}
            onChange={(e) => setBatch((b) => ({ ...b, clubId: e.target.value }))}>
            <option value="">— Seleccionar —</option>
            {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Categoría</label>
          <select className="form-select" value={batch.categoria}
            onChange={(e) => setBatch((b) => ({ ...b, categoria: e.target.value }))}>
            {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* File input */}
      <div>
        <label className={`flex items-center gap-2 justify-center w-full border-2 border-dashed rounded-xl py-4 text-sm transition-colors ${
          batch.clubId ? 'border-gray-300 cursor-pointer hover:border-rfpaf-blue hover:bg-blue-50 text-gray-500' : 'border-gray-200 text-gray-300 cursor-not-allowed'
        }`}>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} disabled={parsing || !batch.clubId} />
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {fileName ? `Archivo: ${fileName} (elegir otro)` : batch.clubId ? 'Seleccionar archivo CSV o Excel' : 'Selecciona primero el club de arriba'}
        </label>
      </div>

      {/* Review table */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Plantilla de <strong>{clubNombre}</strong> — {rows.length} jugadora{rows.length !== 1 ? 's' : ''} en el archivo.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-2"></th>
                  <th className="py-2 pr-2">Nombre</th>
                  <th className="py-2 pr-2">1º Apellido</th>
                  <th className="py-2 pr-2">2º Apellido</th>
                  <th className="py-2 pr-2">F. Nacimiento</th>
                  <th className="py-2 pr-2">Dorsal</th>
                  <th className="py-2 pr-2">Posición</th>
                  <th className="py-2 pr-2">Estado</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowIndex} className="border-b border-gray-50">
                    <td className="py-1.5 pr-2">
                      <input type="checkbox" checked={r.included}
                        onChange={(e) => updateRow(r.rowIndex, { included: e.target.checked })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="form-input !py-1 !text-xs w-28" value={r.nombre}
                        onChange={(e) => updateRow(r.rowIndex, { nombre: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="form-input !py-1 !text-xs w-28" value={r.primerApellido}
                        onChange={(e) => updateRow(r.rowIndex, { primerApellido: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="form-input !py-1 !text-xs w-28" value={r.segundoApellido}
                        onChange={(e) => updateRow(r.rowIndex, { segundoApellido: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="date" className="form-input !py-1 !text-xs" value={r.fechaNacimiento}
                        onChange={(e) => updateRow(r.rowIndex, { fechaNacimiento: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="number" className="form-input !py-1 !text-xs w-16" value={r.dorsal}
                        onChange={(e) => updateRow(r.rowIndex, { dorsal: Number(e.target.value) })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1">
                        <select className="form-select !py-1 !text-xs" value={r.demarcacion}
                          onChange={(e) => updateRow(r.rowIndex, { demarcacion: e.target.value as ImportRow['demarcacion'] })}>
                          <option value="">— sin asignar —</option>
                          {DEMARCACIONES_ITEMS.map((d) => <option key={d.posicion} value={d.posicion}>{d.posicion}</option>)}
                        </select>
                        {!r.demarcacion && r.demarcacionRaw && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      {r.matchingFichaIds.length > 0 ? (
                        <button
                          onClick={() => updateRow(r.rowIndex, { action: r.action === 'update' ? 'create' : 'update' })}
                          title="Pulsa para cambiar entre actualizar la(s) ficha(s) existente(s) o crear una nueva"
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                            r.action === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {r.action === 'update'
                            ? <><RefreshCw className="w-3 h-3" /> Actualizar ({r.matchingFichaIds.length})</>
                            : <><FilePlus2 className="w-3 h-3" /> Nueva (forzada)</>}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 whitespace-nowrap">
                          <FilePlus2 className="w-3 h-3" /> Nueva
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <button onClick={() => removeRow(r.rowIndex)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={handleImport} disabled={importing || includedCount === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing
              ? `Procesando ${progress.done}/${progress.total}…`
              : `Procesar ${includedCount} fila${includedCount !== 1 ? 's' : ''} (${createCount} nueva${createCount !== 1 ? 's' : ''}, ${updateCount} actualizar${updateCount !== 1 ? 'es' : ''})`}
          </button>
        </div>
      )}

      {diagnostico && (
        <details className="text-xs rounded-xl border border-gray-200 bg-gray-50 px-3 py-2" open={sinFilas || cabecerasSinReconocer.length > 0}>
          <summary className="cursor-pointer font-semibold text-gray-600">
            Qué he entendido de este fichero
          </summary>
          <div className="mt-2 space-y-1 text-gray-600">
            <p>
              Separador: <strong>{diagnostico.separador === '\t' ? 'tabulador' : diagnostico.separador || '—'}</strong>
              {' · '}Cabecera en la fila <strong>{diagnostico.filaCabecera}</strong>
              {' · '}<strong>{diagnostico.filas}</strong> fila{diagnostico.filas !== 1 ? 's' : ''} de datos
            </p>
            <table className="w-full">
              <tbody>
                {diagnostico.columnas.map((c, i) => (
                  <tr key={i}>
                    <td className="py-0.5 pr-3 font-mono">{c.original || '(vacía)'}</td>
                    <td className={`py-0.5 ${c.entendida ? 'text-emerald-700' : 'text-rfpaf-red'}`}>
                      {c.entendida ? `→ ${ETIQUETA_COLUMNA[c.entendida] ?? c.entendida}` : '→ no reconocida'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {(cabecerasSinReconocer.length > 0 || sinFilas) && (
        <div className="text-sm rounded-xl px-3 py-2 bg-amber-50 text-amber-800">
          <p className="font-semibold">
            {sinFilas ? 'No he encontrado ninguna jugadora en este fichero.' : 'No he reconocido las columnas de este fichero.'}
          </p>
          <p className="text-xs mt-1">
            {sinFilas
              ? 'El fichero se ha abierto, pero debajo de la cabecera no hay filas con datos. Esto es lo que he leído como cabecera:'
              : 'Se han leído las filas, pero ninguna trae nombre. Estas son las columnas que he encontrado:'}
          </p>
          <p className="text-xs mt-1 font-mono bg-white/60 rounded px-2 py-1 break-words">
            {cabecerasSinReconocer.length > 0 ? cabecerasSinReconocer.join('  ·  ') : '(vacía)'}
          </p>
          <p className="text-xs mt-1">
            Renombra la columna del nombre a <strong>Jugadora</strong> (o <strong>Nombre completo</strong>)
            y la de la fecha a <strong>Fecha nacimiento</strong>, y vuelve a subirlo.
          </p>
        </div>
      )}

      {result && (
        <div className={`text-sm rounded-xl px-3 py-2 ${result.failed > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {result.created} ficha{result.created !== 1 ? 's' : ''} nueva{result.created !== 1 ? 's' : ''}, {result.updated} actualizada{result.updated !== 1 ? 's' : ''}
            {result.failed > 0 && `, ${result.failed} sin guardar`}
          </div>
          {result.motivos.length > 0 && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <p className="font-semibold text-xs mb-1">No se han podido guardar. Las filas siguen en la lista para reintentarlo:</p>
              <ul className="text-xs space-y-0.5">
                {result.motivos.slice(0, 8).map((m, i) => <li key={i}>· {m}</li>)}
                {result.motivos.length > 8 && <li>· y {result.motivos.length - 8} más</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
