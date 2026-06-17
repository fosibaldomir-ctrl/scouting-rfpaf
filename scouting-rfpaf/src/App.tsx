import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import AppLayout from './components/layout/AppLayout'
import SplashScreen from './components/SplashScreen'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaFicha from './pages/NuevaFicha'
import BaseDatos from './pages/BaseDatos'
import FichaJugadora from './pages/FichaJugadora'
import Campograma from './pages/Campograma'
import Calendario from './pages/Calendario'
import Entrenamientos from './pages/Entrenamientos'
import Convocatorias from './pages/Convocatorias'
import Admin from './pages/Admin'
import PintadoAcciones from './pages/PintadoAcciones'

function AppContent() {
  useSupabaseSync()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && <SplashScreen />}
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
          <Route path="/convocatorias" element={<Convocatorias />} />
          <Route path="/ficha/:id" element={<FichaJugadora />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/analisis-lab" element={<PintadoAcciones />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
