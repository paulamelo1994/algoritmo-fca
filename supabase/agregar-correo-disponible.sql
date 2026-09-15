-- ============================================================
--  AGREGAR: verificación de correo duplicado en el registro
--
--  Pega esto en el SQL Editor de Supabase y presiona Run.
--  Es lo único nuevo respecto al esquema que ya cargaste.
--  (También quedó incorporado en supabase/schema.sql, por si
--   alguna vez vuelves a montar el proyecto desde cero.)
-- ============================================================

-- ¿Este correo ya respondió? Se consulta desde la pantalla de registro,
-- ANTES de que la persona conteste las once preguntas.
-- Devuelve solo un booleano: ni el nombre ni ningún otro dato salen.
create or replace function correo_disponible(p_correo text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'disponible',
    not exists (select 1 from participantes where correo = lower(btrim(p_correo)))
  );
$$;

grant execute on function correo_disponible(text) to anon, authenticated;

-- Comprobación: con la base vacía debe devolver disponible = true.
select correo_disponible('prueba@correounivalle.edu.co');
