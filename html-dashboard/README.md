# 🌐 HTML Dashboard & Forms - RCCC Evaluaciones

Archivos HTML **SEPARADOS** (no integrados en Code.gs) para alojar en tu servidor:
`https://profesionales.catholizare.com/catholizare_sistem/`

---

## 📁 Archivos Incluidos

### 1. **admin-dashboard.html** - Panel Administrativo
**Ubicación en servidor:** `/admin-dashboard.html`

**Funcionalidades:**
- ✅ Visualización de candidatos en tiempo real
- ✅ Estadísticas (totales, pendientes, aprobados, rechazados)
- ✅ Tabla searchable con filtros
- ✅ Badges de estado con colores
- ✅ Acciones: Aprobar E1/E2/E3, Rechazar, Categorizar
- ✅ Modales para aprobar/rechazar/categorizar
- ✅ Actualización automática cada 30 segundos
- ✅ Toast notifications para feedback
- ✅ Diseño responsive (mobile-friendly)
- ✅ UX mejorado con iconos y animaciones

**UX/UI Improvements:**
- Gradiente RCCC en header (#001A55 → #0966FF)
- Cards con shadow y hover effects
- Tabla con striping y hover
- Badges coloreados por estado
- Animaciones smooth (fade-in, slide-up)
- Loading spinners
- Progress indicators

**Cómo funciona:**
1. Carga datos via `fetch()` a Google Apps Script
2. Renderiza tabla dinámicamente
3. Permite filtrar por nombre/email/ID
4. Permite filtrar por estado
5. Ejecuta acciones (aprobar, rechazar, categorizar) via API

---

### 2. **exam-webapp.html** - Interfaz de Examen
**Ubicación en servidor:** `/exam-webapp.html`

**Funcionalidades:**
- ✅ Carga dinámica de preguntas desde GAS
- ✅ Soporte para preguntas múltiple choice
- ✅ Soporte para preguntas abiertas (textarea)
- ✅ Timer con colores (normal → amarillo → rojo parpadeante)
- ✅ Progress bar que se actualiza con cada respuesta
- ✅ Validación: evita envío sin responder preguntas
- ✅ Confirmation modal antes de enviar
- ✅ Modal de confirmación con resumen

**Anti-Fraude Integrado:**
- 🔒 Bloquea copy/paste/cut (Ctrl+C, Ctrl+V, Ctrl+X)
- 🔒 Detecta cambios de ventana/pestaña (blur events)
- 🔒 Auto-submit después de 5 cambios de ventana
- 🔒 Deshabilita menú contextual (clic derecho)
- 🔒 Contador de intentos de copia
- 🔒 Contador de eventos blur
- 🔒 Alertas flotantes para violaciones

**Parámetros URL:**
- `token={TOKEN}` - Token del candidato (obligatorio)
- `exam={E1|E2|E3}` - Número de examen (obligatorio)

**Ejemplo:**
```
https://profesionales.catholizare.com/catholizare_sistem/exam-webapp.html?token=E1_CANDIDATO_20260217_123456&exam=E1
```

**Qué envía al servidor:**
```javascript
{
    token: "E1_CANDIDATO_...",
    exam: "E1",
    answers: {
        q1: "option_2",
        q2: "Respuesta abierta del candidato...",
        q3: "option_1"
    },
    startedAt: "2026-02-17T14:30:00.000Z",
    finishedAt: "2026-02-17T16:20:15.000Z",
    elapsedSeconds: 6615,
    blur_count: 2,
    copy_count: 1
}
```

---

### 3. **admin-login.html** - Pantalla de Login
**Ubicación en servidor:** `/admin-login.html`

**Funcionalidades:**
- ✅ Login con email/usuario y contraseña
- ✅ PIN opcional (si lo requiere tu sistema)
- ✅ Opción "Recuérdame en este dispositivo" (localStorage)
- ✅ Soporte para autenticación de dos factores (2FA)
- ✅ OTP input con navegación automática
- ✅ Mensajes de error/éxito
- ✅ Diseño profesional y responsive

**Características de Seguridad:**
- Validación HTML5
- Contraseñas con autocomplete="current-password"
- Campos autocomplete="email"
- Recordación segura via localStorage
- HTTPS requerido en producción

**Flujo:**
1. Usuario ingresa email/usuario y contraseña
2. Sistema valida credenciales via Google Apps Script
3. Si es exitoso → Redirige a dashboard
4. Si requiere 2FA → Muestra OTP input
5. Usuario ingresa código de 6 dígitos
6. Sistema valida OTP y redirige

---

### 4. **wordpress-embed.html** - Formulario de Registro (WordPress)
**Ubicación:** Copiar a un elemento HTML en Elementor

**Funcionalidades:**
- ✅ Formulario completo de registro
- ✅ Validación HTML5 + JavaScript
- ✅ Secciones agrupadas (Personal, Profesional, Términos)
- ✅ Campos obligatorios marcados
- ✅ Selectores de país, profesión, enfoque
- ✅ Área de descripción/experiencia
- ✅ Checkboxes para términos, privacidad, newsletter
- ✅ Mensajes de error/éxito
- ✅ Estilos Elementor-compatible
- ✅ Responsive design

**Cómo insertar en WordPress (Elementor):**

1. **Abre tu página en Elementor**
2. **Añade elemento → Insertar → HTML**
3. **Copia TODO el código de `wordpress-embed.html`**
4. **Reemplaza `[GAS_DEPLOYMENT_ID]` con tu ID real**
5. **Guarda y previsualiza**

**Datos que captura:**
```javascript
{
    name: "Juan Pérez",
    email: "juan@ejemplo.com",
    phone: "+57 300 000 0000",
    country: "CO",
    birthday: "1990-05-15",
    professional_type: "Psicólogo Clínico",
    therapeutic_approach: "Cognitivo-Conductual",
    about: "Tengo 15 años de experiencia...",
    newsletter: true
}
```

---

## 🔗 Endpoints Requeridos en Google Apps Script

Los HTMLs hacen `fetch()` a estos endpoints. Debes crear en Code.gs:

### 1. **getDashboardData** - Para dashboard admin
```javascript
GET /macros/... ?action=getDashboardData
Respuesta:
{
    success: true,
    stats: {
        total: 45,
        pending: 12,
        approved: 28,
        rejected: 5
    },
    candidates: [
        {
            id: "CANDIDATO_20260217_1234",
            name: "Juan Pérez",
            email: "juan@ejemplo.com",
            status: "pending_review_E1",
            progress: 33,
            lastInteraction: "2026-02-17T14:30:00Z"
        },
        ...
    ]
}
```

### 2. **getExamData** - Para cargar examen
```javascript
GET /macros/... ?action=getExamData&token={TOKEN}&exam=E1
Respuesta:
{
    success: true,
    candidateName: "Juan Pérez",
    durationMinutes: 120,
    questions: [
        {
            id: "q1",
            n: 1,
            tipo: "multiple",
            texto: "¿Cuál es..?",
            opciones: ["Opción A", "Opción B", "Opción C", "Opción D"],
            rubric_max_points: 2
        },
        {
            id: "q2",
            n: 2,
            type: "open",
            texto: "¿Cómo abordas...?",
            rubric_max_points: 3
        }
    ]
}
```

### 3. **submitExam** - Para enviar examen
```javascript
POST /macros/... ?action=submitExam
Body:
{
    token: "E1_...",
    exam: "E1",
    answers: { q1: "option_1", q2: "respuesta texto" },
    startedAt: "ISO timestamp",
    finishedAt: "ISO timestamp",
    elapsedSeconds: 6615,
    blur_count: 2,
    copy_count: 1
}
Respuesta:
{
    success: true,
    message: "Examen recibido correctamente"
}
```

### 4. **approveExam** - Admin aprueba examen
```javascript
POST /macros/... ?action=approveExam
Body:
{
    candidateId: "CANDIDATO_...",
    exam: "E1",
    notes: "Respuestas excellentes..."
}
Respuesta:
{
    success: true,
    message: "Examen aprobado"
}
```

### 5. **rejectExam** - Admin rechaza examen
```javascript
POST /macros/... ?action=rejectExam
Body:
{
    candidateId: "CANDIDATO_...",
    exam: "E1",
    reason: "Respuestas incompletas..."
}
Respuesta:
{
    success: true,
    message: "Examen rechazado"
}
```

### 6. **assignCategory** - Admin asigna categoría
```javascript
POST /macros/... ?action=assignCategory
Body:
{
    candidateId: "CANDIDATO_...",
    category: "SENIOR",
    comments: "Desempeño excepcional..."
}
Respuesta:
{
    success: true,
    message: "Categoría asignada"
}
```

### 7. **registerCandidate** - Registro desde WordPress
```javascript
POST /macros/... ?action=registerCandidate
Body:
{
    name: "Juan Pérez",
    email: "juan@ejemplo.com",
    phone: "+57 300 000 0000",
    country: "CO",
    birthday: "1990-05-15",
    professional_type: "Psicólogo Clínico",
    therapeutic_approach: "Cognitivo-Conductual",
    about: "Tengo 15 años...",
    newsletter: true
}
Respuesta:
{
    success: true,
    message: "Registrado correctamente",
    candidate_id: "CANDIDATO_20260217_1234"
}
```

### 8. **adminLogin** - Login admin
```javascript
POST /macros/... ?action=adminLogin
Body:
{
    email: "admin@rccc.org",
    password: "password123",
    pin: "1234",
    rememberMe: true
}
Respuesta (sin 2FA):
{
    success: true,
    message: "Login exitoso"
}

Respuesta (con 2FA):
{
    success: true,
    requiresOTP: true,
    message: "Código enviado al email"
}
```

### 9. **verifyOTP** - Verificar OTP
```javascript
POST /macros/... ?action=verifyOTP
Body:
{
    otp: "123456"
}
Respuesta:
{
    success: true,
    message: "Código verificado"
}
```

---

## 🔧 Configuración e Instalación

### Paso 1: Subir archivos HTML a tu servidor
```bash
# Estructura en tu servidor:
https://profesionales.catholizare.com/catholizare_sistem/
├── admin-dashboard.html
├── exam-webapp.html
├── admin-login.html
├── wordpress-embed.html
└── README.md
```

### Paso 2: Obtener Google Apps Script Deployment ID

1. En Google Apps Script, ve a **Deploy** → **New Deployment**
2. Selecciona **Type: Web App**
3. **Execute as:** Tu cuenta
4. **Who has access:** Anyone (o específico según seguridad)
5. Copia el **Deployment ID**
6. Reemplaza `[GAS_DEPLOYMENT_ID]` en todos los HTMLs con tu ID real

### Paso 3: Crear endpoints en Code.gs

Los HTMLs usan `fetch()` a endpoints que reciben `?action={nombre}`.

**Estructura básica:**
```javascript
function doPost(e) {
    const action = e.parameter.action;

    switch(action) {
        case 'registerCandidate':
            return handleRegistration(e);
        case 'getExamData':
            return handleGetExamData(e);
        case 'submitExam':
            return handleExamSubmit(e);
        case 'getDashboardData':
            return handleGetDashboard(e);
        case 'approveExam':
            return handleApproveExam(e);
        // ... etc
        default:
            return jsonResponse(false, 'Action not found');
    }
}

function doGet(e) {
    const action = e.parameter.action;
    return doPost(e); // Reutiliza la lógica POST
}

function jsonResponse(success, message, data) {
    const response = { success, message };
    if (data) response.data = data;
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}
```

### Paso 4: Configurar en WordPress (para formulario)

1. Abre tu página en **Elementor**
2. Agrega elemento **HTML**
3. Copia código de `wordpress-embed.html`
4. Reemplaza `[GAS_DEPLOYMENT_ID]`
5. Actualiza URLs de: términos, privacidad, página de gracias

---

## 🎨 Customización

### Cambiar colores RCCC

En los archivos HTML, busca `:root {}` y modifica:

```css
:root {
    --primary: #001A55;           /* Azul oscuro */
    --primary-light: #0966FF;     /* Azul claro */
    --success: #4CAF50;           /* Verde */
    --warning: #FF9800;           /* Naranja */
    --danger: #f44336;            /* Rojo */
}
```

### Cambiar textos

- Dashboard: Busca `Gestión de Candidatos`, `Candidatos Totales`, etc.
- Examen: Busca `Examen E1`, `Tiempo restante`, etc.
- Login: Busca `Admin Panel`, `Usuario o Email`, etc.
- Formulario: Busca `Información Personal`, `Información Profesional`, etc.

### Agregar más campos al formulario

En `wordpress-embed.html`, añade dentro de `<form>`:

```html
<div class="rccc-form-group">
    <label for="nuevo_campo">Tu Campo <span class="rccc-required">*</span></label>
    <input type="text" id="nuevo_campo" name="nuevo_campo" placeholder="..." required>
</div>
```

Luego en `handleRegistration()` añade:
```javascript
const data = {
    // ... campos existentes ...
    nuevo_campo: formData.get('nuevo_campo')
};
```

---

## 🔒 Consideraciones de Seguridad

### 1. **CORS (Cross-Origin)**
Si los HTMLs están en dominio diferente a Google Apps Script:
- Google Apps Script acepta CORS por defecto
- Los `fetch()` funcionarán normalmente

### 2. **HTTPS**
- Los HTMLs deben servirse via HTTPS
- Google Apps Script deployment siempre es HTTPS
- Recomendación: Usa certificado SSL en tu servidor

### 3. **Validación en Backend**
- **NUNCA confíes solo en validación frontend**
- Siempre valida datos en Google Apps Script
- Verifica tokens, permisos, datos antes de procesar

### 4. **Rate Limiting**
- Considera limitar requests por IP/candidato
- Implementa cooldown después de múltiples intentos fallidos

### 5. **Content Security Policy (CSP)**
Si tu servidor tiene CSP, permite:
```
script-src: https://script.google.com, https://script.googleapis.com
```

---

## 📊 Información sobre PAUSAS/DELAYS del Sistema

### Pausas Documentadas:

| Tipo | Ubicación | Duración | Propósito |
|------|-----------|----------|-----------|
| **Timer Examen** | exam-webapp.html:1798 | 1 segundo | Actualización de timer cada segundo |
| **Alert Flash** | exam-webapp.html:1808 | 4 segundos | Alertas de copia/paste/blur |
| **Auto-submit** | exam-webapp.html:1796 | Al 5º blur | Auto-envío si cambia de ventana 5 veces |
| **Modal closeout** | wordpress-embed.html | N/A | Confirmación antes de enviar |
| **Dashboard refresh** | admin-dashboard.html | 30 segundos | Auto-actualización de datos |
| **Success redirect** | wordpress-embed.html | 3 segundos | Espera antes de redirigir |
| **OTP verification** | admin-login.html | Inmediato | Sin delay, pero con confirmación |

### Notas importantes:

1. **No hay `Utilities.sleep()` en Code.gs** - Todo es asincrónico
2. **No hay Delays en flujo de candidatos** - El sistema es inmediato
3. **La única "pausa" real es el admin** - Cuando un admin aprueba/rechaza, eso es una decisión manual, no un delay del sistema

### Timeline de Eventos:

```
CANDIDATO REGISTRA
↓ (Inmediato)
RECIBE EMAIL
↓ (Según Brevo/Resend)
TOMA EXAMEN (120 min)
↓ (Inmediato al enviar)
ADMIN VE EN DASHBOARD
↓ (Admin decide manualment)
ADMIN APRUEBA/RECHAZA
↓ (Inmediato)
CANDIDATO RECIBE EMAIL
↓ (Según Brevo/Resend)
PRÓXIMO PASO (E2, Términos, etc)
```

**No hay pausas automáticas entre pasos. Todo depende de las decisiones del admin.**

---

## 📞 Troubleshooting

### "Deployment ID inválido"
- Verifica que reemplazaste `[GAS_DEPLOYMENT_ID]` con tu ID real
- El ID debe ser solo el ID, sin paréntesis `[]`

### "Formulario no envía"
- Verifica que el endpoint `?action=registerCandidate` existe en Code.gs
- Abre consola (F12) y mira errores de red/CORS
- Asegúrate HTTPS en ambos lados

### "Dashboard no carga datos"
- Verifica que el endpoint `?action=getDashboardData` existe
- Confirma que Google Apps Script está deployado como Web App
- Revisa permisos de acceso a sheets

### "Examen no se envía"
- Verifica que el endpoint `?action=submitExam` existe
- Confirma que respondiste al menos 1 pregunta
- Abre consola (F12) para ver errores exactos

### "Timer se ve raro"
- Los números usan monospace font (`Monaco`, `Courier New`)
- Si no se ve bien, ajusta `font-family` en `--timer-display`

---

## 📝 Changelog

**v3.0 - 2026-02-17**
- ✅ Extracción de HTMLs SEPARADOS (no integrados)
- ✅ Admin Dashboard con mejor UX
- ✅ Exam WebApp con anti-fraude completo
- ✅ Admin Login con 2FA
- ✅ WordPress Embed para Elementor
- ✅ Endpoints JSON en lugar de HTML inline
- ✅ Documentación completa de delays/pausas

---

**Ultima actualización:** 2026-02-17
**Rama:** `claude/candidate-selection-tracker-rb6Ke`
