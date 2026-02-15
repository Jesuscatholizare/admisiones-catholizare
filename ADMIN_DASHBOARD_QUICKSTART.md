# 🚀 Admin Dashboard — Quick Start Guide

**Tiempo estimado**: 10 minutos
**Dificultad**: Fácil
**Requisito**: Acceso a Google Sheets y Google Apps Script

---

## ⚡ Opción Rápida (Recomendado): Integrar en Google Sheets Actual

### Paso 1: Abrir Google Apps Script

```
1. Ve a tu Google Sheets DEV (ID: 18jo3Na2fVaCop6S3AA4Cws_QWPJ3q-rFMkEH5QhUGb8)
2. Haz click en: Extensions → Apps Script
3. Deberías ver el Code.gs existente con todas las funciones
```

### Paso 2: Agregar el archivo HTML

```
1. En el editor de Apps Script, click en el "+" junto a "Files"
2. Selecciona "HTML file"
3. Dale el nombre: AdminDashboard
4. Elimina el contenido por defecto
5. Abre /admin-dashboard.html de tu repositorio
6. Copia TODO el contenido
7. Pégalo en el archivo HTML del Apps Script
8. Press Ctrl+S para guardar
```

### Paso 3: Verificar Función en Code.gs

```
1. Vuelve a la pestaña Code.gs
2. Busca la función: getCandidatesForAdmin()
3. Si no existe, cópiala desde la línea 387 en adelante:

function getCandidatesForAdmin() {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) {
      return { success: false, error: 'Sheet Candidatos not found', candidates: [] };
    }

    const data = sheet.getDataRange().getValues();
    const candidates = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        candidates.push({
          candidato_id: data[i][0],
          nombre: data[i][1],
          email: data[i][2],
          telefono: data[i][3],
          fecha_registro: data[i][4],
          scheduled_date: data[i][5],
          status: data[i][6],
          last_interaction: data[i][7],
          final_status: data[i][8],
          final_category: data[i][9],
          admin_assigned_category: data[i][10]
        });
      }
    }

    return { success: true, candidates: candidates };
  } catch (error) {
    Logger.log(`[getCandidatesForAdmin Error] ${error.message}`);
    return { success: false, error: error.message, candidates: [] };
  }
}
```

4. Press Ctrl+S para guardar

### Paso 4: Agregar función doGet()

```
1. Al final del Code.gs, agrega:

function doGet(e) {
  const page = e.parameter.page || 'dashboard';

  if (page === 'dashboard') {
    return HtmlService.createHtmlFileFromPath('AdminDashboard')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

2. Press Ctrl+S
```

### Paso 5: Deploy

```
1. Click en "Deploy" (botón azul, arriba)
2. Selecciona "New Deployment"
3. En el dropdown de Type, selecciona "Web app"
4. En "Execute as", selecciona: Tu cuenta de Google
5. En "Who has access", selecciona: "Anyone"
6. Click en "Deploy"

7. Google te mostrará un mensaje:
   "New deployment created"

   Debajo verás un link tipo:
   https://script.google.com/macros/d/AKfycbx.../usercopy

8. Copia esta URL
```

### Paso 6: ¡Acceder al Dashboard!

```
1. Abre esta URL en tu navegador:
   https://script.google.com/macros/d/[TU_DEPLOYMENT_ID]/usercopy?page=dashboard

2. Deberías ver:
   ✅ Título "🎯 Panel Administrativo — RCCC"
   ✅ 4 tarjetas de estadísticas
   ✅ Tabla con lista de candidatos
   ✅ Botón "⚙️ Acciones" en cada fila

3. Click en "⚙️ Acciones" en cualquier candidato

4. Se abre el modal "Acciones Avanzadas" con 5 tabs:
   ✅ Aprobar Examen
   ❌ Rechazar Examen
   🏆 Categorizar
   🚀 Handoff
   📧 Reenviar Email
```

---

## 🎮 Usando el Dashboard

### Ver Candidatos

