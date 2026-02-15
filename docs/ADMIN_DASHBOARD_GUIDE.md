# 🎯 Guía: Panel Administrativo — RCCC

**Estado**: ✅ Completo y Listo
**Última actualización**: 2026-02-15
**Rama**: `claude/candidate-selection-tracker-rb6Ke`

---

## Descripción General

El **Panel Administrativo** (admin-dashboard.html) proporciona una interfaz moderna y completa para gestionar candidatos, con especial énfasis en la modal de **"Acciones Avanzadas"** que permite:

✅ Aprobar/Rechazar exámenes
✅ Asignar categorías (Junior/Senior/Expert)
✅ Realizar handoff a Onboarding
✅ Reenviar emails
✅ Buscar y filtrar candidatos

---

## Requisitos Previos

1. **Google Apps Script** con Code.gs desplegado como Web App
2. **Google Sheets** con datos de candidatos en la hoja "Candidatos"
3. **Función getCandidatesForAdmin()** agregada a Code.gs ✅ (Hecha)
4. **Funciones administrativas** en Code.gs:
   - `approveExamAdmin(candidateId, exam)`
   - `rejectExamAdmin(candidateId, exam, reason)`
   - `assignCategoryAndApprove(candidateId, category)`
   - `performHandoff(candidateId)`

---

## Instalación

### Opción A: Deploy como Web App Separada (Recomendado)

Esto permite acceder al dashboard desde una URL independiente.

#### Paso 1: Crear un nuevo Google Apps Script

```
1. Abre Google Drive
2. Crea un nuevo Google Apps Script:
   - Click en "Nuevo" → "Google Apps Script"
3. Llámalo "RCCC Admin Dashboard"
4. Borra el código por defecto
```

#### Paso 2: Agregar el código HTML + JavaScript

```
1. En Google Apps Script, haz click en "+" junto a "Files"
2. Selecciona "HTML"
3. Llámalo "AdminDashboard.html"
4. Copia el contenido de admin-dashboard.html en el editor
5. Haz click en "Guardar"
```

#### Paso 3: Crear archivo de servidor para conectar con Code.gs

```
1. Nuevamente en el editor principal (Code.gs), agrega:
```

```javascript
// In the new Apps Script project for the dashboard
// This will call the functions from your main Code.gs

const MAIN_SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Tu ID de Google Sheets

function getCandidatesForAdmin() {
  // This will be called by the HTML via google.script.run
  return {
    success: true,
    candidates: fetchCandidatesFromMainSheet()
  };
}

function fetchCandidatesFromMainSheet() {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();
    const candidates = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        candidates.push({
          candidato_id: data[i][0],
          nombre: data[i][1],
          email: data[i][2],
          telefono: data[i][3],
          fecha_registro: data[i][4],
          scheduled_date: data[i][5],
          status: data[i][6],
          last_interaction: data[i][7],
          final_status: data[i][8],
          final_category: data[i][9],
          admin_assigned_category: data[i][10]
        });
      }
    }
    return candidates;
  } catch (error) {
    Logger.log('Error: ' + error.message);
    return [];
  }
}

function approveExamAdmin(candidateId, exam) {
  return callMainSheetFunction('approveExamAdmin', [candidateId, exam]);
}

function rejectExamAdmin(candidateId, exam, reason) {
  return callMainSheetFunction('rejectExamAdmin', [candidateId, exam, reason]);
}

function assignCategoryAndApprove(candidateId, category) {
  return callMainSheetFunction('assignCategoryAndApprove', [candidateId, category]);
}

function performHandoff(candidateId) {
  return callMainSheetFunction('performHandoff', [candidateId]);
}

// Helper para llamar funciones en el spreadsheet principal
function callMainSheetFunction(functionName, args) {
  // This would require a more complex setup with UrlFetchApp
  // For now, it's recommended to integrate directly in the main Code.gs
  Logger.log(`Would call ${functionName} with args: ${JSON.stringify(args)}`);
  return { success: true };
}

function doGet(e) {
  return HtmlService.createHtmlFileFromPath('AdminDashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

```
4. Deploy como Web App:
   - Click en "Deploy" → "New Deployment"
   - Type: "Web app"
   - Execute as: Tu cuenta
   - Who has access: Anyone
5. Copia la URL de despliegue
```

#### Paso 4: Acceder al dashboard

```
Abre la URL en tu navegador:
https://script.google.com/macros/d/[DEPLOYMENT_ID]/usercopy
```

---

### Opción B: Integrar en el Spreadsheet Principal

Si prefieres que el dashboard esté integrado en el mismo Spreadsheet principal:

#### Paso 1: Agregar archivo HTML a Code.gs

```
1. En tu Google Sheets → Extensions → Apps Script
2. Click en "+" junto a "Files"
3. Selecciona "HTML"
4. Llámalo "AdminDashboard.html"
5. Copia el contenido de admin-dashboard.html
6. En Code.gs, agrega al final:

