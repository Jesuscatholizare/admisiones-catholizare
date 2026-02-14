# Catholizare — Proceso de Selección de Candidatos (Contexto)

## 🎯 Objetivo General
Automatizar el **proceso de selección de candidatos** para psicólogos y consultores católicos de RCCC:
- Registro y seguimiento de candidatos
- 3 evaluaciones en diferentes fases
- Calificación automática de respuestas abiertas con OpenAI
- Pausas y aprobaciones del administrador
- Timeline y notificaciones automáticas (Brevo + Resend)
- Dashboard admin con estilo idéntico al onboarding

## 👥 Actores
1. **Candidato**: Completa el formulario y responde evaluaciones
2. **Administrador**: Revisa, pausa procesos, aprueba avances
3. **Super Administrador**: Gestiona usuarios admin, visualiza reportes globales

## 📊 Fases del Proceso
| Fase | Acción | Automático | Manual |
|------|--------|-----------|--------|
| 1. Registro | Candidato ingresa datos | ✅ Apps Script | - |
| 2. Test 1 | Responde preguntas (abiertas + cerradas) | ✅ OpenAI califica | Admin aprueba |
| 3. Pausa 1 | Sistema espera aprobación | - | ✅ Admin decide |
| 4. Test 2 | Evaluación psicométrica | ✅ OpenAI califica | Admin aprueba |
| 5. Pausa 2 | Sistema espera aprobación | - | ✅ Admin decide |
| 6. Test 3 | Evaluación final | ✅ OpenAI califica | Admin aprueba |
| 7. Notificación | Email resultado (Brevo/Resend) | ✅ Apps Script | - |

## 📁 Estructura del Repositorio
```
admisiones-catholizare/
├── apps-script-dev/        # Código en desarrollo
│   ├── Code.gs             # Script principal (DEV)
│   ├── .clasp.json
│   └── appsscript.json
├── apps-script-prod/       # Código en producción
│   ├── Code.gs             # Script principal (PROD)
│   ├── .clasp.json
│   └── appsscript.json
├── docs/                   # Documentación
│   ├── CONTEXT.md          # Este archivo
│   ├── ARCHITECTURE.md     # Componentes técnicos
│   ├── DECISIONS.md        # Decisiones de diseño
│   └── WORKFLOW.md         # Cómo trabajar
└── .git/                   # Control de versiones
```

## 🔗 Google Sheets (estructura)
**DEV Spreadsheet**: `[ID_DEV - se actualiza en DECISIONS.md]`
**PROD Spreadsheet**: `[ID_PROD - se actualiza en DECISIONS.md]`

Hojas dentro del Spreadsheet:
- **Candidatos**: registro básico (nombre, email, teléfono, estado)
- **Test_1**, **Test_2**, **Test_3**: respuestas y calificaciones
- **Pausas**: registro de pausas y aprobaciones
- **Timeline**: eventos (registro, test completado, pausa, aprobación)
- **Notificaciones**: registro de emails enviados (Brevo/Resend)
- **Config**: credenciales y URLs

## 🌳 Flujo General
```
Candidato registra
    ↓
Apps Script crea registro en Sheets
    ↓
Candidato responde Test 1
    ↓
OpenAI califica preguntas abiertas
    ↓
Admin ve resultado en Dashboard
    ↓
Admin pausa → Sistema espera confirmación
    ↓
Admin aprueba → Candidato recibe email (Brevo/Resend)
    ↓
(Repite para Test 2 y Test 3)
    ↓
Resultado final en Sheets + Email notificación
```

## 🔀 Ramas Git
- `main`: código estable/releases
- `dev`: trabajo diario
- `claude/candidate-selection-tracker-rb6Ke`: rama de la IA para esta funcionalidad

## 📝 Convenciones
- **Cambios nuevos**: siempre en rama asignada
- **main**: solo merges de código probado
- **Commits**: feat/fix/docs/chore con descripción clara
- **Sheets**: nombres en snake_case (ej: `Candidatos`, `Test_1`)