```
1. Dashboard carga automáticamente todos los candidatos
2. Cada fila muestra:
   - Nombre
   - Email
   - Estado (con color)
   - Categoría (si aplica)
   - Fecha de registro
   - Botón de Acciones

3. Las estadísticas arriba se actualizan automáticamente
4. Click en "🔄 Recargar" para actualizar manualmente
```

### Filtrar Candidatos

```
1. Dropdown "Filtrar por Estado" → Selecciona estado
2. Campo de Búsqueda → Escribe nombre o email
3. Click "🔍 Buscar" o presiona Enter

Ejemplos:
- Filtro: "pending_review_E1" → Ve solo candidatos en revisión E1
- Búsqueda: "juan" → Ve todos los candidatos con nombre juan
- Búsqueda: "@gmail.com" → Ve todos los candidatos con Gmail
```

### Aprobar Examen

```
Caso: Admin revisó E1 y quiere aprobarlo

1. Click "⚙️ Acciones" en el candidato
2. Modal abre en tab "✅ Aprobar Examen"
3. "Candidato" ya está pre-llenado
4. Dropdown "Examen a Aprobar" → Selecciona E1 (o E2/E3)
5. (Opcional) Agrega notas
6. Click "Aprobar Examen"

Sistema automáticamente:
✅ Actualiza estado
✅ Si E1 → cambia a "awaiting_terms_acceptance"
✅ Si E2 → genera Token E3 y cambia a "pending_review_E3"
✅ Si E3 → cambia a "awaiting_interview"
✅ Envía email correspondiente
✅ Registra evento en Timeline
✅ Dashboard se actualiza

Modal se cierra en 2 segundos después de éxito.
```

### Rechazar Examen

```
Caso: Admin revisó E2 y encontró inconsistencias

1. Click "⚙️ Acciones" en el candidato
2. Click tab "❌ Rechazar Examen"
3. "Candidato" ya está pre-llenado
4. Dropdown "Examen a Rechazar" → E2
5. "Razón del Rechazo" (requerido) → "Respuestas inconsistentes"
6. Click "Rechazar Examen"

Sistema automáticamente:
❌ Cambia estado a "rechazado"
❌ Mueve contacto Brevo: interesados → rechazados
❌ Envía email EML-03 con la razón
❌ Registra evento en Timeline
✅ Dashboard actualiza (candidato aparece como Rechazado)
```

### Asignar Categoría y Aprobar

```
Caso: Candidato pasó E1, E2, E3 correctamente. Admin decide que sea SENIOR.

1. Click "⚙️ Acciones" en el candidato
2. Click tab "🏆 Categorizar"
3. "Candidato" pre-llenado
4. Dropdown "Asignar Categoría":
   🥉 Junior
   🥈 Senior
   🥇 Expert

   → Selecciona "Senior"
5. (Opcional) Notas: "Excellent performance, strong leadership"
6. Click "Asignar Categoría"

Sistema automáticamente:
✅ Mueve contacto Brevo: interesados → senior
✅ Actualiza campo admin_assigned_category = "SENIOR"
✅ Cambia estado a "approved_senior"
✅ Envía email EML-07: "¡Aprobado como SENIOR!"
✅ Registra evento CANDIDATO_CATEGORIZADO_APROBADO
✅ Dashboard actualiza (muestra ✅ Aprobado Senior)
```

### Realizar Handoff

```
Caso: Candidato está aprobado como SENIOR, listo para Onboarding

1. Click "⚙️ Acciones" en el candidato
2. Click tab "🚀 Handoff"
3. Ve:
   - Candidato: María García
   - Categoría Actual: SENIOR

   ⚠️ ADVERTENCIA en rojo:
   "El handoff transferirá al candidato al spreadsheet de
    Onboarding. Esta acción no se puede deshacer fácilmente."

4. Campo "Confirmación" → Escribe exactamente: "CONFIRMAR HANDOFF"
5. Click "Confirmar Handoff"

Sistema automáticamente:
✅ Transfiere datos a Onboarding Spreadsheet
✅ Cambia estado a "handoff_completed"
✅ Envía notificación a catholizare@gmail.com
✅ Registra evento HANDOFF_COMPLETADO
✅ Dashboard actualiza (muestra ✅ Handoff Completado)

IMPORTANTE: Esta acción transfiere el candidato fuera del
sistema de selección. No se puede invertir fácilmente.
```

