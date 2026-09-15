# ❤️ El Algoritmo del Amor y la Amistad

Aplicación web de la actividad de integración de la **Facultad de Ciencias de la Administración**, Universidad del Valle.

Los funcionarios se registran sin login, responden un cuestionario de trece preguntas y reciben un resultado en suspenso. El día de la reunión, quien administra proyecta el panel, revela los cinco matches de la Fase 3 y al final enciende un interruptor para que todos puedan ver sus compatibilidades.

---

## Lo que necesitas antes de empezar

- **Node.js 20** o superior (`node -v` para comprobarlo)
- Una cuenta de **GitHub**
- Una cuenta de **Supabase** (el plan gratuito basta; puedes crearla con el correo institucional)

Tiempo de montaje: unos 30 minutos la primera vez.

---

## Paso 1 — Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
   - **Nombre:** `algoritmo-fca`
   - **Región:** *East US (North Virginia)* — es la más cercana con buena latencia desde Colombia.
   - **Contraseña de la base de datos:** guárdala en un lugar seguro; no se puede recuperar.
2. Espera a que el proyecto termine de crearse (un par de minutos).

## Paso 2 — Cargar el esquema

1. En el menú lateral, abre **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** su contenido y pégalo.
3. Presiona **Run**.
4. Al final debe aparecer una fila con `participantes = 0`, `complementos = 11` y la configuración en JSON. Si la ves, quedó bien.

El archivo se puede volver a ejecutar completo las veces que quieras: no borra datos.

## Paso 3 — Crear el usuario administrador

1. **Authentication** → **Users** → **Add user** → *Create new user*.
2. Pon tu correo y una contraseña. Marca *Auto Confirm User*.
3. **Authentication** → **Providers** (o *Sign In / Providers*): deja habilitado solo **Email** y **desactiva «Allow new users to sign up»**.

> Esto último es importante: sin desactivarlo, cualquiera podría crearse una cuenta y entrar al panel.

## Paso 4 — Copiar las llaves

En **Project Settings** → **API** copia:

- **Project URL** → algo como `https://abcdefgh.supabase.co`
- **anon public** → una cadena larga que empieza por `eyJ…`

La clave anónima **es pública por diseño**: viaja dentro del JavaScript que descarga cualquier visitante. No es un secreto y no pasa nada si alguien la ve. La que nunca debe salir del panel de Supabase es la `service_role`.

## Paso 5 — Probar en tu computador

```bash
npm install
cp .env.example .env.local     # y pon ahí la URL y la clave anónima
npm run dev
```

Abre la dirección que imprime la terminal. Regístrate tú misma para comprobar que todo el flujo funciona, y entra al panel en `#/admin` con el usuario del paso 3.

## Paso 6 — Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube este proyecto:

   ```bash
   git init
   git add .
   git commit -m "El Algoritmo del Amor y la Amistad"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/algoritmo-fca.git
   git push -u origin main
   ```

2. En el repositorio: **Settings** → **Pages** → en *Source* elige **GitHub Actions**.

3. En **Settings** → **Secrets and variables** → **Actions** → *New repository secret*, crea dos:

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | la Project URL del paso 4 |
   | `VITE_SUPABASE_ANON_KEY` | la clave anónima del paso 4 |

4. Vuelve a **Actions** y vuelve a lanzar el flujo (o haz cualquier commit). Al terminar, el sitio queda en:

   ```
   https://TU-USUARIO.github.io/algoritmo-fca/
   ```

> El `base` del sitio se toma automáticamente del nombre del repositorio, así que si lo llamas distinto no hay que tocar nada.

---

## Cómo se usa el día de la actividad

**Antes**

1. Comparte el enlace con el equipo. El panel (`#/admin`) es solo para ti.
2. Cuando confirmes fecha y hora de la reunión, cárgalas en el panel. Aparecen solas en la pantalla de todos los que ya respondieron, sin volver a publicar nada.

**El día de la reunión**

1. Entra al panel y **cierra el formulario** (interruptor *Formulario abierto*), unas dos horas antes.
2. Presiona **Descargar respaldo**: te baja un JSON con participantes y matches. Es tu red de seguridad si se cae el internet o Supabase.
3. Comparte pantalla y baja a **Modo reunión**. Recorre las cinco categorías: en cada una la tarjeta arranca oculta y presionas *Revelar match* cuando el equipo esté mirando.
4. Al final, enciende **Revelar compatibilidades**. Avísale a la gente que vuelva a abrir el enlace: cada quien verá su top 3, su match improbable y las categorías en las que salió.

