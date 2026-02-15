# 🧪 Guía de Testing Completo — Sistema RCCC

**Fecha**: 2026-02-15
**Status**: 🟢 BACKEND COMPLETO - Listo para testing
**Rama**: `claude/candidate-selection-tracker-rb6Ke`

---

## 📋 Pre-requisitos

### Paso 0: Configurar Google Sheets y Apps Script

```
1. Abre tu Spreadsheet DEV (18jo3Na2fVaCop6S3AA4Cws_QWPJ3q-rFMkEH5QhUGb8)

2. Crea TODAS estas hojas (si no existen):
   - Config
   - Candidatos
   - Tokens
   - Preguntas (CSV importado)
   - Test_1
   - Test_2
   - Test_3
   - Resultados
   - Timeline
   - Notificaciones

3. Llena la hoja "Config" con:
   ┌─────────────────────────────────┬──────────────────────┬──────────┐
   │ Clave                           │ Valor                │ Tipo     │
   ├─────────────────────────────────┼──────────────────────┼──────────┤
   │ OPENAI_API_KEY                  │ sk-proj-tu-clave    │ string   │
   │ OPENAI_MODEL                    │ gpt-4o-mini          │ string   │
   │ BREVO_API_KEY                   │ xkeysib-tu-clave    │ string   │
   │ EMAIL_FROM                      │ noreply@rccc.org    │ string   │
   │ EMAIL_ADMIN                     │ admin@rccc.org      │ string   │
   │ EMAIL_HANDOFF                   │ catholizare@gmail.com│ string   │
   │ APP_NAME                        │ RCCC Evaluaciones   │ string   │
   │ HANDOFF_SPREADSHEET_ID          │ 1YgbnsB0_oL...      │ string   │
   │ EXAM_E1_DURATION_MIN            │ 120                  │ number   │
   │ EXAM_E1_MIN_SCORE               │ 75                   │ number   │
   │ BREVO_LIST_INTERESADOS          │ 3                    │ number   │
   │ BREVO_LIST_RECHAZADOS           │ 4                    │ number   │
   │ BREVO_LIST_APROBADOS            │ 5                    │ number   │
   │ BREVO_LIST_JUNIOR               │ 6                    │ number   │
   │ BREVO_LIST_SENIOR               │ 7                    │ number   │
   │ BREVO_LIST_EXPERT               │ 8                    │ number   │
   └─────────────────────────────────┴──────────────────────┴──────────┘

4. Importa el CSV de preguntas a hoja "Preguntas"

5. En Google Apps Script:
   - Extensions → Apps Script
   - Pega todo Code.gs
   - Ctrl+S para guardar
   - Deploy → New Deployment
   - Copia el Deployment ID
```

---

## 🧑 TEST 1: CREAR CANDIDATO DE PRUEBA

### Opción A: Manual en Sheets (rápido)

```
1. Abre Candidatos sheet
2. Agrega fila:
   ┌──────────────────┬─────────────────────┬────────────────────┐
   │ Candidato ID     │ Nombre              │ Email              │
   ├──────────────────┼─────────────────────┼────────────────────┤
   │ CANDIDATO_TEST_1 │ Juan Test Psicólogo │ tu-email@test.com   │
   └──────────────────┴─────────────────────┴────────────────────┘

3. Llena más campos:
   - Teléfono: +57 310 555 1234
   - Status: "registered"
   - Last_Interaction: hoy
   - Fecha_Registro: hoy

4. Genera Token E1 manualmente en Apps Script:
   - Apps Script → Ctrl+Enter (ejecutar)
   - Escribe en console: generateToken('CANDIDATO_TEST_1', 'E1')
   - Copia el token generado
```

### Opción B: Via API (más realista)

```bash
# Si tienes api-proxy.php configurado:
curl -X POST https://profesionales.catholizare.com/api-proxy.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initial_registration",
    "candidato": {
      "nombre": "Juan Test Psicólogo",
      "email": "tu-email@test.com",
      "telefono": "+57 310 555 1234"
    },
    "scheduled_date": "2026-02-20"
  }'

# Respuesta esperada:
{
  "success": true,
  "message": "Registro exitoso",
  "data": {
    "candidate_id": "CANDIDATO_20260215_1234",
    "token": "E1_CANDIDATO_2026021_ABC123",
    "exam_url": "https://profesionales.catholizare.com/examen/?token=..."
  }
}
```

---

## 📝 TEST 2: COMPLETAR EXAMEN E1

