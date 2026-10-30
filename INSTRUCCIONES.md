# Paradas para comer — versión compartida (gratis)

**Qué ofrece:** una misma lista de restaurantes para todos los compañeros, sincronizada en tiempo real. Provincia, pueblo, nombre, enlace de Google Maps y nota; búsqueda y filtros; edición y eliminación; exportación e importación de copias JSON. Un administrador invita a los compañeros por correo electrónico. Disponible en iPhone, Android y ordenador como web instalable (PWA).

**Importante:** el ZIP ya contiene el código de la app, pero **no está publicada ni conectada a una base de datos**. Hasta completar los pasos de abajo no habrá sincronización real. La página `demo.html` sirve para probar la interfaz sin conexión a Firebase, pero **NO comparte datos** entre teléfonos.

## 1. Crear un proyecto gratuito en Firebase

1. Entrá en https://console.firebase.google.com/ con tu cuenta de Google.
2. Elegí **Crear proyecto** y poné, por ejemplo, `paradas-para-comer`.
3. Usá el plan **Spark (sin coste)**. No hace falta registrar tarjeta ni activar el plan Blaze para esta app pequeña. Google Analytics es opcional.
4. En la pantalla del proyecto, agregá una **app web** (ícono `</>`), con el nombre `Paradas para comer`.
5. Firebase te mostrará un objeto `firebaseConfig` con valores como `apiKey`, `authDomain`, `projectId`, `appId`. Copiá esos valores al archivo `firebase-config.js` que viene en esta carpeta, reemplazando los textos `PEGAR_...`. Los campos `storageBucket` y `messagingSenderId` son opcionales para esta versión.
6. Dejá `TEAM_ID = "equipo"` sin cambiar, salvo que quieras usar otro nombre de equipo y modificar las rutas de Firestore en consecuencia.

**Ojo:** `firebaseConfig` es configuración pública de cliente; **no es una contraseña**. La seguridad depende de las reglas de Firestore que vas a configurar en el paso 3. Nunca pegues contraseñas ni claves de cuenta de servicio en este archivo.

## 2. Activar las cuentas de usuario

1. En Firebase, abrí **Authentication > Sign-in method**.
2. Activá el método **Correo electrónico/Contraseña** y guardá.
3. Más adelante, cuando tengas la URL de GitHub Pages, comprobá en **Authentication > Settings > Authorized domains** que aparezca tu dominio `TUUSUARIO.github.io`; si no aparece, agregalo. No incluyas `https://` ni la ruta del repositorio.
4. Cada compañero tendrá su propio correo y contraseña. La app enviará un correo de verificación al crear su cuenta. Hay que verificarlo antes de entrar a los restaurantes.

## 3. Crear la base de datos y protegerla

1. Abrí **Firestore Database > Crear base de datos**.
2. Elegí la **edición Standard**, la ubicación europea que prefieras (por ejemplo, `europe-west1`) y empezá en **modo producción**, no en modo de prueba público.
3. Entrá a la pestaña **Reglas**. Abrí el archivo `firestore.rules` que viene con esta app, **copiá todo** su contenido y pegalo en Firebase, reemplazando las reglas actuales. Pulsá **Publicar**.
4. Ahora, en la pestaña **Datos**, creá la colección `teams` y como primer documento usá el ID exacto `equipo` (sin comillas). Agregá un campo de texto `name` con valor `Equipo de trabajo`.
5. Dentro del documento `teams/equipo`, creá la subcolección `members`. Su primer documento debe tener como **ID tu correo electrónico en minúsculas**, por ejemplo `ejemplo@gmail.com`.
6. En ese documento de miembro agregá estos dos campos de tipo **string**:
   - `email`: `ejemplo@gmail.com` (el MISMO correo del ID)
   - `role`: `admin`
7. Este primer miembro será el administrador. **Es importante:** el primer administrador se crea desde la consola de Firebase, no desde la app. Después podrá invitar a los demás desde el celular.

Estructura esperada:

```text
teams/
  equipo/                         (documento: name = "Equipo de trabajo")
    members/
      ejemplo@gmail.com           (email = "ejemplo@gmail.com", role = "admin")
      otro@correo.com             (email = "otro@correo.com", role = "member")
    restaurants/
      [documentos que crea la app al guardar restaurantes]
```

