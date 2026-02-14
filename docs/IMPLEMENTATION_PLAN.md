# 🛠️ Plan de Implementación — Fases Detalladas

## 📌 Visión General

Este documento detalla **qué se implementará en cada fase**, con objetivos, entregables y criterios de aceptación.

---

## 🎯 Fase 0: Preparación (COMPLETADA)
**Status**: ✅ COMPLETADA

### Objetivos
- ✅ Documentar completamente el sistema (CONTEXT, ARCHITECTURE, DECISIONS, WORKFLOW)
- ✅ Crear guía de setup para Google Sheets
- ✅ Crear README y este plan
- ✅ Documentar requisitos de seguridad (anti-fraude)
- ✅ Documentar autenticación (roles, contraseñas)
- ✅ Documentar pestaña de Resultados

### Entregables
- ✅ `docs/CONTEXT.md` — Objetivo, fases, estructura
- ✅ `docs/ARCHITECTURE.md` — Stack técnico, módulos, flujo
- ✅ `docs/DECISIONS.md` — 13 decisiones (incluyendo seguridad, auth, resultados)
- ✅ `docs/WORKFLOW.md` — Cómo trabajar con Claude-GitHub
- ✅ `docs/SETUP.md` — Pasos para crear Spreadsheet
- ✅ `docs/SECURITY_REQUIREMENTS.md` — Anti-copia, anti-ventana, anti-IA, timer
- ✅ `docs/AUTHENTICATION.md` — Roles, contraseñas, Google login
- ✅ `docs/RESULTS_TAB.md` — Consolidación de resultados finales
- ✅ `README.md` — Puerta de entrada
- ✅ `docs/IMPLEMENTATION_PLAN.md` — Este archivo

### Criterio de Aceptación
- [x] Toda documentación está clara y sin ambigüedades
- [x] Usuario entiende qué se va a construir
- [x] Usuario tiene instrucciones paso a paso para crear Spreadsheet
- [x] Requisitos de seguridad están documentados
- [x] Sistema de autenticación está definido
- [x] Pestaña de resultados está especificada

### Próximo Paso
👉 **USUARIO**:
1. Confirma decisiones en AUTHENTICATION.md (¿contraseña admin sí/no?)
2. Confirma decisiones en SECURITY_REQUIREMENTS.md (móviles sí/no?)
3. Confirma que Spreadsheets están listos: "proceso de admision 3.0 Dev" ✅ LISTO

---

## 🏗️ Fase 1: Estructuras Básicas (ESPERANDO)
**Status**: ⏳ NO INICIADA (esperando Spreadsheet DEV)

### Objetivos
1. Crear estructura base en `Code.gs`
2. Implementar funciones de lectura/escritura en Sheets
3. Crear funciones de autenticación y roles

### Subtareas

#### 1.1 Módulo de Inicialización
```
Función: onOpen()
  → Detecta usuario
  → Detecta rol (admin, super-admin)
  → Carga configuración desde hoja "Config"
  → Muestra menú con opciones
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~50-100
**Dependencias**: Hoja `Config` debe existir

---

#### 1.2 Módulo de Utilidades Sheets
```
Función: getSheet(name)
  → Obtiene hoja por nombre
  → Maneja errores si no existe

Función: getRange(sheet, range)
  → Obtiene rango de datos
  → Retorna array 2D

Función: appendRow(sheet, data)
  → Agrega fila al final
  → Retorna índice de fila

Función: updateCell(sheet, row, col, value)
  → Actualiza celda específica

Función: findRowByValue(sheet, column, value)
  → Busca fila por valor
  → Retorna índice
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~100-200
**Dependencias**: Ninguna (funciones puras)

---

#### 1.3 Módulo de Autenticación
```
Función: getAdminUser()
  → Obtiene email del usuario actual
  → Valida que sea admin
  → Retorna objeto usuario

Función: validatePermission(userId, action)
  → Verifica si usuario puede hacer acción
  → Acciones: VIEW_DASHBOARD, APPROVE_TEST, PAUSE_PROCESS
  → Retorna true/false

Función: getAdminList()
  → Lee lista de admins desde hoja "Config"
  → Retorna array de emails
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~200-300
**Dependencias**: Hoja `Config`

---

#### 1.4 Módulo de Candidatos (Lectura)
```
Función: getCandidate(candidateId)
  → Lee candidato por ID desde hoja "Candidatos"
  → Retorna objeto: {id, nombre, email, telefono, estado, fecha_registro}
  → Si no existe, retorna null

