-- ============================================================
--  LIMPIAR LA BASE PARA EMPEZAR DE CERO
--
--  Úsalo dos veces en la vida de este proyecto:
--   1. Al terminar las pruebas, antes de abrirle el formulario
--      al equipo.
--   2. Al terminar la actividad, para borrar los datos
--      personales (Ley 1581 de 2012).
--
--  Pégalo completo en el SQL Editor de Supabase y presiona Run.
--
--  ⚠️  BORRA TODAS LAS RESPUESTAS. No se puede deshacer.
--      Si quieres conservar las de prueba, primero usa el botón
--      "Descargar respaldo" del panel de administración.
-- ============================================================

-- 1. Cuántos registros hay ahora mismo (para que veas qué vas a borrar)
select
  (select count(*) from participantes) as participantes,
  (select count(*) from respuestas)    as respuestas;

-- 2. Borrar personas y respuestas.
--    Las respuestas se van solas: la llave foránea es ON DELETE CASCADE.
delete from participantes;

-- 3. Dejar la configuración como debe estar para recibir respuestas reales.
--    Esto importa: si durante las pruebas dejaste encendida la revelación,
--    el primer funcionario que se registre vería sus matches de inmediato
--    y se acaba la sorpresa.
update configuracion set
  revelacion_activa  = false,   -- nadie ve con quién hizo match todavía
  formulario_abierto = true,    -- el equipo ya puede registrarse
  umbral_ica         = 80,
  actualizado_en     = now()
where id = 1;

-- 4. Si cargaste fecha o enlace de prueba para la reunión, descomenta
--    estas líneas para dejarlos vacíos y que vuelva a decir
--    "Fecha por confirmar".
-- update configuracion set
--   reunion_fecha = null, reunion_lugar = null, reunion_enlace = null
-- where id = 1;

-- 5. Comprobación final: debe quedar todo en cero y la configuración lista.
select
  (select count(*) from participantes) as participantes,
  (select count(*) from respuestas)    as respuestas,
  config_publica()                     as configuracion;

-- ============================================================
--  FALTA UN PASO QUE NO SE PUEDE HACER DESDE AQUÍ
--
--  Las FOTOS viven en Storage, no en la base de datos, así que
--  este script no las toca. Ve a Storage → bucket "perfiles",
--  selecciona todos los archivos y elimínalos desde el panel.
--
--  (No las borres con SQL sobre storage.objects: eso quita el
--   registro pero deja el archivo ocupando espacio.)
-- ============================================================
