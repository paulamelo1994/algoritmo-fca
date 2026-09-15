-- =============================================================
--  EL ALGORITMO DEL AMOR Y LA AMISTAD — FCA, Universidad del Valle
--  Esquema completo de Supabase.
--
--  Ejecuta este archivo COMPLETO y UNA SOLA VEZ en el SQL Editor
--  del proyecto de Supabase. Es idempotente: se puede volver a
--  correr sin romper nada.
--
--  Principio de diseño: el navegador de un participante NUNCA
--  recibe las respuestas de otra persona. Las tablas están
--  cerradas a lectura anónima y la única puerta son las funciones
--  de este archivo, que devuelven exactamente lo que cada pantalla
--  necesita y nada más.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- 1. TABLAS
-- -------------------------------------------------------------

create table if not exists participantes (
  correo        text primary key
                check (correo ~* '^[A-Za-z0-9._%+-]+@correounivalle\.edu\.co$'),
  nombre        text not null check (char_length(btrim(nombre)) between 3 and 80),
  telefono      text,
  cumpleanos    date,
  dependencia   text,
  foto_path     text,
  codigo_acceso uuid not null default gen_random_uuid(),
  creado_en     timestamptz not null default now()
);

create table if not exists respuestas (
  correo        text primary key references participantes(correo) on delete cascade,
  emoji         text,
  combustible   text[],
  superpoder    text,
  kriptonita    text,
  genero        text,
  cancion       text,
  pelicula      text,
  lugar         text,
  plan_equipo   text[],
  domingo       text,
  personaje     text,
  cualidad      text[],   -- dos selecciones, igual que combustible y plan
  secreto       text,
  completado_en timestamptz not null default now()
);

-- Si ya existe la tabla de una versión anterior, alinearla.
-- (Estas líneas no hacen nada en una instalación nueva.)
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

create table if not exists configuracion (
  id                 int primary key default 1 check (id = 1),
  revelacion_activa  boolean not null default false,
  formulario_abierto boolean not null default true,
  umbral_ica         int     not null default 80,
  reunion_fecha      timestamptz,
  reunion_lugar      text,
  reunion_enlace     text,
  actualizado_en     timestamptz not null default now()
);

insert into configuracion (id) values (1) on conflict (id) do nothing;

-- Superpoderes que se potencian entre sí. Editable desde el SQL Editor
-- si al ver las respuestas reales quieres ajustar la tabla.
create table if not exists complementos (
  a text not null,
  b text not null,
  primary key (a, b)
);

insert into complementos (a, b) values
  ('Organizar',             'Crear ideas'),
  ('Organizar',             'Trabajar bajo presión'),
  ('Resolver problemas',    'Comunicar'),
  ('Crear ideas',           'Encontrar soluciones'),
  ('Trabajar bajo presión', 'Mantener el buen humor'),
  ('Trabajar en equipo',    'Resolver problemas'),
  ('Comunicar',             'Organizar'),
  ('Encontrar soluciones',  'Mantener el buen humor'),
  ('Maneja los contactos',  'Resolver problemas'),
  ('Maneja los contactos',  'Crear ideas'),
  ('Maneja los contactos',  'Organizar')
on conflict do nothing;


-- -------------------------------------------------------------
-- 2. EL ALGORITMO
--
--  ⚠️  LOS PESOS VIVEN AQUÍ Y TAMBIÉN EN src/lib/escala.js
--      (solo los rótulos y colores). El cálculo es exclusivamente
--      de este archivo: el frontend nunca calcula un ICA.
-- -------------------------------------------------------------

-- Índice de Jaccard para las preguntas de selección múltiple.
create or replace function fn_jaccard(a text[], b text[])
returns numeric
language sql immutable as $$
  select case
    when a is null or b is null or cardinality(a) = 0 or cardinality(b) = 0 then 0
    else coalesce(
      cardinality(array(select unnest(a) intersect select unnest(b)))::numeric
      / nullif(cardinality(array(select unnest(a) union select unnest(b))), 0)
    , 0)
  end;
$$;