Función: getCandidatesList(filters)
  → Lee todos los candidatos
  → Filtros opcionales: {estado: "Registrado", fecha_desde: ...}
  → Retorna array de candidatos

Función: getCandidateStatus(candidateId)
  → Retorna solo el estado actual
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~300-400
**Dependencias**: Hoja `Candidatos`

---

### Entregables
1. `apps-script-dev/Code.gs` con:
   - onOpen()
   - Módulo de utilidades Sheets (~100 líneas)
   - Módulo de autenticación (~100 líneas)
   - Módulo de candidatos lectura (~100 líneas)

2. Pruebas validadas:
   - [ ] onOpen() ejecuta sin errores
   - [ ] Funciones Sheets leen/escriben correctamente
   - [ ] getAdminUser() retorna usuario actual
   - [ ] getCandidate() encuentra candidatos
   - [ ] getCandidatesList() retorna array

### Criterio de Aceptación
- Code.gs tiene ~400 líneas de código funcional
- Todas las funciones ejecutan sin errores
- Datos en Sheets se leen/escriben correctamente
- Usuario (admin) aparece en console.log

---

## 🔄 Fase 2: Flujo de Candidatos
**Status**: ⏳ NO INICIADA

### Objetivos
1. Registrar nuevos candidatos
2. Actualizar estado de candidatos
3. Crear Timeline de eventos

### Subtareas

#### 2.1 Registro de Candidatos
```
Función: registerCandidate(formData)
  Entrada: {nombre, email, telefono, ...}

  1. Valida email
  2. Genera ID: CANDIDATO_YYYYMMDD_NNNN
  3. Agrega fila en hoja "Candidatos"
  4. Crea evento en Timeline
  5. Retorna {success: true, candidateId: ...}

Función: validateEmail(email)
  → Valida formato
  → Retorna true/false
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~400-500
**Dependencias**: Hojas `Candidatos`, `Timeline`

---

#### 2.2 Actualización de Estado
```
Función: updateCandidateStatus(candidateId, newStatus)
  → Encuentra candidato en hoja "Candidatos"
  → Actualiza columna "Estado"
  → Crea evento en Timeline
  → Valida estados válidos

Estados válidos:
  - Registrado
  - En Test 1
  - Pausado T1
  - En Test 2
  - Pausado T2
  - En Test 3
  - Pausado T3
  - Completado
  - Rechazado
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~500-550
**Dependencias**: Hojas `Candidatos`, `Timeline`

---

#### 2.3 Timeline de Eventos
```
Función: addTimelineEvent(candidateId, eventType, details)
  Entrada: {candidateId: "...", eventType: "CANDIDATO_REGISTRADO", details: {...}}

  1. Genera timestamp
  2. Agrega fila en hoja "Timeline"
  3. Valida eventType conocido
  4. Retorna true si es éxito

Eventos válidos:
  - CANDIDATO_REGISTRADO
  - TEST_N_INICIADO (N = 1,2,3)
  - TEST_N_COMPLETADO
  - TEST_N_CALIFICADO_IA
  - TEST_N_APROBADO_ADMIN
  - PAUSA_SOLICITADA
  - PAUSA_APROBADA
  - NOTIFICACION_ENVIADA

Función: getTimeline(candidateId, filtro)
  → Lee todos eventos de candidato
  → Filtro opcional por tipo
  → Retorna array ordenado por timestamp
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~550-650
**Dependencias**: Hoja `Timeline`

---

### Entregables
1. `apps-script-dev/Code.gs` con:
   - registerCandidate()
   - updateCandidateStatus()
   - addTimelineEvent()
   - getTimeline()
   - Funciones de validación

2. Pruebas:
   - [ ] Registra candidato nuevo
   - [ ] ID se genera correctamente
   - [ ] Estado se actualiza
   - [ ] Eventos aparecen en Timeline

### Criterio de Aceptación
- Nuevos candidatos se registran en Sheets
- Timeline registra todos los eventos
- Estados son válidos y se actualizan

---

## 🧠 Fase 3: Evaluaciones (Tests)
**Status**: ⏳ NO INICIADA

### Objetivos
1. Guardar respuestas de tests
2. Preparar datos para OpenAI
3. Registrar calificaciones

### Subtareas

#### 3.1 Guardar Respuestas de Test
```
Función: submitTest(candidateId, testNumber, answers)
  Entrada: {
    candidateId: "CANDIDATO_...",
    testNumber: 1,  // 1, 2 o 3
    answers: {
      pregunta_1: "respuesta texto",
      pregunta_2: "SÍ",  // preguntas cerradas
      pregunta_3: "respuesta larga abierta..."
    }
  }

  1. Valida candidateId existe
  2. Valida testNumber (1, 2, o 3)
  3. Separa preguntas abiertas vs cerradas
  4. Agrega fila en hoja "Test_N" (N = testNumber)
  5. Actualiza estado de candidato a "En Test N"
  6. Crea evento en Timeline: TEST_N_COMPLETADO
  7. Prepara datos para OpenAI
  8. Retorna {success: true, testId: ...}

