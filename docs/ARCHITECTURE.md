# Arquitectura — Sistema de Selección de Candidatos

## 🏗️ Stack Técnico

### Backend (Google Apps Script)
- **Lenguaje**: Google Apps Script (JavaScript)
- **Ubicación**: `apps-script-dev/Code.gs` y `apps-script-prod/Code.gs`
- **Responsabilidades**:
  - Gestión de datos en Google Sheets
  - Integración con OpenAI API (calificación de preguntas abiertas)
  - Envío de notificaciones (Brevo + Resend)
  - Lógica de pausas y aprobaciones
  - WebApp para dashboard admin

### Frontend (Dashboard Admin)
- **Tecnología**: HTML + Vanilla JS (CSS con estilo del onboarding)
- **Ubicación**: HTML incrustado en `Code.gs`
- **Funcionalidades**:
  - Listar candidatos con estado
  - Ver detalles de cada candidato
  - Visualizar respuestas de tests
  - Pausar/reanudar proceso
  - Aprobar/rechazar candidatos
  - Ver timeline de eventos

### Base de Datos (Google Sheets)
- **DEV**: Spreadsheet separado para desarrollo
- **PROD**: Spreadsheet separado para producción
- **Hojas principales**:
  - `Candidatos`: registro base de candidatos
  - `Test_1`, `Test_2`, `Test_3`: respuestas + calificaciones
  - `Pausas`: control de pausas y aprobaciones
  - `Timeline`: eventos del proceso
  - `Notificaciones`: registro de emails
  - `Config`: credenciales y URLs

### Integraciones Externas
1. **OpenAI API**
   - Endpoint: `https://api.openai.com/v1/chat/completions`
   - Uso: Calificar respuestas abiertas
   - Modelo: gpt-4o o gpt-3.5-turbo (definir en DECISIONS.md)

2. **Brevo (Sendinblue)**
   - Endpoint: `https://api.brevo.com/v3/smtp/email`
   - Uso: Envío de correos transaccionales
   - API Key: en hoja `Config`

3. **Resend**
   - Endpoint: `https://api.resend.com/emails`
   - Uso: Envío alternativo de correos
   - API Key: en hoja `Config`

## 🔄 Flujo de Datos

```
┌─────────────────┐
│  Candidato      │
│  (Usuario)      │
└────────┬────────┘
         │ (Registra / Responde tests)
         ↓
┌─────────────────────────────────┐
│  Google Sheets                  │
│  (Candidatos, Test_*, Pausas)   │
└──────────┬──────────────────────┘
           │
┌──────────┴──────────────────────────┐
│  Google Apps Script (Code.gs)       │
├─────────────────────────────────────┤
│  • onOpen()                         │
│  • submitForm()                     │
│  • getCandidate()                   │
│  • gradeOpenAnswers()   ──→ OpenAI │
│  • pauseProcess()                   │
│  • approveCandidate()               │
│  • sendNotification()  ──→ Brevo   │
│  • getTimeline()                    │
│  • doGet() [WebApp]                 │
└──────────┬──────────────────────────┘
           │
     ┌─────┴─────┐
     ↓           ↓
┌──────────┐  ┌────────────┐
│ OpenAI   │  │ Brevo +    │
│ API      │  │ Resend API │
└──────────┘  └────────────┘
     │                 │
     └─────────┬───────┘
               ↓
        ┌────────────────┐
        │ Admin Dashboard│
        │ (WebApp HTML)  │
        └────────────────┘
```

## 📦 Módulos (funciones principales en Code.gs)

### 1. **Módulo de Autenticación**
```
onOpen()
getAdminUser()
validatePermission(userId, role)
```

### 2. **Módulo de Candidatos**
```
registerCandidate(formData)
getCandidate(candidateId)
getCandidatesList(filters)
updateCandidateStatus(candidateId, newStatus)
```

### 3. **Módulo de Evaluaciones**
```
submitTest(candidateId, testNumber, answers)
gradeOpenAnswers(candidateId, testNumber, openAnswers)  // → OpenAI
getTestResults(candidateId, testNumber)
```

### 4. **Módulo de Pausas & Aprobaciones**
```
pauseProcess(candidateId, reason)
resumeProcess(candidateId)
approveCandidatePhase(candidateId, testNumber)
rejectCandidate(candidateId, reason)
```

### 5. **Módulo de Notificaciones**
```
sendNotification(candidateId, messageType)  // Brevo/Resend
recordNotificationLog(candidateId, email, status)
```

### 6. **Módulo de Timeline**
```
addTimelineEvent(candidateId, eventType, details)
getTimeline(candidateId)
getTimeline(candidateId, filterByPhase)
```

### 7. **Módulo de Dashboard (WebApp)**
```
doGet()                             // Renderiza HTML
getCandidate_ajax(candidateId)      // API para AJAX
pauseCandidate_ajax(candidateId)    // API para AJAX
approveCandidate_ajax(candidateId)  // API para AJAX
```

## 🎨 Estilo UI
- **Paleta**: Idéntica al sistema de onboarding (azul, gris, blanco)
- **Componentes**: Cards, botones, tablas, modales
- **Responsivo**: Mobile-first (tablets + mobile)
- **CSS**: Incrustado en HTML (o archivo CSS en sheets si es posible)

## 🔐 Seguridad
1. Verificar rol (admin, super-admin) en cada endpoint
2. No guardar credenciales en código → hoja `Config` con permisos limitados
3. Validar entrada de datos (XSS, inyección)
4. Logs de todas las acciones en `Timeline`

## 📊 Entornos

### DEV Environment
- Spreadsheet: `[URL/ID a definir]`
- Deployment: Apps Script DEV
- Branch: desarrollo
- Testing: pruebas antes de PROD

### PROD Environment
- Spreadsheet: `[URL/ID a definir]`
- Deployment: Apps Script PROD
- Branch: main (solo releases)
- Sincronizado con: producción en vivo
