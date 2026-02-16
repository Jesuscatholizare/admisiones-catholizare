# 📋 PLAN DE IMPLEMENTACIÓN DEFINITIVO

**Versión**: 2.0 - Arquitectura Profesional
**Fecha**: 2026-02-15
**Status**: 🔴 ESPERANDO TU CONFIRMACIÓN

---

## 🎯 Respuestas Directas a tus Preguntas

### P1: ¿TODO en GAS o habrá HTML separados?

```
🚫 NO TODO EN GAS
✅ ARQUITECTURA SEPARADA:

GAS (Google Apps Script)
  └─ Solo funciones backend (lógica, APIs, integraciones)
  └─ Maneja Google Sheets
  └─ Retorna JSON

profesionales.catholizare.com (Web Server)
  ├─ /registro/ → HTML + JS (formulario E1)
  ├─ /terminos/ → HTML + JS (aceptación términos)
  ├─ /examen-e2/ → HTML + JS (exam E2)
  ├─ /examen-e3/ → HTML + JS (exam E3)
  ├─ /dashboard-admin/ → HTML + JS (panel admin)
  ├─ proxy2.php → Puente seguro entre web y GAS
  └─ assets/ → CSS, JS, imágenes
```

### P2: ¿YO actualizo GAS o copias/pegas?

```
OPCIÓN A: YO ACTUALIZO (Recomendado)
─────────────────────────────────────
1. Yo crearé un archivo "CODE_GAS_UPDATES.txt"
2. Mostraré EXACTAMENTE qué código agregar
3. A qué línea
4. Dónde va
5. TÚ copias/pegas en GAS DEV

OPCIÓN B: YO DIRECTAMENTE EN GAS
───────────────────────────────
1. TÚ me das acceso a Google Sheets DEV
2. YO hago los cambios directamente
3. (PERO necesitas el link compartible)

RECOMENDACIÓN: Opción A es más seguro, usaremos esa.
```

### P3: ¿De dónde saco código del formulario?

```
📍 LO VOY A CREAR AHORA MISMO para ti:

1. /registro/index.html → Yo lo creo ✅
2. /terminos/index.html → Yo lo creo ✅
3. /examen-e2/index.html → Yo lo creo ✅
4. /examen-e3/index.html → Yo lo creo ✅
5. /dashboard-admin/index.html → Yo lo creo ✅
6. proxy2.php → Yo lo creo ✅
7. assets/js/api.js → Yo lo creo ✅

Solo COPIAS los archivos a tu servidor.
```

### P4: ¿Dónde se registra aceptación de términos?

```
EN 3 LUGARES SIMULTÁNEAMENTE:

1. GOOGLE SHEETS (Candidatos sheet)
   ────────────────────────────────
   Nueva columna L: "fecha_aceptacion_terminos"
   Nueva columna M: "ip_aceptacion_terminos"

   Valor ejemplo:
   L: "2026-02-15T14:30:45Z"
   M: "192.168.1.100"

2. GOOGLE SHEETS (Timeline sheet)
   ────────────────────────────────
   Nuevo row:
   - candidato_id: "cand_123"
   - evento: "TERMINOS_ACEPTADOS"
   - fecha: "2026-02-15T14:30:45Z"
   - detalles: JSON con IP, navegador, etc.

3. EMAIL AL ADMIN
   ──────────────
   Asunto: "✅ Candidato {nombre} aceptó términos"
   Body: Hora exacta, IP, email
```

---

## 🏗️ Arquitectura Visual Propuesta

