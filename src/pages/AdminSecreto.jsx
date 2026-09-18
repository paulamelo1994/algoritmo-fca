import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Avatar, Cargando, Aviso } from '../components/Base'
import { SoloAdmin } from '../components/AccesoAdmin'
import { emojiDe } from '../lib/preguntas'

/**
 * Fase 4 — «¿Quién es?»
 *
 * Muestra al azar la respuesta abierta de alguien a «Algo que pocas
 * personas de la Facultad saben de mí», sin decir de quién es. El
 * equipo adivina y el administrador revela.
 *
 * Dos botones a propósito:
 *   · Revelar a la persona → el desenlace normal.
 *   · Buscar otra respuesta → la salida cuando lo que salió en
 *     pantalla es delicado y es mejor no exponerlo. La descartada
 *     no vuelve a aparecer en toda la sesión.
 */
export default function AdminSecreto() {
  return <SoloAdmin titulo="¿Quién es?"><Juego /></SoloAdmin>
}

/* ---------------------------------------------------------------- */

/** Cuántas pistas se ven al abrir cada respuesta. El resto salen con el botón. */
const PISTAS_AL_INICIO = 0

const minus = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t)
// Las opciones vienen capitalizadas («Juegos de mesa»); a mitad de
// frase hay que bajarles la inicial para que la pista se lea natural.
const lista = (a) => (a ?? []).map(minus).join(' y ')

/**
 * Convierte las respuestas de una persona en frases para el juego.
 * Se evita la dependencia: en una facultad pequeña sería regalar la
 * respuesta. Las que podrían quedar mal redactadas según la opción
 * («Cambiaría cada semana», «Maneja los contactos») usan dos puntos
 * en vez de armar una frase.
 */
function construirPistas(r) {
  const p = []
  const add = (idPregunta, valor, texto) => {
    const v = Array.isArray(valor) ? valor[0] : valor
    if (!v) return
    p.push({ emoji: emojiDe(idPregunta, v) ?? '•', texto })
  }

  add('superpoder',  r.superpoder,  `Su superpoder: ${minus(r.superpoder ?? '')}`)
  add('kriptonita',  r.kriptonita,  `Su kriptonita: ${r.kriptonita}`)
  add('combustible', r.combustible, `Necesita ${lista(r.combustible)} para una jornada perfecta`)
  add('genero',      r.genero,      `Su música es ${minus(r.genero ?? '')}`)
  add('pelicula',    r.pelicula,    `En cine escoge ${minus(r.pelicula ?? '')}`)
  add('lugar',       r.lugar,       `Su lugar ideal para trabajar: ${minus(r.lugar ?? '')}`)
  add('domingo',     r.domingo,     `Su plan de domingo: ${minus(r.domingo ?? '')}`)
  add('plan_equipo', r.plan_equipo, `Con el equipo escogería ${lista(r.plan_equipo)}`)
  add('personaje',   r.personaje,   `En la película de la Facultad sería ${minus(r.personaje ?? '')}`)
  add('cualidad',    r.cualidad,    `Lo que más valora: ${lista(r.cualidad)}`)
  add('emoji',       r.emoji,       `Se define como «${r.emoji}»`)

  return barajar(p)
}

