# Estructura de Google Sheets - Sistema RCCC

## 📋 13 Hojas Totales

### 1. **Config** (Configuración)
**Propósito:** Almacenar todas las variables globales del sistema (sin hardcode)

**Columnas:**
- Clave (string): nombre de la variable
- Valor: el valor actual
- Tipo: string, number, json

**Ejemplos:**
- OPENAI_API_KEY, OPENAI_MODEL
- BREVO_API_KEY, BREVO_LIST_INTERESADOS (hasta 8 listas)
- EMAIL_FROM, EMAIL_ADMIN, EMAIL_HANDOFF
- EXAM_E1_DURATION_MIN (120), EXAM_E1_MIN_SCORE (75)
- CATEGORY_JUNIOR_MIN (75), CATEGORY_SENIOR_MIN (80), CATEGORY_EXPERT_MIN (90)
- TIMEZONE, APP_NAME, HANDOFF_SPREADSHEET_ID

---

### 2. **Candidatos** (Registro de Candidatos)
**Propósito:** Base de datos de todos los postulantes

**Columnas:**
- candidate_id (ej: CANDIDATO_20260217_1234)
- registration_date
- name
- email
- phone
- country
- birthday
- professional_type
- therapeutic_approach
- about
- status (registered, pending_review_E1, awaiting_terms_acceptance, pending_review_E2, pending_review_E3, awaiting_interview, approved_junior, approved_senior, approved_expert, rejected, handoff_completed)
- last_interaction_date
- final_category
- final_status
- notes

---

### 3. **Tokens** (Gestión de Acceso a Exámenes)
**Propósito:** Control de tokens para que cada candidato acceda a su examen en la ventana horaria correcta

**Columnas:**
- token (ej: E1_CANDIDATO_20260217_123456)
- candidate_id
- exam (E1, E2, E3)
- created_at (fecha/hora de creación)
- valid_from (ISO timestamp: cuando está disponible)
- valid_until (ISO timestamp: cuando expira)
- used (true/false)
- status (active, used)
- email
- name
- scheduled_date (ej: 2026-02-20)

**Ejemplo de ventana:**
- scheduled_date: 2026-02-20
- valid_from: 2026-02-20 06:01:00
- valid_until: 2026-02-21 23:59:59

---

### 4. **Preguntas** (BANCO DE PREGUNTAS)
**Propósito:** Almacenar todas las preguntas con sus rúbricas y opciones de respuesta

**Columnas:**
- Cuestionario (E1, E2, E3)
- N (número de pregunta: 1, 2, 3...)
- id (identificador único: q1, q2, q3...)
- type (multiple, open)
- category (ejemplo: psicologia, etica, clinica)
- ai_check (TRUE/FALSE - detectar si respuesta es de IA)
- texto (la pregunta en sí)
- option_1 (solo para multiple choice)
- option_2
- option_3
- option_4
- option_5
- correct (ej: option_1, option_3)
- almost (no usado actualmente)
- rubric_max_points (2, 3, etc - puntos máximos por pregunta)
- rubric_criteria (descripción de qué hace una respuesta excelente/aceptable)
- rubric_red_flags (qué características indican respuesta débil o copia)
- rubric_raw (datos en bruto para OpenAI)

**Ejemplo pregunta abierta:**
```
Cuestionario: E1
N: 1
id: q1
type: open
texto: ¿Cómo abordas un caso de ansiedad?
rubric_max_points: 2
rubric_criteria: Debe demostrar comprensión psicológica...
rubric_red_flags: Respuestas genéricas, plagio, falta de coherencia
```

---

### 5. **Test_E1_Respuestas** (Respuestas de Candidatos - Examen 1)
**Propósito:** Almacenar respuestas y datos de comportamiento durante el examen E1

**Columnas:**
- candidate_id
- started_at (ISO timestamp: cuándo empezó)
- finished_at (ISO timestamp: cuándo terminó)
- elapsed_seconds (tiempo total en segundos)
- responses_json (JSON con todas las respuestas: {q1: "option_1", q2: "respuesta abierta"...})
- blur_events (número de veces que cambió de ventana/pestaña)
- copy_attempts (intentos de copiar/pegar)
- ai_detection_count (cuántas respuestas OpenAI detectó como posible IA)
- verdict (pass, fail, review)
- openai_score_json (JSON con calificaciones por pregunta)
- flags (alertas detectadas: ["Q2: Posible IA (75%)", "Exceso de cambios de ventana"])

---

### 6. **Test_E2_Respuestas** (Respuestas de Candidatos - Examen 2)
**Propósito:** Mismo que E1 pero para el segundo examen

**Columnas:** Idénticas a Test_E1_Respuestas

---

### 7. **Test_E3_Respuestas** (Respuestas de Candidatos - Examen 3)
**Propósito:** Mismo que E1 pero para el tercer examen (final)

**Columnas:** Idénticas a Test_E1_Respuestas

---

### 8. **Timeline** (Auditoría Completa)
**Propósito:** Registro cronológico de TODOS los eventos del sistema

