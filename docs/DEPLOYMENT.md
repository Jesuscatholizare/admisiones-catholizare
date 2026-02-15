# 🚀 Guía de Despliegue — Sistema RCCC

## Resumen de Fases Completadas

| Fase | Descripción | Status |
|------|-------------|--------|
| **1** | Infraestructura core (registro, exámenes, tokens) | ✅ COMPLETA |
| **2** | OpenAI grading, emails (Brevo+Resend), admin dashboard | ✅ COMPLETA |
| **3** | Generación de resultados, categorización (Junior/Senior/Expert) | ✅ COMPLETA |
| **4** | API Proxy WordPress (seguridad, rate limiting) | ✅ COMPLETA |

## Checklist de Despliegue

### Paso 1: Preparar Google Sheets (DEV y PROD)

#### Para DEV (18jo3Na2fVaCop6S3AA4Cws_QWPJ3q-rFMkEH5QhUGb8)
#### Para PROD (1LufXiDNC5KhcAJtZQZ6VApfCyTWLrFuswapgb-oogqA)

**Crear las siguientes hojas:**

```
1. Config (configuración centralizada)
   A: Clave (ej: OPENAI_API_KEY)
   B: Valor (tu API key)
   C: Tipo (string, number, json)

2. Candidatos (registro base)
   A: ID
   B: Nombre
   C: Email
   D: Teléfono
   E: Fecha_Registro
   F: Scheduled_Date
   G: Status
   H: Last_Interaction
   I: Final_Status
   J: Final_Category
   K: Notes

3. Tokens (gestión de acceso)
   A: Token
   B: Candidate_ID
   C: Exam
   D: Created_At
   E: Valid_From
   F: Valid_Until
   G: Used
   H: Status
   I: Email
   J: Name
   K: Scheduled_Date

4. Test_1, Test_2, Test_3 (respuestas de exámenes)
   A: Candidate_ID
   B: Exam
   C: Started_At
   D: Finished_At
   E: Elapsed_Seconds
   F: Responses_JSON
   G: Blur_Events
   H: Copy_Attempts
   I: AI_Detection_Count
   J: Verdict
   K: OpenAI_Score_JSON
   L: Flags

5. Resultados (consolidado final)
   A: Candidato_ID
   B: Nombre
   C: Email
   D: Telefono
   E: Calificacion_Test_1
   F: Calificacion_Test_2
   G: Calificacion_Test_3
   H: Promedio_Final
   I: Estado_Final
   J: Categoria
   K: Notas_Admin
   L: Fecha_Registro
   M: Fecha_Completacion
   N: Dias_Totales
   O: Email_Enviado
   P: Timestamp

6. Timeline (auditoría)
   A: Timestamp
   B: Candidate_ID
   C: Event_Type
   D: Details_JSON
   E: Source

7. Notificaciones (emails enviados)
   A: Timestamp
   B: Email
   C: Subject
   D: Provider
   E: Status
   F: ISO_Timestamp

8. Usuarios (si usas autenticación con contraseña)
   A: Email
   B: Type (ADMIN, CANDIDATO, SUPER_ADMIN)
   C: Password_Hash
   D: Status
   E: Fecha_Creacion
   F: Ultimo_Login

9. Sessions (si usas autenticación)
   A: Email
   B: Session_Token
   C: Expires_At
   D: IP_Address
   E: Device_Type

10. Login_Audit (si usas autenticación)
    A: Email
    B: Timestamp
    C: Evento
    D: IP
    E: Detalles
```

**Completar la hoja Config:**