function barajar(lista) {
  const a = lista.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Juego() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pila, setPila] = useState([])        // las que faltan por salir
  const [actual, setActual] = useState(null)
  const [revelado, setRevelado] = useState(false)
  const [jugadas, setJugadas] = useState(0)   // reveladas
  const [saltadas, setSaltadas] = useState(0) // descartadas por delicadas
  const [total, setTotal] = useState(0)
  const [pistas, setPistas] = useState(PISTAS_AL_INICIO)

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    const [{ data: rs, error: e1 }, { data: ps, error: e2 }] = await Promise.all([
      supabase.from('respuestas').select('*'),
      supabase.from('participantes').select('correo,nombre,dependencia,foto_path'),
    ])
    if (e1 || e2) {
      setError('No pudimos cargar las respuestas. Revisa tu conexión.')
      setCargando(false); return
    }

    const porCorreo = Object.fromEntries((ps ?? []).map((p) => [p.correo, p]))
    const conSecreto = (rs ?? [])
      .filter((r) => (r.secreto ?? '').trim().length > 0)
      .map((r) => ({
        correo: r.correo,
        secreto: r.secreto.trim(),
        emoji: r.emoji,
        pistas: construirPistas(r),
        ...(porCorreo[r.correo] ?? { nombre: '—' }),
      }))

    const mezcladas = barajar(conSecreto)
    setTotal(mezcladas.length)
    setActual(mezcladas[0] ?? null)
    setPila(mezcladas.slice(1))
    setRevelado(false)
    setPistas(PISTAS_AL_INICIO)
    setJugadas(0); setSaltadas(0)
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function siguiente(motivo) {
    if (motivo === 'revelada') setJugadas((n) => n + 1)
    if (motivo === 'saltada') setSaltadas((n) => n + 1)
    setActual(pila[0] ?? null)
    setPila((p) => p.slice(1))
    setRevelado(false)
    setPistas(PISTAS_AL_INICIO)   // cada persona empieza con las mismas pistas
    window.scrollTo({ top: 0 })
  }

  if (cargando) return <div className="wide"><Cargando texto="Barajando las respuestas…" /></div>

  if (error) {
    return (
      <section className="col stack gap-24 pt-36">
        <Aviso>{error}</Aviso>
        <button className="btn btn--ghost" onClick={cargar}>Reintentar</button>
      </section>
    )
  }

  const restantes = pila.length

  return (
    <section className="wide stack gap-24 pt-28">
      <div className="stack gap-8">
        <p className="eyebrow" style={{ color: 'var(--rojo)' }}>Modo reunión · Fase 4</p>
        <h2 className="h2">¿Quién es?</h2>
        
      </div>

      {total === 0 ? (
        <div className="card card--wash stack gap-12">
          <p className="h3">Todavía no hay respuestas para jugar</p>
          <p className="small">
            Esta pantalla usa la pregunta «Algo que pocas personas de la Facultad saben de mí»,
            que es opcional. Aparecerá aquí cuando alguien la conteste.
          </p>
        </div>
      ) : !actual ? (
        <div className="card card--wash stack gap-16">
          <div className="stack gap-8">
            <p className="h2" style={{ fontSize: 22 }}>Se acabaron las respuestas 🎉</p>
            <p className="small">
              Revelaste {jugadas} {jugadas === 1 ? 'respuesta' : 'respuestas'}
              {saltadas > 0 && ` y dejaste ${saltadas} sin mostrar`}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--sm" onClick={cargar}>Empezar de nuevo</button>
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/admin')}>
              Volver al panel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="stage">
            <p className="stage__kicker" style={{ color: 'var(--morado)' }}>
              Algo que pocas personas de la Facultad saben de mí
            </p>

            <blockquote className="secreto">{actual.secreto}</blockquote>

            {actual.pistas.length > 0 && (
              <ul className="pistas">
                {actual.pistas.slice(0, pistas).map((pi, i) => (
                  <li key={i}>
                    <span className="pistas__emoji" aria-hidden="true">{pi.emoji}</span>
                    <span>{pi.texto}</span>
                  </li>
                ))}
              </ul>
            )}

            {revelado ? (
              <div className="stack gap-12" style={{ alignItems: 'center' }}>
                <hr className="divider" style={{ width: 180 }} />
                <p className="stage__kicker" style={{ color: 'var(--esmeralda)' }}>Era…</p>
                <Avatar persona={actual} tam="xl" />
                <div>
                  <p className="duo__name" style={{ fontSize: 26 }}>{actual.nombre}</p>
                  <p className="duo__area">{actual.dependencia || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="stage__q" aria-hidden="true">?</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!revelado && pistas < actual.pistas.length && (
              <button className="btn btn--ghost btn--sm" onClick={() => setPistas((n) => n + 1)}>
                Dar otra pista
              </button>
            )}
            {!revelado && (
              <button className="btn btn--sm" onClick={() => setRevelado(true)}>
                Revelar a la persona
              </button>
            )}
            <button
              className={revelado ? 'btn btn--sm' : 'btn btn--ghost btn--sm'}
              disabled={restantes === 0 && !revelado}
              onClick={() => siguiente(revelado ? 'revelada' : 'saltada')}
            >
              {revelado ? 'Siguiente respuesta' : 'Buscar otra respuesta'}
            </button>
            <button className="btn btn--quiet btn--sm" onClick={() => navigate('/admin')}>
              Volver al panel
            </button>
          </div>

          <p className="tiny">
            {jugadas} {jugadas === 1 ? 'revelada' : 'reveladas'}
            {saltadas > 0 && ` · ${saltadas} ${saltadas === 1 ? 'descartada' : 'descartadas'}`}
            {' · '}{restantes} {restantes === 1 ? 'pendiente' : 'pendientes'} de {total}
          </p>
        </>
      )}
    </section>
  )
}
