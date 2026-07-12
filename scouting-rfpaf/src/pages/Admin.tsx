import { useRef, useState } from 'react'
import { Trash2, Plus, Shield, Pencil, Check, X, ImagePlus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { DEMARCACIONES_ITEMS } from '../data/masterData'

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Admin() {
  const { observadores, categorias, clubes, addObservador, deleteObservador, addClub, updateClub, deleteClub, addCategoria, deleteCategoria } = useStore()

  const [newObs, setNewObs] = useState('')
  const [newClub, setNewClub] = useState('')
  const [newClubEscudo, setNewClubEscudo] = useState<string | null>(null)
  const [newCat, setNewCat] = useState('')
  const [activeTab, setActiveTab] = useState<'observadores' | 'categorias' | 'clubes' | 'demarcaciones'>('observadores')
  const [editingClubId, setEditingClubId] = useState<string | null>(null)
  const [editingClubName, setEditingClubName] = useState('')
  const newClubFileRef = useRef<HTMLInputElement>(null)

  const handleAddObs = () => {
    const name = newObs.trim().toUpperCase()
    if (!name) return
    addObservador({ id: crypto.randomUUID(), nombre: name })
    setNewObs('')
  }

  const handleNewClubEscudoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNewClubEscudo(await readFileAsDataURL(file))
  }

  const handleAddClub = () => {
    const name = newClub.trim().toUpperCase()
    if (!name) return
    addClub({ id: crypto.randomUUID(), nombre: name, escudo: newClubEscudo })
    setNewClub('')
    setNewClubEscudo(null)
    if (newClubFileRef.current) newClubFileRef.current.value = ''
  }

  const startEditClub = (id: string, nombre: string) => {
    setEditingClubId(id)
    setEditingClubName(nombre)
  }

  const saveEditClub = () => {
    const name = editingClubName.trim().toUpperCase()
    if (editingClubId && name) updateClub(editingClubId, { nombre: name })
    setEditingClubId(null)
    setEditingClubName('')
  }

  const handleAddCat = () => {
    const name = newCat.trim().toUpperCase()
    if (!name) return
    addCategoria({ id: crypto.randomUUID(), nombre: name as never })
    setNewCat('')
  }

  const handleEscudoChange = (clubId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        updateClub(clubId, { escudo: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const TABS = [
    { key: 'observadores', label: 'Observadores' },
    { key: 'categorias', label: 'Categorías' },
    { key: 'clubes', label: 'Clubes' },
    { key: 'demarcaciones', label: 'Demarcaciones' },
  ] as const

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue">Administración</h1>
        <p className="text-gray-500 text-sm">Gestiona las tablas maestras del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? 'bg-white text-rfpaf-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Observadores */}
      {activeTab === 'observadores' && (
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-gray-700">Observadores ({observadores.length})</h2>
          <div className="flex gap-2">
            <input
              type="text"
              className="form-input flex-1"
              placeholder="Nombre del nuevo observador..."
              value={newObs}
              onChange={(e) => setNewObs(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddObs()}
            />
            <button onClick={handleAddObs} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>
          <div className="space-y-2">
            {observadores.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{o.nombre}</span>
                <button onClick={() => deleteObservador(o.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorías */}
      {activeTab === 'categorias' && (
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-gray-700">Categorías ({categorias.length})</h2>
          <div className="flex gap-2">
            <input
              type="text"
              className="form-input flex-1"
              placeholder="Nueva categoría..."
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCat()}
            />
            <button onClick={handleAddCat} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{c.nombre}</span>
                <button onClick={() => deleteCategoria(c.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clubes */}
      {activeTab === 'clubes' && (
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-gray-700">Clubes ({clubes.length})</h2>
          <div className="flex gap-2 items-start">
            <button
              onClick={() => newClubFileRef.current?.click()}
              className="w-11 h-11 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden hover:border-rfpaf-blue hover:bg-blue-50 transition-colors"
              title="Escudo del nuevo club"
            >
              {newClubEscudo
                ? <img src={newClubEscudo} alt="Escudo" className="w-full h-full object-contain" />
                : <ImagePlus className="w-4 h-4 text-gray-400" />}
            </button>
            <input ref={newClubFileRef} type="file" accept="image/*" className="hidden" onChange={handleNewClubEscudoChange} />
            <input
              type="text"
              className="form-input flex-1"
              placeholder="Nombre del nuevo club..."
              value={newClub}
              onChange={(e) => setNewClub(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddClub()}
            />
            <button onClick={handleAddClub} className="btn-primary flex items-center gap-2 flex-shrink-0">
              <Plus className="w-4 h-4" />
              Añadir
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {clubes.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                <div className="flex items-start justify-between gap-2">
                  {editingClubId === c.id ? (
                    <input
                      autoFocus
                      value={editingClubName}
                      onChange={(e) => setEditingClubName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditClub(); if (e.key === 'Escape') setEditingClubId(null) }}
                      className="flex-1 min-w-0 border border-rfpaf-blue rounded px-1.5 py-0.5 text-sm font-medium text-gray-700 outline-none"
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{c.nombre}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {editingClubId === c.id ? (
                      <>
                        <button onClick={saveEditClub} className="text-emerald-500 hover:text-emerald-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingClubId(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditClub(c.id, c.nombre)} className="text-gray-400 hover:text-rfpaf-blue">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteClub(c.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {c.escudo ? (
                    <div className="relative">
                      <img src={c.escudo} alt={c.nombre} className="w-16 h-20 object-contain rounded border border-gray-300" />
                      <label className="absolute inset-0 bg-black/0 hover:bg-black/20 rounded flex items-center justify-center cursor-pointer transition-colors">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEscudoChange(c.id, e)} />
                        <span className="text-white text-xs font-bold opacity-0 hover:opacity-100">Cambiar</span>
                      </label>
                    </div>
                  ) : (
                    <label className="w-16 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-rfpaf-blue hover:bg-blue-50 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleEscudoChange(c.id, e)} />
                      <span className="text-xs text-gray-500 text-center">+ Escudo</span>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demarcaciones (solo visualización) */}
      {activeTab === 'demarcaciones' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-rfpaf-blue" />
            <h2 className="text-base font-bold text-gray-700">Ítems de Evaluación por Demarcación</h2>
          </div>
          <p className="text-xs text-gray-500">Los ítems técnicos están basados en el sistema de evaluación de la RFPAF.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {DEMARCACIONES_ITEMS.map((d) => (
              <div key={d.posicion} className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-rfpaf-blue mb-2 text-sm">{d.posicion}</h3>
                <ul className="space-y-1">
                  {d.items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-5 h-5 bg-rfpaf-blue text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
