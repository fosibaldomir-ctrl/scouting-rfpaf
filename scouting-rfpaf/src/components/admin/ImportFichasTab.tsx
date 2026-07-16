import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Upload, Trash2, AlertTriangle, CheckCircle2, Loader2, RefreshCw, FilePlus2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { DEMARCACIONES_ITEMS } from '../../data/masterData'
import { defaultFichaFields } from '../../utils/fichaDefaults'
import { genRegistro } from '../../utils/registro'
import { parseFichasFile, buildImportRows, type ImportRow } from '../../utils/csvImport'
import type { FichaJugadora } from '../../types'

const CLUB_MATCH_WARN_THRESHOLD = 0.6

interface BatchFields {
  fechaPartido: string
  categoria: string
  observador: string
  equipo: string
  local: string
  visitante: string
}

export default function ImportFichasTab() {
  const { fichas, addFicha, updateFicha, observadores, categorias, clubes, currentObservador } = useStore()

  const [batch, setBatch] = useState<BatchFields>({
    fechaPartido: new Date().toISOString().split('T')[0],
    categoria: categorias[0]?.nombre ?? '1ª REF',
    observador: currentObservador ?? '',
    equipo: '',
    local: '',
    visitante: '',
  })

  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState<{ created: number; updated: number; failed: number } | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setResult(null)
    try {
      const raw = await parseFichasFile(file)
      setRows(buildImportRows(raw, clubes, fichas))
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
    if (!batch.observador) { alert('Selecciona un observador para el lote.'); return }

    setImporting(true)
    setProgress({ done: 0, total: toImport.length })
    let created = 0
    let updated = 0
    let failed = 0
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
          const obsNombre = observadores.find((o) => o.id === batch.observador)?.nombre ?? ''
          const ficha: FichaJugadora = {
            ...defaultFichaFields(),
            fechaPartido: batch.fechaPartido,
            categoria: batch.categoria as FichaJugadora['categoria'],
            observador: batch.observador,
            equipo: batch.equipo,
            local: batch.local,
            visitante: batch.visitante,
            nombre: row.nombre,
            primerApellido: row.primerApellido,
            segundoApellido: row.segundoApellido,
            fechaNacimiento: row.fechaNacimiento,
            dorsal: row.dorsal,
            club: row.clubId || row.clubRawText,
            demarcacion: (row.demarcacion || 'CENTRAL') as FichaJugadora['demarcacion'],
            minutosJugados: row.minutosJugados,
            partidosTitular: row.partidosTitular,
            partidosSuplente: row.partidosSuplente,
            goles: row.goles,
            tarjetasAmarillas: row.tarjetasAmarillas,
            tarjetasRojas: row.tarjetasRojas,
            id: uuidv4(),
            registro: genRegistro(obsNombre, fichasCount),
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
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setImporting(false)
    setResult({ created, updated, failed })
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-700">Importar fichas desde CSV/Excel</h2>
        <p className="text-xs text-gray-500 mt-1">
          Crea una ficha por jugadora con los datos identificativos del archivo. Los datos de partido de abajo se
          aplican a todas las fichas nuevas; el resto (evaluación técnica, valoración) queda en blanco para que lo
          complete el observador. Si una jugadora ya tiene ficha (mismo nombre y club), en vez de crear un
          duplicado se actualizan solo sus estadísticas de temporada — pulsa la etiqueta "Estado" de la fila para
          forzar una ficha nueva si lo prefieres.
        </p>
      </div>

      {/* Batch fields */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Fecha de partido</label>
          <input type="date" className="form-input" value={batch.fechaPartido}
            onChange={(e) => setBatch((b) => ({ ...b, fechaPartido: e.target.value }))} />
        </div>
        <div>
          <label className="form-label">Categoría</label>
          <select className="form-select" value={batch.categoria}
            onChange={(e) => setBatch((b) => ({ ...b, categoria: e.target.value }))}>
            {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Observador</label>
          <select className="form-select" value={batch.observador}
            onChange={(e) => setBatch((b) => ({ ...b, observador: e.target.value }))}>
            <option value="">— Seleccionar —</option>
            {observadores.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Equipo observado</label>
          <select className="form-select" value={batch.equipo}
            onChange={(e) => setBatch((b) => ({ ...b, equipo: e.target.value }))}>
            <option value="">— Seleccionar —</option>
            {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Local</label>
          <select className="form-select" value={batch.local}
            onChange={(e) => setBatch((b) => ({ ...b, local: e.target.value }))}>
            <option value="">— Seleccionar —</option>
            {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Visitante</label>
          <select className="form-select" value={batch.visitante}
            onChange={(e) => setBatch((b) => ({ ...b, visitante: e.target.value }))}>
            <option value="">— Seleccionar —</option>
            {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* File input */}
      <div>
        <label className="flex items-center gap-2 justify-center w-full border-2 border-dashed border-gray-300 rounded-xl py-4 cursor-pointer hover:border-rfpaf-blue hover:bg-blue-50 transition-colors text-sm text-gray-500">
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} disabled={parsing} />
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {fileName ? `Archivo: ${fileName} (elegir otro)` : 'Seleccionar archivo CSV o Excel'}
        </label>
      </div>

      {/* Review table */}
      {rows.length > 0 && (
        <div className="space-y-3">
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
                  <th className="py-2 pr-2">Club</th>
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
                        <select className="form-select !py-1 !text-xs" value={r.clubId}
                          onChange={(e) => updateRow(r.rowIndex, { clubId: e.target.value })}>
                          <option value="">— usar texto tal cual: {r.clubRawText || 'vacío'} —</option>
                          {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        {r.clubRawText && r.clubScore < CLUB_MATCH_WARN_THRESHOLD && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
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

      {result && (
        <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${result.failed > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {result.created} ficha{result.created !== 1 ? 's' : ''} nueva{result.created !== 1 ? 's' : ''}, {result.updated} actualizada{result.updated !== 1 ? 's' : ''}
          {result.failed > 0 && `, ${result.failed} fallida${result.failed !== 1 ? 's' : ''} (revisa la consola y vuelve a intentarlo)`}
        </div>
      )}
    </div>
  )
}