---

## 📞 Troubleshooting

### "Error al cargar candidatos"

```
❌ Problema: Dashboard no carga la tabla

✅ Solución:
1. Revisa que getCandidatesForAdmin() exista en Code.gs
2. Click en "🔄 Recargar"
3. Abre consola (F12) y revisa errores
4. En Google Apps Script:
   - Click "Run"
   - En dropdown, selecciona "getCandidatesForAdmin"
   - Click play
   - Revisa los logs
```

### "Error: El candidato no tiene status válido"

```
❌ Problema: No puedes realizar una acción en el candidato

✅ Causa posible:
- El status del candidato no permite esa acción
- Ej: no puedes "Aprobar E1" si status ya es "approved_senior"

✅ Solución:
1. Revisa el estado actual del candidato (columna "Estado")
2. Ve a Google Sheets → Candidatos
3. Verifica que el status en la DB sea correcto
4. Aplica la acción apropiada para ese estado
```

### "Email no se envió"

```
❌ Problema: Ejecutas una acción pero no llega el email

✅ Solución:
1. Ve a Google Apps Script → Extensions → Executions
2. Revisa los logs de ejecución reciente
3. Busca mensajes de error tipo "BREVO_ERROR"
4. Soluciones comunes:
   - EMAIL_HANDOFF no está configurado en Config sheet
   - BREVO_API_KEY es inválido
   - Dominio no verificado en Brevo
```

### "Modal se queda leyendo..."

```
❌ Problema: Presionas botón pero nada pasa

✅ Solución:
1. Abre consola (F12 → Console)
2. Revisa si hay errores en rojo
3. Espera 5-10 segundos
4. Si persiste, recarga página (F5)
5. Intenta nuevamente
```

---

## 🔐 Tips de Seguridad

1. **No compartas URL**: La URL de despliegue da acceso total
2. **Usa Google Account**: Asegúrate de estar en tu cuenta Google
3. **Cierra sesión**: Logout después de terminar
4. **Verifica cambios**: Revisa que los cambios se guardaron en Sheets

---

## 📊 Flujo Típico de Trabajo

```
Mañana: Admin llega a trabajar
1. Abre dashboard
2. Ve estadísticas del día (nuevos candidatos, pendientes, etc.)
3. Filtra por "pending_review_E1"
4. Revisa cada candidato:
   - Si pasó bien → Aprueba E1
   - Si tiene errores → Rechaza con razón
5. Los candidatos aprobados avanzan automáticamente

Después: Candidatos completan E2 y E3
6. Admin filtra por "pending_review_E2" y "pending_review_E3"
7. Aprueba los que sean correctos
8. Rechaza los que tengan problemas

Al final: Categorizar y handoff
9. Filtra por "awaiting_interview"
10. Categoriza: Junior/Senior/Expert
11. Realiza handoff → candidato pasa a Onboarding
12. Sistema completa el flujo automáticamente
```

---

## ✅ Checklist de Setup

- [ ] Copié admin-dashboard.html al Apps Script
- [ ] getCandidatesForAdmin() existe en Code.gs
- [ ] Agregué función doGet() en Code.gs
- [ ] Hice deploy como Web app
- [ ] Copié URL de despliegue
- [ ] Abrí dashboard en navegador
- [ ] Cargaron candidatos correctamente
- [ ] Probé cada tab del modal
- [ ] Ejecuté una acción (ej: Aprobar E1)
- [ ] Verifiqué que se guardó en Sheets

---

## 🎓 Próximos Pasos

1. **Testing**: Sigue TESTING_GUIDE.md para flujo completo
2. **Producción**: Cuando todo funcione, deploy a PROD
3. **Mejoras**: Agrega autenticación y acciones masivas

---

**¿Problemas?** Contacta a admin@rccc.org

*Dashboard listo para usar - ¡Disfruta!* 🚀