```
┌──────────────────────────────────────────────────────────────────────┐
│                  PROFESIONALES.CATHOLIZARE.COM                        │
│                  (Tu servidor web + PHP + HTML)                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  /registro/                 /terminos/              /dashboard-admin/ │
│  ┌─────────────────┐       ┌─────────────────┐    ┌──────────────┐  │
│  │ Formulario E1   │       │ Términos        │    │ Admin Panel  │  │
│  │ 1. Nombre       │       │ 1. Muestra T&C  │    │ 1. Tabla     │  │
│  │ 2. Email        │       │ 2. Botón Acepto │    │ 2. Botones   │  │
│  │ 3. Teléfono     │       │ 3. Botón Rechaz │    │ 3. Modal     │  │
│  │ 4. Categoría    │       │ 4. Con token    │    │ 4. Acciones  │  │
│  │ 5. Camino acad  │       └─────────────────┘    └──────────────┘  │
│  │ 6. Camino espi  │                                                  │
│  │ 7. Botón Enviar │       /examen-e2/           /examen-e3/        │
│  └─────────────────┘       ┌─────────────────┐    ┌──────────────┐  │
│                            │ Examen E2       │    │ Examen E3    │  │
│  assets/js/api.js          │ 1. Preguntas    │    │ 1. Preguntas │  │
│  ├─ callGAS()              │ 2. Timer        │    │ 2. Timer     │  │
│  ├─ handleErrors()         │ 3. Enviar       │    │ 3. Enviar    │  │
│  └─ validateToken()        └─────────────────┘    └──────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  proxy2.php                                                   │    │
│  │  ┌────────────────────────────────────────────────────────┐  │    │
│  │  │ • Valida token (¿formato correcto?)                   │  │    │
│  │  │ • Valida acción (¿existe en GAS?)                     │  │    │
│  │  │ • Rate limit (max 10 requests/min/IP)                 │  │    │
│  │  │ • Log request (todo lo que pasa)                      │  │    │
│  │  │ • Relay a GAS (/usercopy endpoint)                   │  │    │
│  │  │ • Log response                                        │  │    │
│  │  │ • Retorna resultado al HTML                           │  │    │
│  │  └────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│                   ↓ POST JSON via proxy2.php ↓                       │
│                                                                        │
└────────────────────────┬─────────────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │ {action: "acceptTerms", candidateId: "..."}
                         │
        ┌────────────────▼────────────────┐
        │   GOOGLE APPS SCRIPT (GAS)      │
        │   Code.gs (Backend)             │
        │                                 │
        │   doPost(e) {                   │
        │     action = e.data.action      │
        │     if (action === ...)         │
        │       return acceptTerms()      │
        │   }                             │
        │                                 │
        │   acceptTerms() {               │
        │     • Valida candidato          │
        │     • Genera Token E2           │
        │     • Guarda aceptación         │
        │     • Envía emails              │
        │     • Timeline event            │
        │   }                             │
        │                                 │
        │   GOOGLE SHEETS                 │
        │   ├─ Candidatos (DB)            │
        │   ├─ Tokens (DB)                │
        │   ├─ Timeline (Audit)           │
        │   ├─ Config (Settings)          │
        │   ├─ Preguntas (QBank)          │
        │   └─ Respuestas (Answers)       │
        │                                 │
        │   INTEGRACIONES:                │
        │   ├─ OpenAI (Grading)           │
        │   ├─ Brevo (Contacts)           │
        │   └─ Resend (Email)             │
        │                                 │
        └─────────────────────────────────┘
```

---

## 🔄 Flujo Paso a Paso: Aceptación de Términos

### PASO 1: Candidato registrado

```
Candidato existe en Sheets:
├─ candidato_id: cand_123
├─ nombre: Juan García
├─ email: juan@email.com
├─ status: "registered"
└─ fecha_registro: 2026-02-14
```

### PASO 2: Admin aprueba E1

```
Admin abre dashboard:
  1. Ve "Juan García" en estado "pending_review_E1"
  2. Click "⚙️ Acciones"
  3. Tab "✅ Aprobar Examen"
  4. Selecciona "E1"
  5. Click "Aprobar Examen"

GAS ejecuta:
  ├─ Status → "awaiting_terms_acceptance"
  ├─ Genera Token T1 para términos
  ├─ Guarda en sheet Tokens:
  │  ├─ token: "T1_xyzabc..."
  │  ├─ candidato_id: "cand_123"
  │  ├─ tipo: "TERMS"
  │  ├─ valid_from: "2026-02-15T10:00:00Z"
  │  ├─ valid_until: "2026-02-22T10:00:00Z" (7 días)
  │  └─ usado: false
  ├─ Envía email al candidato:
  │  "Acepte los términos:"
  │  "https://profesionales.catholizare.com/terminos/?uid=cand_123&token=T1_xyzabc"
  └─ Registra Timeline: "E1_APROBADO_ADMIN"
```

