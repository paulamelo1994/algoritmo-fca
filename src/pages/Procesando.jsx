import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, BUCKET } from '../lib/supabase'
import { useBorrador, guardarSesion } from '../App'
import { emojiDe } from '../lib/preguntas'
import { Aviso } from '../components/Base'

const LINEAS = [
  'Escaneando perfiles…',
  'Analizando afinidades…',
  'Cruzando superpoderes laborales…',
  'Detectando conexiones inesperadas…',
  'Calculando el Índice de Compatibilidad…',
]

/**
 * Sube la foto, guarda el registro y hace el espectáculo mientras tanto.
 * La animación nunca termina antes que el guardado real: si la red está
 * lenta, la barra espera en 99 %.
 */
export default function Procesando() {
  const navigate = useNavigate()
  const { borrador } = useBorrador()
  const [pct, setPct] = useState(0)
  const [linea, setLinea] = useState(LINEAS[0])
  const [error, setError] = useState('')
  const yaEnviado = useRef(false)

  useEffect(() => {
    if (!borrador?.datos) { navigate('/registro', { replace: true }); return }
    if (yaEnviado.current) return
    yaEnviado.current = true

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let actual = 0
    const timer = setInterval(() => {
      actual = Math.min(99, actual + (reduce ? 18 : 3))
      setPct(actual)
      setLinea(LINEAS[Math.min(LINEAS.length - 1, Math.floor(actual / 20))])
    }, reduce ? 60 : 70)

    const minimo = new Promise((r) => setTimeout(r, reduce ? 600 : 3800))

    ;(async () => {
      try {
        let foto_path = null
        if (borrador.foto) {
          const nombre = `${crypto.randomUUID()}.webp`
          const { error: errFoto } = await supabase.storage
            .from(BUCKET)
            .upload(nombre, borrador.foto, { contentType: 'image/webp', upsert: false })
          // Que falle la foto no puede costarle el registro a nadie.
          if (!errFoto) foto_path = nombre
          else console.warn('No se pudo subir la foto:', errFoto.message)
        }

        const payload = { ...borrador.datos, ...borrador.respuestas, foto_path }
        const { data, error: errRpc } = await supabase.rpc('registrar', { payload })

        if (errRpc) throw new Error(errRpc.message)
        if (data?.error === 'ya_registrado') {
          throw new Error('Ese correo ya respondió el cuestionario. Entra con «Ya me registré» para ver tu resultado.')
        }
        if (data?.error === 'formulario_cerrado') {
          throw new Error('El formulario se cerró mientras respondías. Escríbele a quien organiza la actividad.')
        }
        if (!data?.codigo) throw new Error('Respuesta inesperada del servidor.')

        guardarSesion({
          correo: borrador.datos.correo,
          codigo: data.codigo,
          emoji: emojiDe('emoji', borrador.respuestas.emoji),
        })

        await minimo
        clearInterval(timer)
        setPct(100)
        setTimeout(() => navigate('/resultado', { replace: true }), reduce ? 200 : 600)
      } catch (e) {
        clearInterval(timer)
        setError(e.message)
      }
    })()

    return () => clearInterval(timer)
  }, [borrador, navigate])

  if (error) {
    return (
      <section className="col stack gap-24 pt-36">
        <Aviso>{error}</Aviso>
        <div className="stack gap-12">
          <button className="btn btn--ghost" onClick={() => navigate('/entrar')}>Ya me registré</button>
          <button className="btn btn--quiet" onClick={() => navigate('/')}>Volver al inicio</button>
        </div>
      </section>
    )
  }

  return (
    <section className="col">
      <div className="processing">
        <div className="pulse" aria-hidden="true">❤️</div>
        <div className="stack gap-12" style={{ alignItems: 'center' }}>
          <p className="eyebrow">Índice de Compatibilidad</p>
          <p className="proc-line" role="status">{linea}</p>
        </div>
        <p className="proc-pct num">{pct}%</p>
        <div className="progress" style={{ width: 220 }}>
          <div className="progress__bar" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  )
}
