import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import { useBorrador, useConfig } from '../App'
import { Aviso } from '../components/Base'

const DOMINIO = /^[A-Za-z0-9._%+-]+@correounivalle\.edu\.co$/

export default function Registro() {
  const navigate = useNavigate()
  const { setBorrador } = useBorrador()
  const { config } = useConfig()
  const inputFoto = useRef(null)

  const [datos, setDatos] = useState({
    nombre: '', correo: '', telefono: '', cumpleanos: '', dependencia: '',
  })
  const [foto, setFoto] = useState(null)         // File comprimido
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [sinFoto, setSinFoto] = useState(false)
  const [autoriza, setAutoriza] = useState(false)
  const [error, setError] = useState('')
  const [procesandoFoto, setProcesandoFoto] = useState(false)

  const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }))

  const correoValido = DOMINIO.test(datos.correo.trim())
  const completo =
    datos.nombre.trim().length >= 3 &&
    correoValido &&
    datos.cumpleanos !== '' &&
    autoriza

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError('')
    setProcesandoFoto(true)
    try {
      // Se comprime en el navegador: 512 px y ~80 KB. Con 70 participantes
      // son unos 6 MB del 1 GB disponible en la capa gratuita.
      const comprimida = await imageCompression(archivo, {
        maxWidthOrHeight: 512,
        maxSizeMB: 0.1,
        useWebWorker: true,
        fileType: 'image/webp',
      })
      setFoto(comprimida)
      setVistaPrevia(URL.createObjectURL(comprimida))
      setSinFoto(false)
    } catch {
      setError('No pudimos procesar esa imagen. Prueba con otra o continúa sin foto.')
    } finally {
      setProcesandoFoto(false)
    }
  }

  function continuar(e) {
    e.preventDefault()
    setBorrador((b) => ({
      ...b,
      datos: { ...datos, correo: datos.correo.trim().toLowerCase(), nombre: datos.nombre.trim() },
      foto,
    }))
    navigate('/cuestionario')
  }

  if (config?.formulario_abierto === false) {
    return (
      <section className="col stack gap-24 pt-36">
        <Aviso>El formulario ya está cerrado.</Aviso>
        <button className="btn btn--ghost" onClick={() => navigate('/')}>Volver al inicio</button>
      </section>
    )
  }

  return (
    <form className="col stack gap-24 pt-36" onSubmit={continuar}>
      <div className="stack gap-8">
        <p className="eyebrow">Paso 1 de 2</p>
        <h2 className="h2">Empecemos por lo básico</h2>
        <p className="small">Necesitamos identificarte para calcular tus afinidades y avisarte de la reunión.</p>
      </div>

      <div className="stack gap-16">
        <div className="field">
          <label htmlFor="f-nombre">Nombre y apellido</label>
          <input id="f-nombre" type="text" autoComplete="name" placeholder="María Fernanda Ocampo"
                 value={datos.nombre} onChange={set('nombre')} required />
        </div>

        <div className="field">
          <label htmlFor="f-correo">Correo institucional</label>
          <input id="f-correo" type="email" autoComplete="email" inputMode="email"
                 placeholder="nombre.apellido@correounivalle.edu.co"
                 value={datos.correo} onChange={set('correo')}
                 aria-invalid={datos.correo !== '' && !correoValido} required />
          {datos.correo !== '' && !correoValido
            ? <span className="error">Debe terminar en @correounivalle.edu.co</span>
            : <span className="hint">Es tu identificador: con él vuelves a entrar a ver tu resultado.</span>}
        </div>

        <div className="field">
          <label htmlFor="f-dep">Dependencia o área</label>
          <input id="f-dep" type="text" placeholder="Decanatura, Posgrados, Bienestar…"
                 value={datos.dependencia} onChange={set('dependencia')} />
        </div>

        <div className="field">
          <label htmlFor="f-tel">Celular <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opcional)</span></label>
          <input id="f-tel" type="tel" autoComplete="tel" inputMode="tel" placeholder="300 000 0000"
                 value={datos.telefono} onChange={set('telefono')} />
          <span className="hint">Solo para avisarte de la reunión de revelación.</span>
        </div>

        <div className="field">
          <label htmlFor="f-cumple">Fecha de cumpleaños</label>
          <input id="f-cumple" type="date" value={datos.cumpleanos} onChange={set('cumpleanos')} required />
          <span className="hint">Te sirve para volver a entrar desde otro dispositivo.</span>
        </div>
      </div>

      <hr className="divider" />

      <div className="stack gap-12">
        <div className="stack gap-8">
          <p className="h3">Tu foto <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span></p>
          <p className="tiny">Si prefieres no subirla, usamos el emoji que elijas en la primera pregunta.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar avatar--lg" style={{ background: 'var(--quiet)', color: 'var(--muted)', fontSize: 30 }}>
            {vistaPrevia ? <img src={vistaPrevia} alt="Vista previa de tu foto" /> : <span aria-hidden="true">{sinFoto ? '🙂' : '📷'}</span>}
          </div>
          <div className="stack gap-8" style={{ flex: 1 }}>
            <input ref={inputFoto} id="f-foto" type="file" accept="image/*" hidden onChange={elegirFoto} />
            <button type="button" className="btn btn--ghost btn--sm"
                    disabled={procesandoFoto} onClick={() => inputFoto.current?.click()}>
              {procesandoFoto ? 'Procesando…' : vistaPrevia ? 'Cambiar foto' : 'Agregar foto'}
            </button>
            <button type="button" className="btn btn--quiet btn--sm"
                    style={{ justifyContent: 'flex-start', paddingLeft: 0 }}
                    onClick={() => { setFoto(null); setVistaPrevia(null); setSinFoto(true) }}>
              Prefiero no subir foto
            </button>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <label className="check" htmlFor="f-auth">
        <input id="f-auth" type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
        <span>
          Autorizo a la Facultad de Ciencias de la Administración de la Universidad del Valle
          a tratar mis datos personales con la única finalidad de desarrollar la actividad de
          integración «El Algoritmo del Amor y la Amistad».
        </span>
      </label>

      {error && <Aviso>{error}</Aviso>}

      <div className="stack gap-12">
        <button className="btn" type="submit" disabled={!completo}>Continuar</button>
        <button className="btn btn--quiet" type="button" onClick={() => navigate('/')}>Volver</button>
      </div>
    </form>
  )
}
