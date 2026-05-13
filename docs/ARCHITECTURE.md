# Arquitectura Técnica — Sistema de Admisiones RCCC

## Diagrama de componentes

```
[WordPress + Elementor]              [Servidor web Apache]
  Formulario de registro     ──→     servidor/registro-candidato.html
                                              │
                                       proxy.php (PHP)
                                              │
                                    [Google Apps Script]
                                         Code.gs
                                              │
                            ┌─────────────────┴──────────────────┐
                    [Google Sheets]      [OpenAI]      [Resend / Brevo]
                    (base de datos)  (calificación IA)  (correos/listas)
```

---

## 1. Google Apps Script (GAS) — `apps-script-dev/Code.gs`

**Versión:** 3.0 RCCC  
**Archivo:** `apps-script-dev/Code.gs` (~2300 líneas)  
**Deployment:** Web App pública (URL fija, no cambiar al redeployar)

### Entrypoints HTTP

| Método | Función GAS       | Descripción                                 |
|--------|-------------------|---------------------------------------------|
| POST   | `doPost(e)`       | Todas las mutaciones (registro, examen, admin) |
| GET    | `doGet(e)`        | Lectura de datos de examen, health check    |

El campo `action` en el body/query string determina qué función se invoca.

### Acciones disponibles

| action                   | Función interna              | Uso                                      |
|--------------------------|------------------------------|------------------------------------------|
| `initial_registration`   | `handleRegistration`         | Registro de candidato nuevo              |
| `submit_exam`            | `handleExamSubmit`           | Enviar respuestas de examen              |
| `save_partial_exam`      | `handleSavePartialExam`      | Guardar respuestas parciales             |
| `acceptTerms`            | `handleAcceptTerms`          | Aceptar T&C antes de E2                  |
| `get_exam`               | vía `doGet`                  | Obtener preguntas del examen             |
| `getDashboardData`       | `handleGetDashboardData`     | Datos para el panel admin                |
| `approveExam`            | `handleApproveExam`          | Aprobar examen (requiere PIN)            |
| `autoApproveE1`          | `handleAutoApproveE1`        | Auto-aprobar E1                          |
| `rejectExam`             | `handleRejectExam`           | Rechazar candidato                       |
| `assignCategory`         | `handleAssignCategory`       | Asignar categoría (Junior/Senior/Expert) |
| `handoff`                | `handleHandoff`              | Transferir aprobado a onboarding         |
| `resetTokenAttempt`      | `handleResetTokenAttempt`    | Reactivar intento (SUPERADMIN only)      |
| `adminLogin`             | `handleAdminLogin`           | Login admin (OTP vía email)              |
| `registerInterviewResult`| `handleRegisterInterviewResult` | Registrar resultado de entrevista     |
| `health`                 | vía `doGet`                  | Health check del GAS                    |
| `gasDiagnostic`          | `handleGasDiagnostic`        | Diagnóstico completo del sistema         |

### Configuración (`getConfig`)

Orden de prioridad para leer una clave:
1. Script Properties (nombre exacto)
2. Script Properties (alias del mapa `PROP_ALIASES`)
3. Hoja `Config` del Spreadsheet (columnas A, B, C)
4. Valor por defecto del código

**Claves relevantes:**

| Clave                   | Default                   | Descripción                        |
|-------------------------|---------------------------|------------------------------------||
| `OPENAI_API_KEY`        | —                         | OpenAI (calificación abierta)      |
| `OPENAI_MODEL`          | `gpt-4o-mini`             | Modelo OpenAI                      |
| `BREVO_API_KEY`         | —                         | Brevo (solo gestión de listas)     |
| `RESEND_API_KEY`        | —                         | Resend (envío de correos)          |
| `EMAIL_FROM`            | noreply@catholizare.com   | Remitente                          |
| `ADMIN_PIN`             | —                         | PIN para acciones admin            |
| `EXAM_E1_DURATION_MIN`  | `120`                     | Duración E1 en minutos             |
| `EXAM_E1_MIN_SCORE`     | `75`                      | Puntaje mínimo E1                  |
| `HANDOFF_SPREADSHEET_ID`| —                         | ID del spreadsheet de onboarding   |
| `INACTIVE_DAYS_THRESHOLD`| `20`                     | Días para marcar inactivo          |

