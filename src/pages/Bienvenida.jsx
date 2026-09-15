import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfig, leerSesion } from '../App'
import { Aviso } from '../components/Base'

export default function Bienvenida() {
  const navigate = useNavigate()
  const { config } = useConfig()
  const sesion = leerSesion()

  // Quien ya respondió desde este dispositivo entra directo a su resultado.
  useEffect(() => {
    if (sesion?.correo && sesion?.codigo) navigate('/resultado', { replace: true })
  }, [sesion, navigate])

  const cerrado = config && config.formulario_abierto === false

  return (
    <section className="col stack gap-32 pt-44">
      <div className="stack gap-16">
        <p className="eyebrow">Facultad de Ciencias de la Administración</p>
        <h1 className="display">
          El Algoritmo<br />del Amor <span style={{ color: 'var(--rojo)' }}>❤</span><br />y la Amistad
        </h1>
        <p className="lead">
          Responde diez preguntas y descubre con quiénes de la Facultad compartes
          más de lo que creías.
        </p>
      </div>

      <div className="card card--wash stack gap-12">
        <p className="small"><strong style={{ color: 'var(--ink)' }}>Diez preguntas. Tres minutos.</strong></p>
        <p className="small">Tus respuestas no se muestran a nadie: solo se usan para calcular afinidades.</p>
        <p className="small">No es una dinámica de parejas. El amor aquí es aprecio, compañerismo y reconocimiento.</p>
      </div>

      {cerrado && (
        <Aviso>
          El formulario ya está cerrado. Si alcanzaste a responder, entra con
          «Ya me registré» para ver tu resultado.
        </Aviso>
      )}

      <div className="stack gap-12">
        <button className="btn" disabled={cerrado} onClick={() => navigate('/registro')}>
          Crear mi perfil
        </button>
        <button className="btn btn--quiet" onClick={() => navigate('/entrar')}>
          Ya me registré
        </button>
      </div>
    </section>
  )
}
