import { useRef, useState } from 'react'
import { Sun, Cloud, CloudRain, CloudLightning, Shirt, MapPin, Clock } from 'lucide-react'
import { uploadInformeArchivo } from '../../../lib/supabase'
import type { PartidoInforme, CondicionAtmosferica } from '../../../types'

const CONDICIONES: { value: CondicionAtmosferica; label: string; icon: React.ElementType }[] = [
  { value: 'soleado', label: 'Soleado', icon: Sun },
  { value: 'nublado', label: 'Nublado', icon: Cloud },
  { value: 'lluvia', label: 'Lluvia', icon: CloudRain },
  { value: 'tormenta', label: 'Tormenta', icon: CloudLightning },
]

interface Props {
  partido: PartidoInforme
  onUpdate: (patch: Partial<PartidoInforme>) => void
}

function ImageUploadField({ label, url, onUpload }: { label: string; url: string; onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-rfpaf-blue transition-colors flex items-center justify-center overflow-hidden bg-gray-50 disabled:opacity-50"
      >
        {url ? <img src={url} alt={label} className="w-full h-full object-contain p-2" /> : <Shirt className="w-8 h-8 text-gray-300" />}
      </button>
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]; e.target.value = ''
          if (!file) return
          setUploading(true)
          await onUpload(file)
          setUploading(false)
        }}
      />
    </div>
  )
}

export default function DatosPartidoSection({ partido, onUpdate }: Props) {
  const handleUpload = async (file: File, field: 'equipacionLocalUrl' | 'equipacionVisitanteUrl' | 'campoFotoUrl') => {
    const url = await uploadInformeArchivo(file, partido.informeId)
    if (url) onUpdate({ [field]: url })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-bold text-rfpaf-blue mb-4">Datos del Partido</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipaciones */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Equipaciones</p>
          <div className="grid grid-cols-2 gap-3">
            <ImageUploadField label="Local" url={partido.equipacionLocalUrl} onUpload={(f) => handleUpload(f, 'equipacionLocalUrl')} />
            <ImageUploadField label="Visitante" url={partido.equipacionVisitanteUrl} onUpload={(f) => handleUpload(f, 'equipacionVisitanteUrl')} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Condiciones atmosféricas</p>
            <div className="flex gap-2">
              {CONDICIONES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => onUpdate({ condiciones: value })}
                  title={label}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${
                    partido.condiciones === value ? 'border-rfpaf-blue bg-rfpaf-blue/5 text-rfpaf-blue' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Hora
              </label>
              <input
                type="time"
                value={partido.horaPartido}
                onChange={(e) => onUpdate({ horaPartido: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fecha</label>
              <input
                type="date"
                value={partido.fechaPartido}
                onChange={(e) => onUpdate({ fechaPartido: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Campo
            </label>
            <input
              value={partido.campoNombre}
              onChange={(e) => onUpdate({ campoNombre: e.target.value })}
              placeholder="Nombre del campo"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none mb-2"
            />
            <ImageUploadField label="Foto del campo" url={partido.campoFotoUrl} onUpload={(f) => handleUpload(f, 'campoFotoUrl')} />
          </div>
        </div>
      </div>
    </div>
  )
}
