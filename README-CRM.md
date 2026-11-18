# NETWORKER 3.0 — CRM visual

CRM de prospectos visual integrado en el mismo repositorio de la landing, disponible en /crm/.
Mantiene diseño y contenido de la landing original; no modifica tus ediciones de Pages CMS.

## Estado
- El CRM visual funciona en modo DEMOSTRACIÓN sin configuración (datos ficticios).
- La landing conserva WhatsApp y su comportamiento actual.
- La sincronización en la nube se habilita al configurar Supabase.

## Activar sincronización real (plan Free)
1. Crear proyecto Free en https://supabase.com/dashboard
2. Abrir SQL Editor y ejecutar el contenido de supabase/crm.sql.
3. Ir a Authentication > Users > Add user y crear un usuario administrador
   con contraseña segura. Deshabilitar registro público si no se necesitan más usuarios.
4. Copiar el UUID del usuario y ejecutar en SQL Editor:
   insert into public.crm_admins(user_id) values ('UUID_DEL_USUARIO') on conflict do nothing;
5. Abrir Project Settings > API Keys o Connect. Copiar Project URL y
   publishable key (sb_publishable_...). Nunca utilizar secret/service_role.
6. Editar crm/config.js en GitHub, completar url y publishableKey, guardar.
7. Netlify publica. Ingresar a https://networker3.netlify.app/crm/ con el usuario creado.
8. Abrir la landing, completar formulario con teléfono y consentimiento,
   enviar un registro DE PRUEBA y confirmar que aparece en Nuevo dentro del CRM.
9. Eliminar los registros de prueba.

## Privacidad y seguridad
- El SQL restringe lectura/edición a UUIDs de usuarios en crm_admins.
- Visitantes solo tienen INSERT limitado y NO pueden consultar contactos.
- Las credenciales incluidas en crm/config.js son públicas por diseño.
- Nunca guardar claves privilegiadas en GitHub.
- La captura puede recibir spam. Antes de campañas grandes, agregar CAPTCHA
  o endpoint con rate limiting. Revisar consentimiento y aviso de privacidad.
- WhatsApp abre un mensaje prellenado: NO envía mensajes automáticamente.
- Los contactos DEMO quedan solo en el navegador, no en la nube.
- El plan Free de Supabase puede pausar el proyecto por inactividad.

## Archivos
- crm/index.html: interfaz visual con kanban, filtros, seguimiento y CSV.
- crm/config.js: parámetros públicos de conexión.
- supabase/crm.sql: tablas, permisos RLS, políticas de acceso.
- index.html: landing existente que envía interesados cuando hay conexión.
