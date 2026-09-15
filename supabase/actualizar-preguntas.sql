-- ============================================================
--  ACTUALIZACIÓN DEL CUESTIONARIO
--
--  Cambios que trae:
--   · Superpoder: nueva opción "Maneja los contactos"
--   · Combustible: nueva opción "Mi mascota"
--   · Plan con el equipo: nueva opción "Rumba"
--   · Género musical: Techno, Música del Pacífico, Música popular,
--     Melomerengues y Disco
--   · Nueva pregunta: categoría de películas
--   · Nueva pregunta: plan de domingo
--   · La cualidad ahora admite DOS selecciones (cambia de un valor
--     a un arreglo, como el combustible y el plan)
--   · Pesos del ICA recalculados para las diez preguntas que puntúan
--
--  Pégalo completo en el SQL Editor de Supabase y presiona Run.
--
--  ⚠️  BORRA LAS RESPUESTAS QUE HAYA. Es obligatorio: las respuestas
--      viejas no tienen película ni plan de domingo, y su cualidad
--      está guardada como un solo valor. Mezclarlas con las nuevas
--      daría porcentajes incorrectos.
--      Si tienes respuestas reales que quieras conservar, NO ejecutes
--      esto: primero descarga el respaldo desde el panel.
-- ============================================================

-- 1. Qué hay ahora
select (select count(*) from participantes) as participantes_a_borrar;

-- 2. Fuera las respuestas viejas (no son compatibles con el cuestionario nuevo)
delete from participantes;

-- 3. Columnas nuevas y cambio de tipo de `cualidad`
alter table respuestas add column if not exists pelicula text;
alter table respuestas add column if not exists domingo  text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'respuestas' and column_name = 'cualidad'
      and data_type <> 'ARRAY'
  ) then
    alter table respuestas
      alter column cualidad type text[]
      using case when cualidad is null then null else array[cualidad] end;
  end if;
end $$;

-- 4. El nuevo superpoder entra a la tabla de complementos
insert into complementos (a, b) values
  ('Maneja los contactos', 'Resolver problemas'),
  ('Maneja los contactos', 'Crear ideas'),
  ('Maneja los contactos', 'Organizar')
on conflict do nothing;

-- 5. Dejar la configuración lista para recibir respuestas reales
update configuracion set
  revelacion_activa  = false,
  formulario_abierto = true,
  actualizado_en     = now()
where id = 1;

-- ============================================================
--  6. AHORA VUELVE A EJECUTAR schema.sql COMPLETO
--
--  Las funciones del algoritmo cambiaron (pesos nuevos, cualidad
--  como arreglo, dos preguntas más). La forma más segura de
--  actualizarlas todas es abrir supabase/schema.sql, copiarlo
--  entero y ejecutarlo: es idempotente y ya trae estos cambios.
--
--  Sin ese paso, el formulario nuevo guardaría respuestas que las
--  funciones viejas no saben leer.
-- ============================================================

-- 7. Comprobación, después de correr schema.sql.
--    La primera consulta debe devolver exactamente 1.0000:
--    es la suma de los pesos, comparando un perfil consigo mismo.
--    Solo funciona si ya hay al menos una respuesta cargada.
-- select round(fn_ica_crudo(r, r), 4) as suma_de_pesos from respuestas r limit 1;

select
  (select count(*) from participantes) as participantes,
  (select count(*) from complementos)  as complementos,
  (select string_agg(column_name, ', ' order by ordinal_position)
     from information_schema.columns where table_name = 'respuestas') as columnas;