```
OPENAI_API_KEY           | sk-proj-...                      | string
OPENAI_MODEL             | gpt-4o-mini                      | string
BREVO_API_KEY            | xkeysib-...                      | string
RESEND_API_KEY           | re_...                           | string
EMAIL_FROM               | noreply@rccc.org                 | string
EMAIL_ADMIN              | admin@rccc.org                   | string
EMAIL_SUPPORT            | soporte@rccc.org                 | string
APP_NAME                 | RCCC Evaluaciones                | string
EXAM_E1_DURATION_MIN     | 120                              | number
EXAM_E1_MIN_SCORE        | 75                               | number
EXAM_E2_DURATION_MIN     | 120                              | number
EXAM_E2_MIN_SCORE        | 75                               | number
EXAM_E3_DURATION_MIN     | 120                              | number
EXAM_E3_MIN_SCORE        | 75                               | number
CATEGORY_JUNIOR_MIN      | 75                               | number
CATEGORY_JUNIOR_MAX      | 79                               | number
CATEGORY_SENIOR_MIN      | 80                               | number
CATEGORY_SENIOR_MAX      | 89                               | number
CATEGORY_EXPERT_MIN      | 90                               | number
INACTIVE_DAYS_THRESHOLD  | 20                               | number
TIMEZONE                 | America/Bogota                   | string
```

### Paso 2: Desplegar Google Apps Script

1. **Abre tu Google Sheets DEV**
2. **Haz clic**: Extensions → Apps Script
3. **Borra todo el código por defecto**
4. **Copia todo el contenido de `/apps-script-dev/Code.gs`**
5. **Reemplaza `SS = SpreadsheetApp.getActiveSpreadsheet()`** si es necesario
6. **Prueba**: Ctrl+S para guardar
7. **Deploy**: Click en "Deploy" → "New Deployment"
8. **Selecciona**:
   - Type: Web app
   - Execute as: Tu cuenta de Google
   - Who has access: Anyone
9. **Copia el Deployment ID** (ej: `AKfycbx...`)

### Paso 3: Actualizar API Proxy

1. **Abre `/wordpress-integration/api-proxy.php`**
2. **Reemplaza las URLs de Apps Script:**

```php
const DEV_APPS_SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_DEV_DEPLOYMENT_ID/usercopy';
const PROD_APPS_SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_PROD_DEPLOYMENT_ID/usercopy';
```

3. **Sube a tu servidor:**
```bash
scp wordpress-integration/api-proxy.php usuario@profesionales.catholizare.com:/public_html/

# Configurar permisos
ssh usuario@profesionales.catholizare.com
chmod 644 /public_html/api-proxy.php
mkdir -p /public_html/logs /public_html/cache
chmod 755 /public_html/logs /public_html/cache
```

### Paso 4: Integrar Formulario WordPress

1. **Ve a tu página de registro en WordPress**
2. **Agrega un HTML block (si usas Gutenberg)**
3. **Copia el contenido de `/wordpress-integration/example-form.html`**
4. **Reemplaza la URL del proxy si es necesario:**

```javascript
const proxyUrl = 'https://profesionales.catholizare.com/api-proxy.php';
```

5. **Publica la página**

## Pruebas Funcionales

### Test 1: Registrar Candidato

```bash
curl -X POST https://profesionales.catholizare.com/api-proxy.php \
  -H "Content-Type: application/json" \
  -H "Origin: https://profesionales.catholizare.com" \
  -d '{
    "action": "initial_registration",
    "nombre": "Test User",
    "email": "test@example.com",
    "telefono": "+57 310 555 1234",
    "fecha_examen": "2026-02-20"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Candidato registrado exitosamente",
  "data": {
    "candidate_id": "CANDIDATO_20260215_1234",
    "token_e1": "E1_CANDIDATO_123456_ABC123"
  }
}
```

### Test 2: Ver logs de registro

```bash
# En tu Google Sheets DEV
# Abre hoja "Candidatos" → deberías ver la nueva fila
# Abre hoja "Timeline" → CANDIDATO_REGISTRADO event
# Abre hoja "Notificaciones" → email de bienvenida registrado
```

### Test 3: Completar Examen

**Accede a la URL de examen desde el email** (o construye manualmente):
```
https://profesionales.catholizare.com/examen/?token=E1_CANDIDATO_123456_ABC123&exam=E1
```

**Completa el formulario y envía:**
- Sistema verifica que el tiempo no exceda 2 horas
- OpenAI califica cada respuesta
- Detecta probabilidad de IA
- Guarda resultado en Test_1

### Test 4: Aprobar Resultado (Admin)