-- Puntaje crudo del ICA: suma ponderada de coincidencias, de 0 a 1.
-- Diez preguntas puntúan y los pesos suman exactamente 1:
--   Superpoder laboral        18 %   ← lo que más define en el trabajo
--   Cualidades que valora     14 %
--   Plan con el equipo        12 %
--   Plan de domingo           11 %
--   Combustible                9 %
--   Género musical             9 %
--   Película                   9 %
--   Lugar ideal                8 %
--   Personaje                  6 %
--   Personalidad (emoji)       4 %   ← es el más ambiguo de todos
-- La kriptonita, la canción y el secreto no puntúan: alimentan el
-- match improbable, la lista de música y el juego "¿Quién es?".
create or replace function fn_ica_crudo(a respuestas, b respuestas)
returns numeric
language sql immutable as $$
  select
      (case when a.superpoder = b.superpoder then 0.18 else 0 end)
    + (case when a.domingo    = b.domingo    then 0.11 else 0 end)
    + (case when a.genero     = b.genero     then 0.09 else 0 end)
    + (case when a.pelicula   = b.pelicula   then 0.09 else 0 end)
    + (case when a.lugar      = b.lugar      then 0.08 else 0 end)
    + (case when a.personaje  = b.personaje  then 0.06 else 0 end)
    + (case when a.emoji      = b.emoji      then 0.04 else 0 end)
    + 0.14 * fn_jaccard(a.cualidad,    b.cualidad)
    + 0.12 * fn_jaccard(a.plan_equipo, b.plan_equipo)
    + 0.09 * fn_jaccard(a.combustible, b.combustible);
$$;

-- Lo que dos personas tienen en común, en palabras.
-- Se quitan los duplicados: "Café" es opción tanto del combustible
-- como del plan con el equipo, y verlo dos veces en la tarjeta de
-- resultado se lee como un error.
create or replace function fn_comunes(a respuestas, b respuestas)
returns text[]
language sql immutable as $$
  select array(select distinct unnest(x.v)) from (select array_remove(array[
      case when a.emoji      = b.emoji      then a.emoji      end,
      case when a.superpoder = b.superpoder then a.superpoder end,
      case when a.genero     = b.genero     then a.genero     end,
      case when a.pelicula   = b.pelicula   then a.pelicula   end,
      case when a.domingo    = b.domingo    then a.domingo    end,
      case when a.lugar      = b.lugar      then a.lugar      end,
      case when a.personaje  = b.personaje  then a.personaje  end
    ], null)
    || coalesce(array(select unnest(a.combustible) intersect select unnest(b.combustible)), '{}')
    || coalesce(array(select unnest(a.plan_equipo) intersect select unnest(b.plan_equipo)), '{}')
    || coalesce(array(select unnest(a.cualidad)    intersect select unnest(b.cualidad)),    '{}')
  as v) x;
$$;

-- El puntaje crudo es engañosamente bajo: con ocho preguntas de seis a
-- diez opciones, coincidir en la mitad ya es muchísimo, y la mejor
-- pareja de un equipo real ronda el 40 %. Sin escalar, el mensaje
-- "tienes más de 80 % con tres personas" nunca se cumpliría.
-- Por eso el ICA que se muestra es el crudo escalado contra la mejor
-- pareja del grupo. El orden del ranking no cambia: cambia la escala.
create or replace function fn_escalar(raw numeric, referencia numeric)
returns int
language sql immutable as $$
  select greatest(1, round(97 * power(least(1, raw / nullif(referencia, 0)), 0.8))::int);
$$;

-- La mejor pareja del grupo, que sirve de referencia para la escala.
create or replace function fn_referencia()
returns numeric
language sql stable as $$
  select coalesce(max(fn_ica_crudo(x, y)), 0.0001)
  from respuestas x join respuestas y on x.correo < y.correo;
$$;

-- Puntajes alternativos de la Fase 3 -------------------------------

