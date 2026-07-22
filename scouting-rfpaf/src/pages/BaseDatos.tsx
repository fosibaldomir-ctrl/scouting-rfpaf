import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Eye, Edit, Trash2, Copy, ChevronUp, ChevronDown, LayoutGrid, List, PlusCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useStore } from '../store/useStore'
import type { FichaJugadora } from '../types'

function PropuestaBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    'SELECCIÓN': 'badge-seleccion',
    'INCORPORAR': 'badge-incorporar',
    'SEGUIR': 'badge-seguir',
    'DESCARTAR': 'badge-descartar',
  }
  return <span className={map[p] ?? 'badge-seguir'}>{p}</span>
}

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

type SortKey = keyof FichaJugadora
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 20

// Position groups mapping
const POSITION_GROUPS = [
  { key: 'POR', label: 'Porteras', color: '#7c3aed', bg: '#ede9fe', positions: ['PORTERO'] },
  { key: 'DEF', label: 'Defensas', color: '#1d4ed8', bg: '#dbeafe', positions: ['LATERAL', 'CENTRAL'] },
  { key: 'MED', label: 'Centrocampistas', color: '#0369a1', bg: '#e0f2fe', positions: ['MEDIO CENTRO DEF.', 'MEDIO CENTRO OF.', 'INTERIOR', 'MEDIA PUNTA'] },
  { key: 'EXT', label: 'Extremas', color: '#b45309', bg: '#fef3c7', positions: ['EXTERIOR'] },
  { key: 'DEL', label: 'Delanteras', color: '#be123c', bg: '#ffe4e6', positions: ['DELANTERO'] },
]

function valoracionColor(v: number): string {
  if (v >= 4) return '#16a34a'
  if (v >= 3) return '#ca8a04'
  return '#ea580c'
}

