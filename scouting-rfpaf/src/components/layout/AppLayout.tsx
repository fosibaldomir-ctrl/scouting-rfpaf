import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useStore } from '../../store/useStore'

export default function AppLayout() {
  const { currentObservador } = useStore()

  if (!currentObservador) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
