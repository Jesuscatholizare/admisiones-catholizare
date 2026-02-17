# Sistema de Selección de Candidatos - RCCC

Sistema para gestionar el proceso de selección de psicólogos católicos.

**Stack:** Google Apps Script + Google Sheets + Brevo + OpenAI

---

## Estructura del Proyecto

```
admisiones-catholizare/
├── Code.gs                         ← Backend completo (1955 líneas)
├── html/                           ← HTMLs para tu servidor
│   ├── admin-dashboard.html        ← Panel administrativo
│   ├── admin-login.html            ← Login admin
│   ├── exam-webapp.html            ← Interfaz de examen (anti-fraude)
│   └── wordpress-embed.html        ← Formulario registro (Elementor)
├── docs/                           ← Documentación
│   ├── CONTEXT.md                  ← Contexto general del proyecto
│   ├── ESTRUCTURA_SHEETS.md        ← 13 hojas del Google Sheet
│   └── DELAYS_AND_PAUSES.md        ← Delays y tiempos del sistema
└── README.md                       ← Este archivo
```

---

## Flujo del Sistema

```
Candidato se registra (WordPress form)
    ↓
Recibe email de bienvenida + token E1 (Brevo)
    ↓
Toma Examen E1 (120 min, anti-fraude)
    ↓
OpenAI califica preguntas abiertas
    ↓
Admin revisa en Dashboard → Aprueba/Rechaza
    ↓
Candidato acepta Términos → Recibe token E2
    ↓
Toma Examen E2 → Admin revisa → Aprueba
    ↓
Toma Examen E3 → Admin revisa → Categoriza
    ↓
Categoría: JUNIOR (75-79%) | SENIOR (80-89%) | EXPERT (90%+)
    ↓
Entrevista → Aprobación final → Handoff a Onboarding
```

---

## Archivos Clave

### Code.gs (Backend)
El archivo principal. Se pega en Google Apps Script.

**Contiene:**
- `initializeSpreadsheet()` - Crea las 13 hojas automáticamente
- `handleRegistration()` - Registro de candidatos
- `handleExamSubmit()` - Recibe respuestas de exámenes
- `gradeExam()` - Califica con OpenAI (rubrics)
- `approveExamAdmin()` / `rejectExamAdmin()` - Admin aprueba/rechaza
- `assignCategoryAndApprove()` - Asigna Junior/Senior/Expert
- `sendEmail()` - Envío via Brevo > Resend > MailApp
- 8 templates de email (bienvenida, términos, E2, E3, entrevista, rechazo, aprobación, handoff)
- `addContactToBrevoList()` / `moveContactBetweenLists()` - Gestión Brevo
- Token management con ventanas ISO (valid_from/valid_until)

### html/ (Frontend - Para tu servidor)
4 archivos HTML independientes que se comunican con Code.gs via `fetch()`.

**Subir a:** `https://profesionales.catholizare.com/catholizare_sistem/`

**Importante:** Reemplazar `[GAS_DEPLOYMENT_ID]` en cada HTML con tu ID real de Google Apps Script.

---

## Google Sheets (13 hojas)

| Hoja | Propósito |
|------|-----------|
| Config | Variables globales (API keys, emails, duraciones) |
| Candidatos | Base de datos de postulantes |
| Tokens | Tokens de acceso a exámenes |
| Preguntas | Banco de preguntas con rúbricas |
| Test_E1_Respuestas | Respuestas examen 1 |
| Test_E2_Respuestas | Respuestas examen 2 |
| Test_E3_Respuestas | Respuestas examen 3 |
| Timeline | Auditoría de eventos |
| Resultados | Resultados finales consolidados |
| Notificaciones | Log de emails enviados |
| Usuarios | Admins del sistema |
| Sessions | Sesiones activas |
| Login_Audit | Intentos de login |

Detalle completo: [docs/ESTRUCTURA_SHEETS.md](docs/ESTRUCTURA_SHEETS.md)

---

## Integraciones

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| **Brevo** | Email principal | BREVO_API_KEY en Config sheet |
| **Resend** | Email fallback | RESEND_API_KEY en Config sheet |
| **OpenAI** | Calificar respuestas abiertas | OPENAI_API_KEY en Config sheet |
| **Google Sheets** | Base de datos | Spreadsheet ID |

---

## Instalación

### 1. Google Apps Script
1. Copia el contenido de `Code.gs`
2. Pégalo en Google Apps Script
3. Ejecuta `initializeSpreadsheet()` una vez
4. Configura las claves en la hoja "Config"
5. Deploy como Web App

### 2. HTMLs en servidor
1. Sube los 4 archivos de `html/` a tu servidor
2. Reemplaza `[GAS_DEPLOYMENT_ID]` con tu Deployment ID
3. Listo

### 3. WordPress (Elementor)
1. Copia contenido de `html/wordpress-embed.html`
2. Pégalo en un elemento HTML de Elementor
3. Reemplaza `[GAS_DEPLOYMENT_ID]`
4. Publica

---

## Rama de Desarrollo

`claude/candidate-selection-tracker-rb6Ke`
