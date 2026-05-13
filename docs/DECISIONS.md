# Decisiones de Diseño — Sistema RCCC

## Tokens: sin expiración por tiempo

**Decisión:** Los tokens de examen no tienen fecha de expiración. Un token es válido indefinidamente hasta que se use.

**Razón:** El proceso requiere que el candidato elija el momento que más le convenga para tomar el examen. No tiene sentido forzar una ventana de tiempo para el token. La restricción real es el examen en sí: 120 minutos una vez que se inicia.

**Implementación:** `valid_from` y `valid_until` en la hoja `Tokens` se guardan vacíos. `verifyToken` solo valida `used === false` y `status === 'active'`.

**Nota:** No confundir con la duración del examen (120 min). Esa sí se verifica en `handleExamSubmit`.

---

## Tokens: un solo intento

**Decisión:** Cada examen tiene exactamente un intento. No se puede reintentar.

**Razón:** Garantizar la integridad de la evaluación. El conocimiento debe demostrarse en la primera oportunidad.

**Excepción:** SUPERADMIN puede reactivar un token usado via `resetTokenAttempt`, quedando registrado en Timeline con razón.

---

## Sin fecha de examen en el registro

**Decisión:** El formulario de registro NO pide fecha ni hora para el examen E1.

**Razón:** Los exámenes son a demanda — el candidato accede cuando quiere usando el link en su email de bienvenida. Pedir una fecha creaba confusión y era innecesario.

**Historia:** Versiones anteriores (v1/v2) pedían `scheduled_date`. Se eliminó del formulario en v3.0. El parámetro `scheduled_date` en `saveToken` se mantiene por compatibilidad de firma pero siempre se pasa vacío.

---

## Solo `apps-script-dev/` para desarrollo

**Decisión:** `apps-script-prod/Code.gs` NO se modifica. Es un snapshot histórico.

**Razón:** El "production" real vive en la consola de Google Apps Script, no en este repo. `apps-script-prod/` quedó desactualizado y continuar editándolo generaría confusión. Todo cambio va a `apps-script-dev/Code.gs`, que se copia manualmente a la consola GAS.

---

## Google Sheets como base de datos

**Decisión:** Usar Google Sheets como almacenamiento en lugar de una base de datos SQL.

**Razón:** El sistema nació y opera en el ecosistema de Google Workspace (GAS). Sheets permite que el equipo no-técnico de Catholizare pueda revisar y auditar datos directamente sin herramientas adicionales. La escala de candidatos (decenas a pocos cientos) no justifica la complejidad operacional de una DB.

**Consecuencia:** `insertNewRow` inserta en la fila 2 (después del header), no al final. Esto mantiene el candidato más reciente al tope de la hoja.

---

## Resend como proveedor de email (con fallback MailApp)

**Decisión:** Usar Resend como proveedor primario de email transaccional. Si falla, usar MailApp de GAS.

**Razón:** Resend tiene mejor entregabilidad y capacidad de personalización HTML que MailApp. El fallback a MailApp garantiza que ningún email crítico se pierda aunque Resend falle.

**Brevo:** Solo se usa para gestión de listas de contactos, NO para envío de correos.

---

## OpenAI gpt-4o-mini para calificación

**Decisión:** Usar `gpt-4o-mini` para calificar respuestas abiertas y detectar texto generado por IA.

**Razón:** Las preguntas abiertas requieren evaluación con criterio, no solo matching. gpt-4o-mini es suficientemente capaz para esto y es más económico que modelos mayores.

**Veredicto `review`:** Cuando se detecta texto generado por IA, el examen no se rechaza automáticamente sino que pasa a revisión manual del admin.

---

## Proxy PHP en lugar de llamadas directas a GAS

**Decisión:** Los HTMLs del servidor llaman a `proxy.php`, que luego llama a GAS.

**Razón:**
1. GAS no puede configurar cabeceras CORS para permitir llamadas desde el dominio del servidor.
2. El proxy permite agregar una capa de autenticación y whitelist de acciones.
3. El proxy inyecta la IP real del cliente para auditoría.

---

## PIN para acciones admin críticas

**Decisión:** Aprobar y rechazar exámenes requiere ingresar `ADMIN_PIN`.

**Razón:** Prevenir acciones accidentales o no autorizadas. El PIN agrega fricción intencional a acciones irreversibles.

---

## Despliegue manual

**Decisión:** No existe CI/CD. Todo se copia y pega manualmente.

**Razón:** El equipo es pequeño y el stack (GAS + servidor compartido) no se presta fácilmente a automatización de deployment. El riesgo de un deploy automático erróneo supera la incomodidad del proceso manual dado el volumen de cambios.

**Implicación:** Al hacer cambios en GAS, siempre crear una nueva versión pero mantener la misma URL de deployment para no romper el `proxy.php`.

---

## Rama `main` como estado de producción

**Decisión:** `main` refleja el estado actual de producción. No hay rama `dev` ni `staging` en uso activo.

**Razón:** Con despliegue manual, mantener múltiples ramas activas solo añade complejidad sin beneficio real. Los cambios se prueban localmente, se mergean a `main`, y luego se copian manualmente.

---

## Registro histórico de cambios

| Fecha      | Decisión                                                          |
|------------|-------------------------------------------------------------------|
| 2026-02-09 | Crear repo con carpetas `apps-script-dev` y `apps-script-prod`    |
| 2026-02-09 | Establecer ramas `main` (estable) y `dev` (trabajo diario)        |
| 2026-05-13 | Eliminar campo `scheduled_date` del formulario de registro (v3.0) |
| 2026-05-13 | Confirmar tokens sin expiración por tiempo (solo un uso)          |
| 2026-05-13 | Consolidar todo en `main`, borrar ramas de features viejas        |