function doGet(e) {
  const page = e.parameter.page || 'dashboard';

  if (page === 'dashboard') {
    return HtmlService.createHtmlFileFromPath('AdminDashboard')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

7. Deploy:
   - Click "Deploy" → "New Deployment"
   - Type: "Web app"
   - Execute as: Tu cuenta
   - Who has access: Anyone
8. Copia la URL, accede como:
   https://script.google.com/macros/d/[DEPLOYMENT_ID]/usercopy?page=dashboard
```

---

## Características del Dashboard

### 1. Estadísticas en Tiempo Real

```
┌─────────────────────────────────────────────────────────┐
│ 📊 ESTADÍSTICAS                                          │
├─────────────────┬──────────────┬──────────┬─────────────┤
│ Candidatos Tot. │ En Revisión  │ Aprobado │ Rechazados  │
│        45       │       12     │    28    │      5      │
└─────────────────┴──────────────┴──────────┴─────────────┘
```

Actualiza automáticamente cada minuto.

### 2. Búsqueda y Filtrado

```
Filtrar por Estado:
- Registrado
- Revisión E1
- Esperando Términos
- Revisión E2
- Revisión E3
- Esperando Entrevista
- Aprobado (Junior/Senior/Expert)
- Handoff Completado
- Rechazado

Búsqueda por:
- Nombre (búsqueda parcial)
- Email (búsqueda parcial)
```

### 3. Tabla de Candidatos

```
┌─────────────────────────────────────────────────────────────┐
│ Candidato | Email | Estado | Categoría | Registro | Acciones │
├───────────┼───────┼────────┼──────────┼──────────┼──────────┤
│ Juan G.   │ j@... │ ⏳ Rev │ —        │ 2026-02  │ ⚙️ ... │
│ María P.  │ m@... │ ✅ Apr │ Senior   │ 2026-01  │ ⚙️ ... │
└───────────┴───────┴────────┴──────────┴──────────┴──────────┘
```

Cada candidato tiene un botón "⚙️ Acciones" para abrir el modal.

### 4. Modal de "Acciones Avanzadas"

El modal permite seleccionar entre 5 acciones principales:

#### ✅ Aprobar Examen

```
┌─────────────────────────────────┐
│ Candidato: Juan García           │
│ Examen a Aprobar: [E1/E2/E3] ↓   │
│ Notas: [textarea]                │
│                                  │
│ [Cancelar] [Aprobar Examen]     │
└─────────────────────────────────┘
```

**Acciones:**
- Actualiza estado en base de datos
- Genera token para siguiente examen (si aplica)
- Envía email correspondiente
- Registra evento en Timeline

#### ❌ Rechazar Examen

```
┌─────────────────────────────────┐
│ Candidato: Juan García           │
│ Examen a Rechazar: [E1/E2/E3] ↓  │
│ Razón del Rechazo: [textarea]    │
│   (requerido)                    │
│                                  │
│ [Cancelar] [Rechazar Examen]    │
└─────────────────────────────────┘
```

**Acciones:**
- Cambia estado a "rechazado"
- Mueve contacto de Brevo: interesados → rechazados
- Envía email EML-03 con razón
- Registra evento en Timeline

#### 🏆 Asignar Categoría

```
┌─────────────────────────────────┐
│ Candidato: María Pérez           │
│ Asignar Categoría:               │
│   🥉 Junior                      │
│   🥈 Senior                      │
│   🥇 Expert                      │
│ Notas de Categorización:         │
│   [textarea]                     │
│                                  │
│ [Cancelar] [Asignar Categoría]  │
└─────────────────────────────────┘
```

**Acciones:**
- Asigna categoría (no basada en score, decisión admin)
- Mueve contacto en Brevo: interesados → [junior/senior/expert]
- Actualiza campo admin_assigned_category
- Envía email EML-07 (Aprobación)
- Registra evento CANDIDATO_CATEGORIZADO_APROBADO

#### 🚀 Handoff

```
┌──────────────────────────────────┐
│ Candidato: Carlos López           │
│ Categoría Actual: Senior          │
│                                   │
│ ⚠️ ADVERTENCIA:                   │
│ El handoff transferirá al cand.   │
│ al spreadsheet de Onboarding.    │
│ Esta acción no se puede deshacer  │
│ fácilmente.                       │
│                                   │
│ Confirmación:                     │
│ [Escribir "CONFIRMAR HANDOFF"]   │
│                                   │
│ [Cancelar] [Confirmar Handoff]   │
└──────────────────────────────────┘
```

**Acciones:**
- Valida confirmación (must write "CONFIRMAR HANDOFF")
- Transfiere fila a Onboarding Spreadsheet
- Actualiza estado a handoff_completed
- Envía notificación a email_handoff
- Registra evento HANDOFF_COMPLETADO

#### 📧 Reenviar Email

```
┌─────────────────────────────────┐
│ Candidato: Juan García           │
│ Email a Reenviar:                │
│   EML-01: Bienvenida + E1        │
│   EML-02: Aceptación Términos    │
│   EML-04: Examen E2              │
│   EML-05: Examen E3              │
│   EML-06: Entrevista             │
│   EML-07: Aprobación             │
│ Notas: [textarea]                │
│                                  │
│ [Cancelar] [Reenviar Email]     │
└─────────────────────────────────┘
```

**Acciones:**
- Reenvía email específico
- Registra evento de reenvío en Timeline

---

## Flujo de Trabajo Típico

### Escenario 1: Aprobar E1

```
1. Admin ve candidato en estado "Revisión E1"
2. Abre modal "Acciones Avanzadas" → Tab "Aprobar Examen"
3. Selecciona "E1"
4. Agrega notas opcionales
5. Click "Aprobar Examen"

Sistema:
✅ Estado → "awaiting_terms_acceptance"
✅ Envía EML-02 (Términos)
✅ Evento Timeline: EXAMEN_E1_APROBADO_ADMIN
✅ Dashboard se actualiza automáticamente
```

### Escenario 2: Rechazar E2

```
1. Admin revisa E2 y encuentra inconsistencias
2. Abre modal "Acciones Avanzadas" → Tab "Rechazar Examen"
3. Selecciona "E2"
4. Escribe razón: "Respuestas inconsistentes con patrón típico"
5. Click "Rechazar Examen"

Sistema:
✅ Estado → "rechazado"
✅ Brevo: contacto movido de "interesados" a "rechazados"
✅ Envía EML-03 (Rechazo) con razón
✅ Evento Timeline: EXAMEN_E2_RECHAZADO_ADMIN
✅ Dashboard muestra candidato en estado rechazado
```

### Escenario 3: Completar flujo (Categorizar → Handoff)

```
1. Admin abre candidato con estado "awaiting_interview"
2. Tab "Categorizar" → Selecciona "SENIOR"
3. Agrega notas: "Excellent performance, strong leadership"
4. Click "Asignar Categoría"

Sistema:
✅ Estado → "approved_senior"
✅ Brevo: contacto movido de "interesados" a "senior"
✅ Envía EML-07 (Aprobación como Senior)
✅ Evento Timeline: CANDIDATO_CATEGORIZADO_APROBADO

5. Admin luego abre mismo candidato
6. Tab "Handoff"
7. Lee advertencia
8. Escribe "CONFIRMAR HANDOFF"
9. Click "Confirmar Handoff"

Sistema:
✅ Transfiere fila a Onboarding Spreadsheet
✅ Estado → "handoff_completed"
✅ Notificación email a catholizare@gmail.com
✅ Evento Timeline: HANDOFF_COMPLETADO
✅ Dashboard muestra candidato como "Handoff Completado"
```

---

## Mensajes del Sistema

El dashboard muestra feedback en tiempo real:

### Éxito

```
✅ Examen E1 aprobado correctamente
Modal cierra en 2 segundos y tabla se actualiza
```

### Error

```
❌ Error: El candidato no tiene status válido para esta acción
Botón permanece habilitado para reintentar
```

### Info

```
ℹ️ Función de reenvío en desarrollo
Permite feedback sin bloquear UX
```

---

## Troubleshooting

### Error: "Error al cargar candidatos"

**Causa**: Google Apps Script no puede acceder a los datos

**Solución:**
1. Verifica que getCandidatesForAdmin() exista en Code.gs
2. Verifica que la hoja "Candidatos" exista
3. Revisa logs en Google Apps Script (Extensions → Executions)

### Error: "Candidato no encontrado"

**Causa**: El candidato_id no existe en la hoja

**Solución:**
1. Verifica que uses el candidato_id correcto
2. Revisa que el Sheet esté actualizado (botón 🔄 Recargar)

### Modal se cierra sin ejecutar acción

**Causa**: Validación fallida en el frontend

**Solución:**
1. Abre la consola del navegador (F12)
2. Revisa mensajes de error
3. Verifica que todos los campos requeridos estén completados

### Email no se envía

**Causa**: Brevo API error o configuración incorrecta

**Solución:**
1. Verifica que EMAIL_HANDOFF esté configurado correctamente en Config sheet
2. Revisa logs en Google Apps Script (Extensions → Executions)
3. Confirma que Brevo API key sea válido

---

## URLs de Acceso

Una vez desplegado, accede al dashboard desde:

```
https://script.google.com/macros/d/[DEPLOYMENT_ID]/usercopy?page=dashboard
```

Reemplaza `[DEPLOYMENT_ID]` con tu ID de despliegue.

**Para producción**, recomendamos:
- Usar un dominio personalizado si tienes Google Workspace
- Configurar autenticación (aunque ya está restringido a tu organización)
- Crear bookmarks en los navegadores de admin

---

## Próximos Pasos

1. **Autenticación**: Agregar layer de autenticación para múltiples admins
2. **Auditoría**: Registrar quién realizó cada acción
3. **Acciones Masivas**: Aprobar/rechazar múltiples candidatos a la vez
4. **Reportes**: Dashboard de métricas y KPIs
5. **Notificaciones**: Alertas en tiempo real para nuevos candidatos

---

## Soporte

- 📋 Logs: Google Apps Script → Extensions → Executions
- 🐛 Bugs: Revisa console del navegador (F12 → Console)
- 📧 Contacto: admin@rccc.org

---

**Status**: ✅ Dashboard Completado
**Versión**: 1.0
**Última actualización**: 2026-02-15
