# NETWORKER SCOUT — Motor gratuito de búsqueda y revisión

## Estado (18 de noviembre de 2026)

- Creado: tabla privada `public.crm_scout_profiles` con RLS solo para administradores autorizados del CRM.
- Creado: panel `https://networker3.netlify.app/scout/` que comparte autenticación con el CRM, muestra candidatos públicos y permite guardarlos, revisarlos o descartarlos.
- Creado: programa `scripts/scout_discovery.py`, que consulta el RSS de un buscador público, deduplica coincidencias de URLs de Instagram y calcula una puntuación indicativa.
- Programado: GitHub Actions `.github/workflows/networker-scout.yml` con ejecución diaria a las **12:17 UTC (09:17 Argentina)**, sujeta a demoras, disponibilidad, cuotas y permisos de GitHub.
- **Aún no verificada** la primera ejecución real ni que el buscador devuelva perfiles. El archivo `scout/candidates.json` arranca vacío; no hay perfiles inventados.

## Usarlo en 3 pasos

1. Abrí `https://networker3.netlify.app/scout/` con el mismo usuario administrador del CRM.
2. Para ejecutar ahora, entrá en `https://github.com/bochita813/networker3.0/actions/workflows/networker-scout.yml`, elegí **Run workflow** → **Run workflow**. Si falta el botón, revisá permisos de Actions del repositorio o esperá la programación diaria.
3. Cuando la ejecución termine, en SCOUT pulsá **Actualizar resultados**. Abrí cada perfil real en Instagram y verificá su relevancia. **Guardar en mi radar** almacena únicamente el candidato seleccionado en Supabase, privado para el admin.

## Personalizar búsquedas

Editar `scout/queries.json` en GitHub. Máximo 12 búsquedas, hasta 250 caracteres cada una. Son búsquedas normales de un motor público, como:

`site:instagram.com/ emprendedores argentina`

Esto no consulta la API privada de Instagram ni asegura encontrar perfiles públicos.

## Limitaciones importantes

- Este método **no lee seguidores, contactos ni datos privados**, y no requiere contraseña ni token de Instagram.
- No dispara DMs automáticos a cuentas desconocidas.
- Resultados de buscadores/RSS pueden ser nulos, obsoletos o irrelevantes, o dejar de funcionar sin aviso.
- GitHub Actions puede suspender o retrasar ejecuciones según las reglas del servicio; en algunos repositorios hay que habilitar Actions o darle permiso de escritura a `GITHUB_TOKEN` (Settings → Actions → General → Workflow permissions → Read and write).
- El JSON de candidatos `/scout/candidates.json` es un archivo estático público con handles que ya fueron indexados por buscadores. Las revisiones y decisiones del usuario se guardan **solo** en Supabase con RLS.
- La puntuación indica coincidencias de palabras clave en resultados indexados; **no es una evaluación personal ni prueba de interés en el negocio**.
- No conectar este listado automáticamente a `crm_leads`: esa tabla guarda consultas reales y consentidas.

## Diagnóstico

- Ver registro: GitHub → Actions → NETWORKER SCOUT - Busqueda diaria gratuita → última ejecución.
- Si se registra error de RSS, revisar disponibilidad de Bing RSS y ampliar/reducir `scout/queries.json`. El motor no inventa resultados.
- Si la acción dice `403 Permission denied to github-actions[bot]` durante `git push`, cambiar permisos de workflow a escritura en el repositorio.
- Si el panel no abre, verificar despliegue Netlify, acceso por URL correcta y sesión del CRM.
- Si el radar no guarda: revisar credenciales CRM, existencia de la tabla y políticas RLS.
