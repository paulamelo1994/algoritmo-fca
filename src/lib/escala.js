/* =============================================================
   Rótulos, colores y textos.

   OJO: aquí NO se calcula ningún porcentaje. Todo el cálculo del
   Índice de Compatibilidad vive en PostgreSQL (supabase/schema.sql).
   El frontend solo traduce números a palabras y colores, para que la
   sorpresa no dependa de lo que el navegador pueda inspeccionar.
   ============================================================= */

export const NIVELES = [
  { min: 90, label: 'Excepcional',                  color: '#199A75', emoji: '❤️' },
  { min: 80, label: 'Alta compatibilidad',          color: '#95C11F', emoji: '📊' },
  { min: 60, label: 'Potencial de colaboración',    color: '#00A9C1', emoji: '🤝' },
  { min: 40, label: 'Complementariedad estratégica',color: '#59358C', emoji: '🧩' },
  { min: 0,  label: 'Match improbable',             color: '#F39200', emoji: '⚡' },
]

export const nivel = (pct) => NIVELES.find((n) => pct >= n.min) ?? NIVELES[NIVELES.length - 1]

/** Las cinco categorías de la Fase 3, en el orden en que se presentan. */
export const TIPOS_MATCH = {
  perfecto: {
    etiqueta: '🥇 El match perfecto',
    corto: 'El match perfecto',
    color: '#199A75',
    kicker: 'Match encontrado',
    escala: 'Compatibilidad',
    veredicto: 'Ustedes probablemente deberían compartir más espacios de trabajo.',
    campos: [],
    nota: 'Las respuestas que coinciden aparecen arriba.',
  },
  improbable: {
    etiqueta: '⚡ El match improbable',
    corto: 'El match improbable',
    color: '#F39200',
    kicker: 'Conexión inexplicable',
    escala: 'Compatibilidad',
    veredicto: 'No entendemos esta conexión… pero queremos saber qué pasa.',
    campos: [
      ['domingo', 'Su domingo'],
      ['genero', 'Su música'],
      ['pelicula', 'En cine'],
      ['lugar', 'Lugar ideal'],
    ],
    nota: 'Ni una coincidencia de gustos. El algoritmo insiste en que se sienten juntos.',
  },
  complementario: {
    etiqueta: '🧩 El match complementario',
    corto: 'El match complementario',
    color: '#59358C',
    kicker: 'Complementariedad estratégica',
    escala: 'Compatibilidad complementaria',
    veredicto: 'Uno pone el mapa. El otro encuentra el camino.',
    campos: [
      ['superpoder', 'Superpoder'],
      ['personaje', 'En la película'],
      ['cualidad', 'Lo que valora'],
    ],
    nota: 'No coinciden: se completan. Un buen equipo no necesita que todos sean iguales.',
  },
  crisis: {
    etiqueta: '🚨 Sobrevivirían juntos',
    corto: 'Sobrevivirían juntos',
    color: '#E30613',
    kicker: 'Equipo de emergencia',
    escala: 'Capacidad de respuesta',
    veredicto: 'Ante una crisis, probablemente estos dos ya estarían trabajando antes de que termináramos la reunión.',
    campos: [
      ['superpoder', 'Superpoder'],
      ['kriptonita', 'Su kriptonita'],
      ['cualidad', 'Lo que valora'],
    ],
    nota: 'Uno mantiene la calma, el otro encuentra la salida.',
  },
  amistad: {
    etiqueta: '💛 El match de la amistad',
    corto: 'El match de la amistad',
    color: '#00A9C1',
    kicker: 'Fuera del horario laboral',
    escala: 'Afinidad personal',
    veredicto: 'Una conversación fuera del horario laboral.',
    campos: [
      ['domingo', 'Su domingo'],
      ['genero', 'Su música'],
      ['pelicula', 'En cine'],
    ],
    nota: 'Calculado solo con las preguntas de la vida, no con las del trabajo.',
  },
}

export const ORDEN_MATCH = ['perfecto', 'improbable', 'complementario', 'crisis', 'amistad']

/** Color estable a partir del nombre, para el avatar de quien no subió foto. */
const PALETA_AVATAR = ['#265AA6', '#199A75', '#F39200', '#59358C', '#00A9C1', '#95C11F', '#E30613']
export function colorDe(texto = '') {
  let h = 0
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) % 9973
  return PALETA_AVATAR[h % PALETA_AVATAR.length]
}

export function formatoFecha(v) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: 'numeric', minute: '2-digit',
  })
}
