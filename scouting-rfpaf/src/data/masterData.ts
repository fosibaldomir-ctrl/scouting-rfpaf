import type { Club, CategoriaItem, Observador, ItemDemarcacion, Categoria } from '../types'

export const OBSERVADORES: Observador[] = [
  { id: '191cb4b1', nombre: 'PARRA' },
  { id: 'b1d51dcf', nombre: 'ADRIAN' },
  { id: 'c5f7bcab', nombre: 'MARIANO' },
  { id: '92ae8d82', nombre: 'JULIO' },
  { id: 'da369f04', nombre: 'BALDOMIR' },
]

export const CATEGORIAS: CategoriaItem[] = [
  { id: 'SDER34', nombre: '1ª REF' },
  { id: 'SDER35', nombre: '2ª REF' },
  { id: 'SDER36', nombre: '3ª REF' },
  { id: 'SDER38', nombre: '1ª ASTURFUTBOL' },
  { id: 'SDER39', nombre: '2ª ASTURFUTBOL' },
  { id: '3c06b540', nombre: 'INFANTIL' },
  { id: 'b674fee9', nombre: 'ALEVIN' },
  { id: 'a695572c', nombre: 'BENJAMIN' },
  { id: '651c64aa', nombre: '3ª CADETE' },
]

export const CLUBES: Club[] = [
  { id: 'e4df12fa', nombre: 'REAL SPORTING DE GIJON' },
  { id: 'dfbe2763', nombre: 'REAL OVIEDO' },
  { id: 'da499e2b', nombre: 'GIJON FUTBOL FEMENINO' },
  { id: '149f0c6c', nombre: "L'ENTREGU" },
  { id: '192e26c2', nombre: 'REAL AVILES INDUSTRIAL' },
  { id: 'c043c32c', nombre: 'UD LLANERA' },
  { id: 'a4249b23', nombre: 'HISPANO DE CASTRILLON' },
  { id: '7a0c8a1c', nombre: 'CD COVADONGA' },
  { id: '86f701ec', nombre: 'CD GIJON PERCHERA' },
  { id: 'e2399756', nombre: 'CD MANUEL RUBIO' },
  { id: '9c3aa063', nombre: 'CD SAN JORGE' },
  { id: '259d325c', nombre: 'VILLA DE PRAVIA' },
  { id: '871bf3e9', nombre: 'CD LLANES' },
  { id: 'a001', nombre: 'CD LUARCA' },
  { id: 'a002', nombre: 'NAVIA CF' },
  { id: 'a003', nombre: 'CD CANGAS DEL NARCEA' },
  { id: 'a004', nombre: 'UD TUILLA' },
  { id: 'a005', nombre: 'LANGREO CF' },
  { id: 'a006', nombre: 'UD POLA DE LAVIANA' },
  { id: 'a007', nombre: 'CD MIERES' },
  { id: 'a008', nombre: 'CD ALLER' },
  { id: 'a009', nombre: 'SD BIMENES' },
  { id: 'a010', nombre: 'CD SARIEGO' },
  { id: 'a011', nombre: 'UD SIERO' },
  { id: 'a012', nombre: 'CD NOREÑA' },
  { id: 'a013', nombre: 'CD CASTRILLON' },
  { id: 'a014', nombre: 'CD PRAVIANO' },
  { id: 'a015', nombre: 'UD GRADO' },
  { id: 'a016', nombre: 'CD SALAS' },
  { id: 'a017', nombre: 'CD ALLANDE' },
  { id: 'a018', nombre: 'CD TINEO' },
  { id: 'a019', nombre: 'CD DEGAÑA' },
  { id: 'a020', nombre: 'UD TAPIA' },
  { id: 'a021', nombre: 'CD CASTROPOL' },
  { id: 'a022', nombre: 'CD VEGADEO' },
  { id: 'a023', nombre: 'SD GRANDAS' },
  { id: 'a024', nombre: 'CD IBIAS' },
  { id: 'a025', nombre: 'COLUNGA CF' },
  { id: 'a026', nombre: 'CD RIBADESELLA' },
  { id: 'a027', nombre: 'CD ARRIONDAS' },
  { id: 'a028', nombre: 'CD CANGAS DE ONIS' },
  { id: 'a029', nombre: 'CD CASO' },
  { id: 'a030', nombre: 'CD SOBRESCOBIO' },
  { id: 'a031', nombre: 'UD CARREÑO' },
  { id: 'a032', nombre: 'CD CORVERA' },
  { id: 'a033', nombre: 'CD ILLAS' },
  { id: 'a034', nombre: 'CD MUROS DE NALON' },
  { id: 'a035', nombre: 'PRAVIA CF' },
  { id: 'a036', nombre: 'CD SOTO DEL BARCO' },
  { id: 'a037', nombre: 'UD CUDILLERO' },
  { id: 'a038', nombre: 'CD VALDÉS' },
  { id: 'a039', nombre: 'CD EL FRANCO' },
  { id: 'a040', nombre: 'CD COAÑA' },
  { id: 'a041', nombre: 'CD BOAL' },
  { id: 'a042', nombre: 'CD PEZOS' },
  { id: 'a043', nombre: 'CD GRANDAS DE SALIME' },
  { id: 'a044', nombre: 'PILONA CF' },
  { id: 'a045', nombre: 'CD PARRES' },
  { id: 'a046', nombre: 'CD AMIEVA' },
  { id: 'a047', nombre: 'UD PONGA' },
  { id: 'a048', nombre: 'CD ONÍS' },
  { id: 'a049', nombre: 'UD PEÑAMELLERA' },
  { id: 'a050', nombre: 'CD RIBADEDEVA' },
  { id: 'a051', nombre: 'OTHAYA CF' },
]

