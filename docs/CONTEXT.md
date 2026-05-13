# Contexto para IA / Nuevos Desarrolladores

## ¿Qué es este sistema?

Sistema de selección y evaluación de profesionales para **Catholizare.com**, una plataforma de atención psicológica y pastoral. El sistema gestiona el proceso completo de admisión: desde el registro del candidato hasta su aprobación como profesional de la plataforma.

## El archivo que más importa

```
apps-script-dev/Code.gs
```

Este es el backend completo. Contiene toda la lógica: registro, exámenes, calificación, notificaciones, panel admin, handoff. Es ~2300 líneas de JavaScript en Google Apps Script (GAS).

**Regla fundamental:** Solo modifica `apps-script-dev/Code.gs`. Ignora `apps-script-prod/`.

## Cómo funciona el sistema en 5 puntos

1. **Formulario WordPress/Elementor** recibe datos del candidato → llama al servidor
2. **`proxy.php`** en el servidor Apache reenvía la llamada a **Google Apps Script**
3. **GAS** procesa todo: guarda en **Google Sheets**, envía emails vía **Resend**, califica con **OpenAI**
4. **Admin** usa `admin-dashboard.html` para revisar candidatos, aprobar/rechazar exámenes
5. **Tokens** controlan el acceso a cada examen — un solo uso, sin expiración

## Lo que NO está en este repo

- El contenido del Spreadsheet de Google Sheets (datos reales de candidatos)
- El proyecto de Google Apps Script (el código vive aquí pero se despliega manualmente)
- El sitio WordPress (el formulario de Elementor es un widget del CMS)
- Las API keys (están en Script Properties de GAS o en la hoja Config)

## Cómo hacer un cambio

### En el backend GAS:
1. Modifica `apps-script-dev/Code.gs`
2. Commit + push al repo
3. Copia manualmente el archivo al editor de GAS en script.google.com
4. Nueva versión → mismo deployment URL

### En el frontend servidor:
1. Modifica el archivo en `servidor/`
2. Commit + push al repo
3. Sube manualmente el archivo al servidor en `/catholizare_sistem/`

## Gotchas importantes

### `insertNewRow` inserta en fila 2, no al final
Esto es intencional — el candidato más reciente aparece al tope de la hoja.

### Los tokens nunca expiran
La columna `valid_until` en la hoja `Tokens` está siempre vacía. `verifyToken` no la verifica.  
La duración de 120 minutos es del **examen** (una vez iniciado), no del token.

### `birthday` en el formulario es la fecha de nacimiento del candidato
No es una fecha de examen. El campo `scheduled_date` fue eliminado en v3.0.

### `apps-script-prod/Code.gs` está desactualizado
No lo modifiques. Si necesitas ver el estado "de producción", consulta directamente el editor de GAS en la consola de Google.

### El deployment ID no está en el repo
`proxy.php` tiene `$GAS_DEPLOYMENT_ID = 'YOUR_DEPLOYMENT_ID_HERE'` como placeholder.  
El ID real está configurado en el servidor. No lo commitees.

### Brevo no envía emails
Brevo solo gestiona listas de contactos. Los emails se envían por Resend. Si Resend falla, hay un fallback a MailApp de GAS.

## Puntajes y categorías

| Categoría | Rango  | Config keys                              |
|-----------|--------|------------------------------------------|
| Junior    | 75-79  | `CATEGORY_JUNIOR_MIN`, `CATEGORY_JUNIOR_MAX` |
| Senior    | 80-89  | `CATEGORY_SENIOR_MIN`, `CATEGORY_SENIOR_MAX` |
| Expert    | 90+    | `CATEGORY_EXPERT_MIN`                    |

El puntaje mínimo para pasar cada examen es 75 por defecto (`EXAM_E1_MIN_SCORE`).

## Estructura de carpetas del servidor

```
/catholizare_sistem/              ← Raíz en el servidor Apache
├── proxy.php                     ← Punto de entrada de todas las llamadas API
├── acceso.html                   ← Página de acceso (redirect al examen con token)
├── admin-dashboard.html          ← Panel de administración completo
├── admin-login.html              ← Login del panel admin
├── exam-webapp.html              ← App de examen (versión alternativa)
├── terminos-y-condiciones.html   ← T&C a aceptar antes de E2
├── registro-candidato.html       ← Formulario alternativo (no el de Elementor)
└── examen/
    └── index.html                ← Examen con URL amigable
```

## Roles en el panel admin

| Rol         | Permisos                                                         |
|-------------|------------------------------------------------------------------|
| `admin`     | Ver candidatos, revisar exámenes, aprobar/rechazar (con PIN)     |
| `superadmin`| Todo lo de admin + resetear tokens, diagnóstico, gestión usuarios |

## Timeline de eventos

Cada acción relevante queda registrada en la hoja `Timeline`:
- `CANDIDATO_REGISTRADO`
- `TEST_E1_COMPLETADO`, `TEST_E2_COMPLETADO`, `TEST_E3_COMPLETADO`
- `EXAMEN_E1_APROBADO`, `EXAMEN_E1_RECHAZADO` (y sus equivalentes para E2, E3)
- `TERMINOS_ACEPTADOS`
- `TOKEN_ATTEMPT_RESET`
- `ENTREVISTA_REGISTRADA`
- `CATEGORIA_ASIGNADA`
- `HANDOFF_COMPLETADO`

## Preguntas frecuentes

**¿Dónde están las preguntas del examen?**  
En la hoja `Preguntas` del Spreadsheet. La columna `Cuestionario` es 'E1', 'E2' o 'E3'.

**¿Cómo se califica una pregunta abierta?**  
`gradeExam` envía la pregunta + respuesta + rubric a OpenAI y recibe un puntaje.

**¿Qué pasa si el candidato cierra el examen a medias?**  
`handleSavePartialExam` guarda las respuestas hasta ese punto. El admin puede verlas.  
El token sigue activo hasta que el candidato envíe el examen completo.

**¿Cómo se da una segunda oportunidad?**  
Solo SUPERADMIN puede ejecutar `resetTokenAttempt` con una razón justificada. Queda en Timeline.

**¿Qué es el `HANDOFF_SPREADSHEET_ID`?**  
El ID del Google Spreadsheet externo donde se registran los candidatos aprobados para su onboarding. El equipo de admisiones lo gestiona por separado.

**¿Dónde está el ID del deployment de GAS?**  
Solo en el servidor (en `proxy.php` ya configurado). No está en este repo por seguridad.