---

## 2. Google Sheets — Base de datos

Cada hoja es una "tabla". La función `insertNewRow(sheet, values)` inserta en la **fila 2** (después del header), no al final.

### Hojas y esquemas

**Candidatos** — registro maestro de cada candidato
```
candidate_id | registration_date | name | email | phone | country |
birthday | professional_type | therapeutic_approach | about |
status | E1_score | E1_date | E2_score | E2_date |
E3_score | E3_date | interview_notes | final_category | last_interaction | notes
```

**Tokens** — tokens de acceso a exámenes
```
token | candidate_id | exam | created_at | valid_from | valid_until |
used | status | email | name | scheduled_date | used_at
```
> `valid_from` y `valid_until` se guardan vacíos — no se usan.  
> `used` (boolean) + `status` ('active'|'used') controlan el único intento.

**Preguntas** — banco de preguntas para E1, E2, E3
```
Cuestionario | N | id | type | category | ai_check | texto |
option_1..5 | correct | almost | rubric_max_points | rubric_criteria |
rubric_red_flags | rubric_raw
```
Tipos de pregunta: `multiple_choice`, `open_ended`, `true_false`.

**Test_E1_Respuestas / Test_E2_Respuestas / Test_E3_Respuestas**
```
candidate_id | started_at | finished_at | elapsed_seconds |
responses_json | blur_events | copy_attempts | ai_detection_count |
verdict | openai_score_json | flags
```

**Timeline** — log de eventos por candidato
```
timestamp | candidate_id | event_type | details_json | actor
```

**Resultados** — resumen final de evaluaciones
```
timestamp | candidate_id | name | email | E1_score | E2_score | E3_score |
average_score | verdict | category | details_json
```

**Notificaciones** — log de correos enviados
```
timestamp | email | subject | provider | status | iso_timestamp
```

**Usuarios** — admins del dashboard
```
email | password_hash | role | created_date | last_login | status
```

**Sessions** — sesiones activas de admins
```
session_id | user_email | created_at | expires_at | ip_address | user_agent
```

**Login_Audit** — auditoría de intentos de login
```
timestamp | email | attempt_type | success | ip_address | notes
```

**Config** — configuración del sistema (columnas A, B, C)
```
Clave | Valor | Tipo
```

---

## 3. Proxy PHP — `servidor/proxy.php`

Actúa como intermediario entre los HTMLs y GAS para:
- Evitar problemas de CORS (los HTMLs llaman a `proxy.php`, no a GAS directamente)
- Aplicar whitelist de acciones permitidas
- Inyectar la IP real del cliente en requests POST

**Configurar antes de desplegar:**
```php
$GAS_DEPLOYMENT_ID = 'TU_DEPLOYMENT_ID'; // línea 18
```

**CORS:** Permite `catholizare.com`, `www.catholizare.com`, `profesionales.catholizare.com`.

---

## 4. Sistema de tokens

Un token es una cadena única generada en `generateToken(candidate_id, exam)`.

**Ciclo de vida:**
1. `saveToken(...)` — creado al registrarse (E1) o al aprobar cada examen anterior
2. `verifyToken(token, exam)` — validado al iniciar/enviar examen
3. `markTokenAsUsed(token)` — marcado al enviar respuestas

**Validación en `verifyToken`:**
- `used === false` → si `true`, mensaje "solo se permite un intento"
- `status === 'active'` → si no, mensaje "Token no activo"
- No hay validación de tiempo — los tokens nunca expiran