create or replace function fn_valor_crisis(s text)
returns numeric
language sql immutable as $$
  select case s
    when 'Trabajar bajo presión'  then 1.00
    when 'Resolver problemas'     then 1.00
    when 'Encontrar soluciones'   then 0.95
    when 'Organizar'              then 0.90
    when 'Mantener el buen humor' then 0.80
    when 'Trabajar en equipo'     then 0.75
    when 'Comunicar'              then 0.65
    when 'Maneja los contactos'   then 0.85  -- en una crisis, saber a quién llamar vale oro
    when 'Crear ideas'            then 0.50
    else 0.50
  end;
$$;

-- No busca parecidos: busca perfiles que se completan.
create or replace function fn_complementaria(a respuestas, b respuestas)
returns numeric
language sql stable as $$
  select
      (case when exists (
         select 1 from complementos c
         where (c.a = a.superpoder and c.b = b.superpoder)
            or (c.b = a.superpoder and c.a = b.superpoder)
       ) then 0.60 else 0 end)
    + (case when a.personaje is distinct from b.personaje then 0.20 else 0 end)
    + 0.20 * (1 - fn_jaccard(a.plan_equipo, b.plan_equipo));
$$;

-- ¿A quién escogerías para sobrevivir a una crisis institucional?
create or replace function fn_crisis(a respuestas, b respuestas)
returns numeric
language sql immutable as $$
  select least(1.0,
      (fn_valor_crisis(a.superpoder) + fn_valor_crisis(b.superpoder)) / 2
    + (case when a.superpoder is distinct from b.superpoder then 0.12 else 0 end)
    + (case when a.cualidad && array['Compromiso','Responsabilidad','Confianza'] then 0.05 else 0 end)
    + (case when b.cualidad && array['Compromiso','Responsabilidad','Confianza'] then 0.05 else 0 end)
  );
$$;

-- La amistad no se mide con las preguntas de trabajo: ignora el
-- superpoder, el personaje y las cualidades, y carga el peso en lo que
-- de verdad predice que dos personas se busquen un sábado.
--   Plan de domingo   22 %
--   Género musical    18 %
--   Película          18 %
--   Plan con el equipo 16 %
--   Combustible       14 %
--   Lugar ideal        8 %
--   Emoji              4 %
create or replace function fn_amistad(a respuestas, b respuestas)
returns numeric
language sql immutable as $$
  select
      (case when a.domingo  = b.domingo  then 0.22 else 0 end)
    + (case when a.genero   = b.genero   then 0.18 else 0 end)
    + (case when a.pelicula = b.pelicula then 0.18 else 0 end)
    + (case when a.lugar    = b.lugar    then 0.08 else 0 end)
    + (case when a.emoji    = b.emoji    then 0.04 else 0 end)
    + 0.16 * fn_jaccard(a.plan_equipo, b.plan_equipo)
    + 0.14 * fn_jaccard(a.combustible, b.combustible);
$$;


-- -------------------------------------------------------------
-- 3. FUNCIONES QUE USA LA APLICACIÓN
-- -------------------------------------------------------------

-- Lo único que el frontend puede leer de la configuración.
create or replace function config_publica()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'revelacion_activa',  c.revelacion_activa,
    'formulario_abierto', c.formulario_abierto,
    'umbral_ica',         c.umbral_ica,
    'reunion_fecha',      c.reunion_fecha,
    'reunion_lugar',      c.reunion_lugar,
    'reunion_enlace',     c.reunion_enlace
  ) from configuracion c where c.id = 1;
$$;

-- ¿Este correo ya respondió? Se consulta desde la pantalla de registro,
-- ANTES de que la persona conteste las once preguntas: enterarse de que
-- el correo está tomado después de tres minutos de cuestionario es una
-- mala experiencia y además pierde las respuestas.
-- Devuelve solo un booleano: ni el nombre ni ningún otro dato salen.
create or replace function correo_disponible(p_correo text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'disponible',
    not exists (select 1 from participantes where correo = lower(btrim(p_correo)))
  );
$$;

