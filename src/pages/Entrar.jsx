import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { guardarSesion } from '../App'
import { Aviso } from '../components/Base'

/**
 * "Ya me registré" desde otro dispositivo. No hay login: el correo
 * identifica y la fecha de cumpleaños hace de segundo factor sencillo.
 */
export default function Entrar() {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [cumpleanos, setCumpleanos] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const listo = correo.trim() !== '' && cumpleanos !== ''

  async function entrar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { data, error: err } = await supabase.rpc('recuperar_codigo', {
      p_correo: correo.trim().toLowerCase(),
      p_cumpleanos: cumpleanos,
    })
    setEnviando(false)

    if (err) { setError('No pudimos conectarnos. Revisa tu internet e intenta otra vez.'); return }
    if (data?.error === 'no_encontrado') {
      setError('No encontramos a nadie con ese correo y esa fecha de cumpleaños. Revisa los dos datos.')
      return
    }
    guardarSesion({ correo: correo.trim().toLowerCase(), codigo: data.codigo })
    navigate('/resultado', { replace: true })
  }

  return (
    <form className="col stack gap-24 pt-36" onSubmit={entrar}>
      <div className="stack gap-8">
        <p className="eyebrow">Volver a entrar</p>
        <h2 className="h2">Recupera tu resultado</h2>
        <p className="small">Con el correo con el que te registraste y tu fecha de cumpleaños.</p>
      </div>

      <div className="stack gap-16">
        <div className="field">
          <label htmlFor="e-correo">Correo institucional</label>
          <input
            id="e-correo" type="email" autoComplete="email" inputMode="email"
            placeholder="nombre.apellido@correounivalle.edu.co"
            value={correo} onChange={(ev) => setCorreo(ev.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="e-cumple">Fecha de cumpleaños</label>
          <input
            id="e-cumple" type="date"
            value={cumpleanos} onChange={(ev) => setCumpleanos(ev.target.value)}
          />
        </div>
      </div>

      {error && <Aviso>{error}</Aviso>}

      <div className="stack gap-12">
        <button className="btn" type="submit" disabled={!listo || enviando}>
          {enviando ? 'Buscando…' : 'Ver mi resultado'}
        </button>
        <button className="btn btn--quiet" type="button" onClick={() => navigate('/')}>Volver</button>
      </div>
    </form>
  )
}
