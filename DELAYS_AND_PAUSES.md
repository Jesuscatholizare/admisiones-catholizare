# ⏱️ DELAYS Y PAUSAS DEL SISTEMA RCCC

Documento que detalla TODOS los delays, pausas, y tiempos de espera en el sistema.

---

## 📊 Resumen Ejecutivo

| Componente | Tipo | Duración | Automático | Intención |
|-----------|------|----------|-----------|-----------|
| **Timer de Examen** | Countdown | Configurable (120 min) | ✅ | Limitar tiempo |
| **Alerta de Fraude** | Flash | 4 segundos | ✅ | Mostrar warning |
| **Auto-submit por Blur** | Auto-trigger | Al 5º evento | ✅ | Detectar tab switch |
| **Dashboard Refresh** | Polling | 30 segundos | ✅ | Actualizar datos |
| **Success Redirect** | Delay | 3 segundos | ✅ | Mostrar confirmación |
| **Aprobación Admin** | Manual | Variable | ❌ | Decisión humana |
| **Email Delivery** | Async | 1-5 minutos | ✅ | Brevo/Resend |

---

## 🔍 Delays Detallados

### 1. TIMER DEL EXAMEN ⏰

**Ubicación:** `html-dashboard/exam-webapp.html` línea 1798

**Código:**
```javascript
function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);  // ← 1000ms = 1 segundo
}
```

**Propiedades:**
- **Duración:** Configurable en Config sheet (default 120 minutos)
- **Frecuencia de actualización:** Cada 1 segundo
- **Comportamiento:**
  - Cuenta regresiva minutos:segundos
  - Color normal (0-10 min) → Amarillo (5-10 min) → Rojo parpadeante (<5 min)
  - Auto-submit cuando llega a 0:00

**Pasos:**
1. Usuario inicia examen → `startTimer()` ejecuta
2. Cada 1000ms → Actualiza display en HTML
3. Calcula: `remaining = endTime - now`
4. Cuando `remaining <= 0` → Auto-submit

**Regla:** Timer es **MÁS FUERTE** que cualquier otra acción
- Si candidato está respondiendo última pregunta y timer llega a 0 → Auto-submit
- No hay gracia, no hay "un minuto más"

---

### 2. ALERTAS DE FRAUDE (Copy/Paste/Blur) ⚠️

**Ubicación:** `html-dashboard/exam-webapp.html` línea 1808

**Código:**
```javascript
function showAlert(msg) {
    var b = document.getElementById('alertBanner');
    b.textContent = msg;
    b.style.display = 'block';
    setTimeout(function() {
        b.style.display = 'none';  // ← 4000ms = 4 segundos
    }, 4000);
}
```

**Eventos que disparan alertas:**
1. **Copy (Ctrl+C)** → "Copiar no está permitido"
2. **Paste (Ctrl+V)** → "Pegar no está permitido"
3. **Cut (Ctrl+X)** → "Cortar no está permitido"
4. **Blur (cambio de ventana)** → "Advertencia: Has cambiado de ventana"
5. **Blur 3x** → "Advertencia: Cambios de ventana detectados (3). Se enviará al llegar a 5"