Las reglas hacen que solo usuarios con **correo verificado e invitación** puedan leer o cambiar restaurantes. Solo el administrador agrega o quita miembros. Los miembros normales pueden guardar, editar y eliminar restaurantes compartidos.

## 4. Publicar la web gratis con GitHub Pages

1. Entrá en https://github.com/ y creá una cuenta gratis, si hace falta.
2. Creá un **repositorio público** nuevo, por ejemplo `paradas-para-comer`. **No subas secretos ni contraseñas.**
3. Descomprimí este ZIP y subí **los archivos que están dentro** de `paradas_para_comer_compartida/` a la **raíz** del repositorio (`index.html`, `app.js`, `styles.css`, `firebase-config.js`, iconos, etc.). No subas solo el ZIP.
4. En el repositorio entrá en **Settings > Pages**, seleccioná **Deploy from a branch > main > /(root)** y guardá.
5. GitHub Pages te proporcionará una dirección parecida a:
   `https://TUUSUARIO.github.io/paradas-para-comer/`
6. Volvé a Firebase Authentication y revisá **Authorized domains** como se explicó en el paso 2.
7. Abrí esa URL. Si tu correo ya está en `members`, elegí **Crear una cuenta**, verificá el correo que recibirás y luego iniciá sesión. Cuando entres, verás la guía y la opción **Invitar compañeros**.
8. Desde **Invitar compañeros** agregá sus correos, ellos abren la misma URL, crean sus cuentas, verifican su correo y ya pueden compartir restaurantes.

**El repositorio será público** (incluidos los archivos de código y la configuración pública). **Los restaurantes NO estarán en GitHub:** se guardan en Firestore y están protegidos por las reglas de acceso.

## 5. Añadir al inicio del celular

- **iPhone:** abrí la URL publicada en **Safari** > botón Compartir > **Añadir a pantalla de inicio** > Añadir. Si aparece la opción **Abrir como app**, activala.
- **Android:** abrí la URL publicada en **Chrome** > menú > **Instalar aplicación** o **Añadir a pantalla de inicio**.

Todos abren el **mismo enlace** y usan sus propias cuentas. Los cambios se reflejan en el resto de los teléfonos conectados.

## 6. Importar datos de la primera versión

Si ya usaste la app local anterior, abrila y pulsá **Exportar copia JSON**. Después entrá a la versión compartida con tu cuenta y elegí **Importar JSON**. La app comprueba los campos y evita importar restaurantes que ya estén guardados con la misma provincia, pueblo y nombre. Se importan un máximo de 400 entradas por archivo.

## Qué es gratis y qué límites hay

- **Firebase Spark:** sin tarjeta y con cuotas gratuitas (Firestore Standard: 1 GiB de datos, 50.000 lecturas y 20.000 escrituras de documentos cada día). Para un grupo pequeño guardando restaurantes debería alcanzar de sobra, **si no se exceden las cuotas ni se activan servicios pagos**. Revisá el panel de uso de Firebase de vez en cuando.
- **GitHub Pages:** permite alojar gratis el sitio desde un repositorio público, sujeto a sus políticas.
- Esta versión no necesita servicios de mapas pagos: **solo guarda enlaces de Google Maps** y abre el enlace original al pulsar Cómo llegar. No usa Google Maps API.
- **La lista compartida necesita internet**; el icono y parte de la interfaz se pueden almacenar en caché, pero no se garantiza que puedas consultar o modificar datos sin conexión.
- No hay copias automáticas de Firestore incluidas: usá periódicamente **Exportar JSON** desde la app.

Referencias oficiales:
- https://firebase.google.com/pricing
- https://docs.cloud.google.com/firestore/quotas
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/auth/web/password-auth
- https://docs.github.com/en/pages/quickstart

## Archivos incluidos

- `index.html`: interfaz principal de la app compartida.
- `styles.css`: apariencia para móvil.
- `app.js`: inicio de sesión, sincronización y funciones.
- `firebase-config.js`: **debes configurarlo** con los datos del proyecto Firebase.
- `firestore.rules`: reglas de seguridad **que debes publicar** en Firestore.
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`: instalación en el celular.
- `demo.html`: vista de prueba local **no sincronizada**.
- `INSTRUCCIONES.md`: esta guía.
