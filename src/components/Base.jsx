import { urlFoto } from '../lib/supabase'
import { colorDe, nivel } from '../lib/escala'
import { emojiDe } from '../lib/preguntas'
import logo from '../assets/logo-fca.png'

export function AppBar({ derecha = 'Amor y Amistad 2026' }) {
  return (
    <header className="appbar">
      <div className="appbar__inner">
        <img src={logo} alt="Universidad del Valle — Facultad de Ciencias de la Administración" />
        <span className="appbar__right">{derecha}</span>
      </div>
    </header>
  )
}

/**
 * Avatar de una persona. Si no subió foto, muestra el emoji que eligió
 * en la primera pregunta sobre un círculo de color derivado del nombre,
 * para que la galería no se vea rota sino intencional.
 */
export function Avatar({ persona, tam = 'md' }) {
  const src = urlFoto(persona?.foto_path)
  const nombre = persona?.nombre ?? ''
  const fondo = colorDe(nombre)

  // En la base de datos se guarda la ETIQUETA de la opción ("Cafetero"),
  // no el carácter, porque es la etiqueta la que compara el algoritmo.
  // Aquí se traduce al emoji; si ya viniera un carácter, se usa tal cual.
  const glifo = emojiDe('emoji', persona?.emoji) ?? persona?.emoji ?? nombre.charAt(0) ?? '🙂'

  return (
    <div className={`avatar avatar--${tam}`} style={{ background: src ? 'var(--quiet)' : fondo }}>
      {src
        ? <img src={src} alt="" loading="lazy" />
        : <span aria-hidden="true">{glifo}</span>}
    </div>
  )
}

export function Badge({ pct }) {
  const n = nivel(pct)
  return <span className="badge" style={{ background: n.color }}>{n.emoji} {n.label}</span>
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="stack gap-16" style={{ alignItems: 'center', padding: '56px 0' }}>
      <div className="spinner" role="status" aria-label={texto} />
      <p className="small">{texto}</p>
    </div>
  )
}

export function Aviso({ children, tono = 'alerta' }) {
  return <div className={tono === 'ok' ? 'aviso aviso--ok' : 'aviso'} role="status">{children}</div>
}