**Reseteo de intento (SUPERADMIN):**  
`handleResetTokenAttempt` puede reactivar un token usado — equivale a dar una segunda oportunidad.

---

## 5. Calificación de exámenes

`gradeExam(exam, answers)` itera las respuestas y llama a OpenAI para preguntas abiertas.

**Resultado:**
- `score` — puntaje 0-100
- `flags` — lista de red flags detectados
- `ai_detected` — número de respuestas detectadas como escritas por IA

**Veredictos:**
- `pass` — score >= min_score Y ai_detected === 0
- `review` — ai_detected > 0 (pasa a revisión manual)
- `fail` — score < min_score

**Límite de tiempo** (enforceado en `handleExamSubmit`):
```js
elapsedMinutes > maxDuration + 5  // rechazo con 5 min de margen
```

---

## 6. Email

**Proveedor primario:** Resend (`sendViaResend`)  
**Fallback:** MailApp de GAS  
**Brevo:** solo se usa para gestión de listas de contactos (no envío)

Plantillas de email:
- `sendWelcomeEmail` — bienvenida con link a E1, aviso de único intento, sin fecha límite
- `sendEmailTerms` — link a T&C tras aprobar E1
- `sendEmailE2` — acceso a E2 tras aceptar T&C
- `sendEmailE3` — acceso a E3 tras aprobar E2
- `sendEmailAwaitingInterview` — aviso de entrevista pendiente
- `sendEmailRejected` — rechazo con razón (email empático, no cierra candidatura definitivamente)
- `sendEmailApproved` — aprobación con categoría asignada

---

## 7. Listas Brevo

| Lista               | Config key                  | Descripción                       |
|---------------------|-----------------------------|-----------------------------------|
| Interesados         | `BREVO_LIST_INTERESADOS`    | Candidatos registrados            |
| Rechazados          | `BREVO_LIST_RECHAZADOS`     | No superaron el proceso           |
| Aprobados           | `BREVO_LIST_APROBADOS`      | Candidatos aprobados              |
| Junior              | `BREVO_LIST_JUNIOR`         | Categoría Junior                  |
| Senior              | `BREVO_LIST_SENIOR`         | Categoría Senior                  |
| Expert              | `BREVO_LIST_EXPERT`         | Categoría Expert                  |
| Agenda              | `BREVO_LIST_AGENDA`         | Esperando entrevista              |
| Inconclusos         | `BREVO_LIST_INCONCLUSOS`    | No terminaron el proceso          |

---

## 8. Autenticación admin

1. **Login:** el admin envía email → GAS genera OTP → se envía por correo
2. **OTP:** el admin lo ingresa → GAS valida → crea sesión
3. **PIN:** acciones destructivas (aprobar/rechazar examen) requieren `ADMIN_PIN`
4. **Roles:** `admin` (acceso normal) vs `superadmin` (resetear tokens, diagnóstico)

---

## 9. Handoff

`handleHandoff(data)` mueve al candidato aprobado a la hoja de onboarding externa:
- Copia datos del candidato al `HANDOFF_SPREADSHEET_ID`
- Actualiza status del candidato en Sheets a `handoff_completed`
- Envía notificación al email de handoff (`EMAIL_HANDOFF`)

---

## 10. Anti-fraude

- **blur_events** — contador de veces que el candidato salió del foco de la ventana
- **copy_attempts** — contador de Ctrl+C / clic derecho
- **ai_detection_count** — preguntas donde OpenAI detectó texto generado por IA
- `maxWindowChanges` — máximo permitido antes de marcar `review`

Estos datos quedan en `Test_Ex_Respuestas` y son visibles en el dashboard admin.

---

## 11. Inicialización del Spreadsheet

Ejecutar UNA SOLA VEZ desde el editor GAS:
- `initializeSpreadsheet()` — crea todas las hojas con headers y configuración por defecto
- `migrateCandidatosSheet()` — si ya hay datos y se necesita actualizar el schema de Candidatos
