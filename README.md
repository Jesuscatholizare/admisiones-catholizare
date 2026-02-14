# 📋 Sistema de Selección de Candidatos — RCCC

Sistema automatizado para **gestionar el proceso de selección** de psicólogos y consultores católicos de la RCCC.

**Stack**: Google Apps Script + Google Sheets + WebApp HTML
**Estado**: 🚀 En desarrollo (rama `claude/candidate-selection-tracker-rb6Ke`)

---

## 🎯 ¿Qué Hace Este Sistema?

Automatiza el **flujo completo** de selección:

1. **Candidato se registra** → Datos guardados en Sheets
2. **Completa 3 evaluaciones** → En diferentes momentos
3. **Preguntas abiertas calificadas** → Automáticamente por OpenAI
4. **Admin pausa el proceso** → Revisa, aprueba/rechaza
5. **Notificaciones automáticas** → Vía Brevo + Resend
6. **Timeline completo** → Auditoría de cada acción

**Resultado**: Dashboard admin para ver candidatos, pruebas, pausas y enviar notificaciones. Estilo idéntico al sistema de onboarding.

---

## 📚 Documentación (LEE ESTO PRIMERO)

| Archivo | Propósito |
|---------|-----------|
| **[docs/CONTEXT.md](docs/CONTEXT.md)** | QUÉ se está construyendo (objetivo, fases, estructura) |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | CÓMO está estructurado (stack, módulos, flujo de datos) |
| **[docs/DECISIONS.md](docs/DECISIONS.md)** | POR QUÉ esas decisiones (OpenAI, Brevo/Resend, Sheets, etc) |
| **[docs/WORKFLOW.md](docs/WORKFLOW.md)** | CÓMO TRABAJAR CONMIGO (Claude + GitHub) |
| **[docs/SETUP.md](docs/SETUP.md)** | PASOS para crear Google Sheets (START HERE) |

---

## 🚀 Quick Start (Pasos Iniciales)

### Paso 1: Lee la documentación
1. Abre [docs/WORKFLOW.md](docs/WORKFLOW.md) — Entiende cómo trabajar con Claude-GitHub
2. Abre [docs/SETUP.md](docs/SETUP.md) — Crea el Spreadsheet

### Paso 2: Crea el Spreadsheet
Sigue exactamente las instrucciones en [docs/SETUP.md](docs/SETUP.md):
- Crea Spreadsheet DEV en Google Sheets
- Crea 8 hojas con la estructura especificada
- Copia el ID y actualiza `docs/DECISIONS.md`

### Paso 3: Espera el Código
Una vez Spreadsheet DEV esté listo, diré "listo para implementar Code.gs" y comenzaré a escribir:
- Módulo de candidatos
- Módulo de calificación con OpenAI
- Módulo de notificaciones
- Dashboard HTML

---

## 📁 Estructura del Proyecto

```
admisiones-catholizare/
├── README.md                    ← Estás aquí
├── docs/
│   ├── CONTEXT.md              ← QUÉ se construye
│   ├── ARCHITECTURE.md         ← CÓMO funciona
│   ├── DECISIONS.md            ← POR QUÉ decisiones
│   ├── WORKFLOW.md             ← CÓMO TRABAJAR CONMIGO
│   └── SETUP.md                ← CREAR SPREADSHEET (start)
├── apps-script-dev/            ← Código en desarrollo
│   ├── Code.gs                 ← Script principal (editable)
│   ├── .clasp.json            ← Config (NO editar)
│   └── appsscript.json        ← Manifest (NO editar)
├── apps-script-prod/           ← Código en producción
│   ├── Code.gs                 ← Script principal (copia de dev)
│   ├── .clasp.json            ← Config (NO editar)
│   └── appsscript.json        ← Manifest (NO editar)
└── .git/                        ← Control de versiones GitHub
```

---

## 🔀 Ramas Git

- **`main`**: Código estable (releases)
- **`dev`**: Trabajo diario
- **`claude/candidate-selection-tracker-rb6Ke`**: Rama actual de desarrollo (IA)

---

## 👤 Roles en el Sistema

| Rol | Permisos |
|-----|----------|
| **Candidato** | Ver formulario, responder evaluaciones |
| **Administrador** | Ver candidatos, pausar procesos, aprobar tests |
| **Super Administrador** | Crear admins, ver reportes globales, configurar URLs/keys |

---

## 🎨 Estilo UI

El dashboard admin tiene el **mismo estilo visual** que el sistema de onboarding:
- Paleta: Azul + gris + blanco
- Componentes: Cards, botones, tablas, modales
- Responsivo: Mobile-first (funciona en tablets y mobile)
- Tema: Profesional, limpio, intuitivo

