# ❤️ El Algoritmo del Amor y la Amistad

Aplicación web de la actividad de integración de la **Facultad de Ciencias de la Administración**, Universidad del Valle.

Los funcionarios se registran sin login, responden un cuestionario de once preguntas y reciben un resultado en suspenso. El día de la reunión, quien administra proyecta el panel, revela los cinco matches de la Fase 3 y al final enciende un interruptor para que todos puedan ver sus compatibilidades.

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
4. Al final debe aparecer una fila con `participantes = 0`, `complementos = 8` y la configuración en JSON. Si la ves, quedó bien.

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
  lib/preguntas.js     Las once preguntas y sus opciones
  lib/escala.js        Rótulos, colores y textos. NO calcula nada.
  lib/supabase.js      Cliente y URLs de las fotos
  components/Base.jsx  Cabezote, avatar, insignia, spinner
  pages/               Una pantalla por archivo
supabase/schema.sql    Tablas, seguridad y TODO el algoritmo
```

**El cálculo del ICA vive entero en PostgreSQL**, no en el navegador. No es un capricho: si el frontend recibiera las respuestas de todos para calcular ahí, cualquiera con la consola del navegador abierta vería los matches antes de la reunión y se acabaría la sorpresa. Por eso las tablas están cerradas a lectura anónima y la única puerta son las funciones del esquema, que devuelven exactamente lo que cada pantalla necesita.

Mientras la revelación está apagada, `mi_resumen()` devuelve un número y nada más: ni un nombre viaja al navegador.

### Sobre el porcentaje

El puntaje crudo de coincidencias es engañosamente bajo. Con ocho preguntas de seis a diez opciones, coincidir en la mitad ya es muchísimo, y la pareja más compatible de un equipo real ronda el 40 %. Sin escalar, el mensaje «tienes más de 80 % con tres personas» nunca se cumpliría.

Por eso el ICA que se muestra es el crudo **escalado contra la mejor pareja del grupo**. El orden del ranking no cambia: cambia la escala. Si prefieres números crudos, quita la llamada a `fn_escalar` en el esquema.

### Los cinco matches

Cada categoría se calcula distinto, no es el mismo número maquillado:

| Categoría | Cómo se elige |
|---|---|
| 🥇 El match perfecto | El ICA más alto de todas las parejas |
| ⚡ El match improbable | El ICA más bajo |
| 🧩 El complementario | Tabla `complementos` de superpoderes que se potencian, más personajes distintos |
| 🚨 Sobrevivirían juntos | `fn_valor_crisis` pondera cada superpoder ante una crisis |
| 💛 El de la amistad | Solo con las preguntas de la vida: emoji, combustible, música, lugar y planes |

**Una persona no se repite entre categorías.** Sin esa regla, la misma pareja tiende a ganar tres de las cinco y la reunión pierde gracia.

Las dos tablas más subjetivas son `complementos` y `fn_valor_crisis`: las definí con criterio razonable, pero cuando veas las respuestas reales conviene revisar qué parejas salen y ajustarlas desde el SQL Editor. Ahí el algoritmo está opinando sobre personas que ustedes conocen.

---

## Advertencias

**No cambies los textos de las preguntas una vez abierto el formulario.** Las respuestas ya guardadas dejarían de coincidir con las nuevas y el ICA quedaría mal calculado. Si tienes que cambiar algo, hazlo antes de compartir el enlace.

**Los pesos del ICA están en `supabase/schema.sql`**, en la función `fn_ica_crudo`. Si cambias un peso, revisa que sigan sumando 1.

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

---

## Nota sobre `despliegue/deploy.yml`

El archivo del flujo de GitHub Actions llegó en la carpeta `despliegue/` porque las
rutas `.github/workflows/` están protegidas y no se pueden escribir desde
herramientas remotas. **Antes del paso 6, muévelo a su lugar:**

```bash
mkdir -p .github/workflows
mv despliegue/deploy.yml .github/workflows/deploy.yml
rmdir despliegue
```
