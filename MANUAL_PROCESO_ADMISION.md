# 📋 MANUAL COMPLETO DEL PROCESO DE ADMISIÓN - RCCC

**Versión:** 3.0
**Fecha:** 2026-02-17
**Sistema:** Red de Psicólogos Católicos (RCCC)
**Rama:** `claude/candidate-selection-tracker-rb6Ke`

---

## 📑 TABLA DE CONTENIDOS

1. [Flujo General del Proceso](#flujo-general)
2. [Formulario de Registro WordPress](#formulario-registro)
3. [Dashboard Administrativo](#dashboard-admin)
4. [Plantillas de Email](#plantillas-email)
5. [Interfaz de Examen](#interfaz-examen)
6. [Página de Términos y Condiciones](#terminos-condiciones)
7. [Base de Datos - Sheets](#base-datos)
8. [Tiempos y Duraciones](#tiempos-duraciones)

---

## 🔄 FLUJO GENERAL DEL PROCESO {#flujo-general}

```
┌─────────────────────────────────────────────────────────────────┐
│ CANDIDATO                                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─→ 1. REGISTRO (WordPress)
         │   └─→ Llena formulario con datos personales
         │   └─→ Recibe email de confirmación
         │
         ├─→ 2. EXAMEN E1 (120 minutos)
         │   └─→ Recibe email con link + token
         │   └─→ Completa preguntas (múltiple choice + abiertas)
         │   └─→ Sistema califica automáticamente con OpenAI
         │
         ├─→ 3. [PAUSA 1] - Admin revisa E1
         │   └─→ Admin ve en Dashboard
         │   └─→ Admin aprueba o rechaza E1
         │
         ├─→ 4. TÉRMINOS Y CONDICIONES
         │   └─→ Recibe email con link a términos
         │   └─→ Lee y marca 4 checkboxes
         │   └─→ Acepta términos
         │
         ├─→ 5. EXAMEN E2 (120 minutos)
         │   └─→ Recibe email con link + token
         │   └─→ Completa preguntas
         │
         ├─→ 6. [PAUSA 2] - Admin revisa E2
         │   └─→ Admin aprueba o rechaza E2
         │
         ├─→ 7. EXAMEN E3 (120 minutos)
         │   └─→ Recibe email con link + token
         │   └─→ Completa preguntas
         │
         ├─→ 8. [PAUSA 3] - Admin revisa E3
         │   └─→ Admin asigna categoría (Junior/Senior/Expert)
         │
         ├─→ 9. ENTREVISTA PERSONAL
         │   └─→ Admin contacta para agendar
         │
         └─→ 10. APROBACIÓN FINAL
             └─→ Handoff a Onboarding

┌─────────────────────────────────────────────────────────────────┐
│ ADMIN                                                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─→ Accede a Dashboard (login)
         │   └─→ Email + Password + 2FA (opcional)
         │
         ├─→ Ve estadísticas en tiempo real
         │   └─→ Total candidatos
         │   └─→ En proceso
         │   └─→ Aprobados
         │   └─→ Rechazados
         │
         ├─→ Revisa tabla de candidatos
         │   └─→ Búsqueda por nombre/email/ID
         │   └─→ Filtro por estado
         │
         ├─→ Acciones por candidato
         │   ├─→ Aprobar E1/E2/E3
         │   ├─→ Rechazar con razón
         │   └─→ Asignar categoría
         │
         └─→ Sistema registra todo en Timeline (auditoría)
```

---

# 📝 FORMULARIO DE REGISTRO WORDPRESS {#formulario-registro}

**Ubicación:** `https://profesionales.catholizare.com/` (embed en WordPress con Elementor)
**Archivo HTML:** `html/wordpress-embed.html`
**Método:** POST a `proxy.php?action=registerCandidate`
**Respuesta:** JSON con success/error

## Estructura Visual

```
┌────────────────────────────────────────────────────────────────┐
│  RCCC - Formulario de Candidatos                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📋 INFORMACIÓN PERSONAL                                       │
│  ├─ [Nombre Completo *] ← input text                         │
│  ├─ [Email *] ← input email                                  │
│  ├─ [Teléfono *] ← input tel                                 │
│  ├─ [País *] ← select dropdown                               │
│  └─ [Fecha de Nacimiento *] ← input date                     │
│                                                                │
│  👨‍💼 INFORMACIÓN PROFESIONAL                                    │
│  ├─ [Tipo de Profesión *] ← select dropdown                  │
│  ├─ [Enfoque Terapéutico *] ← select dropdown                │
│  └─ [Cuéntanos tu experiencia *] ← textarea                  │
│                                                                │
│  📋 INFORMACIÓN ADICIONAL                                      │
│  └─ ☐ Deseo recibir información sobre RCCC                   │
│                                                                │
│  📌 Nota sobre Términos                                        │
│  "Después de completar el Examen 1 y ser aprobado por el     │
│   equipo administrativo, recibirás un email para aceptar     │
│   los Términos y Condiciones antes de continuar con el       │
│   Examen 2."                                                  │
│                                                                │
│  [📤 Enviar Mi Solicitud]                                      │
│                                                                │
│  Si ya tienes solicitud en proceso → [consulta el estado]    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Campos Detallados

### 1. INFORMACIÓN PERSONAL

#### Nombre Completo
- **Campo:** `name`
- **Tipo:** Text input
- **Placeholder:** "Juan Pérez"
- **Obligatorio:** SÍ (*)
- **Validación:** No vacío, mínimo 3 caracteres
- **Formato:** Texto libre (acepta espacios y tildes)
- **Ejemplo:** "María José García López"

#### Email
- **Campo:** `email`
- **Tipo:** Email input
- **Placeholder:** "juan@ejemplo.com"
- **Obligatorio:** SÍ (*)
- **Validación:** RFC 5322 (formato email válido)
- **Nota:** Este email recibe todos los emails del sistema
- **Ejemplo:** "candidato@psychology.com"

#### Teléfono
- **Campo:** `phone`
- **Tipo:** Tel input
- **Placeholder:** "+57 300 000 0000"
- **Obligatorio:** SÍ (*)
- **Validación:** Acepta + y números
- **Formato:** Internacional o local
- **Ejemplos:**
  - "+57 3001234567"
  - "(55) 2127-4900"
  - "300 123 4567"

#### País
- **Campo:** `country`
- **Tipo:** Select dropdown
- **Obligatorio:** SÍ (*)
- **Opciones disponibles:**
  ```
  ├─ Selecciona tu país
  ├─ Colombia (CO)
  ├─ México (MX)
  ├─ España (ES)
  ├─ Argentina (AR)
  ├─ Chile (CL)
  ├─ Perú (PE)
  ├─ Venezuela (VE)
  ├─ Ecuador (EC)
  ├─ Bolivia (BO)
  ├─ Paraguay (PY)
  ├─ Uruguay (UY)
  ├─ Brasil (BR)
  └─ Otro
  ```
- **Almacenado como:** Código ISO 2 letras (CO, MX, ES, etc)

#### Fecha de Nacimiento
- **Campo:** `birthday`
- **Tipo:** Date input (HTML5)
- **Formato:** YYYY-MM-DD
- **Obligatorio:** SÍ (*)
- **Validación:** Debe ser mayor de 18 años
- **Rango:** Hasta hoy, mínimo 1950
- **Ejemplo:** "1990-05-15"

---

### 2. INFORMACIÓN PROFESIONAL

#### Tipo de Profesión
- **Campo:** `professional_type`
- **Tipo:** Select dropdown
- **Obligatorio:** SÍ (*)
- **Opciones:**
  ```
  ├─ Selecciona tu profesión
  ├─ Psicólogo Clínico
  ├─ Psicólogo Organizacional
  ├─ Consejero Pastoral
  ├─ Terapeuta
  └─ Otro
  ```
- **Nota:** Importante para categorizar al candidato
- **Almacenado como:** Texto exacto de opción seleccionada

#### Enfoque Terapéutico Principal
- **Campo:** `therapeutic_approach`
- **Tipo:** Select dropdown
- **Obligatorio:** SÍ (*)
- **Opciones:**
  ```
  ├─ Selecciona tu enfoque
  ├─ Cognitivo-Conductual
  ├─ Psicodinámico
  ├─ Humanista
  ├─ Sistémico
  ├─ Gestáltico
  ├─ Integrativo
  └─ Otro
  ```
- **Almacenado como:** Texto exacto de opción seleccionada

#### Cuéntanos sobre tu Experiencia
- **Campo:** `about`
- **Tipo:** Textarea
- **Obligatorio:** SÍ (*)
- **Placeholder:** "Describe brevemente tu experiencia profesional, especialidades, y por qué deseas unirte a RCCC..."
- **Límites:**
  - Mínimo: 50 caracteres
  - Máximo: 2000 caracteres
- **Validación:** No vacío
- **Propósito:** Mostrar motivación y experiencia del candidato
- **Ejemplo:**
  ```
  "Soy psicólogo clínico con 10 años de experiencia en
  atención a familias. Especializaciones en terapia sistémica
  y psicología pastoral. Deseo contribuir a RCCC porque alineó
  mis valores católicos con mi práctica profesional."
  ```

---

### 3. INFORMACIÓN ADICIONAL

#### Newsletter
- **Campo:** `newsletter`
- **Tipo:** Checkbox (opcional)
- **Defecto:** Unchecked
- **Texto:** "Deseo recibir información sobre RCCC y actualizaciones"
- **Propósito:** Agregar a lista "interesados" en Brevo
- **Nota sobre Términos:**
  - Texto: "Nota: Después de completar el Examen 1 y ser aprobado por el equipo administrativo, recibirás un email para aceptar los Términos y Condiciones antes de continuar con el Examen 2."
  - Color: Gris (#666)
  - Tamaño: Pequeño (0.9em)
  - Ubicación: Encima del botón submit

---

### Botón Submit

#### Enviar Mi Solicitud
- **Texto:** "📤 Enviar Mi Solicitud"
- **Tipo:** Button/submit
- **Color:** Gradiente RCCC (#001A55 → #0966FF)
- **Tamaño:** Full width en mobile, auto en desktop
- **Estados:**
  - **Normal:** Color gradiente, cursor pointer
  - **Hover:** Más oscuro, shadow, transform translateY(-2px)
  - **Disabled:** Opacity 0.6, cursor not-allowed (durante envío)
  - **Enviando:** Spinner + texto "Enviando..."
  - **Éxito:** "✓ Solicitud Enviada"

---

### Mensajes de Feedback

#### Error
- **Color:** #FFEBEE background, #B71C1C text
- **Border-left:** 4px solid #f44336
- **Ejemplos:**
  - "Por favor completa todos los campos obligatorios"
  - "El email ya está registrado"
  - "Error de conexión con el servidor"

#### Éxito
- **Color:** #E8F5E9 background, #1B5E20 text
- **Border-left:** 4px solid #4CAF50
- **Mensaje:** "¡Gracias! Tu solicitud ha sido recibida. Recibirás un email de confirmación pronto."
- **Acción:** Redirige a `/gracias` después de 3 segundos

---

## Flujo de Envío

```
Usuario llena formulario y hace click "Enviar"
                    ↓
    Validación HTML5 (campos requeridos)
                    ↓
   Si hay error → Mostrar error (no envía)
                    ↓
  Si OK → Deshabilitar botón + "Enviando..."
                    ↓
  POST a proxy.php?action=registerCandidate
  Body: JSON con datos del formulario
                    ↓
  Code.gs: handleRegistration()
  ├─ Genera candidate_id (CANDIDATO_YYYYMMDD_XXXX)
  ├─ Crea fila en sheet "Candidatos"
  ├─ Genera token E1
  ├─ Guarda token en sheet "Tokens"
  ├─ Crea evento en Timeline
  ├─ Agrega a Brevo (lista "interesados")
  └─ Envía email "Bienvenida" con token E1
                    ↓
  Respuesta: {success: true, candidate_id: "..."}
                    ↓
  Frontend: mostrar éxito + redirigir
```

---

# 🎛️ DASHBOARD ADMINISTRATIVO {#dashboard-admin}

**Ubicación:** `https://profesionales.catholizare.com/catholizare_sistem/admin-dashboard.html`
**Archivo:** `html/admin-dashboard.html`
**Acceso:** Email + Password + 2FA opcional
**Actualización:** Automática cada 30 segundos
**Respuesta:** JSON desde `proxy.php?action=getDashboardData`

## Estructura Visual Completa

```
┌─────────────────────────────────────────────────────────────────────────┐
│ RCCC - Panel Administrativo > Gestion de Candidatos              [↻] [🚪]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Gestión de Candidatos                    Última actualización: 14:30  │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ 45                 │ 12                 │ 28                 │ 5   │   │
│ │ Candidatos Totales │ En Proceso         │ Aprobados          │ Rechazados│
│ │ Registrados        │ Aguardando revisión│ Completaron proceso│       │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌─ Filtros ─────────────────────────────────────────────────────────┐ │
│ │ 🔍 [Buscar por nombre, email o ID...] [Todos los estados ▼]     │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Candidatos                                                  45 registros│
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ ID              │ Nombre      │ Email           │ Estado   │ % │ Acciones │
│ ├───────────────────────────────────────────────────────────────────┤ │
│ │CANDIDATO_..._001│ Juan Pérez  │ juan@email.com  │ [Rev.E1] │33│[✓] [✗][⭐]│
│ │CANDIDATO_..._002│ María García│ maria@email.com │[Terminos]│50│[✓] [✗][⭐]│
│ │CANDIDATO_..._003│ Carlos López│ carlos@....com  │[Rev.E2] │67│[✓] [✗][⭐]│
│ │CANDIDATO_..._004│ Ana Martín  │ ana@email.com   │[🥉Junior]│ 100│[✓] [✗][⭐]│
│ │CANDIDATO_..._005│ Diego Rojas │ diego@....com   │[❌Rechazado]│0│[✓] [✗][⭐]│
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SECCIÓN 1: NAVBAR (Barra Superior)

### Título
- **Texto:** "RCCC - Panel Administrativo"
- **Subtítulo:** "Gestion de Candidatos"
- **Fondo:** Gradiente (#001A55 → #0966FF)
- **Color texto:** Blanco
- **Tamaño:** h1 = 2rem, p = 0.95em

### Botones Navbar (Derecha)

#### Botón Actualizar
- **Icono:** ↻
- **Texto:** "Actualizar"
- **Función:** `refreshData()`
- **Acción:** Obtiene datos frescos (sin esperar 30s)
- **Feedback:** Toast "Datos actualizados"
- **Color:** Blanco transparente en hover
- **Shortcut:** Puede usarse Ctrl+R

#### Botón Salir
- **Icono:** 🚪
- **Texto:** "Salir"
- **Función:** `logout()`
- **Acción:**
  1. Pide confirmación "¿Cerrar sesión?"
  2. Limpia localStorage
  3. Redirige a login
- **Color:** Blanco transparente en hover

---

## SECCIÓN 2: ESTADÍSTICAS (4 Cards)

### Card 1: Candidatos Totales

```
┌──────────────────────────┐
│        45               │
│ Candidatos Totales      │
│ Registrados en sistema  │
└──────────────────────────┘
```

- **Valor:** Número total de candidatos en sheet "Candidatos"
- **Cálculo:** COUNT de filas (excluyendo header)
- **Color:** Fondo blanco, número azul (#001A55)
- **Actualización:** Cada refresh del dashboard
- **Border:** Left border 4px #0966FF

### Card 2: En Proceso

```
┌──────────────────────────┐
│        12               │
│ En Proceso              │
│ Aguardando revisión     │
└──────────────────────────┘
```

- **Valor:** Candidatos cuyo status = contains("pending") OR "awaiting"
- **Estados incluidos:**
  - `pending_review_E1`
  - `pending_review_E2`
  - `pending_review_E3`
  - `awaiting_terms_acceptance`
  - `awaiting_interview`
  - `registered`
- **Color:** Igual a Card 1
- **Propósito:** Mostrar trabajo pendiente del admin

### Card 3: Aprobados

```
┌──────────────────────────┐
│        28               │
│ Aprobados               │
│ Completaron proceso     │
└──────────────────────────┘
```

- **Valor:** Candidatos cuyo status = contains("approved")
- **Estados incluidos:**
  - `approved_junior`
  - `approved_senior`
  - `approved_expert`
  - `handoff_completed`
- **Color:** Igual a Card 1

### Card 4: Rechazados

```
┌──────────────────────────┐
│        5                │
│ Rechazados              │
│ No continuaron proceso  │
└──────────────────────────┘
```

- **Valor:** Candidatos cuyo status = "rejected"
- **Color:** Igual a Card 1

---

## SECCIÓN 3: FILTROS

### Búsqueda por Texto
- **Icono:** 🔍
- **Placeholder:** "Buscar por nombre, email o ID..."
- **Tipo:** Text input
- **Tamaño:** Min 250px, flex en desktop
- **Función:** `filterTable()`
- **Búsqueda en:**
  - Nombre (Column: "Nombre")
  - Email (Column: "Email")
  - ID (Column: "ID")
- **Búsqueda:** Case-insensitive, parcial
- **Timing:** Ejecuta mientras escribe (onkeyup)
- **Validación:** Muestra solo filas que coinciden

### Filtro por Estado
- **Tipo:** Select dropdown
- **Opciones:**
  ```
  ├─ Todos los estados
  ├─ Registrado
  ├─ En Revisión
  ├─ Términos
  ├─ Aprobado
  └─ Rechazado
  ```
- **Defecto:** "Todos los estados"
- **Función:** `filterTable()`
- **Combinación:** Trabaja + búsqueda (AND)
- **Timing:** Ejecuta en change

---

## SECCIÓN 4: TABLA DE CANDIDATOS

### Headers (Encabezados)

#### ID
- **Ancho:** 180px mín
- **Tipo:** Monospace font
- **Formato:** `CANDIDATO_YYYYMMDD_XXXX`
- **Ejemplo:** `CANDIDATO_20260217_0123`
- **Color background:** #f5f5f5
- **Selectable:** No (pre tag)

#### Nombre
- **Ancho:** Auto
- **Tipo:** Bold
- **Formato:** Texto libre
- **Ejemplo:** "Juan Pérez García"
- **Selectable:** Sí

#### Email
- **Ancho:** 250px
- **Tipo:** Normal
- **Formato:** Email
- **Ejemplo:** "juan@example.com"
- **Click:** No hace nada (solo lectura)

#### Estado
- **Ancho:** 150px
- **Formato:** Badge con color
- **Valores posibles:**
  ```
  ├─ [Registrado] - Azul
  ├─ [Rev. E1] - Naranja
  ├─ [Rev. E2] - Naranja
  ├─ [Rev. E3] - Naranja
  ├─ [Términos] - Púrpura
  ├─ [Entrevista] - Verde
  ├─ [🥉 Junior] - Verde
  ├─ [🥈 Senior] - Azul
  ├─ [🥇 Expert] - Púrpura
  └─ [❌ Rechazado] - Rojo
  ```

#### Progreso (%)
- **Ancho:** 120px
- **Tipo:** Progress bar
- **Formato:** Número 0-100%
- **Cálculo:**
  ```
  - registered: 0%
  - pending_review_E1: 33%
  - awaiting_terms: 50%
  - pending_review_E2: 67%
  - pending_review_E3: 85%
  - awaiting_interview: 90%
  - approved_*: 100%
  - rejected: 0%
  ```
- **Color barra:** Gradiente #4CAF50 → #8BC34A

#### Última Interacción
- **Ancho:** 140px
- **Tipo:** Pequeño, gris
- **Formato:** "15 Feb 2026"
- **Actualización:** Cada vez que candidato hace algo

#### Acciones
- **Ancho:** 250px
- **Tipo:** Botones contextuales
- **Comportamiento:** Mostrar solo si es relevante

---

### Botones de Acción

Los botones cambian según el estado del candidato.

#### 1. Botón "Aprobar E1" (Verde)
- **Icono:** ✓
- **Texto:** "Aprobar E1"
- **Color:** #4CAF50 (verde)
- **Mostrar si:** Status = `pending_review_E1` O `registered`
- **Click:**
  ```
  1. Modal de confirmación
  2. ¿Aprobar examen E1 para [nombre]?
  3. Campo opcional: "Notas"
  4. Click "Aprobar"
       ↓
     POST /proxy.php?action=approveExam
     {
       candidateId: "CANDIDATO_...",
       exam: "E1",
       notes: "..."
     }
       ↓
     Code.gs: approveExamAdmin(candidateId, "E1")
     ├─ Status → awaiting_terms_acceptance
     ├─ Envía email: sendEmailTerms()
     ├─ Timeline: EXAMEN_E1_APROBADO_ADMIN
     └─ Actualiza Dashboard
  ```

#### 2. Botón "Aprobar E2" (Azul)
- **Icono:** ✓
- **Texto:** "Aprobar E2"
- **Color:** #2196F3 (azul)
- **Mostrar si:** Status = `pending_review_E2`
- **Click:** Igual a E1 pero exam="E2"
  ```
  Acciones adicionales:
  ├─ Genera token E3
  ├─ Actualiza Tokens sheet
  ├─ Envía email: sendEmailE3()
  └─ Status → pending_review_E3
  ```

#### 3. Botón "Aprobar E3" (Púrpura)
- **Icono:** ✓
- **Texto:** "Aprobar E3"
- **Color:** #9C27B0 (púrpura)
- **Mostrar si:** Status = `pending_review_E3`
- **Click:** Igual a E1/E2 pero exam="E3"
  ```
  Acciones adicionales:
  ├─ NO genera token
  ├─ Status → awaiting_interview
  ├─ Envía email: sendEmailAwaitingInterview()
  └─ Espera categorización manual
  ```

#### 4. Botón "Rechazar" (Rojo)
- **Icono:** ✗
- **Texto:** "Rechazar"
- **Color:** #f44336 (rojo)
- **Mostrar si:** Status contiene "pending_review"
- **Click:**
  ```
  1. Modal de rechazo
  2. Campo: "Examen a rechazar"
     Select: E1 / E2 / E3
  3. Campo: "Razón del rechazo" (textarea, requerido)
     Ejemplo: "Respuestas con posible plagio"
  4. Click "Rechazar"
       ↓
     POST /proxy.php?action=rejectExam
     {
       candidateId: "...",
       exam: "E1",
       reason: "..."
     }
       ↓
     Code.gs: rejectExamAdmin(candidateId, exam, reason)
     ├─ Status → rejected
     ├─ Mueve en Brevo: interesados → rechazados
     ├─ Envía email: sendEmailRejected()
     ├─ Timeline: EXAMEN_E1_RECHAZADO_ADMIN
     └─ NO genera próximos tokens
  ```

#### 5. Botón "Categorizar" (Naranja)
- **Icono:** ⭐
- **Texto:** "Categorizar"
- **Color:** #FF9800 (naranja)
- **Mostrar si:** Status = `awaiting_interview` O `approved_*`
- **Click:**
  ```
  1. Modal de categorización
  2. Campo: "Categoría"
     Select:
     ├─ 🥉 Junior (75-79%): Fundamentos Sólidos
     ├─ 🥈 Senior (80-89%): Muy Competente
     └─ 🥇 Expert (90%+): Excepcional
  3. Campo: "Comentarios" (textarea, opcional)
  4. Click "Asignar y Aprobar"
       ↓
     POST /proxy.php?action=assignCategory
     {
       candidateId: "...",
       category: "SENIOR",
       comments: "..."
     }
       ↓
     Code.gs: assignCategoryAndApprove(candidateId, category)
     ├─ Status → approved_senior
     ├─ final_category → "SENIOR"
     ├─ Mueve en Brevo: interesados → senior (lista 7)
     ├─ Envía email: sendEmailApproved()
     ├─ Timeline: CANDIDATO_CATEGORIZADO_APROBADO
     ├─ (Opcional) Handoff a Onboarding
     └─ Dashboard actualiza
  ```

#### 6. Botón "Ver" (Info)
- **Icono:** 👁️
- **Texto:** "Ver"
- **Color:** #2196F3 (info)
- **Mostrar si:** Siempre
- **Click:**
  ```
  Abre modal/panel con:
  ├─ Datos personales del candidato
  ├─ Email de candidato
  ├─ Teléfono
  ├─ Fecha de registro
  ├─ Puntajes de exámenes
  ├─ Timeline de eventos
  └─ Notas del admin
  ```

---

### Estilos de Botones

**Normal:**
- Padding: 0.5rem 0.8rem
- Border-radius: 6px
- Font-size: 0.8em
- Font-weight: 600
- Cursor: pointer
- Transición: 0.3s

**Hover:**
- Más oscuro (darken 15%)
- Transform: translateY(-2px)
- Box-shadow: 0 4px 12px rgba(color, 0.3)

**Disabled:**
- Opacity: 0.5
- Cursor: not-allowed

---

## SECCIÓN 5: FILAS DE TABLA

### Estructura por Fila

```
┌─────────────────────────────────────────────────────────────┐
│ CANDIDATO_20260215_0001 │ Juan Pérez │ juan@... │ [Rev.E1] │ 33% │ 15 Feb │ [✓] [✗] [⭐] [👁️] │
└─────────────────────────────────────────────────────────────┘
```

### Hover Effect
- Background: #f9f9f9
- Transición suave

### Click en Fila
- NO hace nada (solo admin click en botones)

---

## ACTUALIZACIÓN AUTOMÁTICA

### Refresh Each 30 Seconds
```
setInterval(() => {
  fetch('proxy.php?action=getDashboardData')
    .then(response => response.json())
    .then(data => {
      updateStats(data.stats)
      renderTable(data.candidates)
      updateLastUpdate()
    })
}, 30000)
```

- **Silencioso:** No molesta al admin
- **Timestamp:** "Última actualización: 14:30"
- **Estado:** Si hay cambios, tabla se re-renderiza

---

# 📧 PLANTILLAS DE EMAIL {#plantillas-email}

Todos los emails usan:
- **De:** `noreply@rccc.org` (configurable en Config sheet)
- **Proveedor:** Brevo (primary) → Resend (fallback) → MailApp (fallback)
- **Log:** Cada email registra en sheet "Notificaciones"
- **HTML:** Responsivo, compatible con clientes móviles

---

## EMAIL 1: Bienvenida + Token E1

**Cuándo:** Candidato se registra en formulario
**A:** Email del candidato
**Asunto:** "Bienvenido a RCCC Evaluaciones"

### Estructura HTML

```html
┌──────────────────────────────────────────────────┐
│ Header Gradiente RCCC                            │
│ ┌───────────────────────────────────────────┐   │
│ │ 🎓 Bienvenido Juan!                       │   │
│ │ Red de Psicologos Catolicos               │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ Body                                             │
│ ┌───────────────────────────────────────────┐   │
│ │ Tu registro ha sido exitoso.               │   │
│ │                                            │   │
│ │ Tu examen E1 está agendado para:          │   │
│ │ Lunes, 17 de Febrero de 2026              │   │
│ │                                            │   │
│ │ Accede al examen:                         │   │
│ │ [💙 Acceder al Examen E1]                 │   │
│ │ https://profesionales.catholizare...      │   │
│ │                                            │   │
│ │ ─ Instrucciones ─                         │   │
│ │ • Duración: 2 horas                       │   │
│ │ • No se permite copiar/pegar               │   │
│ │ • Máximo 3 cambios de ventana              │   │
│ └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Elementos Incluidos

| Elemento | Contenido | Notas |
|----------|-----------|-------|
| **Saludo** | "Bienvenido {nombre}" | Personalizado |
| **Subtítulo** | "Red de Psicologos Catolicos" | Fijo |
| **Descripción** | "Tu registro ha sido exitoso" | Fijo |
| **Fecha Examen** | Fecha formateada (es_CO) | De fecha_programada |
| **Link Examen** | URL con token | `https://prof.catholizare.com/catholizare_sistem/exam-webapp.html?token={token}&exam=E1` |
| **Botón** | "Acceder al Examen E1" | Click → abre examen |
| **Copy-Paste URL** | URL en código | Para copiar manual |
| **Instrucciones** | Duración, restricciones | Fijo |

---

## EMAIL 2: Acepta Términos y Condiciones

**Cuándo:** Admin aprueba E1
**A:** Email del candidato
**Asunto:** "Siguiente paso: Acepta los Términos y Condiciones"

### Estructura HTML

```html
┌──────────────────────────────────────────────────┐
│ Header Gradiente "¡Aprobaste E1!"               │
│ ┌───────────────────────────────────────────┐   │
│ │                                            │   │
│ │ ¡Aprobaste E1!                            │   │
│ │                                            │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ Body                                             │
│ ┌───────────────────────────────────────────┐   │
│ │ Felicidades {nombre},                     │   │
│ │                                            │   │
│ │ Has aprobado exitosamente el Examen E1.  │   │
│ │ El siguiente paso es aceptar los Términos│   │
│ │ y Condiciones de RCCC.                    │   │
│ │                                            │   │
│ │ Por favor:                                 │   │
│ │ 1. Lee cuidadosamente los T&C             │   │
│ │ 2. Marca todas las casillas de aceptación│   │
│ │ 3. Haz clic en "Aceptar y Continuar"     │   │
│ │                                            │   │
│ │ Una vez aceptes, recibirás email con E2. │   │
│ │                                            │   │
│ │ [💙 Aceptar Términos]                    │   │
│ │ https://prof.catholizare.com/...         │   │
│ │                                            │   │
│ │ Si hay problemas accediendo:              │   │
│ │ URL: https://prof.catholizare.com/...    │   │
│ │      ?candidate_id=CANDIDATO_...         │   │
│ └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Elementos Incluidos

| Elemento | Contenido | Notas |
|----------|-----------|-------|
| **Saludo** | "Felicidades {nombre}" | Personalizado |
| **Noticia** | "Has aprobado E1" | Fijo |
| **Instrucciones** | 3 pasos a seguir | Numerado |
| **Link Términos** | URL a términos-condiciones.html | `https://prof.catholizare.com/catholizare_sistem/terminos-condiciones.html?candidate_id={candidateId}` |
| **Botón** | "Aceptar Términos" | Click → abre términos |
| **Copy-Paste URL** | URL en código | Para fallback |

---

## EMAIL 3: Acceso a E2

**Cuándo:** Candidato acepta términos
**A:** Email del candidato
**Asunto:** "Accede al Examen E2"

### Estructura HTML

```html
┌──────────────────────────────────────────────────┐
│ Header                                           │
│                                                  │
│ Hola {nombre},                                   │
│                                                  │
│ Has aceptado los términos. Ya puedes tomar el  │
│ Examen E2.                                       │
│                                                  │
│ [💙 Acceder al Examen E2]                      │
│ https://prof.catholizare.com/...               │
│                                                  │
│ URL: https://prof.catholizare.com/...          │
│      ?token={token}&exam=E2                    │
└──────────────────────────────────────────────────┘
```

### Elementos Incluidos

| Elemento | Contenido | Notas |
|----------|-----------|-------|
| **Noticia** | "Has aceptado términos" | Confirmación |
| **Link Examen** | URL con token E2 | Nuevo token |
| **Duración** | 120 minutos | Informativo |

---

## EMAIL 4: Acceso a E3

**Cuándo:** Admin aprueba E2
**A:** Email del candidato
**Asunto:** "Accede al Examen E3 (Final)"

### Estructura HTML (Similar a E2)

```html
Hola {nombre},

Excelente! Aprobaste E2. Ahora puedes tomar el
Examen E3 (examen final).

[💙 Acceder al Examen E3]
https://prof.catholizare.com/...?token={token}&exam=E3
```

---

## EMAIL 5: Entrevista Pendiente

**Cuándo:** Admin aprueba E3
**A:** Email del candidato
**Asunto:** "Entrevista Personal - Pendiente de Agendamiento"

### Contenido

```html
Hola {nombre},

Felicidades! Has completado los 3 exámenes.

Pronto te contactaremos para agendar tu entrevista
personal.

Gracias por tu paciencia.
```

---

## EMAIL 6: Rechazo (Cualquier Examen)

**Cuándo:** Admin rechaza E1, E2 o E3
**A:** Email del candidato
**Asunto:** "Resultado de tu proceso en RCCC"

### Estructura HTML

```html
Hola {nombre},

Gracias por participar en nuestro proceso de
selección.

Después de revisar tu examen {exam}, hemos
decidido no continuar con tu candidatura en este
momento.

{SI HAY RAZÓN}
Retroalimentación: {razón}

Te animamos a seguir creciendo profesionalmente.
Puedes aplicar nuevamente en el futuro.
```

### Elementos Incluidos

| Elemento | Contenido | Notas |
|----------|-----------|-------|
| **Noticia** | "No continuamos" | Directo |
| **Examen** | E1/E2/E3 | Del evento |
| **Razón** | Texto opcional | Si admin proporciona |
| **Ánimo** | "Puedes aplicar nuevamente" | Positivo |

---

## EMAIL 7: Aprobación Final + Categoría

**Cuándo:** Admin asigna categoría y aprueba
**A:** Email del candidato
**Asunto:** "Aprobado en RCCC - {Categoría}"

### Estructura HTML

```html
┌──────────────────────────────────────────────────┐
│ Header Gradiente (Celébración)                  │
│                                                  │
│ 🎉 Felicidades {nombre}!                        │
│                                                  │
│ Body                                             │
│                                                  │
│ Nos complace informarte que has sido APROBADO  │
│ en el proceso de selección de RCCC.             │
│                                                  │
│ Categoría asignada:                             │
│ {CATEGORÍA CON EMOJI}                           │
│ • 🥉 Junior (75-79%): Fundamentos Sólidos      │
│ • 🥈 Senior (80-89%): Muy Competente           │
│ • 🥇 Expert (90%+): Excepcional                │
│                                                  │
│ Pronto recibirás más información sobre los    │
│ próximos pasos.                                 │
└──────────────────────────────────────────────────┘
```

---

## EMAIL 8: Notificación Handoff (a Admin)

**Cuándo:** Candidato aprobado es transferido a Onboarding
**A:** Admin handoff email
**Asunto:** "Handoff: {Nombre} ({Categoría})"

### Contenido

```html
Nuevo candidato para Onboarding

Nombre: {nombre}
Email: {email}
Categoría: {JUNIOR/SENIOR/EXPERT}

Ha sido transferido al sistema de Onboarding.
```

---

## Estructura General de Emails

Todos los emails incluyen:

### Header
- Gradiente RCCC (#001A55 → #0966FF)
- Título con emoji relevante
- 20px padding

### Body
- Fondo gris claro (#f9f9f9)
- 20px padding
- Línea-height: 1.6
- Font-family: Arial, sans-serif

### Footer (Implícito)
- Copyright RCCC
- Año 2026
- Links: Privacidad, Contacto

### Estilos Botones

```css
Background: #0966FF
Color: white
Padding: 12px 24px
Text-decoration: none
Border-radius: 4px
Margin: 20px 0
Display: inline-block
```

---

# 🎓 INTERFAZ DE EXAMEN {#interfaz-examen}

**Ubicación:** `https://profesionales.catholizare.com/catholizare_sistem/exam-webapp.html?token={TOKEN}&exam=E1`
**Archivo:** `html/exam-webapp.html`
**Duración:** 120 minutos (configurable en Config sheet)
**Timeout:** Auto-submit cuando llega a 0:00

## Estructura Visual

```
┌─────────────────────────────────────────────────────────────┐
│ Examen E1                        Tiempo restante: 02:00:00   │
│ Candidato: Juan Pérez                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Pregunta 1 de 20                    [████████░░░░░░░░░░]50% │
│ (0 respondidas)                                             │
│                                                             │
│ ⚠️ [ALERTA FLOTANTE - Se oculta 4 seg]                     │
│ "Copiar no está permitido"                                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Pregunta 1                                              ││
│ │                                                         ││
│ │ ¿Cuál es la definición de ansiedad según...?          ││
│ │                                                         ││
│ │ ○ Opción A - Explicación aquí...                      ││
│ │ ○ Opción B - Explicación aquí...                      ││
│ │ ○ Opción C - Explicación aquí...                      ││
│ │ ○ Opción D - Explicación aquí...                      ││
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Pregunta 2                                              ││
│ │                                                         ││
│ │ ¿Cómo abordas un caso de depresión?                   ││
│ │                                                         ││
│ │ [Texto abierto.................................. ]     ││
│ │ [                                          ]            ││
│ │ [                                          ]            ││
│ │ 0 caracteres                                           ││
│ │                                                         ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [✓ Enviar Examen] (centrado, ancho completo)             │
│                                                             │
│ Revisa tus respuestas antes de enviar. Una vez enviado    │
│ no podrás hacer cambios.                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Modal de Confirmación (Antes de Enviar)                    │
│                                                             │
│ Confirmar Envío                                            │
│                                                             │
│ ¿Estás seguro de que deseas enviar el examen?             │
│                                                             │
│ Respuestas respondidas: 15 de 20                          │
│                                                             │
│ ⚠️ No podrás hacer cambios después de enviar.             │
│                                                             │
│ [Cancelar]                        [Enviar Ahora]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## HEADER (Barra Superior)

### Sección Izquierda
- **Título:** "Examen {E1|E2|E3}"
- **Font-size:** 1.5rem
- **Font-weight:** 700
- **Subtítulo:** "Candidato: {nombre}"
- **Font-size:** 0.9em
- **Opacity:** 0.9

### Sección Derecha
- **Etiqueta:** "Tiempo restante"
- **Font-size:** 0.8em
- **Timer:** "HH:MM:SS"
- **Font-size:** 2.5rem
- **Font-family:** Monospace
- **Colores Timer:**
  - **Normal (2+ horas):** Blanco
  - **Warning (10-30 min):** Amarillo (#FFD700)
  - **Critical (<5 min):** Rojo parpadeante

---

## ALERTAS FLOTANTES

### Cuándo Aparecen

```javascript
events:
  - copy (Ctrl+C)
  - paste (Ctrl+V)
  - cut (Ctrl+X)
  - blur (cambio de ventana)
  - blur x3 (aviso)
  - blur x5 (auto-submit)
```

### Contenido Alerta

| Evento | Mensaje | Color | Duración |
|--------|---------|-------|----------|
| Copy | "Copiar no está permitido" | Naranja | 4s |
| Paste | "Pegar no está permitido" | Naranja | 4s |
| Cut | "Cortar no está permitido" | Naranja | 4s |
| Blur 1-2 | (Silencioso) | - | - |
| Blur 3 | "Advertencia: Has cambiado de ventana (3/5). Se enviará automáticamente al llegar al límite." | Naranja | 4s |
| Blur 4 | (Silencioso) | - | - |
| Blur 5 | "Demasiados cambios de ventana. Enviando examen..." | Rojo | 2s |

### Styling Alerta
- **Position:** Top banner
- **Background:** Naranja/Rojo según evento
- **Color:** Blanco
- **Padding:** 1rem
- **Text-align:** Center
- **Border-radius:** 6px
- **Animation:** slideDown 0.3s

---

## PROGRESS BAR

- **Ancho:** 100%
- **Altura:** 8px
- **Background:** Gris claro
- **Fill:** Gradiente verde (#4CAF50 → #8BC34A)
- **Actualización:** Cada vez que candidato responde pregunta
- **Fórmula:** (respondidas / total) * 100%

### Texto Debajo
- "Pregunta {N} de {TOTAL}"
- "({respondidas} respondidas)"
- **Color:** Gris
- **Font-size:** 0.9em

---

## TARJETA DE PREGUNTA (Question Card)

### Estructura

```
┌────────────────────────────────────┐
│ Pregunta 1                         │
│                                    │
│ [Contenido de pregunta]            │
│ [Respuestas o textarea]            │
│                                    │
│ [Contador de caracteres]           │
└────────────────────────────────────┘
```

### Estilos
- **Background:** Blanco
- **Padding:** 2rem
- **Border-radius:** 12px
- **Shadow:** 0 2px 8px rgba(0,0,0,0.08)
- **Border-left:** 4px solid #0966FF
- **Margin-bottom:** 1.5rem
- **Hover:** shadow más oscura, transform translateY(-2px)

### Cuando Respondida
- **Border-left:** 4px solid #4CAF50 (verde)
- **Background:** Gradiente rgba(76,175,80,0.05)

### Número de Pregunta

```
┌──────────────────────┐
│ Pregunta {N}        │
├──────────────────────┤
```

- **Background:** #0966FF
- **Color:** Blanco
- **Padding:** 0.4rem 0.8rem
- **Border-radius:** 20px
- **Font-size:** 0.85em
- **Font-weight:** 600
- **Margin-bottom:** 1rem
- **Display:** inline-block

---

## PREGUNTAS MÚLTIPLE CHOICE

### Estructura

```
Pregunta: [Texto]

○ Opción 1 - [Descripción]
○ Opción 2 - [Descripción]
○ Opción 3 - [Descripción]
○ Opción 4 - [Descripción]
```

### Opción (Label)

```
┌─────────────────────────────────────┐
│ ○ Opción B - Explicación aquí...   │
└─────────────────────────────────────┘
```

- **Display:** flex
- **Align-items:** flex-start
- **Padding:** 1rem
- **Border:** 2px solid #e0e0e0
- **Border-radius:** 8px
- **Cursor:** pointer
- **Transition:** 0.3s
- **Margin:** 5px 0

### Hover Opción
- **Border-color:** #0966FF
- **Background:** #f0f5ff

### Opción Seleccionada
- **Border-color:** #0966FF
- **Background:** #e8f0ff
- **Font-weight:** 600
- **Color:** #001A55

### Radio Button
- **Size:** 20px
- **Margin-right:** 1rem
- **Accent-color:** #0966FF
- **Cursor:** pointer

---

## PREGUNTAS ABIERTAS (Textarea)

### Estructura

```
Pregunta: [Texto]

[                                    ]
[                                    ]
[                                    ]
[                                    ]

120 caracteres
```

### Textarea
- **Width:** 100%
- **Min-height:** 150px
- **Padding:** 1rem
- **Border:** 2px solid #e0e0e0
- **Border-radius:** 6px
- **Font-size:** 1em
- **Font-family:** inherit
- **Resize:** vertical

### Focus
- **Outline:** none
- **Border-color:** #0966FF
- **Box-shadow:** 0 0 0 3px rgba(9, 102, 255, 0.1)

### Contador de Caracteres
- **Font-size:** 0.85em
- **Color:** #999
- **Margin-top:** 0.5rem
- **Text-align:** right
- **Formato:** "120 caracteres"

---

## BOTÓN SUBMIT

### Enviar Examen

```
[✓ Enviar Examen]
```

- **Background:** Gradiente (#001A55 → #0966FF)
- **Color:** Blanco
- **Padding:** 1rem
- **Border:** none
- **Border-radius:** 8px
- **Font-size:** 1.1em
- **Font-weight:** 600
- **Cursor:** pointer
- **Display:** block
- **Margin:** 20px auto
- **Width:** 100%
- **Max-width:** 400px
- **Text-transform:** uppercase
- **Letter-spacing:** 0.5px

### Hover
- **Transform:** translateY(-2px)
- **Box-shadow:** 0 6px 20px rgba(9, 102, 255, 0.4)

### Disabled (Durante Envío)
- **Opacity:** 0.6
- **Cursor:** not-allowed
- **Texto:** "Enviando..."
- **Spinner:** Visible

---

## MODAL DE CONFIRMACIÓN

### Contenido

```
┌────────────────────────────────┐
│ Confirmar Envío              X │
├────────────────────────────────┤
│                                │
│ ¿Estás seguro de que deseas   │
│ enviar el examen?              │
│                                │
│ Respuestas respondidas:        │
│ 15 de 20                       │
│                                │
│ ⚠️ No podrás hacer cambios    │
│    después de enviar.          │
│                                │
│ [Cancelar]    [Enviar Ahora]  │
│                                │
└────────────────────────────────┘
```

### Styling
- **Position:** fixed, centered
- **Background:** white
- **Border-radius:** 12px
- **Width:** 90%, max 500px
- **Padding:** 2rem
- **Box-shadow:** 0 10px 40px rgba(0,0,0,0.2)
- **Animation:** slideIn 0.3s

### Botones Modal
- **Cancelar:** Gris
- **Enviar Ahora:** Verde (#0966FF)
- **Padding:** 0.8rem 1.5rem
- **Border-radius:** 6px

---

## VALIDACIONES

### No Puede Copiar/Pegar
```
Eventos bloqueados:
- copy (Ctrl+C)
- paste (Ctrl+V)
- cut (Ctrl+X)
- contextmenu (clic derecho)

Contador: copyAttempts++
```

### No Puede Cambiar de Ventana
```
Evento blur detectado
- Primer cambio: Silencioso
- Segundo cambio: Silencioso
- Tercer cambio: Alerta "Has cambiado..."
- Cuarto cambio: Silencioso
- Quinto cambio: Auto-submit

Contador: blurCount++
```

### No Puede Dejar Vacío
```
Si hace click "Enviar" sin responder:
Mostrar alerta: "Debes responder al menos una pregunta"
```

---

## ENVÍO DEL EXAMEN

### Data Enviada

```javascript
{
  token: "E1_CANDIDATO_20260217_0001",
  exam: "E1",
  answers: {
    q1: "option_2",
    q2: "Respuesta abierta del candidato...",
    q3: "option_1",
    q4: "Respuesta con detalle..."
  },
  startedAt: "2026-02-17T14:00:00.000Z",
  finishedAt: "2026-02-17T16:00:15.000Z",
  elapsedSeconds: 7215,
  blur_count: 2,
  copy_count: 0
}
```

### Proceso Servidor

```
POST proxy.php?action=submitExam
       ↓
Code.gs: handleExamSubmit()
├─ Verifica token
├─ Obtiene preguntas del banco
├─ Llama OpenAI para calificar
├─ Guarda respuestas en Test_E1_Respuestas
├─ Marca token como usado
├─ Actualiza status → pending_review_E1
├─ Crea evento Timeline
└─ Retorna respuesta
       ↓
Frontend: Mostrar "✓ Examen enviado exitosamente"
```

---

## PÁGINA DE ÉXITO

### Después de Enviar

```
┌─────────────────────────────────┐
│ ✓ Examen enviado               │
│                                 │
│ Tu examen ha sido recibido     │
│ correctamente.                  │
│                                 │
│ Por favor espera a que el      │
│ equipo administrativo revise   │
│ tu examen.                      │
│                                 │
│ Pronto recibirás un email con  │
│ el resultado.                   │
│                                 │
│ Gracias por participar.        │
│                                 │
└─────────────────────────────────┘
```

- **Color Header:** Verde (#4CAF50)
- **Mensaje:** Centrado, amigable
- **Padding:** 50px
- **Font-family:** Arial, sans-serif

---

# 📄 PÁGINA DE TÉRMINOS Y CONDICIONES {#terminos-condiciones}

**Ubicación:** `https://profesionales.catholizare.com/catholizare_sistem/terminos-condiciones.html?candidate_id=CANDIDATO_...`
**Archivo:** `html/terminos-condiciones.html`
**Acceso:** Solo después de aprobar E1
**Acción:** Marcar 4 checkboxes y aceptar

## Estructura Visual

```
┌────────────────────────────────────────────────────┐
│ Términos y Condiciones                             │
│ Red de Psicólogos Católicos (RCCC)                │
├────────────────────────────────────────────────────┤
│                                                   │
│ 1. Objetivo del Programa                          │
│ [Texto largo...]                                   │
│                                                   │
│ 2. Descripción del Proceso                        │
│ [Texto largo...]                                   │
│                                                   │
│ 3. Privacidad y Protección de Datos              │
│ [Texto largo...]                                   │
│                                                   │
│ ... (12 secciones total)                          │
│                                                   │
├────────────────────────────────────────────────────┤
│ Aceptar Términos y Condiciones                    │
│                                                   │
│ ☑ He leído y ACEPTO los T&C                      │
│ ☑ Acepto Política de Privacidad                   │
│ ☑ Acepto evaluación con IA                        │
│ ☑ Acepto medidas anti-fraude                      │
│                                                   │
│ [Declinar]              [✓ Aceptar y Continuar]  │
│                                                   │
└────────────────────────────────────────────────────┘
```

---

## SECCIONES DE CONTENIDO (12 total)

### 1. Objetivo del Programa
**Contenido:** Describe qué es RCCC y qué buscan

### 2. Descripción del Proceso
**Contenido:** Explica E1, E2, E3 y sus duraciones (120 min cada)

### 3. Privacidad y Protección de Datos
**Contenido:** Cómo se manejan datos, confidencialidad

### 4. Sistemas de Seguridad y Anti-fraude
**Contenido:**
- Copy-paste blocking
- Blur/tab-switching detection
- AI detection para plagio
- Registro de tiempo

### 5. Evaluación con Inteligencia Artificial
**Contenido:**
- OpenAI GPT-4o-mini
- Rúbricas predefinidas
- Revisión humana

### 6. Categorización de Candidatos
**Contenido:**
- JUNIOR (75-79%)
- SENIOR (80-89%)
- EXPERT (90%+)

### 7. Comunicaciones y Notificaciones
**Contenido:** Qué emails recibe y cuándo

### 8. Limitaciones de Responsabilidad
**Contenido:**
- No responsable por conexión
- No responsable por dispositivos
- No apelable decisión

### 9. Decisiones Finales
**Contenido:** Que las decisiones son finales

### 10. Modificaciones de Términos
**Contenido:** RCCC puede cambiar términos

### 11. Aceptación de Términos
**Contenido:** Qué significa aceptar

### 12. Contacto
**Contenido:** Email: info@rccc.org, sitio web

---

## SECCIÓN DE ACEPTACIÓN

### Checkboxes (4 requeridos)

#### Checkbox 1: Términos y Condiciones
- **Texto:** "He leído y **ACEPTO** los Términos y Condiciones"
- **Requerido:** SÍ
- **Tipo:** checkbox
- **ID:** acceptTerms

#### Checkbox 2: Privacidad
- **Texto:** "Acepto que mis datos sean tratados conforme a la **Política de Privacidad**"
- **Requerido:** SÍ
- **Tipo:** checkbox
- **ID:** acceptPrivacy

#### Checkbox 3: Inteligencia Artificial
- **Texto:** "Acepto que mis respuestas sean evaluadas con **asistencia de Inteligencia Artificial**"
- **Requerido:** SÍ
- **Tipo:** checkbox
- **ID:** acceptAI

#### Checkbox 4: Anti-fraude
- **Texto:** "Entiendo y acepto las **medidas de seguridad anti-fraude** (copy-paste blocking, blur detection, etc)"
- **Requerido:** SÍ
- **Tipo:** checkbox
- **ID:** acceptAntifraud

### Validación Checkboxes
- **Todos deben estar checked:** `if (!all4checked) alert("Debes aceptar todos")`
- **Botón Aceptar disabled:** Hasta que todos estén checked
- **Listener:** onChange en cada checkbox

---

## BOTONES

### Botón Declinar
- **Texto:** "← Declinar"
- **Función:** `declineTerms()`
- **Acción:**
  1. Confirmación: "¿Deseas declinar y cancelar participación?"
  2. Si OK → window.location.href = "https://profesionales.catholizare.com/"
  3. Si Cancel → vuelve a página
- **Color:** Gris #e0e0e0
- **Hover:** Más oscuro

### Botón Aceptar
- **Texto:** "✓ Aceptar y Continuar"
- **Función:** `acceptTerms()`
- **Habilitado:** Solo si todos 4 checkboxes están marked
- **Acción:**
  ```
  1. POST proxy.php?action=acceptTerms
     Body: {
       candidate_id: "CANDIDATO_...",
       accepted_at: "2026-02-17T14:30:00Z"
     }

  2. Code.gs: acceptTerms(candidateId)
     ├─ Valida status = "awaiting_terms_acceptance"
     ├─ Genera token E2
     ├─ Guarda token en Tokens sheet
     ├─ Status → pending_review_E2
     ├─ Envía email: sendEmailE2()
     ├─ Timeline: TERMINOS_ACEPTADOS
     └─ Retorna: {success: true}

  3. Frontend: Mostrar "¡Términos aceptados!"

  4. 3 segundos después:
     window.location.href = "https://prof.catholizare.com/estado?candidate_id=..."
  ```
- **Color:** Verde #4CAF50
- **Hover:** Más oscuro, shadow
- **Disabled state:** Opacity 0.5, cursor not-allowed

---

## MENSAJES DE FEEDBACK

### Error
- **Cuando:** No todos checkboxes checked, error en API, etc
- **Color:** Rojo fondo, texto oscuro
- **Ejemplo:** "ID de candidato no encontrado"

### Success
- **Cuando:** Aceptación exitosa
- **Color:** Verde fondo, texto oscuro
- **Ejemplo:** "¡Términos aceptados! Recibirás email..."

---

# 📊 BASE DE DATOS - GOOGLE SHEETS {#base-datos}

## Hoja: CANDIDATOS

| Columna | Tipo | Descripción |
|---------|------|-------------|
| **A: candidate_id** | Text | CANDIDATO_YYYYMMDD_XXXX |
| **B: registration_date** | DateTime | Cuándo se registró |
| **C: name** | Text | Nombre completo |
| **D: email** | Text | Email del candidato |
| **E: phone** | Text | Teléfono |
| **F: country** | Text | País (ISO 2 letras) |
| **G: birthday** | Date | Fecha nacimiento |
| **H: professional_type** | Text | Psicólogo/Consejero/etc |
| **I: therapeutic_approach** | Text | Enfoque terapéutico |
| **J: about** | Text (Long) | Experiencia candidato |
| **K: status** | Text | Estado actual |
| **L: last_interaction_date** | DateTime | Última acción |
| **M: final_category** | Text | JUNIOR/SENIOR/EXPERT |
| **N: final_status** | Text | Completado/Activo |
| **O: notes** | Text | Notas del admin |

### Estados Posibles

```
registered
  → pending_review_E1 (completó E1)

Si rechazado E1:
  → rejected

Si aprobado E1:
  → awaiting_terms_acceptance (esperando acepte términos)

Si aceptó términos:
  → pending_review_E2 (completó E2)

Si rechazado E2:
  → rejected

Si aprobado E2:
  → pending_review_E3 (completó E3)

Si rechazado E3:
  → rejected

Si aprobado E3:
  → awaiting_interview (esperando entrevista)

Si categorizado:
  → approved_junior
  → approved_senior
  → approved_expert

Final:
  → handoff_completed (transferido)
```

---

## Hoja: TOKENS

| Columna | Tipo | Descripción |
|---------|------|-------------|
| **A: token** | Text | E1_CANDIDATO_... |
| **B: candidate_id** | Text | Ref a Candidatos |
| **C: exam** | Text | E1/E2/E3 |
| **D: created_at** | DateTime | Cuándo se generó |
| **E: valid_from** | DateTime | ISO inicio validez |
| **F: valid_until** | DateTime | ISO fin validez |
| **G: used** | Boolean | TRUE si ya se usó |
| **H: status** | Text | active/used |
| **I: email** | Text | Email para copias |
| **J: name** | Text | Nombre para emails |
| **K: scheduled_date** | Date | Fecha agendada |

---

## Hoja: TEST_E1_RESPUESTAS

| Columna | Tipo | Descripción |
|---------|------|-------------|
| **A: candidate_id** | Text | Ref a Candidatos |
| **B: started_at** | DateTime | Cuándo empezó E1 |
| **C: finished_at** | DateTime | Cuándo terminó E1 |
| **D: elapsed_seconds** | Number | Segundos totales |
| **E: responses_json** | Text | JSON {q1: "option_1", ...} |
| **F: blur_events** | Number | Cambios de ventana |
| **G: copy_attempts** | Number | Intentos copy/paste |
| **H: ai_detection_count** | Number | Preguntas con IA detectada |
| **I: verdict** | Text | pass/fail/review |
| **J: openai_score_json** | Text | Calificaciones OpenAI |
| **K: flags** | Text | Alertas detectadas |

---

## Hoja: TIMELINE

| Columna | Tipo | Descripción |
|---------|------|-------------|
| **A: timestamp** | DateTime | Cuándo ocurrió |
| **B: candidate_id** | Text | Qué candidato |
| **C: event_type** | Text | Tipo de evento |
| **D: details_json** | Text | Contexto del evento |
| **E: actor** | Text | SISTEMA o email admin |

### Eventos Posibles

```
CANDIDATO_REGISTRADO
TEST_E1_COMPLETADO
TERMINOS_ACEPTADOS
EXAMEN_E1_APROBADO_ADMIN
EXAMEN_E1_RECHAZADO_ADMIN
EXAMEN_E2_APROBADO_ADMIN
CANDIDATO_CATEGORIZADO_APROBADO
HANDOFF_COMPLETADO
```

---

## Hoja: NOTIFICACIONES

| Columna | Tipo | Descripción |
|---------|------|-------------|
| **A: timestamp** | DateTime | Cuándo se envió |
| **B: email** | Text | Destinatario |
| **C: subject** | Text | Asunto del email |
| **D: provider** | Text | BREVO/RESEND/MAILAPP |
| **E: status** | Text | SENT/FAILED |
| **F: iso_timestamp** | Text | ISO 8601 |

---

# ⏱️ TIEMPOS Y DURACIONES {#tiempos-duraciones}

## Duraciones de Examen

| Examen | Duración | Configurable |
|--------|----------|--------------|
| E1 | 120 minutos | SÍ (Config.EXAM_E1_DURATION_MIN) |
| E2 | 120 minutos | SÍ (Config.EXAM_E2_DURATION_MIN) |
| E3 | 120 minutos | SÍ (Config.EXAM_E3_DURATION_MIN) |

## Delays en Interfaz

| Elemento | Delay | Propósito |
|----------|-------|-----------|
| **Alert Toast** | 4 segundos | Mostrar warnings |
| **Success Toast** | 3 segundos | Confirmación antes redireccionarse |
| **Dashboard Refresh** | 30 segundos | Auto-actualizar datos |
| **Modal Confirmación E3** | Inmediato | Confirmar envío |
| **Redireccionamiento** | 2-3 segundos | Dar tiempo a leer mensaje |

## Tiempos OpenAI

| Operación | Tiempo | Notas |
|-----------|--------|-------|
| **Calificar E1** | 2-10s | Depende de respuestas |
| **Calificar E2** | 2-10s | Depende de respuestas |
| **Calificar E3** | 2-10s | Depende de respuestas |

## Email Delivery

| Proveedor | Tiempo | Confiabilidad |
|-----------|--------|--------------|
| **Brevo** | 1-2 min | Primary (99.9%) |
| **Resend** | 1-2 min | Fallback (99.5%) |
| **MailApp** | 1-5 min | Fallback (90%) |

---

## Ventanas de Validación de Token

**Formato:** ISO 8601 DateTime

**Ejemplo:**
- `valid_from`: 2026-02-20T06:01:00Z
- `valid_until`: 2026-02-21T23:59:59Z
- **Duración:** ~41 horas 58 minutos

**Validaciones:**
- Si `now < valid_from` → "El examen aún no está disponible"
- Si `now > valid_until` → "El examen ha expirado"
- Si `used == true` → "Este token ya fue usado"

---

## Timeline de Caso Típico

```
06:00 → Candidato se registra en formulario
06:01 → Email "Bienvenida" + Token E1
06:02 → Brevo comienza delivery
06:05 → Candidato recibe email
06:10 → Candidato inicia E1
06:10 → Timer comienza: 2:00:00
08:10 → Candidato termina E1 (2 horas exactas)
08:11 → OpenAI califica (2-10s)
08:12 → Admin ve en Dashboard
08:30 → Admin revisa y hizo click "Aprobar E1"
08:31 → Email "Acepta Términos" enviado
08:35 → Candidato recibe email
08:40 → Candidato acepta términos
08:41 → Email "E2 Disponible" enviado
08:45 → Candidato recibe email
08:50 → Candidato inicia E2
10:50 → Candidato termina E2
10:51 → OpenAI califica
        ... (repite para E3)

TOTAL: ~3-4 horas de trabajo (E1+E2+E3)
       + admin review delays
       + email delivery delays
       = 6-24 horas total proceso
```

---

**FIN DEL MANUAL**

**Documento Versión:** 3.0
**Última actualización:** 2026-02-17
**Rama:** `claude/candidate-selection-tracker-rb6Ke`
**Commit:** Ready for deployment