-- Registro: crea el participante y guarda sus respuestas en una sola
-- transacción. Devuelve el código de acceso que el navegador guarda
-- para poder volver a ver su resultado sin login.
-- La verificación de duplicado se repite aquí a propósito: la del
-- formulario es comodidad, esta es la que de verdad protege, porque
-- corre dentro de la transacción y no se puede saltar.
create or replace function registrar(payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_correo text := lower(btrim(payload->>'correo'));
  v_codigo uuid;
  v_abierto boolean;
begin
  select formulario_abierto into v_abierto from configuracion where id = 1;
  if not v_abierto then
    return jsonb_build_object('error', 'formulario_cerrado');
  end if;

  if exists (select 1 from participantes where correo = v_correo) then
    return jsonb_build_object('error', 'ya_registrado');
  end if;

  insert into participantes (correo, nombre, telefono, cumpleanos, dependencia, foto_path)
  values (
    v_correo,
    btrim(payload->>'nombre'),
    nullif(btrim(coalesce(payload->>'telefono','')), ''),
    nullif(payload->>'cumpleanos','')::date,
    nullif(btrim(coalesce(payload->>'dependencia','')), ''),
    nullif(payload->>'foto_path','')
  )
  returning codigo_acceso into v_codigo;

  insert into respuestas (
    correo, emoji, combustible, superpoder, kriptonita, genero,
    cancion, pelicula, lugar, plan_equipo, domingo, personaje,
    cualidad, secreto
  ) values (
    v_correo,
    payload->>'emoji',
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload->'combustible')), '{}'),
    payload->>'superpoder',
    payload->>'kriptonita',
    payload->>'genero',
    payload->>'cancion',
    payload->>'pelicula',
    payload->>'lugar',
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload->'plan_equipo')), '{}'),
    payload->>'domingo',
    payload->>'personaje',
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload->'cualidad')), '{}'),
    payload->>'secreto'
  );

  return jsonb_build_object('ok', true, 'codigo', v_codigo);
end;
$$;

