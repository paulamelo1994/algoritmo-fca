import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useConfig } from '../App'
import { Avatar, Badge, Cargando, Aviso } from '../components/Base'
import { nivel, TIPOS_MATCH, ORDEN_MATCH } from '../lib/escala'
import { SoloAdmin } from '../components/AccesoAdmin'

export default function Admin() {
  return <SoloAdmin><Panel /></SoloAdmin>
}

/* ---------------------------------------------------------------- */

function Panel() {
  const navigate = useNavigate()
  const { config, recargar } = useConfig()
  const [gente, setGente] = useState(null)
  const [matches, setMatches] = useState([])
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(null)
  const [ranking, setRanking] = useState([])
  const [cargandoRanking, setCargandoRanking] = useState(false)
  const [tipo, setTipo] = useState('perfecto')
  const [revelado, setRevelado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [reunion, setReunion] = useState({ fecha: '', lugar: '', enlace: '' })

  const cargar = useCallback(async () => {
    // El emoji vive en `respuestas`: se trae aparte y se une, para que
    // quien no subió foto aparezca con su emoji y no con una inicial.
    const [{ data: personas }, { data: emojis }, { data: m }] = await Promise.all([
      supabase.from('participantes').select('correo,nombre,dependencia,foto_path').order('nombre'),
      supabase.from('respuestas').select('correo,emoji'),
      supabase.rpc('matches_fase3'),
    ])
    const porCorreo = Object.fromEntries((emojis ?? []).map((r) => [r.correo, r.emoji]))
    const conEmoji = (personas ?? []).map((p) => ({ ...p, emoji: porCorreo[p.correo] }))
    setGente(conEmoji)
    setMatches(m ?? [])
    if (!sel && conEmoji.length) setSel(conEmoji[0].correo)
  }, [sel])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!config) return
    setReunion({
      fecha: config.reunion_fecha ? String(config.reunion_fecha).slice(0, 16) : '',
      lugar: config.reunion_lugar ?? '',
      enlace: config.reunion_enlace ?? '',
    })
  }, [config])

  useEffect(() => {
    if (!sel) return
    setCargandoRanking(true)
    supabase.rpc('admin_ranking', { p_correo: sel }).then(({ data }) => {
      setRanking(data ?? []); setCargandoRanking(false)
    })
  }, [sel])

  async function cambiarRevelacion() {
    const nuevo = !config?.revelacion_activa
    setGuardando(true)
    await supabase.from('configuracion')
      .update({ revelacion_activa: nuevo, actualizado_en: new Date().toISOString() }).eq('id', 1)
    await recargar(); setGuardando(false)
  }

  async function cambiarFormulario() {
    const nuevo = !config?.formulario_abierto
    setGuardando(true)
    await supabase.from('configuracion')
      .update({ formulario_abierto: nuevo, actualizado_en: new Date().toISOString() }).eq('id', 1)
    await recargar(); setGuardando(false)
  }

  async function guardarReunion() {
    setGuardando(true)
    await supabase.from('configuracion').update({
      reunion_fecha: reunion.fecha ? new Date(reunion.fecha).toISOString() : null,
      reunion_lugar: reunion.lugar || null,
      reunion_enlace: reunion.enlace || null,
      actualizado_en: new Date().toISOString(),
    }).eq('id', 1)
    await recargar(); setGuardando(false)
  }

  function exportarRespaldo() {
    // Red de seguridad para el día de la reunión: si Supabase o el internet
    // fallan, este archivo tiene todo lo que se necesita para proyectar.
    const blob = new Blob([JSON.stringify({
      generado: new Date().toISOString(), participantes: gente, matches,
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `respaldo-algoritmo-fca-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!gente) return <div className="wide"><Cargando texto="Cargando participantes…" /></div>

  const filtrados = gente.filter((p) => {
    const q = busca.toLowerCase().trim()
    return !q || p.nombre.toLowerCase().includes(q) || (p.dependencia ?? '').toLowerCase().includes(q)
  })
  const persona = gente.find((p) => p.correo === sel)
  const compatibles = ranking.slice(0, 5)
  const incompatibles = ranking.slice(-3).reverse()

  return (
    <section className="wide stack gap-24 pt-28">
      <div className="stack gap-8">
        <p className="eyebrow">Panel de administración</p>
        <h2 className="h2">El algoritmo procesó <span className="num">{gente.length}</span> {gente.length === 1 ? 'perfil' : 'perfiles'}</h2>
        <p className="small">Haz clic en una persona para ver sus compatibilidades.</p>
      </div>

      {/* Configuración */}
      <div className="card card--lift stack gap-16">
        <div className="switch">
          <div className="stack" style={{ gap: 4 }}>
            <p className="h3">Formulario abierto</p>
            <p className="tiny">
              {config?.formulario_abierto
                ? 'La gente todavía puede registrarse y responder.'
                : 'Cerrado: nadie más puede registrarse.'}
            </p>
          </div>
          <button className="toggle" role="switch" aria-checked={!!config?.formulario_abierto}
                  aria-label="Formulario abierto" disabled={guardando} onClick={cambiarFormulario}>
            <span className="toggle__knob" />
          </button>
        </div>

        <hr className="divider" />

        <div className="stack gap-12">
          <p className="eyebrow">Datos de la reunión</p>
          <div className="split">
            <div className="field">
              <label htmlFor="r-fecha">Fecha y hora</label>
              <input id="r-fecha" type="datetime-local" value={reunion.fecha}
                     onChange={(e) => setReunion({ ...reunion, fecha: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="r-lugar">Lugar</label>
              <input id="r-lugar" type="text" placeholder="Sala virtual / Auditorio FCA"
                     value={reunion.lugar} onChange={(e) => setReunion({ ...reunion, lugar: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="r-enlace">Enlace de la videoconferencia</label>
            <input id="r-enlace" type="url" placeholder="https://…" value={reunion.enlace}
                   onChange={(e) => setReunion({ ...reunion, enlace: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--sm" disabled={guardando} onClick={guardarReunion}>
              {guardando ? 'Guardando…' : 'Guardar datos de la reunión'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={exportarRespaldo}>
              Descargar respaldo
            </button>
          </div>
        </div>
      </div>

      {/* Modo reunión */}
      <div className="card card--lift stack gap-24">
        <div className="stack gap-8">
          <h3 className="h2" style={{ fontSize: 20 }}>Los matches</h3>
        </div>

        <div className="mt-tabs" role="group" aria-label="Tipos de match">
          {ORDEN_MATCH.map((id) => {
            const t = TIPOS_MATCH[id]
            const activo = id === tipo
            return (
              <button key={id} type="button" className="mt-tab" aria-pressed={activo}
                      style={activo ? { background: t.color } : undefined}
                      onClick={() => { setTipo(id); setRevelado(false) }}>
                {t.etiqueta}
              </button>
            )
          })}
        </div>

        <Escenario match={matches.find((m) => m.tipo === tipo)} tipo={tipo}
                   revelado={revelado} total={gente.length} />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn--sm" disabled={revelado} onClick={() => setRevelado(true)}>Revelar match</button>
          <button className="btn btn--ghost btn--sm" disabled={!revelado} onClick={() => setRevelado(false)}>Ocultar de nuevo</button>
        </div>

        <hr className="divider" />

        <div className="stack gap-12">
          <p className="eyebrow" style={{ color: 'var(--morado)' }}>Modo reunión · Fase 4</p>
          <div className="switch">
            <div className="stack" style={{ gap: 4 }}>
              <p className="h3">¿Quién es?</p>
              <p className="tiny">
                Muestra al azar la respuesta a «Algo que pocas personas saben de mí»
                para que el equipo adivine de quién es.
              </p>
            </div>
            <button className="btn btn--ghost btn--sm" style={{ flex: 'none' }}
                    onClick={() => navigate('/admin/secreto')}>
              Abrir el juego
            </button>
          </div>
        </div>

        <hr className="divider" />

        <div className="stack gap-12">
          <p className="eyebrow">Cierre de la actividad</p>
          <div className="switch">
            <div className="stack" style={{ gap: 4 }}>
              <p className="h3">Revelar compatibilidades</p>
              <p className="tiny">
                {config?.revelacion_activa
                  ? 'Encendido: todos ven sus matches con nombre y foto al entrar.'
                  : 'Apagado: cada persona solo ve cuántos matches altos tiene.'}
              </p>
            </div>
            <button className="toggle" role="switch" aria-checked={!!config?.revelacion_activa}
                    aria-label="Revelar compatibilidades" disabled={guardando} onClick={cambiarRevelacion}>
              <span className="toggle__knob" />
            </button>
          </div>
        </div>
      </div>

      {/* Participantes y ranking */}
      <div className="admin-grid">
        <div className="card stack gap-16">
          <div className="stack gap-12">
            <p className="eyebrow">Participantes</p>
            <input type="search" className="searchbox" placeholder="Buscar por nombre o área"
                   aria-label="Buscar participante" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {filtrados.length === 0
            ? <p className="small">Nadie coincide con esa búsqueda.</p>
            : (
              <div className="gallery">
                {filtrados.map((p) => (
                  <button key={p.correo} type="button" className="person"
                          aria-pressed={p.correo === sel} onClick={() => setSel(p.correo)}>
                    <Avatar persona={p} tam="md" />
                    <span className="person__name">{p.nombre}</span>
                    <span className="person__area">{p.dependencia || '—'}</span>
                  </button>
                ))}
              </div>
            )}
        </div>

        <div className="stack gap-24">
          {persona && (
            <div className="card card--lift stack gap-16">
              <div className="match-row">
                <Avatar persona={persona} tam="lg" />
                <div className="stack" style={{ gap: 3 }}>
                  <p className="h2" style={{ fontSize: 20 }}>{persona.nombre}</p>
                  <p className="small">{persona.dependencia || '—'}</p>
                  <p className="tiny">{persona.correo}</p>
                </div>
              </div>
              <hr className="divider" />
              {cargandoRanking ? <Cargando texto="Calculando…" /> : (
                <div className="split">
                  <div className="stack gap-12">
                    <p className="eyebrow" style={{ color: 'var(--esmeralda)' }}>Compatibles</p>
                    <div>{compatibles.map((r) => <Fila key={r.correo} r={r} />)}</div>
                  </div>
                  <div className="stack gap-12">
                    <p className="eyebrow" style={{ color: 'var(--naranja)' }}>Incompatibles</p>
                    <div>{incompatibles.map((r) => <Fila key={r.correo} r={r} />)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {persona && ranking.length > 0 && (
            <div className="stack gap-12">
              <p className="eyebrow">Ranking completo · {persona.nombre} frente a toda la Facultad</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Funcionario</th><th>Área</th><th>Compatibilidad</th><th>Nivel</th><th>En común</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr key={r.correo}>
                        <td className="num" style={{ color: 'var(--muted)' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{r.nombre}</td>
                        <td style={{ color: 'var(--body)' }}>{r.dependencia || '—'}</td>
                        <td className="pct" style={{ color: nivel(r.pct).color }}>{r.pct}%</td>
                        <td><Badge pct={r.pct} /></td>
                        <td className="num" style={{ color: 'var(--body)' }}>{r.comunes?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="tiny">
                El Índice de Compatibilidad se calcula al vuelo: una respuesta que llegue tarde entra al ranking de
                inmediato. El porcentaje está escalado contra la pareja más compatible del grupo.
              </p>
            </div>
          )}
        </div>
      </div>

      <button className="btn btn--quiet" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </section>
  )
}

function Fila({ r }) {
  return (
    <div className="rank-item">
      <Avatar persona={r} tam="sm" />
      <div className="stack" style={{ gap: 0, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{r.nombre}</span>
        <span className="tiny">{r.dependencia || '—'}</span>
      </div>
      <span className="rank-item__pct num" style={{ color: nivel(r.pct).color }}>{r.pct}%</span>
    </div>
  )
}

function Escenario({ match, tipo, revelado, total }) {
  const t = TIPOS_MATCH[tipo]

  if (total < 2 || !match) {
    return (
      <div className="stage">
        <p className="small">
          {total < 2
            ? 'Se necesitan al menos dos perfiles para calcular los matches.'
            : 'Esta categoría todavía no se puede calcular.'}
        </p>
      </div>
    )
  }

  if (!revelado) {
    return (
      <div className="stage">
        <div className="stack gap-16" style={{ alignItems: 'center' }}>
          <p className="stage__kicker" style={{ color: t.color }}>{t.kicker}</p>
          <p className="stage__q" aria-hidden="true">? &nbsp; ?</p>
          <p className="small" style={{ maxWidth: '34ch' }}>
            {t.corto} — el algoritmo ya lo calculó. Presiona «Revelar match».
          </p>
        </div>
      </div>
    )
  }

  const det = match.detalle ?? {}
  const filas = (t.campos ?? [])
    .map(([campo, rotulo]) => [rotulo, det[campo]?.[0], det[campo]?.[1]])
    .filter(([, a, b]) => a || b)

  return (
    <div className="stage">
      <p className="stage__kicker" style={{ color: t.color }}>{t.kicker}</p>

      <div className="duo">
        <div className="duo__side">
          <Avatar persona={match.a} tam="lg" />
          <div>
            <p className="duo__name">{match.a?.nombre}</p>
            <p className="duo__area">{match.a?.dependencia || '—'}</p>
          </div>
        </div>
        <div className="duo__link">
          <p className="duo__scale">{t.escala}</p>
          <p className="duo__pct" style={{ color: t.color }}>
            {match.pct}<span className="duo__unit">%</span>
          </p>
        </div>
        <div className="duo__side">
          <Avatar persona={match.b} tam="lg" />
          <div>
            <p className="duo__name">{match.b?.nombre}</p>
            <p className="duo__area">{match.b?.dependencia || '—'}</p>
          </div>
        </div>
      </div>

      {match.comunes?.length > 0 && (
        <ul className="common">
          {match.comunes.slice(0, 8).map((c) => <li key={c}>{c}</li>)}
        </ul>
      )}

      {filas.length > 0 && (
        <div className="evidence">
          {filas.map(([rotulo, a, b]) => (
            <div key={rotulo} style={{ display: 'contents' }}>
              <span className="evidence__a">{a || '—'}</span>
              <span className="evidence__k">{rotulo}</span>
              <span className="evidence__b">{b || '—'}</span>
            </div>
          ))}
        </div>
      )}

      <p className="verdict">{t.veredicto}</p>
      {t.nota && <p className="tiny" style={{ maxWidth: '44ch' }}>{t.nota}</p>}
      {match.unico === false && (
        <p className="tiny" style={{ color: 'var(--naranja)' }}>
          Alguna de estas dos personas ya salió en otra categoría: el grupo es pequeño y no
          quedaban parejas libres.
        </p>
      )}
    </div>
  )
}