### PASO 3: Candidato recibe email

```
Email content:

Asunto: ✅ Aceptación de Términos — RCCC

Body:
Hola Juan,

Tu examen E1 fue aprobado exitosamente.

Antes de continuar, necesitas aceptar nuestros términos y condiciones:

👉 [ACEPTAR TÉRMINOS]
https://profesionales.catholizare.com/terminos/?uid=cand_123&token=T1_xyzabc

Este link expira en 7 días.

¡Continúa tu proceso de selección!

---
RCCC
```

### PASO 4: Candidato abre link de términos

```
Candidato hace click en link

Browser va a:
  GET /terminos/?uid=cand_123&token=T1_xyzabc

Servidor sirve: /terminos/index.html

JavaScript ejecuta:
  1. Extrae parámetros de URL
  2. Valida token via proxy2.php:
     POST /proxy2.php
     {
       action: "validateToken",
       token: "T1_xyzabc"
     }

  3. Si token válido:
     - Muestra términos y condiciones HTML
     - Muestra botones:
       □ Acepto los términos (verde)
       □ No acepto (gris)

  4. Si token inválido:
     - Muestra: "Link expirado o inválido"
```

### PASO 5: Candidato acepta términos

```
Usuario hace click: "Acepto los términos"

JavaScript ejecuta:
  fetch('/proxy2.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'acceptTerms',
      candidateId: 'cand_123',
      token: 'T1_xyzabc'
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert('✅ Términos aceptados!');
      // Guarda en localStorage
      localStorage.setItem('terms_accepted', true);
      // Redirige
      window.location = '/examen-e2/';
    } else {
      alert('❌ Error: ' + data.error);
    }
  })

proxy2.php recibe:
  1. Valida token format
  2. Valida que candidateId sea válido
  3. Hace rate limit check (IP)
  4. Log request: "acceptTerms - cand_123 - IP"
  5. POST a GAS /usercopy:
     {
       action: 'acceptTerms',
       candidateId: 'cand_123',
       clientIp: '192.168.1.100'
     }
  6. Recibe respuesta de GAS
  7. Log response
  8. Retorna JSON al navegador

GAS (acceptTerms function) ejecuta:
  1. Busca candidato cand_123 en Candidatos sheet
  2. Valida status === 'awaiting_terms_acceptance'
  3. Valida que Token T1 sea válido
  4. Marca Token T1 como usado: true
  5. Genera nuevo Token E2 para examen:
     └─ E2_xyzdef..., válido por 7 días
  6. Guarda en Candidatos sheet:
     └─ L: fecha_aceptacion_terminos = "2026-02-15T14:30:45Z"
     └─ M: ip_aceptacion_terminos = "192.168.1.100"
     └─ Status = "pending_review_E2"
  7. Guarda Token E2 en sheet Tokens
  8. Registra en Timeline:
     └─ evento: "TERMINOS_ACEPTADOS"
     └─ fecha: "2026-02-15T14:30:45Z"
     └─ detalles: { ip: "192.168.1.100", navegador: "Chrome", ... }
  9. Envía email a admin:
     Asunto: "✅ Juan García aceptó términos"
     Body: "Hora: 2026-02-15 14:30:45 GMT-5, IP: 192.168.1.100"
  10. Envía email a candidato:
      Asunto: "📝 Examen E2 — RCCC"
      Body: "Tu examen E2 está listo:"
            "https://profesionales.catholizare.com/examen-e2/?uid=cand_123&token=E2_xyzdef"

Retorna al proxy2.php:
  {
    success: true,
    message: "Terms accepted",
    tokenE2: "E2_xyzdef..."
  }

proxy2.php retorna al navegador:
  {
    success: true,
    message: "Términos aceptados exitosamente"
  }
```

### PASO 6: Candidato ve confirmación

```
En terminos/index.html:

✅ TÉRMINOS ACEPTADOS
Ahora puedes acceder a tu examen E2.

[Ir a Examen E2] → Redirige a /examen-e2/
```

### PASO 7: Admin notificado

```
Email llega a admin@rccc.org:

Asunto: ✅ Juan García aceptó términos

Body:
Candidato: Juan García (cand_123)
Email: juan@email.com
Hora aceptación: 2026-02-15 14:30:45 GMT-5
IP: 192.168.1.100
Navegador: Chrome 98.0
---

El candidato aceptó los términos y está listo para E2.
```

