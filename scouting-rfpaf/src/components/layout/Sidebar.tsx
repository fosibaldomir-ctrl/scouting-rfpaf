import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Database, PlusCircle, Settings, LogOut, LayoutGrid, X, CalendarDays } from 'lucide-react'
import { useStore } from '../../store/useStore'
import RFPAFLogo from '../RFPAFLogo'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/nueva-ficha', icon: PlusCircle, label: 'Nueva Ficha' },
  { to: '/base-datos', icon: Database, label: 'Base de Datos' },
  { to: '/campograma', icon: LayoutGrid, label: 'Campograma' },
  { to: '/calendario', icon: CalendarDays, label: 'Calendario' },
  { to: '/admin', icon: Settings, label: 'Administración' },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { currentObservador, observadores, logout } = useStore()
  const navigate = useNavigate()
  const obs = observadores.find((o) => o.id === currentObservador)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Fondo oscuro al abrir el menú en móvil */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 bg-rfpaf-blue flex flex-col shadow-xl z-50 fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:transform-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Branding (escudo izquierda, texto derecha) */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <RFPAFLogo />
          <div className="flex-1 leading-tight text-right">
            <p className="text-white font-bold text-base tracking-wide">STAFF LAB</p>
            <p className="text-white text-[8px] font-semibold uppercase leading-snug whitespace-nowrap">Real Federación de Fútbol</p>
            <div className="border-t border-white/40 my-0.5" />
            <p className="text-white text-[8px] uppercase leading-snug whitespace-nowrap">Principado de Asturias</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-rfpaf-blue shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-rfpaf-red rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {obs?.nombre?.charAt(0) ?? '?'}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-white text-sm font-semibold truncate">{obs?.nombre ?? 'Usuario'}</p>
              <p className="text-white/50 text-xs">Observador</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  )
}
