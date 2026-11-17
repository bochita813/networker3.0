# NETWORKER 3.0 — Hernán Bocci

Landing estática lista para desplegar por GitHub + Netlify.

## Antes de hacer pública la campaña

1. Reemplazá `foto-hernan.jpg` y `video-hernan.mp4` por archivos reales que tengas autorización de usar (guardalos junto a `index.html`).
2. Configurá `const WHATSAPP_NUMBER = '';` en `index.html` usando tu número internacional sin `+`, espacios ni guiones.
3. Revisá las tarjetas de testimonios: no publiques ejemplos como si fueran declaraciones reales. Usá únicamente historias verificables con consentimiento de sus protagonistas.
4. Revisá aviso de privacidad, datos de contacto y políticas de publicidad y mensajería aplicables.
5. Probá todos los botones desde un celular y verificá que WhatsApp abre el mensaje previsto.

## Subir a GitHub

Creá el repositorio `networker-3-0` en GitHub; en su pestaña Code elegí Add file > Upload files y subí `index.html` y `README.md` descomprimidos. Seleccioná Commit changes.

## Conectar con Netlify

En https://app.netlify.com/ elegí Add new project > Import an existing project > GitHub. Autorizá acceso al repositorio, seleccioná `networker-3-0`, dejá Build command vacío y Publish directory en `.`. Elegí Deploy.

Con cada commit a la rama de producción, Netlify podrá volver a publicar automáticamente.

## Edición

Podés modificar el HTML directamente en GitHub o conectar un complemento de GitHub en ChatGPT. GitHub + Netlify no son por sí solos un editor visual de arrastrar y soltar.