---

## 📁 Archivos que VOY A CREAR

```
PARA TI (copias a tu servidor):

1. /registro/index.html (400 líneas)
   └─ Formulario: nombre, email, teléfono,
      camino académico, camino espiritual

2. /terminos/index.html (350 líneas)
   └─ Términos + botones Acepto/No acepto
   └─ Validación de token

3. /examen-e2/index.html (450 líneas)
   └─ Preguntas E2 + timer + submit

4. /examen-e3/index.html (450 líneas)
   └─ Preguntas E3 + timer + submit

5. /dashboard-admin/index.html (650 líneas)
   └─ Ya creado, mantenemos igual

6. proxy2.php (400 líneas)
   └─ Validación + rate limit + relay a GAS

7. assets/js/api.js (200 líneas)
   └─ Helper para llamar proxy2.php

8. assets/css/styles.css (300 líneas)
   └─ Estilos base para todos los HTMLs

PARA GAS (copias/pegas en Code.gs):

9. Función acceptTerms() (50 líneas)
   └─ Lógica de aceptación

10. Función sendEmailTermsAcceptedToAdmin() (30 líneas)
    └─ Notificación a admin

11. Función validateToken() (30 líneas)
    └─ Valida token es válido

12. Actualizar doPost() (10 líneas)
    └─ Manejar new action

TOTAL: ~3,300 líneas nuevas

TODO ESTARÁ EN GITHUB Y LO COPIAS.
```

---

## ✅ Plan de Implementación

### PASO 1: Confirmación (AHORA)
```
TÚ: ✅ Confirmás que entiendes la arquitectura
YO: ✅ Inicio creación de todos los archivos
```

### PASO 2: Creación de Archivos (Próximas 2 horas)
```
YO crearé y comitearé:
├─ Todos los HTMLs (7 archivos)
├─ proxy2.php actualizado
├─ assets (CSS + JS)
├─ CODE_GAS_UPDATES.txt con código exacto
└─ README con instrucciones paso a paso
```

### PASO 3: Descarga e Instalación (1 hora)
```
TÚ:
├─ Descargas archivos desde GitHub
├─ Subes HTMLs a profesionales.catholizare.com
├─ Subes proxy2.php a profesionales.catholizare.com
├─ Copias/pegas código en Code.gs DEV
├─ Actualiza Config sheet con URLs
└─ Testea flujo completo
```

### PASO 4: Testing (2-3 horas)
```
Flujo completo:
1. Candidato se registra
2. Admin aprueba E1
3. Candidato recibe link de términos
4. Candidato acepta términos
5. Verificar sheet fue actualizado
6. Verificar email al admin fue enviado
7. Verificar email a candidato con E2 fue enviado
8. Verificar Token E2 es válido
```

---

## 📝 Checklist

- [ ] Entiendo que GAS = backend, HTML = frontend separado
- [ ] Entiendo que HTMLs van en profesionales.catholizare.com
- [ ] Entiendo el flujo completo de términos
- [ ] Entiendo que terms se guardan en 3 lugares (sheet, timeline, email)
- [ ] Entiendo que TÚ copias los archivos, YO los creo
- [ ] Listo para que cree todos los archivos

---

## 🎯 Confirmación Necesaria

Por favor responde:

```
1. ¿Está claro dónde va cada cosa?
   □ Sí, entendido
   □ Tengo dudas

2. ¿Está bien la arquitectura propuesta?
   □ Sí, adelante
   □ Quiero cambios (cuáles?)

3. ¿Tienes acceso a profesionales.catholizare.com?
   □ Sí, tengo acceso FTP/SFTP
   □ Sí, tengo acceso cPanel/Plesk
   □ Necesito ayuda para saber cómo acceder

4. ¿Tengo acceso a Google Sheets DEV?
   □ Sí
   □ No, pero puedo solicitar acceso

5. ¿Empiezo a crear todos los archivos?
   □ SÍ, ADELANTE 🚀
   □ Espera, tengo preguntas primero
```

---

**Esperando tu confirmación para proceder** 🙏

