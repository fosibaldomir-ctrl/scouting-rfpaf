import { useEffect, useState } from 'react'
import { Trash2, Clock, RefreshCw, Terminal, Copy, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Categoria } from '../../types'

interface NewMapeoForm {
  temporadaValor: string
  temporadaLabel: string
  tipoJuego: string
  competicionId: string
  competicionLabel: string
  grupoId: string
  grupoLabel: string
  categoria: Categoria | ''
}

const EMPTY_FORM: NewMapeoForm = {
  temporadaValor: '',
  temporadaLabel: '',
  tipoJuego: '1',
  competicionId: '',
  competicionLabel: '',
  grupoId: '',
  grupoLabel: '',
  categoria: '',
}

const SYNC_COMMAND = 'npm run sync-actas'

export default function SyncTab() {
  const {
    competicionMapeos, loadCompeticionMapeos, addCompeticionMapeo, updateCompeticionMapeoAction, deleteCompeticionMapeoAction,
    syncRuns, loadSyncRuns, categorias,
  } = useStore()

  const [form, setForm] = useState<NewMapeoForm>(EMPTY_FORM)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadCompeticionMapeos()
    loadSyncRuns()
  }, [loadCompeticionMapeos, loadSyncRuns])

  const handleAdd = () => {
    if (!form.temporadaValor || !form.competicionId || !form.grupoId || !form.categoria) return
    addCompeticionMapeo({ ...form, categoria: form.categoria as Categoria, activo: true })
    setForm(EMPTY_FORM)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(SYNC_COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <h2 className="text-base font-bold text-gray-700">Sincronización de actas</h2>
        <p className="text-xs text-gray-500">
          asturfutbol.es bloquea el tráfico automático que viene de servidores en la nube, así que la sincronización
          se ejecuta desde tu propio ordenador, no desde un servidor. Corre este comando en la terminal, dentro de la
          carpeta del proyecto, para descargar las actas nuevas y actualizar las estadísticas de las fichas que
          coincidan por nombre y club:
        </p>
        <div className="flex items-center gap-2 bg-gray-900 text-gray-100 rounded-xl px-4 py-3 font-mono text-sm">
          <Terminal className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <code className="flex-1">{SYNC_COMMAND}</code>
          <button onClick={handleCopy} className="text-gray-400 hover:text-white flex-shrink-0" title="Copiar comando">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Para que se ejecute solo cada semana sin tener que acordarte, se puede programar como una tarea automática
          de macOS — pregunta si quieres que la dejemos configurada.
        </p>
      </div>

      {/* Competiciones seguidas */}
      <div className="card space-y-4">
        <h2 className="text-base font-bold text-gray-700">Competiciones seguidas ({competicionMapeos.length})</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="form-label">Temporada (valor)</label>
            <input className="form-input" placeholder="21" value={form.temporadaValor}
              onChange={(e) => setForm((f) => ({ ...f, temporadaValor: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Temporada (texto)</label>
            <input className="form-input" placeholder="2025-2026" value={form.temporadaLabel}
              onChange={(e) => setForm((f) => ({ ...f, temporadaLabel: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Tipo de juego</label>
            <input className="form-input" placeholder="1 = Fútbol-11" value={form.tipoJuego}
              onChange={(e) => setForm((f) => ({ ...f, tipoJuego: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Categoría</label>
            <select className="form-select" value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as Categoria }))}>
              <option value="">— Seleccionar —</option>
              {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">ID competición</label>
            <input className="form-input" placeholder="22271190" value={form.competicionId}
              onChange={(e) => setForm((f) => ({ ...f, competicionId: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Nombre competición</label>
            <input className="form-input" placeholder="Tercera Federación Femenino" value={form.competicionLabel}
              onChange={(e) => setForm((f) => ({ ...f, competicionLabel: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">ID grupo</label>
            <input className="form-input" placeholder="22271231" value={form.grupoId}
              onChange={(e) => setForm((f) => ({ ...f, grupoId: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Nombre grupo</label>
            <input className="form-input" placeholder="Grupo II" value={form.grupoLabel}
              onChange={(e) => setForm((f) => ({ ...f, grupoLabel: e.target.value }))} />
          </div>
        </div>
        <button onClick={handleAdd} className="btn-primary">Añadir competición</button>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-2">Categoría</th>
                <th className="py-2 pr-2">Temporada</th>
                <th className="py-2 pr-2">Competición</th>
                <th className="py-2 pr-2">Grupo</th>
                <th className="py-2 pr-2">Última jornada</th>
                <th className="py-2 pr-2">Activo</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {competicionMapeos.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-2 font-medium text-gray-700">{m.categoria}</td>
                  <td className="py-1.5 pr-2">{m.temporadaLabel || m.temporadaValor}</td>
                  <td className="py-1.5 pr-2">{m.competicionLabel || m.competicionId}</td>
                  <td className="py-1.5 pr-2">{m.grupoLabel || m.grupoId}</td>
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1">{m.ultimaJornadaProcesada}
                      <button title="Reiniciar a 0 (re-procesar desde el principio)"
                        onClick={() => updateCompeticionMapeoAction(m.id, { ultimaJornadaProcesada: 0 })}
                        className="text-gray-400 hover:text-rfpaf-blue">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </span>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="checkbox" checked={m.activo}
                      onChange={(e) => updateCompeticionMapeoAction(m.id, { activo: e.target.checked })} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <button onClick={() => deleteCompeticionMapeoAction(m.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {competicionMapeos.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-400">Ninguna competición dada de alta todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registro de ejecuciones */}
      <div className="card space-y-3">
        <h2 className="text-base font-bold text-gray-700">Registro de ejecuciones</h2>
        <div className="space-y-2">
          {syncRuns.map((r) => (
            <div key={r.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-3 py-2 text-xs">
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                r.estado === 'completado' ? 'bg-emerald-100 text-emerald-700'
                  : r.estado === 'error' ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {r.estado === 'en_curso' && <Clock className="w-3 h-3" />}
                {r.estado}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-700">
                  {new Date(r.iniciadoEn).toLocaleString('es-ES')} · {r.disparadoPor}
                </p>
                <p className="text-gray-500">{r.resumen || 'Sin resumen todavía…'}</p>
                {r.errores.length > 0 && (
                  <p className="text-red-500 mt-1">{r.errores.length} error{r.errores.length !== 1 ? 'es' : ''}: {r.errores.slice(0, 2).map((e) => e.message).join('; ')}</p>
                )}
              </div>
            </div>
          ))}
          {syncRuns.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Todavía no se ha ejecutado ninguna sincronización.</p>}
        </div>
      </div>
    </div>
  )
}
