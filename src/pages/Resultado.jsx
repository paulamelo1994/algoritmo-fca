import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { leerSesion, borrarSesion, useConfig } from '../App'
import { Avatar, Badge, Cargando, Aviso } from '../components/Base'
import { nivel, TIPOS_MATCH, formatoFecha } from '../lib/escala'

export default function Resultado() {
  const navigate = useNavigate()
  const { config } = useConfig()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const sesion = leerSesion()

  useEffect(() => {
    if (!sesion?.correo || !sesion?.codigo) { navigate('/', { replace: true }); return }
    let vivo = true
    ;(async () => {
      const { data, error: err } = await supabase.rpc('mi_resumen', {
        p_correo: sesion.correo, p_codigo: sesion.codigo,
      })
      if (!vivo) return
      if (err) { setError('No pudimos conectarnos. Revisa tu internet e intenta otra vez.'); return }
      if (data?.error === 'no_autorizado') {
        borrarSesion()
        setError('No reconocimos tus datos. Vuelve a entrar con tu correo y tu fecha de cumpleaños.')
        return
      }
      if (data?.error === 'sin_respuestas') { setError('Tu perfil está incompleto: no alcanzaste a responder el cuestionario.'); return }
      setDatos(data)
    })()
    return () => { vivo = false }
    // La revelación puede haberse encendido; por eso depende de config.
  }, [sesion?.correo, sesion?.codigo, config?.revelacion_activa, navigate])

  if (error) {
    return (
      <section className="col stack gap-24 pt-36">
        <Aviso>{error}</Aviso>
        <button className="btn btn--ghost" onClick={() => navigate('/entrar')}>Entrar con mi correo</button>
      </section>
    )
  }

  if (!datos) return <div className="col"><Cargando texto="Consultando el algoritmo…" /></div>

  return datos.revelado
    ? <Revelado datos={datos} navigate={navigate} />
    : <EnSuspenso datos={datos} navigate={navigate} />
}

/* ---------------------------------------------------------------- */

function Invitacion({ reunion }) {
  const fecha = formatoFecha(reunion?.fecha)
  const hay = fecha || reunion?.lugar
  return (
    <div className="invite stack gap-12">
      <p className="h2" style={{ fontSize: 20, textAlign: 'center' }}>¿Quieres saber con quién tienes compatibilidad? 💙</p>
      <p className="small">
        No te puedes perder nuestra actividad de Amor y Amistad: Ahí el algoritmo revelará todos los matches de la Facultad.
      </p>
      {hay ? (
        <>
          <hr className="divider" style={{ background: 'rgba(227,6,19,.15)' }} />
          <div className="stack" style={{ gap: 4 }}>
            {fecha && <p className="h3" style={{ textTransform: 'capitalize' }}>{fecha}</p>}
            {reunion?.lugar && <p className="small">{reunion.lugar}</p>}
          </div>
          {reunion?.enlace && (
            <a className="btn btn--sm" href={reunion.enlace} target="_blank" rel="noopener noreferrer">
              Abrir enlace
            </a>
          )}
        </>
      ) : (
        <p className="tiny" style={{ color: 'var(--body)' }}>
          <strong>Fecha por confirmar</strong> — te avisamos pronto.
        </p>
      )}
    </div>
  )
}

function EnSuspenso({ datos, navigate }) {
  const n = datos.altos
  return (
    <section className="col stack gap-24 pt-36">
      <div className="stack gap-16">
        <p className="eyebrow">Análisis completo</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span className="big-number num">{n}</span>
          <p className="lead">
            {n === 1 ? 'persona de la Facultad tiene' : 'personas de la Facultad tienen'} contigo
            un <strong style={{ color: 'var(--ink)' }}>ICA superior al {datos.umbral}%</strong>.
          </p>
        </div>
        <p className="small">
          {n > 0
            ? 'Todavía no podemos decirte quiénes son.'
            : 'Pero hay varias muy cerca del umbral, y el algoritmo tiene más de una sorpresa guardada.'}
        </p>
      </div>

      <div className="stack gap-16">
        {[0, 1, 2].slice(0, Math.max(1, Math.min(3, n || 3))).map((k) => (
          <div className="card locked" key={k} style={{ padding: 20 }}>
            <div className="locked__blur match-row">
              <div className="avatar avatar--md" style={{ background: 'var(--hairline-strong)' }} />
              <div className="stack" style={{ gap: 6, flex: 1 }}>
                <div style={{ height: 13, width: '62%', background: 'var(--hairline-strong)', borderRadius: 99 }} />
                <div style={{ height: 11, width: '38%', background: 'var(--hairline)', borderRadius: 99 }} />
              </div>
              <div style={{ height: 26, width: 52, background: 'var(--hairline-strong)', borderRadius: 99 }} />
            </div>
            <div className="locked__seal"><span aria-hidden="true">🔒</span></div>
          </div>
        ))}
      </div>

      <Invitacion reunion={datos.reunion} />
      <button className="btn btn--quiet" onClick={() => navigate('/')}>Volver al inicio</button>
    </section>
  )
}