Función: isTestComplete(candidateId, testNumber)
  → Verifica si test ya se respondió
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~650-750
**Dependencias**: Hojas `Test_1`, `Test_2`, `Test_3`, `Candidatos`, `Timeline`

---

#### 3.2 Preparación para OpenAI
```
Función: prepareForOpenAI(candidateId, testNumber)
  → Lee respuestas abiertas de hoja "Test_N"
  → Formatea para enviar a OpenAI
  → Retorna objeto con prompts

Función: buildOpenAIPrompt(openAnswers, candidateProfile)
  → Crea prompt contextualizado
  → Incluye criterios de evaluación
  → Retorna string con instrucciones
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~750-850
**Dependencias**: Hojas `Test_*`

---

### Entregables
1. `apps-script-dev/Code.gs` con:
   - submitTest()
   - isTestComplete()
   - prepareForOpenAI()
   - buildOpenAIPrompt()

2. Pruebas:
   - [ ] Respuestas se guardan en Sheets
   - [ ] Estados se actualizan correctamente
   - [ ] Timeline registra eventos

### Criterio de Aceptación
- Respuestas de tests se guardan en Sheets
- Datos preparados correctamente para OpenAI
- Candidato avanza de estado

---

## 🤖 Fase 4: Integración OpenAI
**Status**: ⏳ NO INICIADA

### Objetivos
1. Integrar API de OpenAI
2. Calificar respuestas abiertas automáticamente
3. Guardar calificaciones en Sheets

### Subtareas

#### 4.1 Conexión a OpenAI
```
Función: gradeOpenAnswers(candidateId, testNumber)
  1. Lee hoja "Config" para obtener OPENAI_API_KEY
  2. Obtiene respuestas abiertas de hoja "Test_N"
  3. Construye prompts con criterios de evaluación
  4. Envía a OpenAI API (gpt-4o)
  5. Procesa respuesta (calificaciones 0-100)
  6. Actualiza hoja "Test_N" columna "Calificacion_IA"
  7. Crea evento en Timeline: TEST_N_CALIFICADO_IA
  8. Retorna {success: true, calificaciones: {...}}

Función: callOpenAIAPI(prompt, apiKey)
  → Implementación de llamada HTTP a OpenAI
  → Manejo de errores
  → Retorna respuesta parseada
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~850-950
**Dependencias**: Hojas `Test_*`, `Config`, OpenAI API

---

#### 4.2 Validación de Calificaciones
```
Función: validateGrade(grade)
  → Valida que sea número 0-100
  → Retorna true/false

Función: calculateAverageGrade(candidateId, testNumber)
  → Promedia todas las preguntas abiertas
  → Retorna número 0-100
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~950-1000
**Dependencias**: Hojas `Test_*`

---

### Entregables
1. `apps-script-dev/Code.gs` con:
   - gradeOpenAnswers()
   - callOpenAIAPI()
   - validateGrade()
   - calculateAverageGrade()

2. Pruebas:
   - [ ] Conexión a OpenAI funciona
   - [ ] Respuestas se califican (0-100)
   - [ ] Calificaciones se guardan en Sheets
   - [ ] Timeline registra evento

### Criterio de Aceptación
- OpenAI califica respuestas automáticamente
- Calificaciones aparecen en Sheets
- No hay errores de API

---

## ⏸️ Fase 5: Pausas y Aprobaciones
**Status**: ⏳ NO INICIADA

### Objetivos
1. Permitir que admin pause procesos
2. Admin aprueba o rechaza candidatos
3. Registrar decisiones en Timeline

### Subtareas

#### 5.1 Pausar Proceso
```
Función: pauseProcess(candidateId, testNumber, razon)
  1. Actualiza estado a "Pausado T{testNumber}"
  2. Agrega fila en hoja "Pausas"
  3. Crea evento en Timeline: PAUSA_SOLICITADA
  4. Retorna {success: true, pausaId: ...}

