import { Outlet, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import RFPAFLogo from '../RFPAFLogo'
import { useStore } from '../../store/useStore'

export default function AppLayout() {
  const { currentObservador } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!currentObservador) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior móvil */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-rfpaf-blue px-4 py-3 shadow-md">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white p-1 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
          <RFPAFLogo />
          <div className="flex-1 leading-tight text-right">
            <p className="text-white font-bold text-sm tracking-wide">STAFF LAB</p>
            <p className="text-white text-[8px] font-semibold uppercase">Real Federación de Fútbol</p>
            <div className="border-t border-white/40 my-0.5" />
            <p className="text-white text-[8px] uppercase">Principado de Asturias</p>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
