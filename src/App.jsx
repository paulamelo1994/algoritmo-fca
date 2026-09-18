import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AppBar } from './components/Base'

import Bienvenida from './pages/Bienvenida'
import Registro from './pages/Registro'
import Cuestionario from './pages/Cuestionario'
import Procesando from './pages/Procesando'
import Resultado from './pages/Resultado'
import Entrar from './pages/Entrar'
import Admin from './pages/Admin'
import AdminSecreto from './pages/AdminSecreto'

/* ---------- Sesión del participante (sin login) ---------- */
const CLAVE = 'algoritmo-fca:sesion'

export function leerSesion() {
  try {
    const raw = localStorage.getItem(CLAVE)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function guardarSesion(sesion) {
  try { localStorage.setItem(CLAVE, JSON.stringify(sesion)) } catch { /* modo privado */ }
}
export function borrarSesion() {
  try { localStorage.removeItem(CLAVE) } catch { /* modo privado */ }
}

/* ---------- Configuración global ---------- */
const CtxConfig = createContext({ config: null, recargar: () => {} })
export const useConfig = () => useContext(CtxConfig)

/* ---------- Borrador del registro, entre pantallas ---------- */
const CtxBorrador = createContext(null)
export const useBorrador = () => useContext(CtxBorrador)

export default function App() {
  const [config, setConfig] = useState(null)
  const [borrador, setBorrador] = useState({ datos: null, respuestas: {} })
  const location = useLocation()

  const recargar = useCallback(async () => {
    const { data, error } = await supabase.rpc('config_publica')
    if (error) {
      console.error('No se pudo leer la configuración:', error.message)
      setConfig({ error: true })
    } else {
      setConfig(data)
    }
  }, [])

  useEffect(() => { recargar() }, [recargar])

  // Al volver a la pestaña, revisar si el administrador encendió la revelación.
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') recargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [recargar])

  const esAdmin = location.pathname.startsWith('/admin')

  return (
    <CtxConfig.Provider value={{ config, recargar }}>
      <CtxBorrador.Provider value={{ borrador, setBorrador }}>
        <AppBar derecha={esAdmin ? 'Panel de administración' : 'Amor y Amistad 2026'} />
        <main>
          <Routes>
            <Route path="/" element={<Bienvenida />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/cuestionario" element={<Cuestionario />} />
            <Route path="/procesando" element={<Procesando />} />
            <Route path="/resultado" element={<Resultado />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/secreto" element={<AdminSecreto />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </CtxBorrador.Provider>
    </CtxConfig.Provider>
  )
}