-- "Ya me registré" desde otro dispositivo: el cumpleaños hace de
-- segundo factor sencillo.
create or replace function recuperar_codigo(p_correo text, p_cumpleanos date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_codigo uuid;
begin
  select codigo_acceso into v_codigo
  from participantes
  where correo = lower(btrim(p_correo)) and cumpleanos = p_cumpleanos;

  if v_codigo is null then
    return jsonb_build_object('error', 'no_encontrado');
  end if;
  return jsonb_build_object('ok', true, 'codigo', v_codigo);
end;
$$;

-- Todas las parejas posibles con sus cuatro puntajes, calculadas en un
-- solo lugar. No se le concede acceso a nadie: solo la usan las
-- funciones security definer de este archivo.
create or replace view v_pares as
select
  x.correo as ca, y.correo as cb,
  fn_ica_crudo(x, y)      as raw,
  fn_comunes(x, y)        as comunes,
  fn_complementaria(x, y) as comp,
  fn_crisis(x, y)         as crisis,
  fn_amistad(x, y)        as amistad,
  x.superpoder as sa, y.superpoder as sb,
  x.kriptonita as ka, y.kriptonita as kb,
  x.personaje  as pa, y.personaje  as pb,
  array_to_string(x.cualidad, ' y ') as qa,
  array_to_string(y.cualidad, ' y ') as qb,
  x.genero     as ga, y.genero     as gb,
  x.lugar      as la, y.lugar      as lb,
  x.emoji      as ea, y.emoji      as eb,
  x.domingo    as da, y.domingo    as db,
  x.pelicula   as ma, y.pelicula   as mb,
  x.combustible as fa, y.combustible as fb
from respuestas x join respuestas y on x.correo < y.correo;

revoke all on v_pares from anon, authenticated;

-- Los cinco matches de la Fase 3. La usa el panel de administración
-- y también la pantalla del participante, para decirle en qué
-- categorías salió.
--
-- Regla 1 — una persona no se repite entre categorías. Sin ella, la
-- misma pareja tiende a ganar el match perfecto Y el complementario Y
-- el de la amistad, y la reunión pierde gracia porque siempre se
-- nombra a la misma gente. Las categorías se resuelven en orden de
-- prioridad y cada una descarta a quienes ya salieron. Si el grupo es
-- tan pequeño que no quedan parejas libres, se permite la repetición
-- antes que dejar la categoría vacía.
--
-- Regla 2 — cada categoría escala su porcentaje contra la mejor pareja
-- DISPONIBLE en su turno, no contra la mejor del grupo entero. La
-- amistad es la última en resolverse, así que sus mejores parejas
-- suelen estar ya ocupadas; midiendo contra un listón que la pareja
-- elegida no puede alcanzar, salía un número bajo que en la proyección
-- se leía como "se llevan poquito" cuando en realidad quiere decir
-- "menos que aquella otra pareja, que ustedes no van a ver".
-- Con la referencia local, la pareja mostrada siempre sale alta.
-- El precio: los porcentajes ya no son comparables ENTRE categorías.
-- Dentro de una categoría sí, y es lo único que se proyecta.
create or replace function matches_fase3()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tipos   text[] := array['perfecto','improbable','complementario','crisis','amistad'];
  v_tipo    text;
  v_usados  text[] := '{}';
  v_out     jsonb  := '[]'::jsonb;
  v_ref     numeric;
  v_ref_ami numeric;
  v_par     record;
  v_pct     int;
begin
  foreach v_tipo in array v_tipos loop

    -- Referencia de escala: la mejor pareja que todavía está libre.
    -- Si no queda ninguna libre, se cae a la mejor del grupo entero.
    select coalesce(max(t.raw)     filter (where t.libre), max(t.raw),     0.0001),
           coalesce(max(t.amistad) filter (where t.libre), max(t.amistad), 0.0001)
      into v_ref, v_ref_ami
    from (
      select p.raw, p.amistad,
             (p.ca <> all(v_usados) and p.cb <> all(v_usados)) as libre
      from v_pares p
    ) t;

    for v_par in
      select p.*,
             (p.ca <> all(v_usados) and p.cb <> all(v_usados)) as libre
      from v_pares p
      order by
        -- primero las parejas sin personas repetidas
        (p.ca <> all(v_usados) and p.cb <> all(v_usados)) desc,
        case v_tipo
          when 'perfecto'       then  p.raw
          when 'improbable'     then -p.raw
          when 'complementario' then  p.comp
          when 'crisis'         then  p.crisis
          when 'amistad'        then  p.amistad
        end desc
      limit 1
    loop
      v_pct := case v_tipo
        when 'perfecto'       then fn_escalar(v_par.raw, v_ref)
        -- El improbable se mide contra la mejor disponible a propósito:
        -- es la única categoría donde un número bajo es el chiste.
        when 'improbable'     then fn_escalar(v_par.raw, v_ref)
        when 'complementario' then least(97, round(v_par.comp * 100))::int
        when 'crisis'         then least(99, round(v_par.crisis * 100))::int
        when 'amistad'        then fn_escalar(v_par.amistad, v_ref_ami)
      end;

      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'tipo', v_tipo,
        'pct',  v_pct,
        'unico', v_par.libre,
        'comunes', case when v_tipo in ('perfecto','amistad')
                        then to_jsonb(v_par.comunes) else '[]'::jsonb end,
        -- El emoji viaja junto al nombre: quien no subió foto se muestra
        -- con el emoji que eligió, no con la inicial de su nombre.
        'a', (select jsonb_build_object('correo', p.correo, 'nombre', p.nombre,
                     'dependencia', p.dependencia, 'foto_path', p.foto_path,
                     'emoji', v_par.ea)
              from participantes p where p.correo = v_par.ca),
        'b', (select jsonb_build_object('correo', p.correo, 'nombre', p.nombre,
                     'dependencia', p.dependencia, 'foto_path', p.foto_path,
                     'emoji', v_par.eb)
              from participantes p where p.correo = v_par.cb),
        'detalle', jsonb_build_object(
          'superpoder',  jsonb_build_array(v_par.sa, v_par.sb),
          'kriptonita',  jsonb_build_array(v_par.ka, v_par.kb),
          'personaje',   jsonb_build_array(v_par.pa, v_par.pb),
          'cualidad',    jsonb_build_array(v_par.qa, v_par.qb),
          'genero',      jsonb_build_array(v_par.ga, v_par.gb),
          'lugar',       jsonb_build_array(v_par.la, v_par.lb),
          'domingo',     jsonb_build_array(v_par.da, v_par.db),
          'pelicula',    jsonb_build_array(v_par.ma, v_par.mb),
          'combustible', jsonb_build_array(v_par.fa[1], v_par.fb[1])
        )
      ));

      if v_par.libre then
        v_usados := v_usados || array[v_par.ca, v_par.cb];
      end if;
    end loop;
  end loop;

  return v_out;
