import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { ChevronRight, ChevronLeft, Save, CheckCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { DEMARCACIONES_ITEMS, ALTURAS, TIPOLOGIAS, LATERALIDADES, PROPUESTAS } from '../data/masterData'
import ScoreSlider from '../components/forms/ScoreSlider'
import RadarChart from '../components/charts/RadarChart'
import type { FichaJugadora, Demarcacion, EvaluacionDemarcacion } from '../types'
import { genRegistro } from '../utils/registro'
import { defaultFichaFields as defaultForm } from '../utils/fichaDefaults'

const STEPS = ['Partido', 'Jugadora', 'Físico', 'Técnica', 'Evaluación']

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() - nac.getMonth() === 0 && hoy.getDate() < nac.getDate())) e--
  return e
}

export default function NuevaFicha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fichas, addFicha, updateFicha, getFicha, observadores, categorias, clubes, currentObservador, borrador, saveBorrador, clearBorrador } = useStore()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Partial<FichaJugadora>>(defaultForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const isEdit = Boolean(id)

  useEffect(() => {
    if (isEdit && id) {
      const existing = getFicha(id)
      if (existing) setForm(existing)
    } else if (borrador && !isEdit) {
      setForm({ ...defaultForm(), ...borrador })
    }
    if (!form.observador && currentObservador) {
      setForm((f) => ({ ...f, observador: currentObservador }))
    }
  }, [])

  useEffect(() => {
    if (!form.observador && currentObservador) {
      setForm((f) => ({ ...f, observador: currentObservador }))
    }
  }, [currentObservador])

  const set = (field: keyof FichaJugadora, value: unknown) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  const setTec = (key: keyof EvaluacionDemarcacion, val: number) => {
    setForm((f) => ({
      ...f,
      evaluacionTecnica: { ...(f.evaluacionTecnica ?? { item1:3,item2:3,item3:3,item4:3,item5:3,item6:3 }), [key]: val },
    }))
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        set('foto', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const itemsDemarc = DEMARCACIONES_ITEMS.find((d) => d.posicion === form.demarcacion)?.items ?? []

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (step === 1) {
      if (!form.fechaPartido) errs.fechaPartido = 'Obligatorio'
      if (!form.equipo?.trim()) errs.equipo = 'Obligatorio'
      if (!form.categoria) errs.categoria = 'Obligatorio'
      if (!form.local?.trim()) errs.local = 'Obligatorio'
      if (!form.visitante?.trim()) errs.visitante = 'Obligatorio'
      if (!form.observador) errs.observador = 'Obligatorio'
    }
    if (step === 2) {
      if (!form.nombre?.trim()) errs.nombre = 'Obligatorio'
      if (!form.primerApellido?.trim()) errs.primerApellido = 'Obligatorio'
      if (!form.fechaNacimiento) errs.fechaNacimiento = 'Obligatorio'
      if (!form.club) errs.club = 'Obligatorio'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (validate()) {
      saveBorrador(form)
      setStep((s) => Math.min(5, s + 1) as 1|2|3|4|5)
    }
  }

  const prevStep = () => setStep((s) => Math.max(1, s - 1) as 1|2|3|4|5)

  const handleSubmit = () => {
    const obs = observadores.find((o) => o.id === form.observador)
    const now = new Date().toISOString()
    const ficha: FichaJugadora = {
      ...defaultForm(),
      ...form,
      id: isEdit ? (id as string) : uuidv4(),
      registro: isEdit ? (form.registro ?? genRegistro(obs?.nombre ?? '', fichas.length)) : genRegistro(obs?.nombre ?? '', fichas.length),
      creadoEn: isEdit ? (form.creadoEn ?? now) : now,
      actualizadoEn: now,
    } as FichaJugadora

    if (isEdit) {
      updateFicha(id as string, ficha)
    } else {
      addFicha(ficha)
    }
    clearBorrador()
    setSaved(true)
    setTimeout(() => navigate('/base-datos'), 1500)
  }

  const tecValues = [
    form.evaluacionTecnica?.item1 ?? 3,
    form.evaluacionTecnica?.item2 ?? 3,
    form.evaluacionTecnica?.item3 ?? 3,
    form.evaluacionTecnica?.item4 ?? 3,
    form.evaluacionTecnica?.item5 ?? 3,
    form.evaluacionTecnica?.item6 ?? 3,
  ]

  if (saved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <p className="text-xl font-bold text-gray-700">Ficha guardada correctamente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue">{isEdit ? 'Editar Ficha' : 'Nueva Ficha'}</h1>
        <p className="text-gray-500 text-sm">Completa todos los pasos para registrar la jugadora</p>
      </div>

      {/* Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 ${i + 1 === step ? 'text-rfpaf-blue' : i + 1 < step ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  i + 1 === step ? 'border-rfpaf-blue bg-rfpaf-blue text-white' :
                  i + 1 < step ? 'border-green-500 bg-green-500 text-white' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 sm:w-16 mx-1 ${i + 1 < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Form */}
        <div className="flex-1 card">
          {/* PASO 1: Partido */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-700 mb-4">Datos del Partido</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Fecha del Partido *</label>
                  <input type="date" className={`form-input ${errors.fechaPartido ? 'border-red-400' : ''}`}
                    value={form.fechaPartido ?? ''} onChange={(e) => set('fechaPartido', e.target.value)} />
                  {errors.fechaPartido && <p className="text-red-500 text-xs mt-1">{errors.fechaPartido}</p>}
                </div>
                <div>
                  <label className="form-label">Categoría *</label>
                  <select className={`form-select ${errors.categoria ? 'border-red-400' : ''}`}
                    value={form.categoria ?? ''} onChange={(e) => set('categoria', e.target.value)}>
                    {categorias.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Equipo Observado *</label>
                <select className={`form-select ${errors.equipo ? 'border-red-400' : ''}`}
                  value={form.equipo ?? ''} onChange={(e) => set('equipo', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </select>
                {errors.equipo && <p className="text-red-500 text-xs mt-1">{errors.equipo}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Equipo Local *</label>
                  <select className={`form-select ${errors.local ? 'border-red-400' : ''}`}
                    value={form.local ?? ''} onChange={(e) => set('local', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                  {errors.local && <p className="text-red-500 text-xs mt-1">{errors.local}</p>}
                </div>
                <div>
                  <label className="form-label">Equipo Visitante *</label>
                  <select className={`form-select ${errors.visitante ? 'border-red-400' : ''}`}
                    value={form.visitante ?? ''} onChange={(e) => set('visitante', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {clubes.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                  {errors.visitante && <p className="text-red-500 text-xs mt-1">{errors.visitante}</p>}
                </div>
              </div>
              <div>
                <label className="form-label">Observador *</label>
                <select className={`form-select ${errors.observador ? 'border-red-400' : ''}`}
                  value={form.observador ?? ''} onChange={(e) => set('observador', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {observadores.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
                {errors.observador && <p className="text-red-500 text-xs mt-1">{errors.observador}</p>}
              </div>
            </div>
          )}

          {/* PASO 2: Jugadora */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-700 mb-4">Datos de la Jugadora</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Nombre *</label>
                  <input type="text" className={`form-input ${errors.nombre ? 'border-red-400' : ''}`}
                    value={form.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} />
                  {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                </div>
                <div>
                  <label className="form-label">Primer Apellido *</label>
                  <input type="text" className={`form-input ${errors.primerApellido ? 'border-red-400' : ''}`}
                    value={form.primerApellido ?? ''} onChange={(e) => set('primerApellido', e.target.value)} />
                  {errors.primerApellido && <p className="text-red-500 text-xs mt-1">{errors.primerApellido}</p>}
                </div>
                <div>
                  <label className="form-label">Segundo Apellido</label>
                  <input type="text" className="form-input"
                    value={form.segundoApellido ?? ''} onChange={(e) => set('segundoApellido', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label">Foto</label>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <input type="file" accept="image/*" className="form-input"
                      onChange={handleFotoChange} />
                  </div>
                  {form.foto && (
                    <div className="w-16 h-20 rounded border border-gray-300 overflow-hidden flex-shrink-0">
                      <img src={form.foto} alt="Vista previa" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Fecha de Nacimiento *</label>
                  <input type="date" className={`form-input ${errors.fechaNacimiento ? 'border-red-400' : ''}`}
                    value={form.fechaNacimiento ?? ''} onChange={(e) => set('fechaNacimiento', e.target.value)} />
                  {form.fechaNacimiento && (
                    <p className="text-rfpaf-blue text-xs mt-1 font-medium">
                      Edad: {calcularEdad(form.fechaNacimiento)} años
                    </p>
                  )}
                  {errors.fechaNacimiento && <p className="text-red-500 text-xs mt-1">{errors.fechaNacimiento}</p>}
                </div>
                <div>
                  <label className="form-label">Dorsal</label>
                  <input type="number" min={1} max={99} className="form-input"
                    value={form.dorsal ?? ''} onChange={(e) => set('dorsal', Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Lateralidad</label>
                  <select className="form-select" value={form.lateralidad ?? 'DIESTRA'}
                    onChange={(e) => set('lateralidad', e.target.value)}>
                    {LATERALIDADES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tipología</label>
                  <select className="form-select" value={form.tipologia ?? 'ATLÉTICA'}
                    onChange={(e) => set('tipologia', e.target.value)}>
                    {TIPOLOGIAS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Altura</label>
                  <select className="form-select" value={form.altura ?? '1.65'}
                    onChange={(e) => set('altura', e.target.value)}>
                    {ALTURAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Club *</label>
                <select className={`form-select ${errors.club ? 'border-red-400' : ''}`}
                  value={form.club ?? ''} onChange={(e) => set('club', e.target.value)}>
                  <option value="">— Seleccionar club —</option>
                  {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {errors.club && <p className="text-red-500 text-xs mt-1">{errors.club}</p>}
              </div>
            </div>
          )}

          {/* PASO 3: Físico */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">Cualidades Físicas (1-10)</h2>
              <ScoreSlider label="Fuerza" value={form.fuerza ?? 5} onChange={(v) => set('fuerza', v)} />
              <ScoreSlider label="Velocidad" value={form.velocidad ?? 5} onChange={(v) => set('velocidad', v)} color="#c0392b" />
              <ScoreSlider label="Resistencia" value={form.resistencia ?? 5} onChange={(v) => set('resistencia', v)} color="#16a34a" />

              <h2 className="text-lg font-bold text-gray-700 mb-4 pt-4 border-t border-gray-100">Estadísticas de Temporada</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Minutos jugados</label>
                  <input type="number" min={0} className="form-input" value={form.minutosJugados ?? 0}
                    onChange={(e) => set('minutosJugados', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Partidos titular</label>
                  <input type="number" min={0} className="form-input" value={form.partidosTitular ?? 0}
                    onChange={(e) => set('partidosTitular', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Partidos suplente</label>
                  <input type="number" min={0} className="form-input" value={form.partidosSuplente ?? 0}
                    onChange={(e) => set('partidosSuplente', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Goles</label>
                  <input type="number" min={0} className="form-input" value={form.goles ?? 0}
                    onChange={(e) => set('goles', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Tarjetas amarillas</label>
                  <input type="number" min={0} className="form-input" value={form.tarjetasAmarillas ?? 0}
                    onChange={(e) => set('tarjetasAmarillas', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Tarjetas rojas</label>
                  <input type="number" min={0} className="form-input" value={form.tarjetasRojas ?? 0}
                    onChange={(e) => set('tarjetasRojas', Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Técnica */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-700 mb-4">Evaluación Técnica por Demarcación</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Demarcación Principal</label>
                  <select className="form-select" value={form.demarcacion ?? 'CENTRAL'}
                    onChange={(e) => set('demarcacion', e.target.value as Demarcacion)}>
                    {DEMARCACIONES_ITEMS.map((d) => (
                      <option key={d.posicion} value={d.posicion}>{d.posicion}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Otra Demarcación</label>
                  <input type="text" className="form-input" placeholder="Opcional"
                    value={form.otraDemarcacion ?? ''} onChange={(e) => set('otraDemarcacion', e.target.value)} />
                </div>
              </div>
              {itemsDemarc.length > 0 && (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-gray-500 font-medium">Evalúa cada ítem (1-5):</p>
                  {itemsDemarc.map((item, i) => {
                    const colors = ['#1a3a6b', '#c0392b', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4']
                    return (
                      <ScoreSlider
                        key={i}
                        label={item}
                        value={tecValues[i]}
                        max={5}
                        onChange={(v) => setTec(`item${i + 1}` as keyof EvaluacionDemarcacion, v)}
                        color={colors[i % colors.length]}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* PASO 5: Evaluación Final */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-700 mb-4">Evaluación Final</h2>
              <div>
                <label className="form-label">Valoración General</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => set('valoracionGeneral', n)}
                      className={`text-2xl transition-transform hover:scale-110 ${n <= (form.valoracionGeneral ?? 3) ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 ml-2 self-center">
                    {form.valoracionGeneral ?? 3}/5
                  </span>
                </div>
              </div>
              <div>
                <label className="form-label">Propuesta</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {PROPUESTAS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => set('propuesta', p.value)}
                      className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        form.propuesta === p.value
                          ? p.color === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                          : p.color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : p.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Descripción de la Jugadora</label>
                <textarea rows={3} className="form-input resize-none"
                  placeholder="Describe las características principales de la jugadora..."
                  value={form.descripcionJugadora ?? ''} onChange={(e) => set('descripcionJugadora', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Observaciones</label>
                <textarea rows={2} className="form-input resize-none"
                  placeholder="Notas adicionales..."
                  value={form.observaciones ?? ''} onChange={(e) => set('observaciones', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Cierre</label>
                <textarea rows={2} className="form-input resize-none"
                  placeholder="Resumen final..."
                  value={form.cierre ?? ''} onChange={(e) => set('cierre', e.target.value)} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            {step < 5 ? (
              <button onClick={nextStep} className="btn-primary flex items-center gap-2">
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isEdit ? 'Actualizar Ficha' : 'Guardar Ficha'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar radar */}
        <div className="hidden lg:block w-56 space-y-4">
          {step === 3 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 mb-2 text-center">Físico</p>
              <RadarChart
                labels={['Fuerza', 'Velocidad', 'Resistencia']}
                values={[form.fuerza ?? 5, form.velocidad ?? 5, form.resistencia ?? 5]}
                max={10}
                color="#1a3a6b"
              />
            </div>
          )}
          {step === 4 && itemsDemarc.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 mb-2 text-center">{form.demarcacion}</p>
              <RadarChart
                labels={itemsDemarc}
                values={tecValues}
                max={5}
                color="#c0392b"
              />
            </div>
          )}
          {(step === 1 || step === 2 || step === 5) && (
            <div className="card text-center text-gray-400 text-xs p-4">
              <p>Los gráficos radar aparecerán en los pasos de evaluación física y técnica.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
