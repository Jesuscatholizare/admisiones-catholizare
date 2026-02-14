# Workflow — Cómo Trabajar Conmigo (Claude + GitHub)

## 🎯 Objetivo
Permitir que la IA programe cambios con contexto estable, mínimo intercambio y máxima claridad.

---

## ⚡ Regla de Oro
1. **Rama de trabajo**: `claude/candidate-selection-tracker-rb6Ke` (ya creada)
2. **Todos los cambios van aquí** (no a `dev` ni a `main`)
3. **Al final**: `git push -u origin claude/candidate-selection-tracker-rb6Ke`
4. **main solo recibe merges** cuando ya pasó pruebas en dev/main

---

## 📋 QUÉ ME MANDAS EN CADA PEDIDO

Cuando solicites cambios, proporciona SIEMPRE:

### 1️⃣ Objetivo (1 línea)
```
Ej: "Agregar validación de email en el formulario de registro"
```

### 2️⃣ Alcance (qué puedo tocar)
```
PUEDO EDITAR:
- apps-script-dev/Code.gs
- apps-script-prod/Code.gs
- docs/*.md

NO DEBO TOCAR:
- .git/ (excepto git commands)
- .clasp.json (configuración de deployment)
```

### 3️⃣ Estado Actual (copia y pega esto)
```bash
git status
git log --oneline -10
git branch --show-current
```

### 4️⃣ Contexto (contenido de archivos a editar)
```
Si quieres cambiar apps-script-dev/Code.gs, pégame el fragmento relevante
(no necesito el archivo completo si es muy largo)
```

### 5️⃣ Criterio de Aceptación
```
Se considera listo cuando:
- El código compila sin errores
- Se pasaron pruebas en DEV
- Los comentarios están claros
```

---

## 🔄 CÓMO TE RESPONDO YO

Cuando completo una tarea, doy:

1. **Archivos modificados** (lista clara)
2. **Código final** (por archivo, listo para copiar)
3. **Comandos Git exactos** que tú ejecutarás:
   ```bash
   git add apps-script-dev/Code.gs docs/CONTEXT.md
   git commit -m "feat: agregar validación de email"
   git push -u origin claude/candidate-selection-tracker-rb6Ke
   ```
4. **Checklist de prueba** (qué validar en DEV/PROD)

---

## 📁 Estructura del Repositorio (IMPORTANTE)

```
admisiones-catholizare/
├── apps-script-dev/        ← DESARROLLO (cambios aquí primero)
│   ├── Code.gs             ← Script principal (modificable)
│   ├── .clasp.json         ← NO MODIFICAR
│   └── appsscript.json
├── apps-script-prod/       ← PRODUCCIÓN (igual a dev cuando está listo)
│   ├── Code.gs
│   ├── .clasp.json         ← NO MODIFICAR
│   └── appsscript.json
├── docs/                   ← DOCUMENTACIÓN (SIEMPRE ACTUALIZAR)
│   ├── CONTEXT.md          ← Qué se está construyendo
│   ├── ARCHITECTURE.md     ← Cómo está estructurado
│   ├── DECISIONS.md        ← Por qué esas decisiones
│   └── WORKFLOW.md         ← Este archivo
└── .git/                   ← Control de versiones
```

---

## 📝 Convención de Commits

Usa este formato para mensajes de commit:

```bash
git commit -m "tipo: descripción corta

descripción detallada si es necesaria
referencia a CONTEXT.md / DECISIONS.md si aplica"
```

### Tipos válidos:
- `feat: ` → Nueva funcionalidad
- `fix: ` → Corrección de bug
- `docs: ` → Cambios en documentación
- `refactor: ` → Reorganizar código sin cambiar comportamiento
- `test: ` → Agregar/actualizar tests
- `chore: ` → Tareas mantenimiento (actualizar dependencias, etc)

### Ejemplos:
```bash
git commit -m "feat: agregar módulo de calificación con OpenAI"
git commit -m "fix: validar email antes de enviar notificación"
git commit -m "docs: actualizar ARCHITECTURE.md con nueva estructura de Sheets"
```

---

## 🧪 Testing Checklist

Después de cada cambio, valida:

### En DEV (apps-script-dev)
- [ ] Code.gs compila sin errores
- [ ] Funciones nuevas se ejecutan sin errores
- [ ] Datos en Spreadsheet DEV cambian correctamente
- [ ] Logs muestran lo esperado (usar `console.log()`)

### Antes de PROD
- [ ] Copiar cambios a apps-script-prod/Code.gs
- [ ] Ejecutar mismas pruebas en PROD
- [ ] Validar que no afecta datos existentes

### Documentación
- [ ] CONTEXT.md actualizado (si hay cambio conceptual)
- [ ] ARCHITECTURE.md actualizado (si hay cambio técnico)
- [ ] DECISIONS.md actualizado (si hay nueva decisión)
- [ ] Comentarios en código claros

---

## 🚀 Flujo Típico de Trabajo

### Paso 1: Solicitud
```
[TÚ] Mándame objetivo, alcance, contexto, criterio
```

### Paso 2: Implementación
```
[YO] Actualizo Code.gs, docs, etc.
     Hago commit en rama actual
     Doy instrucciones exactas de git
```

### Paso 3: Validación (TÚ)
```
[TÚ] Copias comandos de git exactamente
     Ejecutas en tu terminal
     Validas cambios en DEV
     Copias a PROD si todo funciona
```

### Paso 4: Integración Final
```
[YO] Cuando esté listo para merge a main:
     - Hago pull request (si aplica)
     - O instrucciones de merge manual
```

---

## 🔑 Variables Importantes

Estas se actualizarán conforme avancemos:

| Variable | Valor | Actualizado |
|----------|-------|-------------|
| DEV Spreadsheet ID | `[COMPLETAR]` | No |
| PROD Spreadsheet ID | `[COMPLETAR]` | No |
| OpenAI API Key | En hoja `Config` | No |
| Brevo API Key | En hoja `Config` | No |
| Resend API Key | En hoja `Config` | No |

---

## ❓ Preguntas Frecuentes

### ¿Por qué separar apps-script-dev y apps-script-prod?
Para que puedas probar cambios sin afectar la aplicación en uso. DEV es tu sandbox.

### ¿Qué pasa si cometo un error en git?
Avísame y lo arreglamos. Git tiene historial, así que podemos deshacer.

### ¿Cómo copio cambios de DEV a PROD?
Simplemente copias el contenido de `apps-script-dev/Code.gs` a `apps-script-prod/Code.gs` cuando esté listo.

### ¿Y si hay conflictos?
Si editas el mismo archivo en ambos lados, git te lo dirá. Avísame y resolvemos juntos.

---

## 📞 Soporte

Si algo no está claro:
- Revisa este archivo (WORKFLOW.md)
- Mira ejemplos en commits anteriores (`git log`)
- Pregúntame directamente