**Columnas:**
- timestamp (cuándo ocurrió)
- candidate_id
- event_type (ej: CANDIDATO_REGISTRADO, TEST_E1_COMPLETADO, EXAMEN_E1_APROBADO_ADMIN, CANDIDATO_CATEGORIZADO_APROBADO, HANDOFF_COMPLETADO, TERMINOS_ACEPTADOS)
- details_json (datos contextuales del evento)
- actor (quién causó el evento: SISTEMA o email del admin)

**Ejemplo:**
```
timestamp: 2026-02-15 14:30:00
candidate_id: CANDIDATO_20260215_5678
event_type: TEST_E1_COMPLETADO
details_json: {"puntaje": 82, "veredicto": "pass", "flags": ["Q3: Posible IA (65%)"]}
actor: SISTEMA
```

---

### 9. **Resultados** (Resultados Finales Consolidados)
**Propósito:** Tabla de candidatos que completaron TODO el proceso (E1 + E2 + E3)

**Columnas:**
- timestamp (cuándo se generó el resultado)
- candidate_id
- name
- email
- E1_score (ej: 82)
- E2_score (ej: 78)
- E3_score (ej: 85)
- average_score (ej: 81.67)
- verdict (APROBADO o RECHAZADO basado en promedio)
- category (JUNIOR si 75-79, SENIOR si 80-89, EXPERT si 90+)
- details_json (información adicional)

---

### 10. **Notificaciones** (Log de Emails Enviados)
**Propósito:** Auditoría de todos los emails (para rastrear entregas y fallos)

**Columnas:**
- timestamp (cuándo se intentó enviar)
- email (destinatario)
- subject (asunto del email)
- provider (BREVO, RESEND, o MAILAPP)
- status (SENT, FAILED, etc)
- iso_timestamp (formato ISO)

---

### 11. **Usuarios** (Admin Users)
**Propósito:** Registro de usuarios administradores

**Columnas:**
- email
- password_hash
- role (admin, super_admin)
- created_date
- last_login
- status (active, inactive)

---

### 12. **Sessions** (Sesiones Activas)
**Propósito:** Rastrear sesiones de admin para timeout automático

**Columnas:**
- session_id
- user_email
- created_at
- expires_at (8 horas desde created_at)
- ip_address
- user_agent

---

### 13. **Login_Audit** (Auditoría de Login)
**Propósito:** Registro de intentos de login (éxitos y fallos)

**Columnas:**
- timestamp
- email
- attempt_type (login_attempt, logout)
- success (true/false)
- ip_address
- notes (motivo del fallo si aplica)

---

## 🔄 Flujo de Datos

```
CANDIDATO REGISTRA
    ↓
1. Crea fila en "Candidatos" (status: registered)
2. Crea token en "Tokens" (exam: E1, valid_from/until)
3. Evento en "Timeline" (CANDIDATO_REGISTRADO)
4. Agrega contacto a Brevo (lista: interesados)
5. Envía email "Bienvenida" → log en "Notificaciones"

CANDIDATO TOMA EXAMEN E1
    ↓
1. Obtiene preguntas de "Preguntas" (Cuestionario=E1)
2. Responde todas las preguntas
3. POST a /submit_exam
4. OpenAI califica usando rúbricas
5. Guarda respuestas en "Test_E1_Respuestas"
6. Marca token como "used" en "Tokens"
7. Actualiza "Candidatos" (status: pending_review_E1)
8. Evento en "Timeline" (TEST_E1_COMPLETADO)
9. Notifica admin por email → log en "Notificaciones"

ADMIN APRUEBA EXAMEN E1
    ↓
1. Dashboard lee "Candidatos" + "Test_E1_Respuestas"
2. Admin click "Aprobar E1"
3. Genera token E2
4. Guarda token en "Tokens" (exam: E2)
5. Actualiza "Candidatos" (status: awaiting_terms_acceptance)
6. Envía email "Términos" → log en "Notificaciones"
7. Evento en "Timeline" (EXAMEN_E1_APROBADO_ADMIN)

(Repite para E2 y E3)

ADMIN ASIGNA CATEGORÍA Y APRUEBA
    ↓
1. Admin click "Categorizar" → selecciona JUNIOR/SENIOR/EXPERT
2. Actualiza "Candidatos" (status: approved_junior, category: JUNIOR)
3. Mueve contacto en Brevo (lista interesados → lista junior)
4. Envía email "Aprobado" → log en "Notificaciones"
5. Evento en "Timeline" (CANDIDATO_CATEGORIZADO_APROBADO)
6. (Opcional) Realiza Handoff a Onboarding Spreadsheet

RESULTADO FINAL
    ↓
1. Crea fila en "Resultados" con promedio y categoría
2. Envía email final al candidato
```

---

## ✅ Reglas Importantes

1. **Preguntas** es READ-ONLY (solo admin carga preguntas aquí)
2. **Test_E1/2/3_Respuestas** solo contiene respuestas de candidatos (nunca datos del candidato como nombre)
3. **Timeline** es el source of truth para auditoría (TODA acción debe estar logueada aquí)
4. **Notificaciones** sirve para debugging (¿por qué no llegó un email?)
5. **Candidatos** es la tabla central (estado, categoría, última interacción)

---

**Última actualización:** 2026-02-17
**Rama:** claude/candidate-selection-tracker-rb6Ke
