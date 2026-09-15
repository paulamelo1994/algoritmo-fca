import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  // Falla ruidosamente en desarrollo en vez de dar errores raros después.
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Crea el archivo .env.local a partir de .env.example.'
  )
}

// La clave anónima es pública por diseño: viaja en el JavaScript.
// La seguridad la dan las políticas RLS y las funciones del esquema,
// no esconder esta clave.
export const supabase = createClient(url ?? '', key ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const BUCKET = 'perfiles'

/** URL pública de una foto de perfil, o null si la persona no subió. */
export function urlFoto(path) {
  if (!path) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
