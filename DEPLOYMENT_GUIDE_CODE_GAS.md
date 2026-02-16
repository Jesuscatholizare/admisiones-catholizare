# 🚀 GUÍA DE INSTALACIÓN - CODE.GS COMPLETO

**Archivo**: `CODE_GAS_COMPLETE.gs`
**Versión**: 2.0 - Completo con Formateo y Health Check
**Fecha**: 2026-02-16

---

## ⚡ INICIO RÁPIDO (5 minutos)

### Paso 1️⃣: Copiar el código

1. Abre este archivo: `CODE_GAS_COMPLETE.gs`
2. Selecciona TODO el contenido (Ctrl+A)
3. Cópialo (Ctrl+C)

### Paso 2️⃣: Pegar en Google Apps Script

1. Ve a tu Google Sheet DEV
2. Click en **Extensions → Apps Script**
3. En el editor, abre el archivo `Code.gs`
4. **Borra TODO el contenido actual**
5. Pega el nuevo código (Ctrl+V)
6. Presiona **Ctrl+S** para guardar

### Paso 3️⃣: Ejecutar Setup

1. En el menú de funciones (arriba), selecciona: **`setupSystem`**
2. Click en el botón **▶️ Ejecutar** (play button)
3. Aceptar permisos si aparece un diálogo
4. Espera a que se complete (~10-15 segundos)

### Paso 4️⃣: Verificar Logs

1. Click en **Executions** (pestaña izquierda)
2. Busca la ejecución más reciente de `setupSystem`
3. Haz click para ver los logs completos
4. Deberías ver: ✅ Mensajes de éxito

---

## 📋 ¿QUÉ HACE CODE_GAS_COMPLETE.GS?

### Funciones Principales

| Función | Propósito |
|---------|-----------|
| `setupSystem()` | ⭐ **EJECUTA PRIMERO** - Setup completo del sistema |
| `formatAllSheets()` | Formatea todas las hojas automáticamente |
| `formatSheet()` | Aplica formato a cada hoja específica |
| `checkSystemHealth()` | ✅ Verifica estado completo del sistema |
| `handleRegistration()` | Procesa registro de nuevos candidatos |
| `handleExamSubmit()` | Procesa envío de exámenes |
| `approveExamAdmin()` | Admin aprueba un examen |
| `rejectExamAdmin()` | Admin rechaza un examen con motivo |
| `assignCategoryAndApprove()` | Asigna categoría (JUNIOR/SENIOR/EXPERT) |
| `performHandoff()` | Transfiere candidato a Onboarding |
| `acceptTerms()` | Candidato acepta términos |
| `validateToken()` | Valida tokens de exámenes |

### Integraciones

✅ **Google Sheets** - Base de datos
✅ **Google Apps Script** - Lógica backend
✅ **OpenAI** - Calificación inteligente de preguntas abiertas
✅ **Brevo** - Gestión de contactos (6 listas)
✅ **Resend** - Emails (opcional)
✅ **Gmail** - Emails de notificación

---

## 🔍 VERIFICACIÓN POST-INSTALACIÓN

### Opción 1: Ver Logs (Recomendado)

Después de ejecutar `setupSystem()`:

```
Abre Google Apps Script
→ Click en "Executions" (izquierda)
→ Busca setupSystem() más reciente
→ Click para expandir logs
```

Deberías ver:
```
✅ Sistema formateado correctamente
✅ Setup completado
📊 HEALTH CHECK: {...}
```

### Opción 2: Ejecutar Health Check Manual

Si quieres verificar el estado en cualquier momento:

1. En Google Apps Script, selector de funciones: **`checkSystemHealth`**
2. Click en **▶️ Run**
3. Verifica los logs

El output mostrará:
- ✅ Estado de Google Sheets (6 hojas encontradas)
- ✅ API Keys configuradas
- ✅ Email config lista
- ✅ Brevo lists activas
- ✅ Número de candidatos registrados

---

## 📊 ESTRUCTURA DE HOJAS REQUERIDAS

El sistema espera estas 6 hojas en tu Google Sheet:

```
📋 Config           ← Configuración central
📋 Candidatos       ← Base de candidatos
📋 Tokens           ← Tokens de seguridad
📋 Timeline         ← Historial de eventos
📋 Preguntas        ← Banco de preguntas
📋 Respuestas       ← Respuestas de exámenes
```

**Nota**: Si alguna falta, `checkSystemHealth()` lo reportará como ⚠️

---

## ⚙️ CONFIGURACIÓN REQUERIDA

En la hoja **"Config"** de tu Google Sheet, asegúrate de tener:

