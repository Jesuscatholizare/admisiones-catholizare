# 🏗️ Arquitectura de Implementación — Robusta y Funcional

## 📡 Conexión Formulario → Apps Script (API_PROXY)

### Por qué API_PROXY es más robusto

```
❌ SIMPLE (directa):
  Formulario WordPress → Apps Script /exec
  Problemas:
    - CORS issues
    - No hay validación de origen
    - Apps Script ejecuta directamente (seguridad)

✅ ROBUSTA (con proxy):
  Formulario WordPress → api-proxy.php → Apps Script /exec
  Ventajas:
    - Control de origen (solo WordPress)
    - Validación de tokens
    - Rate limiting
    - Logs centralizados
    - Desacoplamiento
    - Apps Script ejecuta en backend (seguro)
```

### Implementación del API_PROXY

El `api-proxy.php` actuará como:
1. **Validador**: Verifica que la solicitud viene de WordPress
2. **Securizador**: Valida estructura de datos
3. **Rate limiter**: Evita spam
4. **Logeador**: Registra todas las solicitudes

```php
// api-proxy.php (ubicación: /profesionales.catholizare.com/api-proxy.php)
<?php
define('ALLOWED_ORIGINS', ['https://profesionales.catholizare.com', 'https://www.catholizare.com']);
define('GAS_SCRIPT_ID', 'tu-script-id-aqui');
define('GAS_DEPLOYMENT_ID', 'AKfycbz...'); // Deployment ID de Apps Script

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? ''));

// 1. Validar origen
if (!in_array($_SERVER['HTTP_ORIGIN'] ?? '', ALLOWED_ORIGINS)) {
    http_response_code(403);
    die(json_encode(['success' => false, 'error' => 'Origen no permitido']));
}

// 2. Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['success' => false, 'error' => 'Solo POST permitido']));
}

// 3. Obtener payload
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'JSON inválido']));
}

// 4. Validar estructura
if (!isset($input['action'])) {
    http_response_code(400);
    die(json_encode(['success' => false, 'error' => 'Campo "action" requerido']));
}

// 5. Llamar Apps Script
$gas_url = "https://script.google.com/macros/d/{GAS_SCRIPT_ID}/usercache/d/{GAS_DEPLOYMENT_ID}/doPost";

$options = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($input),
        'timeout' => 30
    ]
];

$context = stream_context_create($options);
$response = @file_get_contents($gas_url, false, $context);

if ($response === false) {
    http_response_code(502);
    die(json_encode(['success' => false, 'error' => 'Apps Script no responde']));
}

// 6. Retornar respuesta
echo $response;
?>
```

---

## 📊 Estructura Mejorada de Google Sheets

### Hojas Principales

#### 1. **Config** (Centro de configuración)
```
Propósito: TODA variable del sistema en un solo lugar
Acceso: Super-admin solo (permissions limitados)

Columnas:
A: Clave
B: Valor
C: Tipo (string/number/json)
D: Descripción
E: Última actualización

EJEMPLOS:

┌─────────────────────────────┬──────────────────────┬────────┬──────────────────────┐
│ CLAVE                       │ VALOR                │ TIPO   │ DESCRIPCIÓN          │
├─────────────────────────────┼──────────────────────┼────────┼──────────────────────┤
│ OPENAI_API_KEY              │ sk-proj-xxx...       │ string │ API Key OpenAI       │
│ OPENAI_MODEL                │ gpt-4o-mini          │ string │ Modelo a usar        │
│ BREVO_API_KEY               │ xkeysib-xxx...       │ string │ API Key Brevo        │
│ RESEND_API_KEY              │ re_xxx...            │ string │ API Key Resend       │
│ EMAIL_FROM                  │ noreply@rccc.org     │ string │ Email remitente      │
│ EMAIL_ADMIN                 │ admin@rccc.org       │ string │ Email admin          │
│ EMAIL_SUPPORT               │ soporte@rccc.org     │ string │ Email soporte        │
│ BREVO_GROUPS                │ {...JSON...}         │ json   │ IDs grupos Brevo     │
│ EXAM_E1_DURATION_MIN        │ 120                  │ number │ 2 horas en minutos   │
│ EXAM_E1_MIN_SCORE           │ 75                   │ number │ Puntaje mínimo E1    │
│ EXAM_E1_CRITICAL_THRESHOLD  │ 3                    │ number │ Máx errores críticos │
│ EXAM_E2_DURATION_MIN        │ 120                  │ number │ 2 horas              │
│ EXAM_E2_MIN_SCORE           │ 75                   │ number │ Puntaje mínimo E2    │
│ EXAM_E3_DURATION_MIN        │ 120                  │ number │ 2 horas              │
│ EXAM_E3_MIN_SCORE           │ 75                   │ number │ Puntaje mínimo E3    │
│ CATEGORY_JUNIOR_MIN         │ 75                   │ number │ Score mín Junior     │
│ CATEGORY_JUNIOR_MAX         │ 79                   │ number │ Score máx Junior     │
│ CATEGORY_SENIOR_MIN         │ 80                   │ number │ Score mín Senior     │
│ CATEGORY_SENIOR_MAX         │ 89                   │ number │ Score máx Senior     │
│ CATEGORY_EXPERT_MIN         │ 90                   │ number │ Score mín Expert     │
│ INACTIVE_DAYS_THRESHOLD     │ 20                   │ number │ Días antes inconcluso│
│ TIMEZONE                    │ America/Bogota       │ string │ Zona horaria         │
│ APP_NAME                    │ RCCC Evaluaciones    │ string │ Nombre de la app     │
│ APP_VERSION                 │ 1.0.0                │ string │ Versión              │
└─────────────────────────────┴──────────────────────┴────────┴──────────────────────┘
```

