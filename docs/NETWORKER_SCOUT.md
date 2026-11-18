# NETWORKER SCOUT — Motor gratuito de búsqueda y revisión

## Estado (18 de noviembre de 2026)

- Creado: tabla privada `public.crm_scout_profiles` con RLS solo para administradores autorizados del CRM.
- Creado: panel `https://networker3.netlify.app/scout/` que comparte autenticación con el CRM, muestra candidatos públicos y permite guardarlos, revisarlos o descartarlos.
- Creado: programa `scripts/scout_discovery.py`, que consulta el RSS de un buscador público, deduplica coincidencias de URLs de Instagram y calcula una puntuación indicativa.
- Programado: GitHub Actions `.github/workflows/networker-scout.yml` con ejecución diaria a las **12:17 UTC (09:17 Argentina)**, sujeta a demoras, disponibilidad, cuotas y permisos de GitHub.
- **Búsqueda real exitosa el 18 de noviembre de 2026:** la automatización de GitHub Actions incorporó 60 handles listados por tres directorios públicos: 31 Climaps, 20 Famadex, 9 Infloo. GitHub actualizó `scout/candidates.json`. No se verificó directamente que cada cuenta de Instagram continúe accesible ni que tenga interés en la propuesta. Directorio CreatorReach devolvió HTTP 403 y fue excluido de la ejecución posterior; no se intentó evadir el bloqueo. La fuente RSS de Bing seguía sin descubrir URLs de cuentas.
- Se añadió disparador `push` en cambios de script, configuración o workflow para probar el motor sin botones de interfaz, además de las ejecuciones diarias y manuales.
- Diagnósticos por consulta: `feed_inspection` dentro de `scout/candidates.json`.

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

## Datos reales y trazabilidad

Los candidatos importados aparecen en `scout/candidates.json` con `source_query`, `source_page` y `discovery_method=directorio_publico`, que indican qué directorio publicó cada nombre de usuario. En el panel SCOUT se puede abrir tanto el perfil de Instagram como la fuente original para verificar la información. **No se debe interpretar que 60 cuentas listadas son 60 prospectos interesados**; el interés de emprender no se infiere de forma segura ni se verificó por contacto directo. Las entradas estáticas de los directorios pueden agotarse sin nuevas cuentas; el escaneo diario compara y no duplica resultados.


## Ampliación de fuentes (18-11-2026)

Se incorporó el directorio público [EmprenZona](https://www.emprenzona.com.ar/emprende), que publica marcas, rubros, descripciones y cuentas @instagram en fichas abiertas. En la primera ejecución detectó 889 nombres de usuario en dicha fuente, con deduplicación posterior. También se incorporaron y probaron catálogos públicos ADULP, Comunidad de Emprendedorxs y UNL, además de Famadex, Infloo y Climaps.

La primera ejecución ampliada guardó 800 cuentas porque existía un límite de salida de 800; ese límite fue corregido a 2.400 cuentas y se configuró una ejecución adicional de verificación. **Nunca confundir la cantidad de perfiles publicados con personas que quieren asociarse, ni dar por activo o verificado el perfil dentro de Instagram.** Un catálogo puede tener cuentas antiguas. La búsqueda automática corre cada mañana y conservará candidatos previos aunque alguna fuente deje de responder.

El panel ahora pagina en bloques de 100 resultados, permite buscar por nombre y descripción y muestra enlaces a la fuente pública de cada candidato. No modifica \`crm_leads\` ni envía DMs.