### Paso 1: Acceder al examen

```
1. Email de bienvenida debería llegar
2. Click en link del email O accede a:
   https://profesionales.catholizare.com/examen/?token=TU_TOKEN&exam=E1

3. Deberías ver:
   ✓ Formulario con preguntas de E1
   ✓ Timer de 2 horas
   ✓ Advertencia anti-fraude
```

### Paso 2: Responder preguntas

```
Para las MÚLTIPLES (opción múltiple):
- Selecciona UNA respuesta (cualquiera)

Para las ABIERTAS (cuando haya):
- Escribe una respuesta (cualquier texto)

Nota: El sistema calificará automáticamente:
- Múltiple: Si es correcta → 2pts, si es incorrecta → 0pts
- Abierta: OpenAI evalúa con rúbrica → 0/1/2pts
```

### Paso 3: Enviar examen

```
1. Click "Enviar Examen"
2. Deberías recibir confirmación
3. Verifica:
   ✓ Sheet Test_1: Nueva fila con respuestas
   ✓ Sheet Candidatos: Status = "pending_review_E1"
   ✓ Sheet Timeline: Evento "TEST_E1_COMPLETADO"
   ✓ Email admin: Notificación
```

---

## 👨‍💼 TEST 3: ADMIN APRUEBA E1

### Paso 1: Acceder a funciones de Admin

```
// En Google Apps Script console (Ctrl+Enter):

// Opción A: Aprobar E1
approveExamAdmin('CANDIDATO_TEST_1', 'E1')

// Opción B: Rechazar E1
rejectExamAdmin('CANDIDATO_TEST_1', 'E1', 'Respuestas inconsistentes')
```

### Paso 2: Si APROBÓ E1

```
Deberías ver:
✓ Email EML-02 (Términos) enviado
✓ Candidatos.status = "awaiting_terms_acceptance"
✓ Timeline: "EXAMEN_E1_APROBADO_ADMIN"
✓ Brevo: Contacto sigue en lista_interesados
```

### Paso 3: Si RECHAZÓ E1

```
Deberías ver:
✓ Email EML-03 (Rechazo) enviado
✓ Candidatos.status = "rejected"
✓ Timeline: "EXAMEN_E1_RECHAZADO_ADMIN"
✓ Brevo: Contacto movido a lista_rechazados
```

---

## ✅ TEST 4: CANDIDATO ACEPTA TÉRMINOS

```
// En Apps Script console:

acceptTerms('CANDIDATO_TEST_1')

Deberías ver:
✓ Email EML-04 (Email E2) enviado
✓ Candidatos.status = "pending_review_E2"
✓ Token E2 generado
✓ Timeline: "TERMINOS_ACEPTADOS"
```

---

## 📋 TEST 5: COMPLETAR E2 Y E3 (IGUAL A E1)

```
// Repetir mismo proceso que E1:
// 1. Candidato accede a E2 desde email
// 2. Responde preguntas
// 3. Envía examen
// 4. Admin aprueba → E3 desbloqueado
// 5. Candidato hace E3
// 6. Admin aprueba → awaiting_interview
```

---

## 🎯 TEST 6: ASIGNAR CATEGORÍA Y APROBAR

```
// En Apps Script console:

assignCategoryAndApprove('CANDIDATO_TEST_1', 'SENIOR')

Deberías ver:
✓ Email EML-07 (Aprobación) enviado
✓ Candidatos.status = "approved_senior"
✓ Candidatos.admin_assigned_category = "SENIOR"
✓ Brevo: Contacto movido de lista_interesados → lista_senior
✓ Timeline: "CANDIDATO_CATEGORIZADO_APROBADO"
```

---

## 🚀 TEST 7: HANDOFF A ONBOARDING

```
// En Apps Script console:

performHandoff('CANDIDATO_TEST_1')

Deberías ver:
✓ Fila nueva en Spreadsheet Onboarding (1YgbnsB0_oL...)
✓ Candidatos.status = "handoff_completed"
✓ Email notificación a catholizare@gmail.com
✓ Timeline: "HANDOFF_COMPLETADO"
```

---

## 📊 VERIFICAR DATOS

### Sheet Candidatos - Verificar estructura

