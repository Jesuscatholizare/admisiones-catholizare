# SETUP — Guía de Configuración Inicial

## 🎯 Objetivo
Crear la estructura de Google Sheets (DEV y PROD) necesaria para el sistema de selección de candidatos.

---

## 📋 Paso 1: Crear el Spreadsheet DEV

### 1.1 En Google Sheets
1. Ve a [sheets.google.com](https://sheets.google.com)
2. Haz clic en **+ Crear nuevo** → **Hoja de cálculo**
3. Nombra el archivo: `Candidatos-Selección-DEV`
4. Copiar la URL del Spreadsheet (necesitarás el ID)
   - URL se parece a: `https://docs.google.com/spreadsheets/d/**1A2B3C4D5E6F7...**/edit`
   - El ID es lo que está entre `/d/` y `/edit`

### 1.2 Guarda el ID en DECISIONS.md
```markdown
# En docs/DECISIONS.md, busca la sección "D2: Separación DEV/PROD en Sheets"
# Y actualiza:
- **DEV**: `1A2B3C4D5E6F7...` (reemplaza con tu ID)
```

---

## 🗂️ Paso 2: Crear las Hojas (Tabs)

En tu Spreadsheet DEV, crea estas hojas **exactamente** en este orden:

### 2.1 Hoja 1: `Candidatos`
**Propósito**: Registro base de candidatos

**Columnas** (primera fila = encabezados):
```
A           B       C           D           E       F                G
ID          Nombre  Email       Teléfono    Estado  Fecha_Registro   Notas
```

**Campos**:
- **A (ID)**: Formato `CANDIDATO_YYYYMMDD_0001`
- **B (Nombre)**: Nombre completo
- **C (Email)**: Correo electrónico válido
- **D (Teléfono)**: Número de contacto
- **E (Estado)**: Valores válidos: `Registrado`, `En Test 1`, `Pausado T1`, `En Test 2`, `Pausado T2`, `En Test 3`, `Pausado T3`, `Completado`, `Rechazado`
- **F (Fecha_Registro)**: Timestamp de registro
- **G (Notas)**: Observaciones opcionales

**Ejemplo de fila de datos**:
```
CANDIDATO_20260214_0001 | Juan García | juan@example.com | +57 310 555 1234 | Registrado | 2026-02-14 10:30 |
```

---

### 2.2 Hoja 2: `Test_1`
**Propósito**: Respuestas y calificaciones de la evaluación 1

**Columnas**:
```
A                B                   C               D               E               F
Candidato_ID    Pregunta_Abierta    Respuesta       Calificacion_IA Aprobado_Admin  Timestamp
```

**Campos**:
- **A (Candidato_ID)**: Referencia a ID en hoja `Candidatos`
- **B (Pregunta_Abierta)**: Texto de la pregunta
- **C (Respuesta)**: Texto de respuesta del candidato
- **D (Calificacion_IA)**: Puntuación 0-100 (calculada por OpenAI)
- **E (Aprobado_Admin)**: SÍ / NO / PENDIENTE
- **F (Timestamp)**: Cuándo se completó

---

### 2.3 Hoja 3: `Test_2`
**Propósito**: Evaluación 2 (misma estructura que Test_1)

**Columnas**:
```
A                B                   C               D               E               F
Candidato_ID    Pregunta_Abierta    Respuesta       Calificacion_IA Aprobado_Admin  Timestamp
```

---

### 2.4 Hoja 4: `Test_3`
**Propósito**: Evaluación 3 (misma estructura que Test_1 y Test_2)

**Columnas**:
```
A                B                   C               D               E               F
Candidato_ID    Pregunta_Abierta    Respuesta       Calificacion_IA Aprobado_Admin  Timestamp
```

---

### 2.5 Hoja 5: `Pausas`
**Propósito**: Registro de pausas en el proceso

**Columnas**:
```
A                B               C                   D               E                   F
Candidato_ID    Test_Numero     Razon_Pausa         Fecha_Pausa    Aprobado_Admin     Fecha_Aprobacion
```

**Ejemplo**:
```
CANDIDATO_20260214_0001 | 1 | Falta información personal | 2026-02-14 11:00 | SÍ | 2026-02-14 12:00
```

---

### 2.6 Hoja 6: `Timeline`
**Propósito**: Auditoría completa de eventos

**Columnas**:
```
A                B           C                           D
Candidato_ID    Timestamp   Evento                      Detalles
```

**Eventos típicos** (valores en columna C):
- `CANDIDATO_REGISTRADO`
- `TEST_1_INICIADO`
- `TEST_1_COMPLETADO`
- `TEST_1_CALIFICADO_IA`
- `TEST_1_APROBADO_ADMIN`
- `PAUSA_SOLICITADA`
- `PAUSA_APROBADA`
- `NOTIFICACION_ENVIADA`

**Ejemplo**:
```
CANDIDATO_20260214_0001 | 2026-02-14 10:30 | CANDIDATO_REGISTRADO | Usuario completó el formulario
```

---

### 2.7 Hoja 7: `Notificaciones`
**Propósito**: Registro de emails enviados

**Columnas**:
```
A                B               C                   D           E               F
Candidato_ID    Email           Tipo_Mensaje        Timestamp   Proveedor       Status
```

**Tipo_Mensaje** (valores):
- `REGISTRO_CONFIRMADO`
- `TEST_DISPONIBLE`
- `PAUSA_NOTIFICACION`
- `RESULTADO_FINAL`
- `RECHAZO`

**Proveedor**:
- `BREVO`
- `RESEND`
- `FALLBACK`

**Status**:
- `ENVIADO`
- `ENTREGADO`
- `BOUNCE`
- `ERROR`

---

### 2.8 Hoja 8: `Config`
**Propósito**: Configuración y credenciales

**Formato**: 2 columnas (Clave-Valor)

```
A                           B
Clave                       Valor
---
OPENAI_API_KEY              sk-...
BREVO_API_KEY               xkeysib-...
RESEND_API_KEY              re_...
SPREADSHEET_ID_DEV          1A2B3C...
SPREADSHEET_ID_PROD         5X6Y7Z...
ADMIN_EMAILS                admin1@example.com,admin2@example.com
TIMEZONE                    America/Bogota
```

⚠️ **IMPORTANTE**: Esta hoja debe tener **permisos limitados** (solo admin puede ver)

---

## 📱 Paso 3: Compartir el Spreadsheet

### 3.1 Configurar permisos DEV
1. En el Spreadsheet DEV, haz clic en **Compartir** (esquina superior derecha)
2. Agrega los emails de desarrollo
3. Asigna rol: **Editor**

### 3.2 Nota sobre PROD
No compartas PROD hasta que todo esté probado en DEV

---

## 🔗 Paso 4: Conectar Google Apps Script al Spreadsheet

### 4.1 Abre el Apps Script Editor
1. En tu Spreadsheet DEV, ve a **Extensiones** → **Apps Script**
2. Se abre una nueva pestaña con el editor

### 4.2 Copiar `.clasp.json`
1. Copia el **Script ID** desde la configuración del proyecto
2. Actualiza `apps-script-dev/.clasp.json`:
```json
{
  "scriptId": "[SCRIPT_ID_AQUI]",
  "rootDir": "apps-script-dev"
}
```

---

## 🧪 Paso 5: Testing Inicial

### 5.1 Verifica las hojas
- [ ] Todas las 8 hojas existen
- [ ] Los encabezados están exactamente como se especificó
- [ ] No hay hojas adicionales por accidente

### 5.2 Verifica permisos
- [ ] Puedes editar las hojas
- [ ] Los colaboradores ven los mismos datos

### 5.3 Anota los IDs
En `docs/DECISIONS.md`, actualiza:
```markdown
- **DEV**: `[ID_DEV_AQUI]`
```

---

## ✅ Checklist Final

Cuando hayas completado esto, marca como listo:

- [ ] Spreadsheet DEV creado con nombre: `Candidatos-Selección-DEV`
- [ ] 8 hojas creadas con nombres exactos
- [ ] Encabezados y estructura correcta
- [ ] ID del Spreadsheet actualizado en `DECISIONS.md`
- [ ] `.clasp.json` actualizado con Script ID
- [ ] Puedes editar las hojas sin problemas
- [ ] Has compartido DEV con el equipo

---

## 📝 Próximo Paso

Una vez hayas completado esto, avísame y procederé a:
1. Implementar el **Code.gs** (backend con funciones)
2. Crear el **Dashboard HTML** (interfaz admin)
3. Integrar con **OpenAI** y **Brevo/Resend**

---

## ❓ Dudas

Si algo no está claro:
- Revisa CONTEXT.md para ver la estructura general
- Revisa ARCHITECTURE.md para entender cómo se conectan los datos
- Si te atascas, pregúntame directamente