function Revelado({ datos, navigate }) {
  const top = datos.top ?? []
  const cats = datos.categorias ?? []

  return (
    <section className="col stack gap-24 pt-36">
      <div className="stack gap-12">
        <p className="eyebrow">Tus resultados</p>
        <h2 className="display" style={{ fontSize: 28 }}>El algoritmo encontró a tu gente</h2>
        <p className="small">
          {top.length > 1
            ? `Estas son las ${top.length} personas con las que más compartes.`
            : 'Esta es la persona con la que más compartes.'}
        </p>
      </div>

      <div className="stack gap-16">
        {top.map((m, i) => (
          <div className="card card--lift stack gap-12" key={m.nombre + i}>
            <div className="match-row">
              <Avatar persona={m} tam="md" />
              <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <p className="h3">{m.nombre}</p>
                <p className="tiny">{m.dependencia || 'Facultad de Ciencias de la Administración'}</p>
              </div>
              <p className="num" style={{
                fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', color: nivel(m.pct).color,
              }}>
                {m.pct}<span style={{ fontSize: 17 }}>%</span>
              </p>
            </div>
            <div><Badge pct={m.pct} /></div>
            {m.comunes?.length > 0 && (
              <div className="stack" style={{ gap: 6 }}>
                <p className="eyebrow">
                  {m.comunes.length} {m.comunes.length === 1 ? 'cosa en común' : 'cosas en común'}
                </p>
                <ul className="common">
                  {m.comunes.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            )}
            {i === 0 && (
              <p className="tiny" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
                Veredicto del algoritmo: «Ustedes probablemente deberían compartir más espacios de trabajo.»
              </p>
            )}
          </div>
        ))}
      </div>

      {cats.length > 0 && (
        <div className="card card--lift stack gap-16">
          <div className="stack" style={{ gap: 4 }}>
            <p className="eyebrow" style={{ color: 'var(--rojo)' }}>Saliste en la reunión</p>
            <p className="small">
              El algoritmo te nombró en {cats.length === 1 ? 'una categoría' : `${cats.length} categorías`}.
            </p>
          </div>
          {cats.map((c) => {
            const t = TIPOS_MATCH[c.tipo]
            const otro = c.a?.correo === datos.correo ? c.b : c.a
            return (
              <div className="match-row" key={c.tipo} style={{ gap: 12 }}>
                <Avatar persona={otro} tam="sm" />
                <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.color }}>{t.etiqueta}</span>
                  <span className="tiny">con {otro?.nombre}{otro?.dependencia ? ` · ${otro.dependencia}` : ''}</span>
                </div>
                <span className="num" style={{ fontWeight: 800, fontSize: 17, color: t.color }}>{c.pct}%</span>
              </div>
            )
          })}
        </div>
      )}

      {datos.improbable && (
        <div className="card card--wash stack gap-12">
          <p className="eyebrow" style={{ color: 'var(--naranja)' }}>⚡ Tu match improbable</p>
          <div className="match-row">
            <Avatar persona={datos.improbable} tam="sm" />
            <p className="h3" style={{ flex: 1 }}>{datos.improbable.nombre}</p>
            <p className="num" style={{ fontSize: 22, fontWeight: 800, color: 'var(--naranja)' }}>
              {datos.improbable.pct}%
            </p>
          </div>
          <p className="tiny">«No entendemos esta conexión… pero queremos saber qué pasa.»</p>
        </div>
      )}

      <button className="btn btn--quiet" onClick={() => navigate('/')}>Volver al inicio</button>
    </section>
  )
}
