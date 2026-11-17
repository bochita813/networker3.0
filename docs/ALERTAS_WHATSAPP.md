# NETWORKER 3.0 — Alertas por WhatsApp

## Estado
El receptor de contactos ya tiene un módulo opcional de avisos por WhatsApp. **Está desactivado hasta configurar Meta y confirmar los costos.** La landing y el CRM continúan recibiendo contactos normalmente.

## Requisitos
- Configurar WhatsApp Business Platform (Cloud API) en Meta Business.
- Registrar un número EMISOR habilitado para la API; no migrar tu número actual sin comprobar coexistencia.
- Tener el Phone Number ID, token de Meta y un teléfono RECEPTOR (donde llegará el aviso). No es recomendable que emisor y receptor sean el mismo número.
- Crear una plantilla de mensaje y esperar la aprobación de Meta. Texto sugerido sin datos personales: «NETWORKER 3.0: tenés una nueva solicitud de información. Ingresá al CRM para revisarla.» Meta determina la categoría.
- Confirmar los cargos por mensaje antes de activar.

## Configuración en Supabase
Desde [Supabase Dashboard](https://supabase.com/dashboard/project/uhdkmgljczeuxzrimfaf/functions) abrir Edge Functions > Secrets. Registrar:
- `WA_ACCESS_TOKEN` = token permanente de Meta (SECRETO)
- `WA_PHONE_NUMBER_ID` = ID del número emisor
- `WA_ALERT_TO` = número receptor con código de país, solo dígitos
- `WA_TEMPLATE_NAME` = nombre exacto de plantilla APROBADA
- `WA_TEMPLATE_LANGUAGE` = idioma exacto de esa plantilla (por ejemplo `es_AR`, solo si Meta la aprobó así)
- `WA_ALERT_ENABLED` = `false` hasta revisar y aprobar costos.

**Nunca incluir tokens privados en GitHub, la landing pública ni este chat.**

## Activación y verificación
Tras aceptar los costos: establecer `WA_ALERT_ENABLED=true`; enviar un registro ficticio desde la landing; verificar que aparezca en el CRM y que llegue el aviso al número receptor. Si Meta falla, el registro sigue almacenado.

El mensaje automático no contiene datos personales del prospecto, solo un aviso para ingresar al CRM protegido.

Documentación: https://developers.facebook.com/documentation/business-messaging/whatsapp/overview/
Precios: https://whatsappbusiness.com/es-la/products/platform-pricing/