```
OPENAI_API_KEY          (String)
BREVO_API_KEY           (String)
RESEND_API_KEY          (String)
EMAIL_FROM              (String)
EMAIL_ADMIN             (String)
EMAIL_SUPPORT           (String)
EMAIL_HANDOFF           (String)

BREVO_LIST_INTERESADOS  (Number)
BREVO_LIST_RECHAZADOS   (Number)
BREVO_LIST_APROBADOS    (Number)
BREVO_LIST_JUNIOR       (Number)
BREVO_LIST_SENIOR       (Number)
BREVO_LIST_EXPERT       (Number)
```

---

## 🎨 FORMATEO AUTOMÁTICO

Cuando ejecutas `setupSystem()`, se aplica:

### Headers (Primera fila)
- 🎨 Fondo: Azul oscuro (#001A55)
- 📝 Texto: Blanco, Negrita
- 📌 Frozen: Primera fila congelada
- 🔍 Autofilter: Activado

### Ancho de Columnas (Por hoja)
- **Config**: 250, 300, 100
- **Candidatos**: 120, 150, 180, 130, 120, 120, 150, 120, 150, 130, 130, 150, 130
- **Tokens**: 150, 120, 100, 130, 130, 80
- **Timeline**: 120, 120, 180, 150, 300
- **Preguntas**: 80, 100, 150, 300, 150
- **Respuestas**: 120, 120, 100, 100, 300, 100

---

## ✅ CHECKLIST DE INSTALACIÓN

- [ ] Descargué el archivo `CODE_GAS_COMPLETE.gs`
- [ ] Abrí Google Apps Script en mi Google Sheet DEV
- [ ] Borré el código antiguo en Code.gs
- [ ] Copié TODO el contenido de CODE_GAS_COMPLETE.gs
- [ ] Pegué el código en Code.gs
- [ ] Presioné Ctrl+S para guardar
- [ ] Seleccioné función `setupSystem()`
- [ ] Presioné el botón ▶️ Ejecutar
- [ ] Acepté los permisos si me lo pidió
- [ ] ✅ Verificué los logs: "Setup completado"
- [ ] Ejecuté `checkSystemHealth()` como verificación
- [ ] Todos los checks muestran ✅

---

## 🆘 TROUBLESHOOTING

### ❌ Error: "Identifier has already been declared"

**Problema**: Las funciones ya existen

**Solución**:
1. Abre Code.gs
2. Busca y borra la función duplicada
3. Vuelve a pegar
4. Presiona Ctrl+S

### ❌ Error: "Sheet not found: Candidatos"

**Problema**: La hoja no existe

**Solución**:
1. En tu Google Sheet, crea una hoja nueva
2. Nómbrala exactamente: `Candidatos`
3. Repite para las otras 5 hojas:
   - Config, Tokens, Timeline, Preguntas, Respuestas
4. Ejecuta `setupSystem()` de nuevo

### ❌ Error: "CONFIG.email_admin is undefined"

**Problema**: Configuración incompleta

**Solución**:
1. Abre tu Google Sheet
2. Ve a la hoja "Config"
3. Agrega todas las claves requeridas (ver sección ⚙️ CONFIGURACIÓN REQUERIDA)
4. Presiona Ctrl+S
5. Ejecuta `checkSystemHealth()` para verificar

### ❌ Error: "Permission denied"

**Problema**: Google Apps Script necesita permisos

**Solución**:
1. Cuando ejecutes `setupSystem()`, aparecerá un diálogo de permisos
2. Haz click en "Review permissions"
3. Selecciona tu cuenta de Google
4. Lee los permisos y haz click "Allow"
5. El script continuará ejecutándose

---

## 📞 SIGUIENTE PASO

Después de una instalación exitosa:

1. **Verifica todos los checks** con `checkSystemHealth()` ✅
2. **Sigue PROXIMO_PASO.md** PASO 3-5:
   - PASO 3: Configurar URLs en Google Sheets
   - PASO 4: Reemplazar Deployment ID en proxy2.php
   - PASO 5: Testing completo del sistema

---

## 📈 RESUMEN

| Tarea | Tiempo | Status |
|-------|--------|--------|
| Copiar código | 1 min | ⏳ |
| Pegar en GAS | 2 min | ⏳ |
| Ejecutar setupSystem() | 1 min | ⏳ |
| Verificar logs | 1 min | ⏳ |
| **TOTAL** | **~5 min** | ⏳ |

---

**¡Listo para instalar!** 🎉

Cualquier duda → Revisa INSTALACION_WEB.md o PROXIMO_PASO.md