export const DEMARCACIONES_ITEMS: ItemDemarcacion[] = [
  {
    posicion: 'PORTERO',
    items: ['Comunicación', 'Golpeo Corto', 'Golpeo Largo', 'Bajo Palos', '1 contra 1', 'Balones Laterales'],
  },
  {
    posicion: 'LATERAL',
    items: ['Manejo', 'Recorrido', 'Centro', 'Duelos', 'Duelos Aéreos', 'Frontal'],
  },
  {
    posicion: 'CENTRAL',
    items: ['Salida de Balón', 'Pase Largo', 'Conducción', 'Duelos', 'Duelos Aéreos', 'Frontal'],
  },
  {
    posicion: 'MEDIO CENTRO DEF.',
    items: ['Pases Cercanos', 'Pases Lejanos', 'Pausa', 'Equilibrio', 'Colocación', 'Duelos'],
  },
  {
    posicion: 'MEDIO CENTRO OF.',
    items: ['Manejo', 'Llegada', 'Último Pase', 'Remate', 'Interpretación', 'Ayudas'],
  },
  {
    posicion: 'INTERIOR',
    items: ['Duelos', 'Llegada', 'Centro', 'Manejo', 'Interpretación', 'Ayudas'],
  },
  {
    posicion: 'MEDIA PUNTA',
    items: ['Manejo', 'Llegada', 'Último Pase', 'Remate', 'Interpretación', 'Ayudas'],
  },
  {
    posicion: 'EXTERIOR',
    items: ['Duelos', 'Llegada', 'Centro', 'Manejo', 'Interpretación', 'Ayudas'],
  },
  {
    posicion: 'DELANTERO',
    items: ['Juego de Espaldas', 'Remate', 'Tiro', 'Desmarque', 'Interpretación', 'Ayudas'],
  },
]

export const ALTURAS = Array.from({ length: 61 }, (_, i) => {
  const cm = 130 + i
  return { value: `${(cm / 100).toFixed(2)}`, label: `${(cm / 100).toFixed(2)} m (${cm} cm)` }
})

export const TIPOLOGIAS = ['FUERTE', 'ATLÉTICA', 'DELGADA']
export const LATERALIDADES = ['DIESTRA', 'ZURDA', 'AMBIDIESTRA']
export const PROPUESTAS: { value: string; label: string; color: string }[] = [
  { value: 'SELECCIÓN', label: 'SELECCIÓN', color: 'green' },
  { value: 'INCORPORAR', label: 'INCORPORAR', color: 'blue' },
  { value: 'SEGUIR', label: 'SEGUIR', color: 'yellow' },
  { value: 'DESCARTAR', label: 'DESCARTAR', color: 'red' },
]

export const getCategoriaLabel = (id: string): Categoria | undefined =>
  CATEGORIAS.find(c => c.id === id)?.nombre

export const getItemsDemarcacion = (demarcacion: string): string[] => {
  const found = DEMARCACIONES_ITEMS.find(d => d.posicion === demarcacion)
  return found ? [...found.items] : []
}