**Propiedades:**
- **Duración:** 4 segundos (luego se oculta automáticamente)
- **Posición:** Top banner, naranja (#FF9800)
- **Frecuencia:** Cada evento genera una alerta (hasta 4 segundos)
- **Acumulable:** Si hay 2 intentos de copy en 4 segundos, salen 2 alertas

**Contador:**
- `copyAttempts++` cada vez que copia/pega/corta
- `blurCount++` cada vez que cambia de ventana
- Se envían con el examen al servidor

---

### 3. AUTO-SUBMIT POR DEMASIADOS CAMBIOS DE VENTANA 🔒

**Ubicación:** `html-dashboard/exam-webapp.html` línea 1796

**Código:**
```javascript
window.addEventListener('blur', function() {
    blurCount++;
    if (blurCount >= 5) {
        showAlert('Demasiados cambios de ventana. Enviando examen...');
        setTimeout(submitExam, 2000);  // ← 2000ms = 2 segundos
    }
});
```

**Condiciones:**
- **Trigger:** Después de 5 cambios de ventana (blur events)
- **Acción:** Muestra alerta "Demasiados cambios..." + espera 2 segundos + auto-envía
- **Nonoficar:** El candidato VE que se va a enviar (delay de 2 seg)

**Timeline:**
```
Blur 1 → blurCount=1 (sin acción)
Blur 2 → blurCount=2 (sin acción)
Blur 3 → blurCount=3 + Alerta "Cambios detectados (3)"
Blur 4 → blurCount=4 (sin acción)
Blur 5 → blurCount=5 + Alerta "Enviando..." + WAIT 2 seg + AUTO-SUBMIT
```

---

### 4. ACTUALIZACIÓN AUTOMÁTICA DEL DASHBOARD 🔄

**Ubicación:** `html-dashboard/admin-dashboard.html` línea inicio

**Código:**
```javascript
const REFRESH_INTERVAL = 30000;  // ← 30000ms = 30 segundos

function startAutoRefresh() {
    autoRefreshInterval = setInterval(loadData, REFRESH_INTERVAL);
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();           // Cargar datos inmediatamente
    startAutoRefresh();   // Luego cada 30 seg
});
```

**Propiedades:**
- **Frecuencia:** Cada 30 segundos automáticamente
- **Acción:** Hace `fetch()` a Google Apps Script para obtener datos nuevos
- **Display:** Silencioso (no interrumpe al admin)
- **Actualización visual:** Tabla se re-renderiza si hay cambios

**Timeline para admin que abre dashboard:**
```
T=0s    → Carga datos iniciales
T=30s   → Auto-refresh 1
T=60s   → Auto-refresh 2
T=90s   → Auto-refresh 3
...
T=∞     → Sigue refrescando cada 30s hasta cerrar página
```

**Botón "Actualizar" manual:**
- El botón en navbar llama `refreshData()` inmediatamente (sin delay)
- Útil si admin quiere datos frescos sin esperar 30 segundos

---

### 5. REDIRECT DESPUÉS DE ÉXITO EN FORMULARIO 📱

**Ubicación:** `html-dashboard/wordpress-embed.html` línea ~3 segundos

**Código:**
```javascript
if (result.success) {
    form.reset();
    showSuccess('¡Gracias! Tu solicitud ha sido recibida...');
    button.innerHTML = '✓ Solicitud Enviada';

    // Redirect after 3 seconds
    setTimeout(() => {
        window.location.href = '/gracias';
    }, 3000);  // ← 3000ms = 3 segundos
}
```

**Propiedades:**
- **Duración:** 3 segundos
- **Propósito:** Mostrar mensaje de éxito antes de redirigir
- **UX:** El usuario ve "✓ Solicitud Enviada" + cuenta regresiva mental
- **Destino:** Página `/gracias` (configurable)

**Timeline:**
```
T=0s   → Submit button deshabilitado
T=0.5s → Endpoint responde "success: true"
T=0.5s → Mostrar "¡Gracias! Tu solicitud..."
T=0.5s → Botón cambia a "✓ Solicitud Enviada"
T=3s   → `window.location.href = '/gracias'`
T=3.2s → Nueva página cargada
```

---

### 6. APROBACIÓN/RECHAZO DEL ADMIN (DELAY MANUAL) 👨‍💼

**Ubicación:** `html-dashboard/admin-dashboard.html` modales

**Código:**
```javascript
async function confirmApprove() {
    try {
        const response = await fetch(API_BASE + '?action=approveExam', {
            method: 'POST',
            body: JSON.stringify({
                candidateId: currentCandidateId,
                exam: exam,
                notes: notes
            })
        });
        // ... procesar respuesta
    }
}
```

**Propiedades:**
- **Duración:** ⏳ VARIABLE (decisión humana)
- **Rango:** Desde minutos hasta días
- **Propósito:** Admin revisa examen manualmente
- **Desencadenante:** Admin hace clic en "Aprobar E1" / "Rechazar" / "Categorizar"

**No es un delay del sistema, es un delay administrativo:**
```
CANDIDATO TERMINA EXAMEN
↓
APARECE EN DASHBOARD DEL ADMIN (inmediato)
↓
ADMIN REVISA → 30 segundos a 2 horas (depende del admin)
↓
ADMIN HIZO CLIC "Aprobar" (0 segundos después de clic)
↓
EMAIL ENVIADO AL CANDIDATO (1-5 minutos después)
```

---

### 7. ENVÍO DE EMAILS (BREVO/RESEND) 📧

**Ubicación:** `apps-script-dev/Code.gs` línea 1211

**Código:**
```javascript
function sendEmail(to, subject, htmlBody) {
    const brevoResult = sendViaBrevo(to, subject, htmlBody, brevoKey);
    // Brevo responde en ~500ms-2s
    // Pero el email TARDA en llegar:
    // - Normalmente: 1-2 minutos
    // - Casos raros: hasta 5 minutos
}
```

**Propiedades:**
- **Llamada API:** ~500ms-2s (respuesta del servidor Brevo)
- **Entrega real:** 1-5 minutos (propagación SMTP)
- **Fallback chain:** Brevo → Resend → MailApp
- **Log:** Todo se registra en hoja "Notificaciones"

**Timeline de email:**
```
T=0s      → Code.gs llama a Brevo API
T=0.5s    → Brevo responde "201 Created"
T=0.5s    → Log en "Notificaciones" sheet
T=1-2s    → Candidato ve email (mejor caso)
T=5min    → Candidato recibe email (peor caso)
T=15min   → Seguro que llegó (timeout de reintentos)
```

---

### 8. GRADING CON OPENAI ⚡

**Ubicación:** `apps-script-dev/Code.gs` línea gradeExam()

**Código:**
```javascript
function gradeExam(candidate_id, exam, responsesJson) {
    // OpenAI API call (no delay explícito)
    // Tiempo de respuesta típico: 2-10 segundos (depende de cantidad de preguntas)

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const result = JSON.parse(response.getContentText());
    // Procesar puntuaciones
}
```

**Propiedades:**
- **Duración:** 2-10 segundos (típico)
- **Variabilidad:** Depende de:
  - Número de preguntas
  - Complejidad de rubrics
  - Carga de OpenAI
  - Longitud de respuestas abiertas
- **Sin delay:** Proceso bloqueante (espera respuesta)

**Acción después:**
```
CANDIDATO ENVÍA EXAMEN
↓ (0s)
SERVER INICIA GRADING CON OPENAI
↓ (2-10s espera por OpenAI)
RECIBE PUNTUACIONES
↓ (0s)
GUARDA EN SHEET "Test_E1_Respuestas"
↓ (0s)
ADMIN VE EN DASHBOARD (próxima actualización en 30s)
```

---

### 9. VENTANA DE VALIDACIÓN DE TOKEN (En Google Sheet) 🎫

**Ubicación:** `apps-script-dev/Code.gs` línea verifyToken()

**Código:**
```javascript
function verifyToken(token, exam) {
    // Lee desde "Tokens" sheet
    // Verifica:
    // - valid_from (¿token es válido ya?)
    // - valid_until (¿token expiró?)
    // - used (¿ya se utilizó?)

    const now = new Date();
    if (now < validFrom) {
        return { valid: false, message: 'El examen aún no está disponible' };
    }
    if (now > validUntil) {
        return { valid: false, message: 'El examen ha expirado' };
    }
}
```

**Ventana de validación típica:**
```
Token creado: 2026-02-20 06:01:00
valid_from:   2026-02-20 06:01:00
valid_until:  2026-02-21 23:59:59
Duration:     41 horas 58 minutos
```

**No es un delay, es una VENTANA:**
- El candidato puede acceder **EN CUALQUIER MOMENTO** dentro de esa ventana
- No hay "espera" obligatoria
- Si intenta antes de `valid_from` → "No disponible aún"
- Si intenta después de `valid_until` → "Ha expirado"

---

## 🚫 DELAYS QUE NO EXISTEN

Cosas que **NO tienen delay** en el sistema (todo es inmediato):

1. ❌ **Creación de candidato** → Inmediato en Google Sheet
2. ❌ **Generación de token** → Inmediato
3. ❌ **Guardado de respuestas** → Inmediato
4. ❌ **Actualización de estado** → Inmediato
5. ❌ **Timeline events** → Inmediato
6. ❌ **Brevo contact list** → Inmediato (async)
7. ❌ **API responses** → Inmediato (esperas Red)

**Regla de oro:** Todo en Code.gs es sincrónico (se espera completación antes de siguiente paso), excepto emails y OpenAI (que se loguean pero continúa el flujo).

---

## 📋 TABLA RESUMIDA: ¿CUÁNTO TARDA CADA PASO?

| Paso | Duración | Nota |
|------|----------|------|
| 1. Candidato registra | Inmediato | Input → Google Sheet |
| 2. Email "Bienvenida" | 1-5 min | Vía Brevo |
| 3. Candidato ve token | 1-5 min | Cuando recibe email |
| 4. Candidato inicia examen | 120 min | Timer (configurable) |
| 5. Examen se califica | 2-10s | OpenAI procesa respuestas |
| 6. Admin ve en dashboard | 0-30s | Próx auto-refresh |
| 7. Admin aprueba | 0s - ∞ | Decisión manual (puede tardar horas/días) |
| 8. Email "Aprobación" | 1-5 min | Vía Brevo |
| 9. Candidato recibe token E2 | 1-5 min | Cuando recibe email |
| 10. Candidato toma E2 | 120 min | Timer (configurable) |
| ... (repite para E3) | | |
| Final. Email "Aprobado" | 1-5 min | Vía Brevo |

**Total sin admin delays:** ~6-20 horas (3 exámenes × 2 horas + esperas de email)
**Total CON admin delays:** Variable (depende de qué tan rápido revise)

---

## 🎯 Configuración de Delays

### Duración del Examen
En Google Sheet "Config":
```
EXAM_E1_DURATION_MIN  = 120 (minutos)
EXAM_E2_DURATION_MIN  = 120
EXAM_E3_DURATION_MIN  = 120
```

Cambiar a 90 minutos:
```
EXAM_E1_DURATION_MIN  = 90
```

### Frecuencia de Dashboard Refresh
En `admin-dashboard.html` línea inicio:
```javascript
const REFRESH_INTERVAL = 30000;  // Cambiar a 60000 para 1 minuto
```

### Duración de alertas de fraude
En `exam-webapp.html` línea showAlert():
```javascript
setTimeout(function() {
    b.style.display = 'none';
}, 4000);  // Cambiar a 5000 para 5 segundos
```

---

## 🔧 Casos Especiales

### Caso 1: Candidato pierde conexión durante examen
- **¿Qué pasa?** El timer sigue contando
- **¿Se guarda el examen?** No, hasta que haga submit
- **¿Cuánto tiempo tiene?** El restante del timer original
- **Recomendación:** Implementar "resume exam" feature

### Caso 2: Admin aprobó pero email se perdió
- **¿Qué ven en dashboard?** Status actualizado
- **¿El candidato lo ve?** NO hasta recibir email
- **¿Qué hacer?** Hoja "Notificaciones" muestra FAILED
- **Reenviar manualmente** desde dashboard

### Caso 3: OpenAI está lento (>10s)
- **¿Qué pasa?** El servidor "espera" (bloquea el examen)
- **¿El candidato lo ve?** NO, procesa en backend
- **¿Hay timeout?** Google Apps Script: 30 segundos max
- **Si expira OpenAI?** El examen falla, log en Timeline

### Caso 4: Candidato intenta entrar con token expirado
- **Mensaje:** "El examen ha expirado"
- **Opción:** Generar nuevo token (manual del admin)
- **No hay re-envío automático** - decisión del admin

---

## 📊 Ejemplo de Timeline Completo

**Fecha:** 2026-02-20

```
06:00 → Admin crea candidato en Google Sheet
06:01 → Sistema genera token E1 (valid_from ahora, valid_until mañana 23:59)
06:01 → Email "Bienvenida" enviado a Brevo
06:02 → Brevo comienza a entregar emails
06:05 → Candidato recibe email
06:10 → Candidato hace clic en link, inicia exam
06:10 → Timer comienza: 2:00:00 → 1:59:59 → ...
08:10 → Candidato termina examen, hace clic "Enviar"
08:10 → Google Apps Script recibe respuestas
08:12 → OpenAI termina de calificar
08:12 → Respuestas guardadas en "Test_E1_Respuestas"
08:12 → Status actualizado a "pending_review_E1"
08:12 → Admin VE EN DASHBOARD (espera próxima actualización)
08:30 → Dashboard se auto-actualiza (primer refresh desde 06:00)
08:32 → Admin ve el examen nuevo
08:35 → Admin hace clic "Aprobar E1"
08:35 → Status actualizado a "awaiting_terms_acceptance"
08:35 → Token E2 generado
08:35 → Email "Términos" enviado a Brevo
08:36 → Brevo comienza a entregar
08:40 → Candidato recibe email
...
TOTAL: 2:40 horas hasta recibir invitación E2
```

---

## ✅ Conclusión

**El sistema NO tiene pausas automáticas artificiales.**

Todos los delays son:
1. **Necesarios** (timers de examen, emails)
2. **Configurables** (duración examen, dashboard refresh)
3. **Transparentes** (visible al candidato/admin)
4. **Manuales** (admin decide cuándo aprobar)

**No hay `Utilities.sleep()` artificiales** esperando entre pasos.

---

**Última actualización:** 2026-02-17
**Rama:** `claude/candidate-selection-tracker-rb6Ke`
