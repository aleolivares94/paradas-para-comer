# Paradas para comer — Actualización 3.0

**Objetivo:** buscar los restaurantes que el equipo ya guardó por cercanía, sin cambiar las cuentas ni borrar datos.

## Antes de empezar

- La app sigue usando el mismo proyecto Firebase y la misma colección `teams/equipo/restaurants`.
- Ninguna de estas operaciones borra los restaurantes existentes.
- Como medida adicional, podés abrir la app actual e ir a **Respaldo de la guía → Exportar JSON** para guardar una copia.
- **No hace falta crear un proyecto, una base de datos ni usuarios nuevos.**

## Paso 1 — IMPORTANTE: actualizar las reglas de Firebase

1. Abrí https://console.firebase.google.com/ y entrá en **Paradas para comer**.
2. En el menú izquierdo: **Firestore → Reglas**.
3. Abrí `firestore.rules` incluido en este ZIP en Bloc de notas.
4. Copiá TODO su contenido y reemplazá el código que aparece en la pestaña **Reglas**.
5. Tocá **Publicar**. Esto habilita los campos opcionales `lat` y `lng` sin cambiar la política de usuarios verificados ni los miembros autorizados.

**Importante:** subir `firestore.rules` a GitHub NO publica esas reglas en Firebase. Es obligatorio el paso anterior.

## Paso 2 — Subir los archivos a GitHub

1. Abrí https://github.com/aleolivares94/paradas-para-comer
2. En **Code → Add file → Upload files**, arrastrá estos archivos, sueltos (no el ZIP):
   - `index.html`
   - `app.js`
   - `styles.css`
   - `location-utils.mjs` (archivo nuevo)
   - `sw.js`
   - `firestore.rules` (copia del proyecto)
   - `GUIA_ACTUALIZACION_V3.md` (opcional)
3. Si GitHub advierte que algunos archivos ya existen, confirmá que querés reemplazarlos.
4. Al final pulsá **Commit changes**.
5. En **Actions** comprobá la publicación de Pages. La web se mantiene en la misma dirección:
   https://aleolivares94.github.io/paradas-para-comer/
6. Si el navegador todavía muestra la versión anterior, recargá con **Ctrl+F5**. Si la instalaste en un móvil, cerrala y volvela a abrir con conexión a internet.

**No cambies** `firebase-config.js`, el ícono ni el manifiesto: lo que ya funciona se conserva.

## Paso 3 — Probar Cerca de mí

- Abrí la app, iniciá sesión y bajá a **Restaurantes guardados**.
- Tocá **Cerca de mí** y aceptá la ubicación cuando el navegador lo pida. Funciona por HTTPS.
- Elegí el radio (5, 10, 25, 50, 100 o 200 km). Las distancias indicadas son **en línea recta**, no por carretera.
- También podés desplegar **¿Probando desde la PC?** e ingresar coordenadas manuales para simular una ubicación.
- **No se guarda tu ubicación personal** en Firestore; solo se consulta al pulsar el botón.

## Paso 4 — Añadir la ubicación exacta a los restaurantes

Los restaurantes guardados antes de esta actualización no tienen coordenadas, por lo que NO aparecerán en Cerca de mí hasta completarlas.

1. Buscá un restaurante y tocá **Editar**.
2. Abrí **Ubicación exacta del restaurante**.
3. Elegí una de estas opciones:
   - **Detectar del enlace:** funciona solo si el enlace largo de Google Maps incluye coordenadas de un marcador. Los enlaces cortos `maps.app.goo.gl` normalmente no sirven para extraerlas automáticamente.
   - **Estoy en el restaurante:** toca y concede permiso **solo si estás físicamente allí**.
   - **Coordenadas manuales:** en Google Maps, haz clic derecho sobre el marcador → copiar coordenadas, p. ej. `38.973, -5.797`.
4. Guardá los cambios. La posición del **restaurante** se compartirá con el equipo.
5. Repetí para cada restaurante que quieras mostrar por cercanía.

Podés seguir agregando restaurantes nuevos sin coordenadas; aparecerán en la guía normal pero no en la lista por cercanía.

## En caso de problema

- «No tenés permiso»: asegurate de **publicar las reglas nuevas de Firestore** antes de guardar coordenadas.
- «No se pudo obtener la ubicación»: habilitá los permisos de ubicación del navegador, probá desde tu teléfono o usá coordenadas de prueba.
- Si no ves la novedad: comprobá en el pie de página **Versión equipo 3.0 · Cerca de mí** y actualizá la página.
- Si un enlace de Maps no permite extraer coordenadas, ingresalas manualmente; el botón **Cómo llegar** seguirá funcionando.

**No hace falta contratar ningún servicio de geocodificación ni pagar una API de Google Maps para esta versión.**