Función: resumeProcess(candidateId)
  → Cambia estado de "Pausado TN" a "En Test N+1"
  → O a siguiente fase si aplica
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1000-1100
**Dependencias**: Hojas `Pausas`, `Candidatos`, `Timeline`

---

#### 5.2 Aprobaciones de Admin
```
Función: approveCandidatePhase(candidateId, testNumber, notas)
  1. Valida que usuario actual es admin
  2. Marca hoja "Test_N" columna "Aprobado_Admin" = SÍ
  3. Actualiza estado a siguiente fase
  4. Crea evento: TEST_N_APROBADO_ADMIN
  5. Retorna success

Función: rejectCandidate(candidateId, razon)
  1. Valida que usuario es admin
  2. Actualiza estado a "Rechazado"
  3. Guarda razon en hoja "Candidatos"
  4. Crea evento: CANDIDATO_RECHAZADO
  5. Prepara para enviar email de rechazo
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1100-1200
**Dependencias**: Hojas `Test_*`, `Candidatos`, `Timeline`

---

### Entregables
1. `apps-script-dev/Code.gs` con:
   - pauseProcess()
   - resumeProcess()
   - approveCandidatePhase()
   - rejectCandidate()

2. Pruebas:
   - [ ] Proceso se pausa correctamente
   - [ ] Admin puede aprobar
   - [ ] Rechazos registran razón
   - [ ] Timeline tiene eventos

### Criterio de Aceptación
- Admin pausa candidatos
- Aprobaciones se registran
- Estados avanzan correctamente

---

## 📧 Fase 6: Notificaciones (Brevo + Resend)
**Status**: ⏳ NO INICIADA

### Objetivos
1. Enviar emails automáticos
2. Integrar Brevo como primario
3. Integrar Resend como fallback
4. Registrar intentos de envío

### Subtareas

#### 6.1 Integración con Brevo
```
Función: sendViaBrevo(candidateEmail, templateId, variables)
  1. Obtiene BREVO_API_KEY de hoja "Config"
  2. Construye payload para Brevo API
  3. Hace POST a https://api.brevo.com/v3/smtp/email
  4. Maneja respuesta (200 = éxito)
  5. Retorna {success: true, messageId: ...}

Función: sendNotification(candidateId, messageType)
  Tipos de mensaje:
  - REGISTRO_CONFIRMADO
  - TEST_1_DISPONIBLE
  - TEST_2_DISPONIBLE
  - TEST_3_DISPONIBLE
  - PAUSA_NOTIFICACION
  - RESULTADO_FINAL_APROBADO
  - RESULTADO_FINAL_RECHAZADO
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1200-1300
**Dependencias**: Hojas `Candidatos`, `Config`, Brevo API

---

#### 6.2 Fallback a Resend
```
Función: sendViaResend(candidateEmail, subject, htmlBody)
  1. Si Brevo falla, intenta Resend
  2. Obtiene RESEND_API_KEY de hoja "Config"
  3. Hace POST a https://api.resend.com/emails
  4. Retorna {success: true/false, messageId: ...}

Función: sendWithFallback(candidateId, messageType)
  1. Intenta Brevo
  2. Si falla, intenta Resend
  3. Registra intento en Timeline
  4. Actualiza hoja "Notificaciones"
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1300-1400
**Dependencias**: Hojas `Notificaciones`, `Config`, Brevo + Resend APIs

---

#### 6.3 Registro de Notificaciones
```
Función: recordNotificationLog(candidateId, email, messageType, proveedor, status)
  → Agrega fila en hoja "Notificaciones"
  → Campos: candidato_id, email, tipo_mensaje, timestamp, proveedor, status
  → Status valores: ENVIADO, ENTREGADO, BOUNCE, ERROR

Función: getNotificationHistory(candidateId)
  → Lee todos los emails enviados a candidato
  → Retorna array
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1400-1450
**Dependencias**: Hoja `Notificaciones`

---

### Entregables
1. `apps-script-dev/Code.gs` con:
   - sendViaBrevo()
   - sendViaResend()
   - sendWithFallback()
   - sendNotification()
   - recordNotificationLog()
   - getNotificationHistory()

2. Pruebas:
   - [ ] Email se envía via Brevo
   - [ ] Fallback a Resend funciona
   - [ ] Registro en hoja "Notificaciones"
   - [ ] Timeline registra evento

