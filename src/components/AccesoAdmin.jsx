import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Cargando, Aviso } from './Base'

/**
 * Estado de la sesión de administrador.
 *   undefined = todavía averiguando
 *   null      = no hay sesión
 *   objeto    = sesión activa
 */
export function useSesionAdmin() {
  const [sesion, setSesion] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return sesion
}

/** Formulario de acceso. Lo comparten el panel y la pantalla del juego. */
export function LoginAdmin({ titulo = 'Panel de administración' }) {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setError(''); setEnviando(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
    setEnviando(false)
    if (err) setError('Correo o contraseña incorrectos.')
  }

  return (
    <form className="col stack gap-24 pt-44" onSubmit={entrar}>
      <div className="stack gap-8">
        <p className="eyebrow">Acceso restringido</p>
        <h2 className="h2">{titulo}</h2>
      </div>
      <div className="stack gap-16">
        <div className="field">
          <label htmlFor="a-correo">Correo</label>
          <input id="a-correo" type="email" autoComplete="username"
                 value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="a-clave">Contraseña</label>
          <input id="a-clave" type="password" autoComplete="current-password"
                 value={clave} onChange={(e) => setClave(e.target.value)} required />
        </div>
      </div>
      {error && <Aviso>{error}</Aviso>}
      <button className="btn" type="submit" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

/** Envuelve una pantalla que solo puede ver el administrador. */
export function SoloAdmin({ titulo, children }) {
  const sesion = useSesionAdmin()
  if (sesion === undefined) return <div className="col"><Cargando /></div>
  if (!sesion) return <LoginAdmin titulo={titulo} />
  return children
}
