# Admisiones Catholizare — Sistema de Selección RCCC

Sistema de selección y evaluación de profesionales para Catholizare.com.  
Versión del backend: **GAS v3.0 RCCC**.

---

## Mapa del repositorio

```
admisiones-catholizare/
├── apps-script-dev/         ← TODO EL TRABAJO VA AQUÍ
│   └── Code.gs              ← Backend principal (2300+ líneas, GAS v3.0)
├── apps-script-prod/        ← NO TOCAR — snapshot histórico desactualizado
├── servidor/                ← HTML + PHP que se hospedan en el servidor web
│   ├── proxy.php            ← Proxy PHP: puente entre HTMLs y GAS
│   ├── acceso.html          ← Página de acceso a examen con token
│   ├── admin-dashboard.html ← Dashboard admin completo
│   ├── admin-login.html     ← Login del panel admin
│   ├── exam-webapp.html     ← Webapp del examen (legacy/alternativa)
│   ├── examen/index.html    ← Página de examen (URL amigable)
│   ├── registro-candidato.html ← Formulario de registro (alternativa al de Elementor)
│   └── terminos-y-condiciones.html ← Aceptación de T&C antes del E2
└── docs/
    ├── ARCHITECTURE.md      ← Stack técnico completo
    ├── WORKFLOW.md          ← Flujo de admisión paso a paso
    ├── DECISIONS.md         ← Decisiones de diseño con razonamiento
    └── CONTEXT.md           ← Contexto para IA / nuevos desarrolladores
```

---

## Despliegue (100% manual)

**No existe CI/CD.** Cada cambio se despliega así:

### 1 · Google Apps Script
1. Abrir el proyecto GAS en [script.google.com](https://script.google.com)
2. Copiar y pegar el contenido de `apps-script-dev/Code.gs` en el editor
3. Guardar (`Ctrl+S`) → **Nueva versión** → **Desplegar** como Web App
4. Usar la misma URL de deployment (no crear una nueva)

### 2 · Servidor web
1. Conectarse al servidor vía SSH/FTP en `profesionales.catholizare.com`
2. Subir los archivos modificados de `servidor/` a la ruta:  
   `/catholizare_sistem/`
3. El `proxy.php` debe tener el `GAS_DEPLOYMENT_ID` correcto (ver `proxy.php` línea 18)

### Configuración de APIs (Script Properties en GAS)
Abrir el proyecto GAS → **Proyecto > Propiedades del script** y configurar:

| Clave                | Descripción                              |
|----------------------|------------------------------------------|
| `OPENAI_API_KEY`     | API key de OpenAI (gpt-4o-mini)          |
| `BREVO_API_KEY`      | API key de Brevo (solo listas)           |
| `RESEND_API_KEY`     | API key de Resend (envío de correos)     |
| `ADMIN_PIN`          | PIN numérico para acciones admin         |
| `ADMIN_TOKEN`        | Token de sesión admin                    |
| `HANDOFF_SPREADSHEET_ID` | ID de la hoja de candidatos aprobados |

O bien, configurarlos en la hoja **Config** del Spreadsheet (columnas A, B, C).

---

## Flujo resumido del candidato

```
Registro (WordPress Elementor form)
  → E1 (examen, 1 intento, 120 min)
  → Admin revisa y aprueba E1
  → Candidato acepta Términos y Condiciones
  → E2 (examen, 1 intento, 120 min)
  → Admin revisa y aprueba E2
  → E3 (examen final, 1 intento, 120 min)
  → Admin revisa y aprueba E3
  → Entrevista personal
  → Asignación de categoría (Junior/Senior/Expert)
  → Handoff a planilla de onboarding
```

---

## Tecnologías principales

| Componente          | Tecnología                        |
|---------------------|-----------------------------------|
| Backend             | Google Apps Script (GAS)          |
| Base de datos       | Google Sheets (hojas nombradas)   |
| Hosting frontend    | Apache en `profesionales.catholizare.com` |
| Formulario registro | WordPress + Elementor             |
| Email transaccional | Resend (primario) → MailApp (fallback) |
| Listas de contacto  | Brevo                             |
| Calificación IA     | OpenAI gpt-4o-mini                |
| Proxy               | PHP (`proxy.php`)                 |

---

## URLs del sistema en producción

| Página                       | URL                                                               |
|------------------------------|-------------------------------------------------------------------|
| Formulario de registro       | WordPress/Elementor (página del sitio catholizare.com)           |
| Acceso a examen              | `https://profesionales.catholizare.com/catholizare_sistem/examen/?token=XXX&exam=E1` |
| Términos y condiciones       | `https://profesionales.catholizare.com/catholizare_sistem/terminos-y-condiciones.html` |
| Panel admin                  | `https://profesionales.catholizare.com/catholizare_sistem/admin-dashboard.html` |
| Proxy (no acceso directo)    | `https://profesionales.catholizare.com/catholizare_sistem/proxy.php` |

---

## Reglas de desarrollo

- **Solo modificar `apps-script-dev/Code.gs`** — `apps-script-prod/` es un snapshot histórico que NO se toca.
- El formulario de registro en WordPress/Elementor NO está en este repo — es un widget.
- Los tokens de examen son de **un solo uso** — no tienen fecha de expiración.
- La duración de cada examen es de **120 minutos** enforceados en `handleExamSubmit`.

---

Ver `docs/ARCHITECTURE.md` para detalles técnicos completos.
