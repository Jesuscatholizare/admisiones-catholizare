# Decisiones de Diseño — Sistema de Selección de Candidatos

## Cronología de Decisiones

### 2026-02-09: Estructura de Ramas y Carpetas
- ✅ **Rama main** (estable) + **rama dev** (trabajo diario)
- ✅ **apps-script-dev/** vs **apps-script-prod/** separadas
- **Motivo**: Evitar pérdida de contexto, releases controlados, entornos independientes

### 2026-02-14: Sistema de Selección de Candidatos

#### D1: Arquitectura General
- **Decisión**: Google Apps Script + Google Sheets + WebApp HTML
- **Alternativa rechazada**: Firebase (costo), custom backend (mantenimiento)
- **Motivo**: Integración nativa con Sheets, bajo costo, mantenimiento mínimo
- **Status**: ✅ APROBADO

#### D2: Separación DEV/PROD en Sheets
- **Decisión**: 2 Spreadsheets independientes (DEV + PROD)
- **URLs**:
  - **DEV**: `[ID_SPREADSHEET_DEV]` → COMPLETAR AL CREAR SHEETS
  - **PROD**: `[ID_SPREADSHEET_PROD]` → COMPLETAR AL CREAR SHEETS
- **Motivo**: Pruebas sin afectar datos reales, sincronización independiente
- **Status**: ✅ APROBADO

#### D3: Integración con OpenAI
- **Decisión**: OpenAI API para calificar preguntas abiertas
- **Modelo**: gpt-4o (mejor para evaluación contextual)
- **Alternativa**: gpt-3.5-turbo (más barato, menor precisión)
- **Motivo**: Precisión en evaluación psicológica es crítica
- **Status**: ⏳ PENDIENTE VALIDAR (revisar costo)
- **API Key**: Guardada en hoja `Config` de Sheets

#### D4: Notificaciones (Brevo + Resend)
- **Decisión**: Dual integration (Brevo primaria, Resend como fallback)
- **Brevo**: Correos transaccionales (registro, aprobación)
- **Resend**: Alternativa si Brevo falla
- **Motivo**: Garantizar entrega de notificaciones críticas
- **Status**: ✅ APROBADO
- **API Keys**: En hoja `Config`

#### D5: Dashboard Admin UI
- **Decisión**: HTML incrustado en Code.gs con Vanilla JS
- **Estilo**: Idéntico al sistema de onboarding
- **Alternativa rechazada**: React/Vue (complejidad, dependency management)
- **Motivo**: Simplicidad, distribución única (WebApp), sin build process
- **Status**: ✅ APROBADO

#### D6: Estructura de Hojas en Google Sheets
- **Hojas requeridas**:
  1. `Candidatos` — registro base (id, nombre, email, teléfono, estado, fecha_registro)
  2. `Test_1` — respuestas fase 1 (candidato_id, preguntas, respuestas_abiertas, respuestas_cerradas, calificacion_openai, aprobado_admin)
  3. `Test_2` — respuestas fase 2
  4. `Test_3` — respuestas fase 3
  5. `Pausas` — pausas del proceso (candidato_id, fecha_pausa, razon, aprobado_admin, fecha_aprobacion)
  6. `Timeline` — eventos (candidato_id, timestamp, tipo_evento, detalles)
  7. `Notificaciones` — emails enviados (candidato_id, email, tipo_mensaje, timestamp, proveedor, status)
  8. `Config` — credenciales y URLs (openai_api_key, brevo_api_key, resend_api_key, admin_emails)
- **Motivo**: Separación de responsabilidades, fácil auditoría, independencia
- **Status**: ✅ APROBADO

#### D7: Roles y Permisos
- **Roles definidos**:
  - **Administrador**: Gestiona candidatos, pausa procesos, aprueba tests
  - **Super Administrador**: Crea admins, visualiza reportes globales, configura URLs/keys
- **Verificación**: onOpen() detecta rol del usuario logged
- **Status**: ✅ APROBADO

#### D8: Convención de Nombres (IDs)
- **Candidatos**: `CANDIDATO_YYYYMMDD_NNNN` (timestamp + secuencial)
- **Tests**: `TEST_1`, `TEST_2`, `TEST_3`
- **Hojas Sheets**: snake_case (ej: `Candidatos`, `Test_1`, `Pausas`)
- **Funciones JS**: camelCase
- **Status**: ✅ APROBADO

#### D9: Timeline y Auditoría
- **Decisión**: Todos los eventos se registran automáticamente en hoja `Timeline`
- **Eventos**:
  - `CANDIDATO_REGISTRADO`
  - `TEST_1_INICIADO`, `TEST_1_COMPLETADO`, `TEST_1_CALIFICADO_IA`, `TEST_1_APROBADO_ADMIN`
  - `PAUSA_SOLICITADA`, `PAUSA_APROBADA`, `PAUSA_RECHAZADA`
  - `NOTIFICACION_ENVIADA`
- **Motivo**: Trazabilidad completa para auditoría
- **Status**: ✅ APROBADO

#### D10: Validación de Emails
- **Decisión**: Validar formato email en frontend + backend
- **Motivo**: Evitar bounces de Brevo/Resend
- **Regex**: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- **Status**: ✅ APROBADO

## Próximas Decisiones (Pendientes)
- [ ] Costo estimado de OpenAI API → evaluar si usar gpt-3.5-turbo en lugar de gpt-4o
- [ ] Definir SLO de entrega de emails (¿1 min? ¿5 min?)
- [ ] Politica de retención de datos (¿cuánto tiempo guardar registros?)
- [ ] Backup strategy (manual vs automático)
