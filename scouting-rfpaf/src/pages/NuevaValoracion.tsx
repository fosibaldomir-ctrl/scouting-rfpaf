import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { DEMARCACIONES_ITEMS } from '../data/masterData'
import { DatosPartidoFields, FisicoFields, EvaluacionTecnicaFields, CierreFields, type DatosPartidoValue, type CierreValue } from '../components/ficha/ValoracionFields'
import type { Valoracion, EvaluacionDemarcacion } from '../types'

const emptyValoracion = (): Partial<Valoracion> => ({
  fechaPartido: new Date().toISOString().split('T')[0],
  local: '',
  visitante: '',
  categoria: undefined,
  observador: '',
  fuerza: 5,
  velocidad: 5,
  resistencia: 5,
  evaluacionTecnica: { item1: 3, item2: 3, item3: 3, item4: 3, item5: 3, item6: 3 },
  valoracionGeneral: 3,
  propuesta: 'SEGUIR',
  descripcionJugadora: '',
  observaciones: '',
  cierre: '',
})

export default function NuevaValoracion() {
  const { fichaId, valoracionId } = useParams()
  const navigate = useNavigate()
  const { getFicha, clubes, categorias, observadores, currentObservador, addValoracion, updateValoracion } = useStore()

  const ficha = getFicha(fichaId ?? '')
  const isEdit = Boolean(valoracionId)
  const existing = isEdit ? ficha?.valoraciones.find((v) => v.id === valoracionId) : undefined

  const [form, setForm] = useState<Partial<Valoracion>>(emptyValoracion())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (existing) setForm(existing)
    else if (!isEdit && currentObservador) setForm((f) => ({ ...f, observador: currentObservador }))
  }, [existing, isEdit, currentObservador])

  const setPatch = (patch: Record<string, unknown>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => {
      const n = { ...e }
      for (const k of Object.keys(patch)) delete n[k]
      return n
    })
  }

  const setTec = (key: keyof EvaluacionDemarcacion, val: number) => {
    setForm((f) => ({
      ...f,
      evaluacionTecnica: { ...(f.evaluacionTecnica ?? { item1: 3, item2: 3, item3: 3, item4: 3, item5: 3, item6: 3 }), [key]: val },
    }))
  }

  if (!ficha) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="text-gray-500 mb-4">Ficha no encontrada.</p>
        <button onClick={() => navigate('/base-datos')} className="btn-primary">Volver</button>
      </div>
    )
  }

  if (isEdit && !existing) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="text-gray-500 mb-4">Esa valoración no existe (puede que ya se haya eliminado).</p>
        <button onClick={() => navigate(`/ficha/${ficha.id}`)} className="btn-primary">Volver a la ficha</button>
      </div>
    )
  }

  const clubNombre = clubes.find((c) => c.id === ficha.club)?.nombre ?? ficha.equipo ?? ficha.club
  const itemsDemarc = DEMARCACIONES_ITEMS.find((d) => d.posicion === ficha.demarcacion)?.items ?? []

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.fechaPartido) errs.fechaPartido = 'Obligatorio'
    if (!form.categoria) errs.categoria = 'Obligatorio'
    if (!form.local?.trim()) errs.local = 'Obligatorio'
    if (!form.visitante?.trim()) errs.visitante = 'Obligatorio'
    if (!form.observador) errs.observador = 'Obligatorio'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const now = new Date().toISOString()

    if (isEdit && valoracionId) {
      await updateValoracion(ficha.id, valoracionId, form)
    } else {
      const valoracion: Valoracion = {
        id: uuidv4(),
        fechaPartido: form.fechaPartido ?? '',
        local: form.local ?? '',
        visitante: form.visitante ?? '',
        categoria: form.categoria ?? ficha.categoria,
        observador: form.observador ?? '',
        fuerza: form.fuerza ?? 5,
        velocidad: form.velocidad ?? 5,
        resistencia: form.resistencia ?? 5,
        evaluacionTecnica: form.evaluacionTecnica ?? { item1: 3, item2: 3, item3: 3, item4: 3, item5: 3, item6: 3 },
        valoracionGeneral: form.valoracionGeneral ?? 3,
        propuesta: form.propuesta ?? 'SEGUIR',
        descripcionJugadora: form.descripcionJugadora ?? '',
        observaciones: form.observaciones ?? '',
        cierre: form.cierre ?? '',
        creadoEn: now,
      }
      await addValoracion(ficha.id, valoracion)
    }
    setSaved(true)
    setTimeout(() => navigate(`/ficha/${ficha.id}`), 1200)
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <p className="text-xl font-bold text-gray-700">Valoración guardada correctamente</p>
        </div>
      </div>
    )
  }

  const datosPartidoValue: DatosPartidoValue = {
    fechaPartido: form.fechaPartido ?? '',
    categoria: form.categoria ?? '',
    local: form.local ?? '',
    visitante: form.visitante ?? '',
    observador: form.observador ?? '',
  }

  const cierreValue: CierreValue = {
    valoracionGeneral: form.valoracionGeneral ?? 3,
    propuesta: form.propuesta ?? 'SEGUIR',
    descripcionJugadora: form.descripcionJugadora ?? '',
    observaciones: form.observaciones ?? '',
    cierre: form.cierre ?? '',
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/ficha/${ficha.id}`)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-rfpaf-blue">
            {isEdit ? 'Editar valoración' : 'Nueva valoración'}
          </h1>
          <p className="text-gray-500 text-sm">
            {ficha.nombre} {ficha.primerApellido} {ficha.segundoApellido} · {clubNombre}
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-gray-700">Datos del Partido</h2>
        <DatosPartidoFields
          value={datosPartidoValue}
          onChange={setPatch}
          errors={errors}
          categorias={categorias}
          clubes={clubes}
          observadores={observadores}
        />
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-gray-700">Valoración Física (1-10)</h2>
        <FisicoFields
          value={{
            fuerza: form.fuerza ?? 5,
            velocidad: form.velocidad ?? 5,
            resistencia: form.resistencia ?? 5,
          }}
          onChange={setPatch}
        />
      </div>

      {itemsDemarc.length > 0 && (
        <div className="card space-y-4">
          <h2 className="text-lg font-bold text-gray-700">Evaluación Técnica · {ficha.demarcacion}</h2>
          <EvaluacionTecnicaFields
            itemsDemarc={itemsDemarc}
            values={form.evaluacionTecnica ?? { item1: 3, item2: 3, item3: 3, item4: 3, item5: 3, item6: 3 }}
            onChange={setTec}
          />
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Cierre</h2>
        <CierreFields value={cierreValue} onChange={setPatch} />
      </div>

      <button onClick={handleSubmit} className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        {isEdit ? 'Actualizar valoración' : 'Guardar valoración'}
      </button>
    </div>
  )
}
