import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaFicha from './pages/NuevaFicha'
import BaseDatos from './pages/BaseDatos'
import FichaJugadora from './pages/FichaJugadora'
import Campograma from './pages/Campograma'
import Calendario from './pages/Calendario'
import Entrenamientos from './pages/Entrenamientos'
import Admin from './pages/Admin'

function AppContent() {
  useSupabaseSync()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/nueva-ficha" element={<NuevaFicha />} />
        <Route path="/editar/:id" element={<NuevaFicha />} />
        <Route path="/base-datos" element={<BaseDatos />} />
        <Route path="/campograma" element={<Campograma />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/entrenamientos" element={<Entrenamientos />} />
        <Route path="/ficha/:id" element={<FichaJugadora />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