**En el Dashboard Admin:**
1. Ir a pestaña "Exámenes"
2. Buscar candidato
3. Click en "Revisar"
4. Revisar calificación de OpenAI
5. Click en "Aprobar"

**Sistema automáticamente:**
- Genera fila en "Resultados"
- Categoriza candidato (Junior/Senior/Expert)
- Envía email con resultado
- Registra en Timeline

## Checklista Pre-Producción

- [ ] Google Sheets DEV totalmente configurado con datos de prueba
- [ ] Google Sheets PROD creado y configurado
- [ ] Code.gs desplegado en ambos Spreadsheets
- [ ] Deployment IDs actualizados en api-proxy.php
- [ ] API Proxy subido a servidor con permisos correctos
- [ ] Formulario WordPress integrado y testeable
- [ ] Todas las API keys configuradas en Config sheet
  - [ ] OPENAI_API_KEY
  - [ ] BREVO_API_KEY (o RESEND_API_KEY)
  - [ ] Email addresses correctos
- [ ] Logs y cache directorios creados
- [ ] Pruebas de flujo completo exitosas

## Troubleshooting

### Error: "Script ID not found"

**Causa**: Deployment ID incorrecto en api-proxy.php

**Solución**:
```bash
# Verifica el Deployment ID en Google Apps Script
# Debe ser similar a: AKfycbx1234567890abc...
# NO el Script ID original
```

### Error: "Rate limit exceeded"

**Causa**: Demasiadas solicitudes desde una IP en 1 hora

**Solución**:
```bash
# Esperar 1 hora o limpiar cache
rm -f /public_html/cache/rate_limit_*.txt
```

### Error: "OpenAI API Error"

**Causa**: API key inválido o cuota excedida

**Solución**:
1. Verifica que la API key en Config sheet es válida
2. Revisa saldo en OpenAI dashboard
3. Asegúrate que gpt-4o-mini está disponible

### Error: "Email not sent"

**Causa**: Brevo API key inválido o dominio no verificado

**Solución**:
1. En Brevo: Dashboard → Sender settings → verifica tu dominio
2. Verifica la API key en Config sheet
3. Revisa logs en Notificaciones sheet

## Monitoreo Post-Despliegue

### Métricas Clave

```javascript
// En Google Apps Script → Executions
// Monitorear:
// - Total executions por día
// - Errores
// - Tiempo de ejecución promedio

// En /logs/ del servidor
// Monitorear:
// - Solicitudes por hora
// - Errores de validación
// - Rate limits alcanzados
```

### Alertas Recomendadas

1. **Registraciones fallidas**: Monitorar Error count en Timeline
2. **OpenAI errors**: Si score = 0, algo falló
3. **Email failures**: Check Notificaciones sheet
4. **Rate limit**: Alert si alguien hace 100+ requests/hora

## Rollback Plan

Si algo sale mal:

### Rollback a DEV
```bash
# Los datos de DEV y PROD están separados
# Simplemente redeploy el script anterior desde Google Apps Script
```

### Rollback de API Proxy
```bash
# Restaurar versión anterior
git checkout HEAD~1 -- wordpress-integration/api-proxy.php
scp wordpress-integration/api-proxy.php usuario@servidor:/public_html/
```

## Próximos Pasos

1. **Triggers**: Configurar Google Apps Script triggers
   ```javascript
   // Ir a Extensions → Applets by Google Apps Script
   // Crear trigger para triggerMarkIncompleteByInactivity()
   // Ejecutar diariamente a las 2 AM
   ```

2. **Analytics**: Integrar con Google Analytics para seguimiento

3. **SMS**: Agregar notificaciones por SMS via Twilio

4. **Webhooks**: Integrar con sistema interno de RCCC

5. **Certificados**: Generar certificados digitales firmados

## Contacto

- **Admin**: admin@rccc.org
- **Tech Support**: tech@rccc.org
- **GitHub**: https://github.com/Jesuscatholizare/admisiones-catholizare

---

**Última actualización**: 2026-02-15
**Versión**: 1.0
**Status**: ✅ Listo para producción