---

## 🔗 Integraciones Externas

El sistema se integra con:

| Servicio | Uso | Config |
|----------|-----|--------|
| **OpenAI API** | Calificar respuestas abiertas | En hoja `Config` |
| **Brevo** (Sendinblue) | Envío de emails | En hoja `Config` |
| **Resend** | Email alternativo (fallback) | En hoja `Config` |
| **Google Sheets** | Base de datos | DEV + PROD |
| **Google Apps Script** | Backend/lógica | apps-script-dev/prod |

---

## 📋 Fases del Proceso

```
Registro
  ↓
Test 1 (evaluación abierta)
  ↓
[PAUSA] Admin revisa, aprueba/rechaza
  ↓
Test 2 (evaluación psicométrica)
  ↓
[PAUSA] Admin revisa, aprueba/rechaza
  ↓
Test 3 (evaluación final)
  ↓
[PAUSA] Admin revisa, aprueba/rechaza
  ↓
Notificación final (email resultado)
  ↓
Completado/Rechazado
```

---

## 🧪 Testing

Después de cada cambio:

### En DEV (sandbox seguro)
```
1. Cambia aparecen en apps-script-dev/Code.gs
2. Ejecuta pruebas en Spreadsheet DEV
3. Valida que Sheets actualiza correctamente
4. Mira logs en Apps Script editor
```

### Cuando todo funciona en DEV
```
1. Copia Code.gs a apps-script-prod/
2. Ejecuta mismas pruebas en PROD
3. Valida en Spreadsheet PROD
4. Confirma que no afecta datos existentes
```

---

## 📝 Convención de Commits

Cuando hagas push, usa este formato:

```bash
git commit -m "tipo: descripción breve

Descripción detallada (opcional)
Referencia a docs si aplica"
```

**Tipos válidos**:
- `feat: ` → Nueva funcionalidad
- `fix: ` → Corrección de bug
- `docs: ` → Cambios en documentación
- `refactor: ` → Reorganizar código
- `test: ` → Pruebas
- `chore: ` → Tareas mantenimiento

**Ejemplos**:
```bash
git commit -m "feat: agregar validación de emails"
git commit -m "docs: actualizar SETUP.md con instrucciones de Config"
git commit -m "fix: corregir timezones en Timeline"
```

---

## 🚨 Importante: Nunca Edites Estos Archivos Directamente

```
❌ NO EDITES:
- .clasp.json (salvo Script ID)
- appsscript.json
- .git/ (git commands solo)

✅ EDITA LIBREMENTE:
- Code.gs (apps-script-dev/prod)
- docs/*.md
```

---

## ❓ Preguntas Frecuentes

### ¿Cómo se usan DEV y PROD?
- **DEV** = Sandbox para probar cambios sin riesgo
- **PROD** = Versión en uso (datos reales)
- Siempre prueba primero en DEV

### ¿Qué pasa si cometo un error en git?
Avísame, git tiene historial y podemos deshacer. No es problema.

### ¿Cuál es el próximo paso?
1. Lee [docs/WORKFLOW.md](docs/WORKFLOW.md)
2. Sigue [docs/SETUP.md](docs/SETUP.md) para crear Spreadsheet
3. Avísame cuando Spreadsheet esté listo
4. Comenzaré a implementar Code.gs

### ¿Cómo contacto soporte?
Pregúntame directamente en el chat. Estoy aquí para ayudar.

---

## 📞 Contacto & Soporte

Si tienes preguntas:
1. Revisa primero [docs/WORKFLOW.md](docs/WORKFLOW.md)
2. Mira ejemplos en [docs/SETUP.md](docs/SETUP.md)
3. Pregúntame directamente

---

## 📈 Timeline (Tentativo)

| Fase | Estado | Notas |
|------|--------|-------|
| Documentación ✅ | Completado | CONTEXT, ARCHITECTURE, DECISIONS, WORKFLOW, SETUP |
| Spreadsheet Setup | **⏳ NEXT** | Crea Sheets DEV/PROD (tú) |
| Code.gs v1 | Pendiente | Backend + módulos (IA) |
| Dashboard HTML | Pendiente | UI admin (IA) |
| Testing | Pendiente | DEV → PROD (colaborativo) |
| Go Live | Pendiente | Merge a main (tú apruebas) |

---

**¡Comienza leyendo [docs/SETUP.md](docs/SETUP.md) para crear el Spreadsheet!** 🚀
