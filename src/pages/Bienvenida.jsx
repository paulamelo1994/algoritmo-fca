import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfig, leerSesion, borrarSesion } from '../App'
import { Aviso } from '../components/Base'

export default function Bienvenida() {
  const navigate = useNavigate()
  const { config } = useConfig()
  const [sesion, setSesion] = useState(leerSesion)
  const yaRespondio = Boolean(sesion?.correo && sesion?.codigo)

  // Antes esta pantalla redirigía sola a /resultado cuando había sesión
  // guardada, y eso hacía imposible volver al inicio: el botón "Salir"
  // navegaba aquí y el efecto rebotaba de vuelta al resultado.
  // Ahora la pantalla se adapta en vez de redirigir.

  const cerrado = config && config.formulario_abierto === false

  function salirDeEsteDispositivo() {
    borrarSesion()
    setSesion(null) // re-renderiza sin recargar la página
  }

  return (
    <section className="col stack gap-32 pt-44">
      <div className="stack gap-16">
        <p className="eyebrow">Facultad de Ciencias de la Administración</p>
        <h1 className="display">
          El Algoritmo<br />del Amor <span style={{ color: 'var(--rojo)' }}>❤</span><br />y la Amistad
        </h1>
        <p className="lead">
          Responde unas cuantas preguntas y descubre con quiénes de la Facultad
          compartes más de lo que creías.
        </p>
      </div>

      <div className="card card--wash stack gap-12">
        <p className="small"><strong style={{ color: 'var(--ink)' }}>Trece preguntas. Cuatro minutos.</strong></p>
        <p className="small">Tus respuestas no se muestran a nadie: solo se usan para calcular afinidades.</p>
        <p className="small">No es una dinámica de parejas. El amor aquí es aprecio, compañerismo y reconocimiento.</p>
      </div>

      {cerrado && !yaRespondio && (
        <Aviso>
          El formulario ya está cerrado. Si alcanzaste a responder, entra con
          «Ya me registré» para ver tu resultado.
        </Aviso>
      )}

      {yaRespondio ? (
        <div className="stack gap-12">
          <button className="btn" onClick={() => navigate('/resultado')}>
            Ver mi resultado
          </button>
          <button className="btn btn--quiet" onClick={salirDeEsteDispositivo}>
            Salir de este dispositivo
          </button>
        </div>
      ) : (
        <div className="stack gap-12">
          <button className="btn" disabled={cerrado} onClick={() => navigate('/registro')}>
            Crear mi perfil
          </button>
          <button className="btn btn--quiet" onClick={() => navigate('/entrar')}>
            Ya me registré
          </button>
        </div>
      )}
    </section>
  )
}
