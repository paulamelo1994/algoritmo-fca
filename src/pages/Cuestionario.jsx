import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PREGUNTAS } from '../lib/preguntas'
import { useBorrador } from '../App'

export default function Cuestionario() {
  const navigate = useNavigate()
  const { borrador, setBorrador } = useBorrador()
  const [i, setI] = useState(0)

  // Sin datos de registro no hay nada que hacer aquí.
  useEffect(() => {
    if (!borrador?.datos) navigate('/registro', { replace: true })
  }, [borrador, navigate])

  if (!borrador?.datos) return null

  const q = PREGUNTAS[i]
  const valor = borrador.respuestas[q.id]
  const esUltima = i === PREGUNTAS.length - 1

  const responder = (v) => setBorrador((b) => ({ ...b, respuestas: { ...b.respuestas, [q.id]: v } }))

  function alternarMultiple(label) {
    const actual = Array.isArray(valor) ? valor : []
    if (actual.includes(label)) responder(actual.filter((x) => x !== label))
    else if (actual.length < (q.max ?? 3)) responder([...actual, label])
  }

  const puedeSeguir =
    q.tipo === 'texto' ? true
    : q.tipo === 'multiple' ? Array.isArray(valor) && valor.length > 0
    : Boolean(valor)

  function siguiente() {
    if (esUltima) navigate('/procesando')
    else { setI(i + 1); window.scrollTo({ top: 0 }) }
  }

  return (
    <section className="col stack gap-24 pt-28">
      <div className="stack gap-12">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <p className="eyebrow">Pregunta {i + 1} de {PREGUNTAS.length}</p>
          {i > 0 && (
            <button className="btn btn--quiet btn--sm" style={{ padding: 0, minHeight: 'auto' }}
                    onClick={() => { setI(i - 1); window.scrollTo({ top: 0 }) }}>
              Atrás
            </button>
          )}
        </div>
        <div className="progress">
          <div className="progress__bar" style={{ width: `${((i + 1) / PREGUNTAS.length) * 100}%` }} />
        </div>
      </div>

      <div className="stack gap-16">
        <h2 className="display" style={{ fontSize: 28 }}>{q.titulo}</h2>
        {q.ayuda && <p className="small">{q.ayuda}</p>}
      </div>

      {q.tipo === 'texto' ? (
        <div className="field">
          <label htmlFor={`q-${q.id}`} className="hint">Respuesta libre</label>
          <input id={`q-${q.id}`} type="text" placeholder={q.placeholder}
                 value={valor ?? ''} onChange={(e) => responder(e.target.value)} />
        </div>
      ) : (
        <div className="chips">
          {q.opciones.map(([emoji, label]) => {
            const activo = q.tipo === 'multiple'
              ? Array.isArray(valor) && valor.includes(label)
              : valor === label
            return (
              <button key={label} type="button" className="chip" aria-pressed={activo}
                      onClick={() => q.tipo === 'multiple' ? alternarMultiple(label) : responder(label)}>
                <span className="chip__emoji" aria-hidden="true">{emoji}</span>
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      )}

      <button className="btn" disabled={!puedeSeguir} onClick={siguiente}>
        {esUltima ? 'Ver mi resultado' : 'Siguiente'}
      </button>
    </section>
  )
}
