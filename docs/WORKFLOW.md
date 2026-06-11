# Workflow — Proceso de Admisión RCCC

## Flujo completo del candidato

```
[1] REGISTRO
     │
     ▼
[2] EXAMEN E1 ──── (único intento, 120 min)
     │
     ▼
[3] ADMIN revisa E1
     ├─── Rechazar → email de rechazo → FIN
     └─── Aprobar  → email con link a T&C
     │
     ▼
[4] TÉRMINOS Y CONDICIONES
     │  Candidato acepta en página de T&C
     │  → GAS genera token E2 → envía email
     ▼
[5] EXAMEN E2 ──── (único intento, 120 min)
     │
     ▼
[6] CALIFICACIÓN E2 (automática)
     ├─── Aprueba (score ≥ mínimo, sin flags de IA)
     │      → GAS genera token E3 y envía email AUTOMÁTICAMENTE
     │        (sin esperar aprobación manual del admin)
     └─── No aprueba o veredicto `review`
            → queda en `pending_review_E2` para revisión manual del admin
              ├─── Rechazar → email de rechazo → FIN
              └─── Aprobar  → GAS genera token E3 → envía email
     │
     ▼
[7] EXAMEN E3 ──── (único intento, 120 min, examen final)
     │
     ▼
[8] ADMIN revisa E3
     ├─── Rechazar → email de rechazo → FIN
     └─── Aprobar  → email "entrevista pendiente"
     │
     ▼
[9] ENTREVISTA PERSONAL
     │  Admin registra notas y resultado
     ▼
[10] ASIGNACIÓN DE CATEGORÍA
     │  Admin asigna: Junior (75-79) / Senior (80-89) / Expert (90+)
     ▼
[11] APROBADO
     │  Email de aprobación con categoría
     ▼
[12] HANDOFF
      Admin ejecuta handoff → datos pasan a planilla de onboarding
```

---

## Estados del candidato (`status` en hoja Candidatos)

| Status                    | Descripción                                     |
|---------------------------|-------------------------------------------------|
| `registered`              | Recién registrado, token E1 enviado             |
| `pending_review_E1`       | Completó E1, esperando revisión admin           |
| `approved_E1`             | E1 aprobado, esperando aceptación de T&C        |
| `terms_accepted`          | T&C aceptados, token E2 enviado                 |
| `pending_review_E2`       | Completó E2 sin aprobar automáticamente, esperando revisión admin |
| `approved_E2`             | E2 aprobado, token E3 enviado                   |
| `pending_review_E3`       | Completó E3, esperando revisión admin           |
| `approved_E3`             | E3 aprobado, esperando entrevista               |
| `awaiting_interview`      | Entrevista pendiente de agendamiento            |
| `interview_completed`     | Entrevista realizada                            |
| `category_assigned`       | Categoría asignada                              |
| `approved`                | Proceso completo, aprobado                      |
| `rejected`                | Rechazado en algún punto del proceso            |
| `handoff_completed`       | Transferido a planilla de onboarding            |
| `incomplete`              | Marcado manualmente como inconcluso             |

---

## Paso 1: Registro

**Formulario:** Widget de WordPress/Elementor en catholizare.com  
**Campos recopilados:**
- `name` — nombre completo
- `email` — único, no se pueden repetir
- `phone` — teléfono
- `birthday` — fecha de nacimiento del candidato (NO fecha de examen)
- `country` — país
- `professional_type` — tipo de profesional
- `therapeutic_approach` — enfoque terapéutico
- `about` — texto libre sobre sí mismo

**No se pide:** fecha/hora de examen — los exámenes son a demanda.

**Resultado:** 
- Se crea candidato en hoja `Candidatos`
- Se genera token E1
- Se envía email de bienvenida con link directo a E1
- Se agrega a lista Brevo "Interesados"

---

## Paso 2–3: Examen E1

**Acceso:** El candidato hace clic en el enlace del email de bienvenida.  
**URL:** `https://profesionales.catholizare.com/catholizare_sistem/examen/?token=XXX&exam=E1`

**Reglas del examen:**
- 1 único intento (el token se marca como usado al enviar)
- 120 minutos máximo + 5 min de margen de red
- Máximo 3 cambios de ventana antes de flag
- No se puede copiar/pegar
- Si AI detecta texto generado por IA → veredicto `review`

**Admin revisa en dashboard:**
- Ve respuestas completas, puntaje, flags, blur_events, ai_detection_count
- Botón "Aprobar" (requiere PIN) o "Rechazar" (con razón obligatoria)

---

## Paso 4: Términos y Condiciones

**URL:** `terminos-y-condiciones.html?candidate_id=XXX&email=YYY`  
El candidato lee y acepta → GAS registra aceptación con IP y user-agent → genera token E2 → envía email.

---

## Pasos 5–7: Exámenes E2 y E3

Idéntico al flujo de E1. Cada examen se desbloquea solo si el anterior fue aprobado.

---

## Paso 9: Entrevista

El admin registra el resultado vía `registerInterviewResult`:
- `interview_notes` — notas de la entrevista
- `interview_result` — aprobado/rechazado

Si se aprueba, el admin puede asignar categoría.

---

## Paso 10-11: Categoría y Aprobación

**Categorías por puntaje promedio (E1+E2+E3):**
| Categoría | Rango de puntaje |
|-----------|------------------|
| Junior    | 75 – 79          |
| Senior    | 80 – 89          |
| Expert    | 90+              |

Los rangos son configurables en hoja `Config`.

---

## Paso 12: Handoff

El admin ejecuta handoff desde el dashboard:
1. Los datos del candidato se copian al spreadsheet de onboarding externo (`HANDOFF_SPREADSHEET_ID`)
2. Se envía notificación interna al email `EMAIL_HANDOFF`
3. El status en Sheets cambia a `handoff_completed`

---

## Acciones del Admin (Dashboard)

### Requerir PIN
- Aprobar E2, E3
- Rechazar E1, E2, E3

### No requieren PIN
- Aprobar E1 (envía la Información general) — disponible para rol `admin`
- Ver datos de candidatos
- Ver respuestas de exámenes
- Registrar resultado de entrevista
- Asignar categoría
- Ejecutar handoff
- Reenviar email de bienvenida

### Solo SUPERADMIN
- `resetTokenAttempt` — dar segunda oportunidad a candidato (con razón registrada)
- `gasDiagnostic` — diagnóstico completo de salud del sistema
- Gestión de usuarios admin

---

## Ciclo de vida del desarrollo

1. Modificar `apps-script-dev/Code.gs`
2. Hacer commit y push al repositorio
3. **Copiar manualmente** el contenido a la consola de GAS
4. Guardar y re-deployar como Web App (misma URL)
5. Si se modificaron HTMLs: subir al servidor por FTP/SSH

No existe CI/CD ni deploy automático.
