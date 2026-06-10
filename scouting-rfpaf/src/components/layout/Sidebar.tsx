import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Database, PlusCircle, Settings, LogOut, LayoutGrid } from 'lucide-react'
import { useStore } from '../../store/useStore'
import RFPAFLogo from '../RFPAFLogo'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/nueva-ficha', icon: PlusCircle, label: 'Nueva Ficha' },
  { to: '/base-datos', icon: Database, label: 'Base de Datos' },
  { to: '/campograma', icon: LayoutGrid, label: 'Campograma' },
  { to: '/admin', icon: Settings, label: 'Administración' },
]

export default function Sidebar() {
  const { currentObservador, observadores, logout } = useStore()
  const navigate = useNavigate()
  const obs = observadores.find((o) => o.id === currentObservador)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-rfpaf-blue min-h-screen flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <RFPAFLogo />
        <div>
          <p className="text-white font-bold text-sm leading-tight">RFPAF</p>
          <p className="text-white/60 text-xs">Scouting</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
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
          <div className="w-8 h-8 bg-rfpaf-red rounded-full flex items-center justify-center text-white text-xs font-bold">
            {obs?.nombre?.charAt(0) ?? '?'}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{obs?.nombre ?? 'Usuario'}</p>
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
  )
}