```
┌──────────────────┬────────────────┬─────────┬───────────────┐
│ Candidato_ID     │ Nombre         │ Email   │ Status        │
├──────────────────┼────────────────┼─────────┼───────────────┤
│ CANDIDATO_TEST_1 │ Juan Test      │ tu@...  │ handoff_..    │
└──────────────────┴────────────────┴─────────┴───────────────┘

Status debe progresar:
registered → pending_review_E1 → awaiting_terms_acceptance
→ pending_review_E2 → pending_review_E3 → awaiting_interview
→ approved_senior → handoff_completed
```

### Sheet Test_1, Test_2, Test_3 - Verificar resultados

```
Cada examen debe tener:
- candidate_id
- exam (E1/E2/E3)
- started_at, finished_at
- responses_json: {"q1": "option_1", ...}
- verdict: "pass" o "fail"
- openai_score_json: {"q1": {"score": 2}, ...}
```

### Sheet Timeline - Verificar eventos

```
Deberías ver eventos en orden:
1. CANDIDATO_REGISTRADO
2. TEST_E1_COMPLETADO
3. EXAMEN_E1_APROBADO_ADMIN (si aprobó)
4. TERMINOS_ACEPTADOS
5. TEST_E2_COMPLETADO
...continúa...
8. CANDIDATO_CATEGORIZADO_APROBADO
9. HANDOFF_COMPLETADO
```

### Sheet Notificaciones - Verificar emails

```
Cada email enviado debe estar registrado:
- Timestamp
- Email_to
- Subject
- Provider (BREVO, RESEND, MAILAPP)
- Status (SENT, ERROR)
```

---

## 🐛 TROUBLESHOOTING

### Error: "Hoja Preguntas no encontrada"

```
Solución:
1. Asegúrate de crear la hoja "Preguntas"
2. Importa el CSV (File → Import)
3. Verifica que la estructura sea correcta
```

### Error: "OpenAI API Error"

```
Solución:
1. Verifica que OPENAI_API_KEY sea válida
2. Revisa saldo en OpenAI dashboard
3. Confirma que gpt-4o-mini esté disponible
```

### Error: "Brevo contact not added"

```
Solución:
1. Verifica que BREVO_API_KEY sea válida
2. Confirma IDs de listas en Config sheet
3. Revisa logs en Apps Script (Extensions → Executions)
```

### Email no llegó

```
Solución:
1. Revisa Gmail spam/promociones
2. Revisa Sheet Notificaciones para error
3. Si Provider = FAILED:
   - Intenta con RESEND_API_KEY
   - O usa fallback MailApp
```

---

## 📊 MÉTRICAS DE ÉXITO

Después de completar todos los tests, deberías tener:

```
✅ Candidato registrado en Candidatos
✅ Token E1 generado y usado
✅ E1 completado en Test_1 (score calculado)
✅ Admin aprobó E1
✅ Email Términos enviado
✅ Candidato aceptó términos
✅ Token E2 generado
✅ E2 completado en Test_2
✅ Admin aprobó E2
✅ Token E3 generado
✅ E3 completado en Test_3
✅ Admin aprobó E3 (awaiting_interview)
✅ Admin asignó categoría (SENIOR)
✅ Candidato categorizado y aprobado
✅ Handoff completado
✅ Candidato en Onboarding Spreadsheet
✅ 15+ eventos en Timeline
✅ 7+ emails en Notificaciones
✅ Contacto movido a lista_senior en Brevo
```

---

## 📞 PRÓXIMOS PASOS

Una vez testing sea exitoso:

1. **Dashboard Admin** - Crear UI para Acciones Avanzadas
2. **Mejorar Formulario** - Agregar Camino Académico + Espiritual
3. **Producción** - Configurar PROD Spreadsheet
4. **Monitoreo** - Configurar alertas

---

## ⚡ RESUMEN RÁPIDO

```bash
# Para testing rápido, ejecutar en orden:

# 1. Crear candidato
curl ... action=initial_registration ...

# 2. Completar E1 (desde browser)
# 3. Aprobar E1
approveExamAdmin('CANDIDATO_TEST_1', 'E1')

# 4. Aceptar términos
acceptTerms('CANDIDATO_TEST_1')

# 5. Completar E2, E3 (repetir)

# 6. Categorizar y aprobar
assignCategoryAndApprove('CANDIDATO_TEST_1', 'SENIOR')

# 7. Handoff
performHandoff('CANDIDATO_TEST_1')

# ✅ ¡Flujo completo testeado!
```

---

**Status**: 🟢 Sistema listo para testing
**Última actualización**: 2026-02-15
**Commits**: 6 (Phase 1-4 + Admin Workflow)