### Criterio de Aceptación
- Emails se envían automáticamente
- Fallback funciona si Brevo falla
- Registro completo en Sheets

---

## 🎨 Fase 7: Dashboard Admin (WebApp HTML)
**Status**: ⏳ NO INICIADA

### Objetivos
1. Crear interfaz web para admin
2. Listar candidatos con estados
3. Ver detalles y respuestas de tests
4. Permitir pausar, aprobar, rechazar

### Subtareas

#### 7.1 Estructura HTML + CSS
```
Archivo: apps-script-dev/Code.gs (función doGet())

Componentes:
- Header con logo/título
- Navigation (Candidatos, Reportes, Configuración)
- Main content area
- Sidebar con filtros

Estilo: Idéntico al onboarding
  - Paleta: Azul (#0066CC) + Gris (#666) + Blanco
  - Font: Arial/Helvetica
  - Cards con sombra
  - Botones redondeados
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1450-1600
**Dependencias**: Ninguna (solo HTML/CSS)

---

#### 7.2 Funcionalidad AJAX
```
Función: doGet()
  → Renderiza HTML del dashboard

Función: getCandidate_ajax(candidateId)
  → Lee datos de candidato
  → Retorna JSON para JavaScript

Función: getCandidatesList_ajax(filtros)
  → Lee lista con filtros
  → Retorna JSON array

Función: getTestResponses_ajax(candidateId, testNumber)
  → Lee respuestas de test
  → Incluye calificaciones IA
  → Retorna JSON

Función: pauseCandidate_ajax(candidateId, razon)
  → Ejecuta pauseProcess()
  → Retorna success/error

Función: approveCandidate_ajax(candidateId, testNumber)
  → Ejecuta approveCandidatePhase()
  → Retorna success/error

Función: rejectCandidate_ajax(candidateId, razon)
  → Ejecuta rejectCandidate()
  → Retorna success/error
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1600-1800
**Dependencias**: Funciones anteriores

---

#### 7.3 Vistas del Dashboard

**Vista 1: Lista de Candidatos**
```
Tabla con columnas:
- ID
- Nombre
- Email
- Estado (color-coded)
- Última acción
- Acciones (ver detalles, pausar, aprobar, rechazar)

Filtros:
- Por estado
- Por fecha
- Por nombre/email
```

**Vista 2: Detalles de Candidato**
```
Sección 1: Información Personal
- Nombre, Email, Teléfono, Fecha de registro

Sección 2: Progress del Proceso
- Test 1: Estado, Calificación IA, Aprobado Admin
- Pausa 1: Si existe, muestra razón y estado
- Test 2: ...
- Test 3: ...

Sección 3: Timeline
- Lista de eventos ordenados por fecha
- Cada evento muestra: tipo, timestamp, detalles

Sección 4: Acciones (si es admin)
- Botón "Pausar"
- Botón "Aprobar Test N"
- Botón "Rechazar"
- Botón "Enviar Email"

Sección 5: Notificaciones
- Historial de emails enviados
- Fecha, tipo, proveedor, status
```

**Vista 3: Reportes**
```
Gráficos simples:
- Total de candidatos por estado (pie chart)
- Timeline de registros (bar chart)
- Tasa de aprobación por test
```

#### 7.4 Pestaña "Resultados" (NUEVA)
```
Vista consolidada de candidatos completados:
- Tabla: ID, Nombre, Email, T1, T2, T3, Promedio, Estado
- Filtros por estado (APROBADO/RECHAZADO) y fechas
- Estadísticas rápidas (Total, % Aprobación, Promedio)
- Detalle de candidato completado
- Indicadores de riesgo (copias, cambios ventana, probabilidad IA)
- Botones: Descargar Certificado, Enviar Email

Función: generateAndApproveResult()
  - Al aprobar Test 3, genera registro en hoja "Resultados"
  - Calcula promedio automático
  - Determina APROBADO (≥75) o RECHAZADO (<75)
  - Envía email al candidato
```

**Archivo**: `apps-script-dev/Code.gs`
**Líneas**: ~1800-1900
**Dependencias**: Hojas `Test_*`, `Resultados`, función sendNotification()

---

### Entregables
1. `apps-script-dev/Code.gs` con:
   - doGet() (renderiza HTML)
   - AJAX endpoints (*_ajax functions)
   - HTML incrustado
   - CSS incrustado

2. WebApp funcional con:
   - [ ] Lista de candidatos
   - [ ] Detalles de candidato
   - [ ] Pausar, aprobar, rechazar
   - [ ] Timeline visible
   - [ ] Estilo igual al onboarding