#### 2. **Candidatos** (Registro base)
```
Propósito: Info fundamental de cada candidato

A: candidate_id (CANDIDATO_YYYYMMDD_NNNN) [PRIMARY KEY]
B: registration_date (ISO timestamp)
C: full_name
D: email
E: phone
F: country
G: birthday
H: professional_type (Psicólogo, Psiquiatra, etc)
I: therapeutic_approach (texto abierto)
J: about_me (bio)
K: status (registered, in_E1, pausado_E1, in_E2, pausado_E2, in_E3, pausado_E3, completed, rejected, incomplete)
L: last_interaction_date (última vez que hizo algo)
M: final_category (Junior/Senior/Expert)
N: final_status (APROBADO_JUNIOR, APROBADO_SENIOR, APROBADO_EXPERT, RECHAZADO, INCONCLUSO)
O: notes (observaciones admin)
```

#### 3. **Test_1, Test_2, Test_3** (Respuestas de exámenes)
```
Propósito: Guardar respuestas + calificaciones + flageos

A: candidate_id [FOREIGN KEY → Candidatos]
B: exam_id (E1, E2, E3)
C: started_at (timestamp cuando comenzó)
D: finished_at (timestamp cuando terminó)
E: elapsed_seconds (cuánto tardó)
F: responses_json (respuestas en JSON)
G: blur_events (número de veces que cambió de tab)
H: copy_attempts (número de intentos de copy)
I: ai_detection_count (respuestas flaggeadas como IA)
J: verdict (pass, fail, review)
K: openai_score_json (calificaciones de OpenAI)
L: admin_approved (SÍ/NO/PENDIENTE)
M: admin_notes (por qué rechazó)
N: flags (JSON con lista de flags: TIEMPO_EXCEDIDO, AI_DETECTED_Q2, etc)
```

#### 4. **Tokens** (Gestión de acceso)
```
Propósito: Tokens para acceder a exámenes

A: token [PRIMARY KEY] (EXAM_YYYYMMDD_NNNNNN_RANDOM)
B: candidate_id [FOREIGN KEY]
C: exam_id (E1, E2, E3)
D: created_at
E: valid_from (ISO datetime - cuándo es válido)
F: valid_until (ISO datetime - cuándo expira)
G: used (true/false)
H: status (active, expired, used, revoked)
I: scheduled_date (fecha agendada del examen)
```

#### 5. **Timeline** (Auditoría completa)
```
Propósito: Registro de TODOS los eventos

A: timestamp (ISO datetime)
B: candidate_id [FOREIGN KEY]
C: event_type (CANDIDATO_REGISTRADO, TEST_1_INICIADO, TEST_1_COMPLETADO, AI_DETECTED, PAUSA_SOLICITADA, ADMIN_APPROVED_E1, INCONCLUSO_MARCADO, etc)
D: event_details (JSON con contexto)
E: triggered_by (SISTEMA, ADMIN, CANDIDATO)
```