end;
$$;

-- Lo que ve un participante. Es la función que protege la sorpresa:
-- mientras la revelación esté apagada, devuelve un número y nada más.
create or replace function mi_resumen(p_correo text, p_codigo uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_correo  text := lower(btrim(p_correo));
  v_cfg     configuracion;
  v_yo      respuestas;
  v_nombre  text;
  v_ref     numeric;
  v_umbral  int;
  v_altos   int;
  v_top     jsonb;
  v_improb  jsonb;
  v_cats    jsonb;
begin
  select * into v_cfg from configuracion where id = 1;

  select p.nombre into v_nombre
  from participantes p
  where p.correo = v_correo and p.codigo_acceso = p_codigo;

  if v_nombre is null then
    return jsonb_build_object('error', 'no_autorizado');
  end if;

  select * into v_yo from respuestas where correo = v_correo;
  if v_yo.correo is null then
    return jsonb_build_object('error', 'sin_respuestas');
  end if;

  v_umbral := v_cfg.umbral_ica;
  select greatest(fn_referencia(), coalesce(max(fn_ica_crudo(v_yo, r)), 0))
    into v_ref
    from respuestas r where r.correo <> v_correo;

  select count(*) into v_altos
  from respuestas r
  where r.correo <> v_correo
    and fn_escalar(fn_ica_crudo(v_yo, r), v_ref) >= v_umbral;

  if not v_cfg.revelacion_activa then
    return jsonb_build_object(
      'revelado', false,
      'nombre',   v_nombre,
      'umbral',   v_umbral,
      'altos',    v_altos,
      'reunion',  jsonb_build_object(
        'fecha',  v_cfg.reunion_fecha,
        'lugar',  v_cfg.reunion_lugar,
        'enlace', v_cfg.reunion_enlace)
    );
  end if;

  -- Revelación activa: top 3, el improbable y las categorías de la Fase 3.
  with r as (
    select p.nombre, p.dependencia, p.foto_path, x.emoji,
           fn_escalar(fn_ica_crudo(v_yo, x), v_ref) as pct,
           fn_comunes(v_yo, x) as comunes
    from respuestas x join participantes p on p.correo = x.correo
    where x.correo <> v_correo
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object(
        'nombre', t.nombre, 'dependencia', t.dependencia, 'emoji', t.emoji,
        'foto_path', t.foto_path, 'pct', t.pct, 'comunes', to_jsonb(t.comunes))
        order by t.pct desc)
      from (select * from r order by pct desc limit 3) t), '[]'::jsonb),
    (select jsonb_build_object(
        'nombre', t.nombre, 'dependencia', t.dependencia, 'emoji', t.emoji,
        'foto_path', t.foto_path, 'pct', t.pct)
      from (select * from r order by pct asc limit 1) t)
  into v_top, v_improb;

  select coalesce(jsonb_agg(m) filter (
           where m->'a'->>'correo' = v_correo or m->'b'->>'correo' = v_correo
         ), '[]'::jsonb)
    into v_cats
    from jsonb_array_elements(matches_fase3()) m;

  return jsonb_build_object(
    'revelado',   true,
    'nombre',     v_nombre,
    'correo',     v_correo,
    'umbral',     v_umbral,
    'altos',      v_altos,
    'top',        v_top,
    'improbable', v_improb,
    'categorias', v_cats,
    'reunion',    jsonb_build_object(
      'fecha',  v_cfg.reunion_fecha,
      'lugar',  v_cfg.reunion_lugar,
      'enlace', v_cfg.reunion_enlace)
  );