### Criterio de Aceptación
- Dashboard abre en navegador
- Admin ve lista de candidatos
- Admin puede pausar/aprobar/rechazar
- Cambios se reflejan en Sheets

---

## ✅ Fase 8: Testing Integral
**Status**: ⏳ NO INICIADA

### Objetivos
1. Probar todas las funcionalidades en DEV
2. Copiar a PROD
3. Validar que PROD funciona igual

### Checklist DEV

- [ ] **Registro**
  - [ ] Nuevo candidato se registra en Sheets
  - [ ] ID se genera correctamente
  - [ ] Evento en Timeline

- [ ] **Tests**
  - [ ] Respuestas se guardan en Sheets
  - [ ] OpenAI califica automáticamente
  - [ ] Calificaciones aparecen en Sheets

- [ ] **Pausas**
  - [ ] Admin pausa proceso
  - [ ] Estado actualiza a "Pausado T1"
  - [ ] Evento en Timeline

- [ ] **Aprobaciones**
  - [ ] Admin aprueba test
  - [ ] Candidato avanza a siguiente fase
  - [ ] Email se envía via Brevo/Resend

- [ ] **Dashboard**
  - [ ] Abre sin errores
  - [ ] Lista de candidatos visible
  - [ ] Detalles se cargan correctamente
  - [ ] Acciones funcionan (pausar, aprobar, rechazar)

- [ ] **Seguridad**
  - [ ] Anti-copia funciona (Ctrl+C/V/X bloqueados)
  - [ ] Tab switching detectado (máx 3)
  - [ ] Timer funciona (cuenta atrás 2 horas)
  - [ ] Auto-envío al agotar tiempo
  - [ ] OpenAI detecta respuestas IA
  - [ ] Indicadores de riesgo en Dashboard

- [ ] **Autenticación**
  - [ ] Login de candidato funciona (contraseña)
  - [ ] Admin login automático (Google)
  - [ ] Sessions expiran correctamente (8 horas)
  - [ ] Bloqueo tras 5 intentos fallidos
  - [ ] Logs en Login_Audit

- [ ] **Resultados**
  - [ ] Hoja "Resultados" se genera al aprobar Test 3
  - [ ] Promedio se calcula correctamente
  - [ ] Estado (APROBADO/RECHAZADO) es correcto
  - [ ] Email de resultado se envía
  - [ ] Pestaña "Resultados" visible en Dashboard
  - [ ] Estadísticas rápidas mostradas
  - [ ] Filtros y reportes funcionan

### Checklist PROD

Después de copiar Code.gs a PROD, repetir todas las pruebas (incluyendo seguridad, autenticación, resultados).

---

## 🚀 Fase 9: Go Live
**Status**: ⏳ NO INICIADA

### Objetivos
1. Validar que PROD funciona con datos reales
2. Capacitar admin
3. Lanzar sistema

### Tareas
- [ ] Admin accede al dashboard PROD
- [ ] Prueba con candidato real
- [ ] Verifica que emails llegan
- [ ] Valida Timeline y reportes
- [ ] Capacitación al equipo

---

## 📊 Resumen Visual

```
Fase 0 ✅: Documentación
  └─> Fase 1 ⏳: Estructuras Básicas
      └─> Fase 2: Flujo de Candidatos
          └─> Fase 3: Evaluaciones
              └─> Fase 4: OpenAI
                  └─> Fase 5: Pausas & Aprobaciones
                      └─> Fase 6: Notificaciones
                          └─> Fase 7: Dashboard
                              └─> Fase 8: Testing
                                  └─> Fase 9: Go Live 🚀
```

---

## 📝 Notas Importantes

1. **Cada fase depende de la anterior** — Implementar en orden
2. **Testing en cada fase** — No esperar al final
3. **Documentar cambios** — Actualizar DECISIONS.md si hay cambios
4. **Code.gs crecerá** — Será ~1800 líneas al final (ok para Apps Script)
5. **Copiar a PROD regularmente** — No dejar DEV adelantado

---

## 🎯 Próximo Paso

**USUARIO**:
1. Crea Spreadsheet DEV siguiendo `docs/SETUP.md`
2. Avísame cuando esté listo
3. Comenzaré Fase 1 (Estructuras Básicas)

**YO** (Claude):
1. Implementaré funciones en Code.gs
2. Daré instrucciones de git exactas
3. Haré pruebas en DEV
4. Documentaré en DECISIONS.md