#### 6. **Notificaciones** (Log de emails)
```
Propósito: Rastrear emails enviados

A: notification_id [PRIMARY KEY]
B: candidate_id [FOREIGN KEY]
C: email_to
D: email_type (BIENVENIDA, APROBADO_E1, RECHAZADO, INCONCLUSO, RESULTADO_FINAL, etc)
E: sent_at
F: provider (BREVO, RESEND, FALLBACK)
G: status (sent, delivered, bounced, error)
H: error_message (si aplica)
```

#### 7. **Usuarios** (Para autenticación con contraseña)
```
Propósito: Gestionar usuarios admin + candidatos

A: user_id
B: email [UNIQUE]
C: password_hash (SHA-256)
D: role (ADMIN, SUPER_ADMIN, CANDIDATO)
E: status (ACTIVO, INACTIVO, BLOQUEADO)
F: created_at
G: last_login
H: failed_attempts
H: blocked_until
```

#### 8. **Sessions** (Token de sesiones)
```
Propósito: Gestionar sesiones activas

A: session_token
B: user_id
C: created_at
D: expires_at
E: ip_address (opcional)
```

---

## 🔄 Flujo de Datos Mejorado

```
┌──────────────────────────────────────────────────────────┐
│ 1. REGISTRO                                              │
│ WordPress Form → api-proxy.php → Apps Script            │
│ → Crea candidate_id                                      │
│ → Genera token E1                                        │
│ → Envía email con link                                  │
│ → Timeline: CANDIDATO_REGISTRADO                         │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ 2. CANDIDATO ACCEDE A EXAMEN                            │
│ Email link: /examen/?token=TOKEN&exam=E1               │
│ → WebApp valida token                                   │
│ → Timer inicia 2 horas                                  │
│ → Bloquea copy/paste/ventana                            │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ 3. ENVÍO DE RESPUESTAS                                  │
│ WebApp → api-proxy.php → Apps Script: handleSubmitExam  │
│ → Valida tiempo ≤ 2 horas                               │
│ → Califica con OpenAI                                   │
│ → Detecta IA (70%+)                                     │
│ → Determina verdict (pass/fail/review)                  │
│ → Crea/actualiza fila Test_N                            │
│ → Timeline: TEST_N_COMPLETADO                           │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ 4. ADMIN REVISA EN DASHBOARD                            │
│ Dashboard admin (WebApp) muestra:                        │
│ - Candidatos por estado                                 │
│ - Scores + flags (IA, copy, ventana)                    │
│ - Botones: Aprobar / Rechazar / Pausar                  │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│ 5. TRIGGER DIARIO (Midnight)                            │
│ Cada 24h → detecta inconclusos (20+ días sin actividad) │
│ → Marca como INCONCLUSO                                 │
│ → Envía email notificando                               │
│ → Timeline: INCONCLUSO_MARCADO                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔐 Seguridad

### Frontend (WebApp)
- ✅ Anti-copia: Bloquear Ctrl+C/V/X
- ✅ Anti-ventana: Max 3 cambios de tab (después auto-envío)
- ✅ Timer real: Cuenta atrás visible (2:00:00 → 0:00:00)
- ✅ Validaciones: Email, formato, no vacíos

### Backend (Apps Script)
- ✅ Validar token (existe, no usado, no expirado)
- ✅ Validar tiempo: elapsed ≤ 120 minutos
- ✅ Validar respuestas: no vacías, formato correcto
- ✅ OpenAI: Detectar IA (70%+)
- ✅ Timeline: Auditar TODOS los eventos
- ✅ PropertiesService: No hardcodear nada

### API_PROXY
- ✅ Validar origen (solo WordPress)
- ✅ Validar estructura JSON
- ✅ Rate limiting (máx 100 req/min)
- ✅ Timeout: 30 segundos máximo

---

## 📋 Checklist de Implementación Fase 1

- [ ] Config en Sheets con TODAS las variables
- [ ] Estructura de 8 hojas optimizadas
- [ ] Code.gs v1 que compile sin errores
- [ ] doPost() maneja registration + submit exam
- [ ] doGet() renderiza WebApp con timer
- [ ] Tokens generados con ventanas ISO
- [ ] OpenAI integrado (detección IA + scoring)
- [ ] Brevo integrado (fallback Resend)
- [ ] Timeline automático en TODOS eventos
- [ ] Trigger diario para inconclusos
- [ ] Validaciones robustas (frontend + backend)