end;
$$;

-- Ranking completo de una persona. Solo para el administrador.
-- Se borra antes de crearla porque PostgreSQL no deja cambiar el tipo
-- de retorno de una función existente con "create or replace", y este
-- archivo está pensado para poder volver a ejecutarse completo.
drop function if exists admin_ranking(text);
create or replace function admin_ranking(p_correo text)
returns table (
  correo text, nombre text, dependencia text, foto_path text,
  emoji text, pct int, comunes text[]
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_yo  respuestas;
  v_ref numeric;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'Solo el administrador puede consultar el ranking';
  end if;

  select * into v_yo from respuestas where respuestas.correo = lower(btrim(p_correo));
  if v_yo.correo is null then return; end if;

  v_ref := fn_referencia();

  return query
  select p.correo, p.nombre, p.dependencia, p.foto_path, x.emoji,
         fn_escalar(fn_ica_crudo(v_yo, x), v_ref),
         fn_comunes(v_yo, x)
  from respuestas x join participantes p on p.correo = x.correo
  where x.correo <> v_yo.correo
  order by 6 desc, p.nombre asc;
end;
$$;


-- -------------------------------------------------------------
-- 4. SEGURIDAD (RLS)
--
--  La clave anónima viaja en el JavaScript y es pública por diseño.
--  La seguridad no la da esconderla: la da esto.
-- -------------------------------------------------------------

alter table participantes enable row level security;
alter table respuestas    enable row level security;
alter table configuracion enable row level security;
alter table complementos  enable row level security;

-- Sin políticas de SELECT para anon: nadie anónimo lee estas tablas.
-- Toda inserción pasa por registrar(), que es security definer.

drop policy if exists admin_lee_participantes on participantes;
create policy admin_lee_participantes on participantes
  for select to authenticated using (true);

drop policy if exists admin_edita_participantes on participantes;
create policy admin_edita_participantes on participantes
  for delete to authenticated using (true);

drop policy if exists admin_lee_respuestas on respuestas;
create policy admin_lee_respuestas on respuestas
  for select to authenticated using (true);

drop policy if exists admin_config on configuracion;
create policy admin_config on configuracion
  for all to authenticated using (true) with check (true);

drop policy if exists admin_complementos on complementos;
create policy admin_complementos on complementos
  for select to authenticated using (true);

-- Permisos de ejecución de las funciones públicas.
grant execute on function config_publica()              to anon, authenticated;
grant execute on function correo_disponible(text)       to anon, authenticated;
grant execute on function registrar(jsonb)              to anon, authenticated;
grant execute on function recuperar_codigo(text, date)  to anon, authenticated;
grant execute on function mi_resumen(text, uuid)        to anon, authenticated;
grant execute on function matches_fase3()               to anon, authenticated;
grant execute on function admin_ranking(text)           to authenticated;


-- -------------------------------------------------------------
-- 5. STORAGE — las fotos de perfil
--
--  El bucket 'perfiles' es PÚBLICO a propósito. Los nombres de
--  archivo son UUID aleatorios y la aplicación solo entrega esas
--  rutas cuando la revelación está encendida, así que en la
--  práctica nadie llega a una foto sin que se la muestren. La
--  alternativa (bucket privado con URLs firmadas) obligaría a que
--  cada participante estuviera autenticado, y el requisito era
--  justamente que no hubiera login.
--  No se crea política de SELECT sobre storage.objects: sin ella
--  nadie puede LISTAR el bucket, solo abrir una ruta que ya conoce.
-- -------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('perfiles', 'perfiles', true)
on conflict (id) do update set public = true;

drop policy if exists sube_foto on storage.objects;
create policy sube_foto on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'perfiles');


-- -------------------------------------------------------------
-- 6. COMPROBACIÓN
--    Después de ejecutar todo, esto debe devolver una fila.
-- -------------------------------------------------------------
select
  (select count(*) from participantes) as participantes,
  (select count(*) from complementos)  as complementos,
  config_publica()                     as configuracion;
