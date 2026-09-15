/* =============================================================
   Las trece preguntas del cuestionario.

   ⚠️  Los `id` deben coincidir con las columnas de la tabla
       `respuestas` del esquema SQL, y los TEXTOS de las opciones
       con los que usa el algoritmo (tabla `complementos` y
       función `fn_valor_crisis`). Si cambias un texto aquí,
       revisa supabase/schema.sql.

   ⚠️  Una vez abierto el formulario, NO cambies textos ni opciones:
       las respuestas ya recogidas dejarían de coincidir con las
       nuevas y el Índice de Compatibilidad quedaría mal calculado.

   Diez preguntas puntúan para el Índice de Compatibilidad. La kriptonita, la canción y
   el secreto no: alimentan el match improbable, la lista de música
   y el juego «¿Quién es?».
   ============================================================= */

export const PREGUNTAS = [
  {
    id: 'emoji', tipo: 'unica',
    titulo: 'Si tuviera que definirme con un emoji, sería…',
    opciones: [
      ['😂', 'Risa fácil'], ['😎', 'Tranquilo'], ['🤓', 'Curioso'],
      ['🧘', 'Sereno'], ['🚀', 'Acelerado'], ['🧐', 'Detallista'],
      ['❤️', 'Entregado'], ['🤪', 'Impredecible'], ['☕', 'Cafetero'],
    ],
  },
  {
    id: 'combustible', tipo: 'multiple', max: 3,
    titulo: 'Para una jornada laboral perfecta necesito…',
    opciones: [
      ['☕', 'Café'], ['🎧', 'Música'], ['🍫', 'Algo para comer'],
      ['💬', 'Una buena conversación'], ['🤫', 'Silencio'],
      ['😂', 'Buen humor'], ['🐶', 'Mi mascota'],
    ],
  },
  {
    id: 'superpoder', tipo: 'unica',
    titulo: 'Mi superpoder laboral',
    ayuda: 'La fortaleza que más te reconocen.',
    opciones: [
      ['🧠', 'Resolver problemas'], ['📋', 'Organizar'], ['💡', 'Crear ideas'],
      ['🗣️', 'Comunicar'], ['🤝', 'Trabajar en equipo'], ['⏱️', 'Trabajar bajo presión'],
      ['🔎', 'Encontrar soluciones'], ['😂', 'Mantener el buen humor'],
      ['📇', 'Maneja los contactos'],
    ],
  },
  {
    id: 'kriptonita', tipo: 'unica',
    titulo: 'Mi kriptonita laboral',
    ayuda: 'La frase que te hace respirar hondo.',
    opciones: [
      ['🚨', '«Necesitamos esto para ya»'],
      ['🕒', '«Es una reunión de 15 minutos»'],
      ['✂️', '«Solo es un pequeño cambio»'],
      ['📱', '«Te lo envié por WhatsApp»'],
      ['👀', '«¿Puedes revisarlo rapidito?»'],
    ],
  },
  {
    id: 'genero', tipo: 'unica',
    titulo: 'El género musical que me representa',
    opciones: [
      ['💃', 'Salsa'], ['🪗', 'Vallenato'], ['🎸', 'Rock'], ['🎤', 'Pop'],
      ['💔', 'Baladas'], ['🌞', 'Tropical'], ['🔊', 'Reguetón'],
      ['🎻', 'Clásica'], ['🎷', 'Jazz y blues'], ['🌮', 'Rancheras'],
      ['🌴', 'Música del Pacífico'], ['🎺', 'Melomerengues'],
      ['🤠', 'Música popular'], ['🪩', 'Disco'], ['🎛️', 'Techno'],
    ],
  },
  {
    id: 'cancion', tipo: 'texto', opcional: true,
    titulo: '¿Cuál es tu canción favorita?',
    ayuda: 'Con ella armamos una playlist de la Facultad.',
    placeholder: 'Título — artista',
  },
  {
    id: 'pelicula', tipo: 'unica',
    titulo: 'Si tú escoges la película, ¿qué vemos?',
    opciones: [
      ['😂', 'Comedia'], ['💥', 'Acción'], ['😱', 'Terror'],
      ['💘', 'Romance'], ['🕵️', 'Suspenso y policiacas'], ['🚀', 'Ciencia ficción'],
      ['🎭', 'Drama'], ['📽️', 'Documentales'], ['🇨🇴', 'Cine colombiano'],
      ['🍿', 'Animadas y familiares'],
    ],
  },
  {
    id: 'lugar', tipo: 'unica',
    titulo: 'Si pudiera trabajar desde cualquier lugar…',
    opciones: [
      ['🏖️', 'La playa'], ['🏔️', 'La montaña'], ['🌆', 'La ciudad'],
      ['🌳', 'El campo'], ['🏠', 'Mi casa'], ['✈️', 'Cambiaría cada semana'], ['👔', 'La oficina es mi lugar favorito'],
    ],
  },
  {
    id: 'plan_equipo', tipo: 'multiple', max: 3,
    titulo: 'El plan perfecto con el equipo',
    opciones: [
      ['🍕', 'Pizza'], ['☕', 'Café'], ['🍖', 'Asado'], ['🍻', 'Cena'],
      ['🎬', 'Cine'], ['🏞️', 'Paseo'], ['🎤', 'Karaoke'],
      ['🎲', 'Juegos de mesa'], ['💃', 'Rumba'],
    ],
  },
  {
    id: 'domingo', tipo: 'unica',
    titulo: '¿Cuál es tu plan de domingo?',
    opciones: [
      ['🧹', 'Hacer oficio'], ['🖥️', 'Maratón de series en casa'],
      ['⛪', 'Ir a misa o al culto'], ['🚵‍♀️', 'Hacer deporte'],
      ['🎬', 'Ir a cine'],
      ['🛏️', 'Enchusparse'], ['😴', 'No hacer absolutamente nada'],
    ],
  },
  {
    id: 'personaje', tipo: 'unica',
    titulo: 'En una película sobre la Facultad, yo sería…',
    opciones: [
      ['🦸', 'El héroe que resuelve todo'], ['🕵️', 'El detective'], ['🧙', 'El sabio'],
      ['🎨', 'El creativo'], ['🚨', 'El que apaga incendios'],
      ['😂', 'El alivio cómico'], ['🧭', 'El que sabe para dónde vamos'],
    ],
  },
  {
    id: 'cualidad', tipo: 'multiple', max: 2,
    titulo: 'Las cualidades más importantes en un equipo',
    opciones: [
      ['🫶', 'Empatía'], ['✅', 'Responsabilidad'], ['✨', 'Creatividad'],
      ['🤝', 'Colaboración'], ['🙏', 'Respeto'], ['😄', 'Humor'],
      ['💪', 'Compromiso'], ['🔐', 'Confianza'],
    ],
  },
  {
    id: 'secreto', tipo: 'texto', opcional: true,
    titulo: 'Algo que pocas personas de la Facultad saben de mí…',
    ayuda: 'Se usa solo para el juego «¿Quién es?» de la reunión.',
    placeholder: 'Toqué en una banda de rock durante seis años',
  },
]

/** Emoji de la opción elegida en una pregunta, para el avatar de respaldo. */
export function emojiDe(idPregunta, valor) {
  const q = PREGUNTAS.find((p) => p.id === idPregunta)
  if (!q || !q.opciones) return null
  const op = q.opciones.find(([, label]) => label === valor)
  return op ? op[0] : null
}