**Después**

Cuando la actividad termine, borra los datos personales. En el SQL Editor:

```sql
delete from participantes;   -- las respuestas se borran en cascada
```

Y en **Storage** → `perfiles`, selecciona todo y elimina las fotos.

---

## Cómo está hecho

```
src/
  lib/preguntas.js     Las trece preguntas y sus opciones
  lib/escala.js        Rótulos, colores y textos. NO calcula nada.
  lib/supabase.js      Cliente y URLs de las fotos
  components/Base.jsx  Cabezote, avatar, insignia, spinner
  pages/               Una pantalla por archivo
supabase/schema.sql    Tablas, seguridad y TODO el algoritmo
```

**El cálculo del Índice de Compatibilidad vive entero en PostgreSQL**, no en el navegador. No es un capricho: si el frontend recibiera las respuestas de todos para calcular ahí, cualquiera con la consola del navegador abierta vería los matches antes de la reunión y se acabaría la sorpresa. Por eso las tablas están cerradas a lectura anónima y la única puerta son las funciones del esquema, que devuelven exactamente lo que cada pantalla necesita.

Mientras la revelación está apagada, `mi_resumen()` devuelve un número y nada más: ni un nombre viaja al navegador.

## Cómo califica el algoritmo

Son cuatro fórmulas distintas, no una sola con distintos nombres. Cada categoría de la Fase 3 usa la suya.

### El Índice de Compatibilidad — las diez preguntas que puntúan

Decide el **match perfecto** (el más alto de todas las parejas), el **match improbable** (el más bajo) y el ranking personal que ve cada funcionario.

| Pregunta | Peso | Cómo se compara |
|---|---|---|
| Superpoder laboral | **18 %** | Coincide o no |
| Cualidades del equipo | **14 %** | Proporción compartida \* |
| Plan con el equipo | **12 %** | Proporción compartida \* |
| Plan de domingo | **11 %** | Coincide o no |
| Combustible | **9 %** | Proporción compartida \* |
| Género musical | **9 %** | Coincide o no |
| Película | **9 %** | Coincide o no |
| Lugar ideal | **8 %** | Coincide o no |
| Personaje | **6 %** | Coincide o no |
| Emoji | **4 %** | Coincide o no |
| | **100 %** | |

\* En las preguntas de selección múltiple no es todo o nada: se divide lo que comparten entre todo lo que marcaron entre los dos (índice de Jaccard). Si una persona marcó `{café, música}` y la otra `{café, humor, música}`, comparten 2 de 3 → 0,67 → se llevan el 67 % de ese peso.

El emoji pesa poco a propósito: es la pregunta más ambigua del cuestionario. Dos personas pueden marcar «Curioso» por razones completamente distintas.

**No puntúan:** la kriptonita, la canción y el secreto. Alimentan el match improbable, la lista de música de la Facultad y el juego «¿Quién es?».

### El match de la amistad — solo las preguntas de la vida

Ignora por completo el superpoder, el personaje y las cualidades. Responde «¿con quién te tomarías un café fuera de la oficina?», y eso no se mide con competencias laborales.

| Pregunta | Peso |
|---|---|
| Plan de domingo | **22 %** |
| Género musical | **18 %** |
| Película | **18 %** |
| Plan con el equipo | **16 %** |
| Combustible | **14 %** |
| Lugar ideal | **8 %** |
| Emoji | **4 %** |
| | **100 %** |

### El match complementario — no busca parecidos

| Componente | Vale |
|---|---|
| Sus superpoderes están en la tabla `complementos` | **60 %** |
| Tienen personajes distintos | **20 %** |
| Qué tan distintos son sus planes con el equipo | **hasta 20 %** |

### Sobrevivirían juntos — qué tan útil es cada superpoder en una crisis

| Superpoder | Valor |
|---|---|
| Trabajar bajo presión · Resolver problemas | 1,00 |
| Encontrar soluciones | 0,95 |
| Organizar | 0,90 |
| Maneja los contactos | 0,85 |
| Mantener el buen humor | 0,80 |
| Trabajar en equipo | 0,75 |
| Comunicar | 0,65 |
| Crear ideas | 0,50 |

Se promedian los dos valores y encima se suma: **+12 %** si los superpoderes son distintos (aportan cosas diferentes ante el mismo problema) y **+5 %** por cada persona que valore compromiso, responsabilidad o confianza. El total se corta en 100 %.

### Las dos tablas subjetivas