function PlayerCard({ f, onView, onEdit, onAddValoracion, onDuplicate, onDelete, escudo }: {
  f: FichaJugadora
  onView: () => void
  onEdit: () => void
  onAddValoracion: () => void
  onDuplicate: () => void
  onDelete: () => void
  escudo?: string
}) {
  const edad = calcularEdad(f.fechaNacimiento)
  const sinValorar = f.valoraciones.length === 0
  const val = f.valoracionGeneral ?? 0
  const pct = Math.round((val / 5) * 100)
  const barColor = valoracionColor(val)
  const fullName = [f.nombre, f.primerApellido, f.segundoApellido].filter(Boolean).join(' ')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow w-44 flex-shrink-0">
      {/* Photo area */}
      <div className="relative bg-gradient-to-b from-gray-100 to-gray-200 h-44 flex items-end justify-center overflow-hidden">
        {f.foto ? (
          <img src={f.foto} alt={fullName} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-gray-300">
              {f.nombre?.charAt(0)}{f.primerApellido?.charAt(0)}
            </span>
          </div>
        )}
        {/* Propuesta badge top-right */}
        <div className="absolute top-2 right-2">
          {sinValorar ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Sin valorar
            </span>
          ) : (
            <PropuestaBadge p={f.propuesta} />
          )}
        </div>
        {/* Club escudo top-left */}
        {escudo && (
          <div className="absolute top-2 left-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center p-0.5">
            <img src={escudo} alt="" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{fullName}</p>
          <p className="text-xs text-gray-400 truncate">{f.equipo || '—'}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Edad: {edad || '—'}</span>
          <span className="text-gray-300">|</span>
          <span>Nº {f.dorsal || '—'}</span>
        </div>

        {/* Valoración bar */}
        {sinValorar ? (
          <p className="text-[10px] text-gray-400 italic">Sin valorar todavía</p>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] text-gray-400 font-medium">Valoración</span>
              <span className="text-[10px] font-bold" style={{ color: barColor }}>{val}/5</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
          </div>
        )}

        {/* Category */}
        <p className="text-[10px] text-gray-400 truncate">{f.categoria}</p>

        {/* Actions */}
        <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
          <button
            onClick={onView}
            className="flex items-center gap-1 text-xs text-rfpaf-blue font-semibold border border-rfpaf-blue/20 rounded-lg px-2 py-1 hover:bg-rfpaf-blue hover:text-white transition-colors flex-1 justify-center"
          >
            <Eye className="w-3 h-3" />
            Ver
          </button>
          <div className="flex items-center gap-1 ml-1">
            <button onClick={onAddValoracion} className="text-gray-400 hover:text-rfpaf-blue p-1" title="Nueva valoración">
              <PlusCircle className="w-3 h-3" />
            </button>
            <button onClick={onEdit} className="text-gray-400 hover:text-gray-600 p-1" title="Editar">
              <Edit className="w-3 h-3" />
            </button>
            <button onClick={onDuplicate} className="text-gray-300 hover:text-gray-500 p-1" title="Duplicar">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="text-red-300 hover:text-red-500 p-1" title="Eliminar">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BaseDatos() {
  const { fichas, deleteFicha, addFicha, observadores, clubes } = useStore()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterDemarcacion, setFilterDemarcacion] = useState('')
  const [filterPropuesta, setFilterPropuesta] = useState('')
  const [filterObservador, setFilterObservador] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('creadoEn')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const filtered = useMemo(() => {
    let list = [...fichas]
    const q = search.toLowerCase()
    if (q) list = list.filter((f) =>
      `${f.nombre} ${f.primerApellido} ${f.segundoApellido}`.toLowerCase().includes(q) ||
      f.equipo?.toLowerCase().includes(q)
    )
    if (filterCategoria) list = list.filter((f) => f.categoria === filterCategoria)
    if (filterDemarcacion) list = list.filter((f) => f.demarcacion === filterDemarcacion)
    if (filterPropuesta) list = list.filter((f) => f.propuesta === filterPropuesta)
    if (filterObservador) list = list.filter((f) => f.observador === filterObservador)

    list.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey as string] ?? ''
      const bv = (b as unknown as Record<string, unknown>)[sortKey as string] ?? ''
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return list
  }, [fichas, search, filterCategoria, filterDemarcacion, filterPropuesta, filterObservador, sortKey, sortDir])

  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null

  const handleDuplicate = (f: FichaJugadora) => {
    const copy = {
      ...f,
      id: crypto.randomUUID(),
      registro: `${f.registro}-COPIA`,
      creadoEn: new Date().toISOString(),
      valoraciones: f.valoraciones.map((v) => ({ ...v, id: crypto.randomUUID() })),
    }
    addFicha(copy)
  }

  const handleExport = () => {
    const rows = filtered.map((f) => ({
      ID: f.id,
      REGISTRO: f.registro,
      'FECHA PARTIDO': f.fechaPartido,
      EQUIPO: f.equipo,
      CATEGORÍA: f.categoria,
      OBSERVADOR: observadores.find((o) => o.id === f.observador)?.nombre ?? f.observador,
      LOCAL: f.local,
      VISITANTE: f.visitante,
      NOMBRE: f.nombre,
      'PRIMER APELLIDO': f.primerApellido,
      'SEGUNDO APELLIDO': f.segundoApellido,
      'FECHA NACIMIENTO': f.fechaNacimiento,
      EDAD: calcularEdad(f.fechaNacimiento),
      DORSAL: f.dorsal,
      TIPOLOGÍA: f.tipologia,
      ALTURA: f.altura,
      LATERALIDAD: f.lateralidad,
      CLUB: clubes.find((c) => c.id === f.club)?.nombre ?? f.club,
      FUERZA: f.fuerza,
      VELOCIDAD: f.velocidad,
      RESISTENCIA: f.resistencia,
      DEMARCACIÓN: f.demarcacion,
      'OTRA DEMARCACIÓN': f.otraDemarcacion,
      'ITEM 1': f.evaluacionTecnica?.item1,
      'ITEM 2': f.evaluacionTecnica?.item2,
      'ITEM 3': f.evaluacionTecnica?.item3,
      'ITEM 4': f.evaluacionTecnica?.item4,
      'ITEM 5': f.evaluacionTecnica?.item5,
      'ITEM 6': f.evaluacionTecnica?.item6,
      'VALORACIÓN GENERAL': f.valoracionGeneral,
      PROPUESTA: f.propuesta,
      'DESCRIPCIÓN': f.descripcionJugadora,
      OBSERVACIONES: f.observaciones,
      CIERRE: f.cierre,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Scouting')
    XLSX.writeFile(wb, `RFPAF_Scouting_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const uniqueCategs = [...new Set(fichas.map((f) => f.categoria))].sort()
  const uniqueDemarcs = [...new Set(fichas.map((f) => f.demarcacion))].sort()

  const getEscudo = (f: FichaJugadora): string | undefined => {
    const byId = clubes.find((c) => c.id === f.club)?.escudo
    const byName = clubes.find((c) => c.nombre === f.equipo)?.escudo
    return byId ?? byName ?? undefined
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue">Base de Datos</h1>
          <p className="text-gray-500 text-sm">{filtered.length} fichas encontradas</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'cards' ? 'bg-white shadow text-rfpaf-blue' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Galería</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white shadow text-rfpaf-blue' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o equipo..."
              className="form-input pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select className="form-select" value={filterCategoria}
            onChange={(e) => { setFilterCategoria(e.target.value); setPage(1) }}>
            <option value="">Todas las categorías</option>
            {uniqueCategs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" value={filterDemarcacion}
            onChange={(e) => { setFilterDemarcacion(e.target.value); setPage(1) }}>
            <option value="">Todas las demarcaciones</option>
            {uniqueDemarcs.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="form-select" value={filterPropuesta}
            onChange={(e) => { setFilterPropuesta(e.target.value); setPage(1) }}>
            <option value="">Todas las propuestas</option>
            {['SELECCIÓN', 'INCORPORAR', 'SEGUIR', 'DESCARTAR'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {(filterCategoria || filterDemarcacion || filterPropuesta || filterObservador || search) && (
          <button
            onClick={() => { setSearch(''); setFilterCategoria(''); setFilterDemarcacion(''); setFilterPropuesta(''); setFilterObservador(''); setPage(1) }}
            className="text-rfpaf-red text-xs mt-2 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── GALLERY VIEW ── */}
      {viewMode === 'cards' && (
        <div className="space-y-8">
          {filtered.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">
              {fichas.length === 0 ? 'No hay fichas registradas.' : 'No se encontraron resultados.'}
            </div>
          ) : (
            POSITION_GROUPS.map((group) => {
              const groupFichas = filtered.filter((f) => group.positions.includes(f.demarcacion))
              if (groupFichas.length === 0) return null
              return (
                <div key={group.key}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-xs font-extrabold px-3 py-1.5 rounded-xl tracking-widest"
                      style={{ backgroundColor: group.color, color: '#fff' }}
                    >
                      {group.key}
                    </span>
                    <h2 className="text-base font-bold text-gray-800">{group.label}</h2>
                    <span className="text-sm text-gray-400 font-medium">({groupFichas.length})</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Horizontal scroll row */}
                  <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
                    {groupFichas.map((f) => (
                      <PlayerCard
                        key={f.id}
                        f={f}
                        escudo={getEscudo(f)}
                        onView={() => navigate(`/ficha/${f.id}`)}
                        onEdit={() => navigate(`/editar/${f.id}`)}
                        onAddValoracion={() => navigate(`/ficha/${f.id}/valorar`)}
                        onDuplicate={() => handleDuplicate(f)}
                        onDelete={() => setConfirmDelete(f.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[
                    { key: null, label: 'Foto' },
                    { key: 'fechaPartido', label: 'Fecha' },
                    { key: 'primerApellido', label: 'Jugadora' },
                    { key: null, label: 'Edad' },
                    { key: 'equipo', label: 'Equipo' },
                    { key: 'club', label: 'Club' },
                    { key: 'categoria', label: 'Categoría' },
                    { key: 'demarcacion', label: 'Demarcación' },
                    { key: 'lateralidad', label: 'Lateral.' },
                    { key: 'valoracionGeneral', label: 'Val.' },
                    { key: 'propuesta', label: 'Propuesta' },
                    { key: null, label: 'Acciones' },
                  ].map(({ key, label }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${key ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
                      onClick={() => key && toggleSort(key as SortKey)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {key && <SortIcon k={key as SortKey} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-gray-400">
                      {fichas.length === 0 ? 'No hay fichas registradas.' : 'No se encontraron resultados.'}
                    </td>
                  </tr>
                ) : (
                  paged.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        {f.foto ? (
                          <div className="w-12 h-16 rounded border border-gray-200 overflow-hidden">
                            <img src={f.foto} alt={f.nombre} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-16 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                            {f.nombre?.charAt(0)}{f.primerApellido?.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(f.fechaPartido).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {f.nombre} {f.primerApellido}
                        {f.segundoApellido && ` ${f.segundoApellido}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{calcularEdad(f.fechaNacimiento)}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-32">
                        <div className="flex items-center gap-2">
                          {clubes.find((c) => c.nombre === f.equipo)?.escudo && (
                            <img src={clubes.find((c) => c.nombre === f.equipo)?.escudo!} alt={f.equipo} className="w-5 h-6 object-contain flex-shrink-0" />
                          )}
                          <span className="truncate">{f.equipo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 flex items-center justify-center">
                        {clubes.find((c) => c.id === f.club)?.escudo ? (
                          <img src={clubes.find((c) => c.id === f.club)?.escudo!} alt={clubes.find((c) => c.id === f.club)?.nombre} className="w-8 h-10 object-contain" />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{f.categoria}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{f.demarcacion}</td>
                      <td className="px-4 py-3 text-gray-600">{f.lateralidad?.charAt(0)}</td>
                      <td className="px-4 py-3">
                        {f.valoraciones.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Sin valorar</span>
                        ) : (
                          <span className="text-yellow-500">{'★'.repeat(f.valoracionGeneral ?? 0)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {f.valoraciones.length === 0 ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Sin valorar</span>
                        ) : (
                          <PropuestaBadge p={f.propuesta} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/ficha/${f.id}`)} className="text-rfpaf-blue hover:text-rfpaf-blue-light" title="Ver">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate(`/ficha/${f.id}/valorar`)} className="text-gray-400 hover:text-rfpaf-blue" title="Nueva valoración">
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate(`/editar/${f.id}`)} className="text-gray-500 hover:text-gray-700" title="Editar">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDuplicate(f)} className="text-gray-400 hover:text-gray-600" title="Duplicar">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(f.id)} className="text-red-400 hover:text-red-600" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100">‹</button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const n = Math.max(1, Math.min(pages - 4, page - 2)) + i
                  return (
                    <button key={n} onClick={() => setPage(n)}
                      className={`px-3 py-1 rounded border text-sm ${page === n ? 'bg-rfpaf-blue text-white border-rfpaf-blue' : 'hover:bg-gray-100'}`}>
                      {n}
                    </button>
                  )
                })}
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100">›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmar eliminación</h3>
            <p className="text-gray-600 text-sm mb-5">¿Estás seguro de que quieres eliminar esta ficha? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => { deleteFicha(confirmDelete); setConfirmDelete(null) }} className="btn-danger">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