`complementos` y `fn_valor_crisis` las definimos con criterio razonable, pero son opiniones, no hechos. Cuando veas las respuestas reales conviene revisar qué parejas salen y ajustarlas desde el SQL Editor: ahí el algoritmo está opinando sobre personas que ustedes conocen.

---

## Por qué los porcentajes están escalados

El puntaje crudo de coincidencias es engañosamente bajo. Con diez preguntas de seis a quince opciones, coincidir en la mitad ya es muchísimo, y la pareja más compatible de un equipo real ronda el 40 %. Sin escalar, el mensaje «tienes más de 80 % con tres personas» nunca se cumpliría.

Por eso el porcentaje que se muestra es el crudo **escalado**, con la fórmula `97 × (crudo ÷ referencia) ^ 0,8`. El orden del ranking no cambia nunca: cambia la escala.

La pregunta interesante es contra qué referencia.

**En el ranking personal** (el top 3 y el Índice de Compatibilidad de cada persona) la referencia es **la mejor pareja de todo el grupo**. Así los porcentajes son comparables entre personas: el 87 % de Ana y el 87 % de Pedro quieren decir lo mismo.

**En las cinco categorías de la reunión** la referencia es **la mejor pareja que todavía estaba disponible** en el turno de esa categoría. Esto necesita explicación.

Las categorías se resuelven en orden y cada una descarta a quienes ya salieron, para que no se repita gente. La amistad es **la última**, así que cuando le llega el turno sus mejores parejas suelen estar ocupadas. Midiéndola contra la mejor del grupo entero —una pareja que la elegida no puede alcanzar porque ni siquiera compite— salían números como 40 %, que proyectados se leen como «se llevan poquito» cuando en realidad querían decir «menos que aquella otra pareja, que ustedes no van a ver».

Con la referencia local, la pareja mostrada en cada categoría siempre sale alta, que es lo que corresponde: es la mejor de su categoría entre las que quedaban.

**El precio de esta decisión:** los porcentajes ya no son comparables *entre* categorías. Un 97 % en amistad y un 97 % en el match perfecto no significan lo mismo. Dentro de una misma categoría sí, y en la reunión nunca se proyectan dos categorías a la vez.

La excepción es el **match improbable**, que también se mide contra la mejor disponible pero al revés: ahí un número bajo es justamente el chiste.

### Cuántas personas se necesitan

Cinco categorías × dos personas = **diez personas distintas como mínimo**. Con menos, es matemáticamente imposible que no se repita alguien, y el panel lo avisa con una línea naranja bajo el match. Con menos de diez la aplicación no se rompe: prefiere repetir antes que dejarte una categoría vacía en plena reunión.

---

## Advertencias

**No cambies los textos de las preguntas una vez abierto el formulario.** Las respuestas ya guardadas dejarían de coincidir con las nuevas y el Índice de Compatibilidad quedaría mal calculado. Si tienes que cambiar algo, hazlo antes de compartir el enlace.

**Los pesos del Índice de Compatibilidad están en `supabase/schema.sql`**, en la función `fn_ica_crudo`. Si cambias un peso, revisa que sigan sumando 1.

**Supabase pausa los proyectos gratuitos tras una semana sin actividad.** Para esta actividad no es problema, pero verifica el día anterior que el proyecto responda. Si quieres conservar el sitio después, entra al panel de Supabase cada semana o exporta los datos.

**Las fotos están en un bucket público** con nombres UUID aleatorios y sin permiso de listado: nadie puede recorrer el bucket, solo abrir una ruta que ya conoce. Se hizo así porque el requisito era que no hubiera login; un bucket privado con URLs firmadas obligaría a autenticar a cada participante.

---

## Problemas frecuentes

**«No pudimos conectarnos»** — Revisa que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén bien en `.env.local` (local) o en los secrets del repositorio (publicado). Si cambias un secret hay que volver a lanzar el flujo de Actions.

**La página publicada sale en blanco** — Casi siempre es el `base`. Abre la consola del navegador: si los archivos de `assets/` dan 404, el nombre del repositorio y el `base` no coinciden.

**«Ese correo ya respondió»** — Cada correo responde una sola vez. Para permitir que alguien vuelva a empezar, bórralo en el SQL Editor:
`delete from participantes where correo = 'x@correounivalle.edu.co';`

**El panel me devuelve al login** — La sesión de Supabase expiró. Vuelve a entrar.

**Alguien no puede subir su foto** — La foto es opcional; que siga sin ella. El avatar usará el emoji que eligió en la primera pregunta.

---

Facultad de Ciencias de la Administración · Universidad del Valle · 2026
