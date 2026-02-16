# 📝 CÓDIGO PARA COPIAR/PEGAR EN GOOGLE APPS SCRIPT

**Archivo**: `apps-script-dev/Code.gs`
**Acción**: Agregar estas funciones al final del archivo

---

## ⚠️ INSTRUCCIONES MUY IMPORTANTES

1. **NO reemplaces** el código existente
2. **Agrega** estas funciones al **FINAL** del archivo Code.gs
3. Copia exactamente como está (respeta indentación y saltos de línea)
4. Después de copiar, presiona **Ctrl+S** para guardar
5. **NO**debes ejecutar las funciones, solo guardar el archivo

---

## 🔧 FUNCIÓN 1: acceptTerms()

**Ubicación**: Agregar al final de Code.gs

```javascript
/**
 * Admin aceptación de términos por candidato
 * Llamada desde: /terminos/index.html cuando candidato acepta
 */
function acceptTerms(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) {
      return { success: false, error: 'Candidatos sheet not found' };
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];
        const status = data[i][6];

        // Validar que status sea correcto
        if (status !== 'awaiting_terms_acceptance') {
          return {
            success: false,
            error: 'Candidate status does not allow terms acceptance'
          };
        }

        // 1. Generar Token E2
        const tokenE2 = generateToken(candidateId, 'E2');
        const scheduled_date = new Date().toISOString().split('T')[0];
        saveToken(tokenE2, candidateId, 'E2', email, name, scheduled_date);

        // 2. Registrar aceptación en sheet
        const nowISO = new Date().toISOString();
        sheet.getRange(i + 1, 12).setValue(nowISO); // Columna L: fecha_aceptacion_terminos

        // 3. Cambiar status a pending_review_E2
        sheet.getRange(i + 1, 11).setValue('pending_review_E2');

        // 4. Enviar email a admin notificando aceptación
        sendEmailTermsAcceptedToAdmin(name, email, candidateId);

        // 5. Enviar Email E2 al candidato con token
        sendEmailE2(email, name, tokenE2, candidateId);

        // 6. Timeline
        addTimelineEvent(candidateId, 'TERMINOS_ACEPTADOS', {
          fecha: nowISO,
          email: email
        });

        Logger.log(`[acceptTerms] ${candidateId} - Terms accepted`);

        return {
          success: true,
          message: 'Terms accepted successfully',
          tokenE2: tokenE2
        };
      }
    }

    return { success: false, error: 'Candidate not found' };
  } catch (error) {
    Logger.log(`[acceptTerms Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

---

## 🔧 FUNCIÓN 2: sendEmailTermsAcceptedToAdmin()

**Ubicación**: Agregar después de acceptTerms()

```javascript
/**
 * Envía email a admin notificando que candidato aceptó términos
 */
function sendEmailTermsAcceptedToAdmin(name, email, candidateId) {
  try {
    const adminEmail = CONFIG.email_admin;
    if (!adminEmail) return;

    const subject = `✅ Candidato ${name} aceptó términos`;
    const body = `
Candidato: ${name}
Email: ${email}
ID: ${candidateId}
Hora aceptación: ${new Date().toLocaleString()}

El candidato ha aceptado los términos y condiciones de RCCC.
Ya ha recibido su link de examen E2.

---
Sistema RCCC
`;

    MailApp.sendEmail(adminEmail, subject, body);
    Logger.log(`[Email Sent] Terms acceptance notification to admin`);
  } catch (error) {
    Logger.log(`[sendEmailTermsAcceptedToAdmin Error] ${error.message}`);
  }
}
```

---

## 🔧 FUNCIÓN 3: validateToken()

**Ubicación**: Agregar después de sendEmailTermsAcceptedToAdmin()

```javascript
/**
 * Valida que un token sea válido y no haya expirado
 * Llamada desde: proxy2.php con action: validateToken
 */
function validateToken(token) {
  try {
    if (!token || token.length < 5) {
      return { success: false, error: 'Invalid token format' };
    }

    const sheet = SS.getSheetByName('Tokens');
    if (!sheet) {
      return { success: false, error: 'Tokens sheet not found' };
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === token) {
        const tipo = data[i][2];
        const validFrom = new Date(data[i][3]);
        const validUntil = new Date(data[i][4]);
        const usado = data[i][5];
        const now = new Date();

        // Validaciones
        if (usado === true || usado === 'TRUE') {
          return { success: false, error: 'Token already used' };
        }

        if (now < validFrom) {
          return { success: false, error: 'Token not yet valid' };
        }

        if (now > validUntil) {
          return { success: false, error: 'Token expired' };
        }

        return {
          success: true,
          message: 'Token is valid',
          token: token,
          type: tipo
        };
      }
    }

    return { success: false, error: 'Token not found' };
  } catch (error) {
    Logger.log(`[validateToken Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

---

## 🔧 FUNCIÓN 4: doPost() - ACTUALIZACIÓN

**BUSCA**: Esta función ya existe en tu Code.gs

**REEMPLAZA** la línea que dice `const action = data.action;` por:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // ← AQUÍ EMPIEZA LA NUEVA SECCIÓN
    // Manejar nuevas acciones
    if (action === 'acceptTerms') {
      return ContentService
        .createTextOutput(JSON.stringify(acceptTerms(data.candidateId)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'validateToken') {
      return ContentService
        .createTextOutput(JSON.stringify(validateToken(data.token)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // ← AQUÍ TERMINA LA NUEVA SECCIÓN

    // ... resto del código existente ...
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 🔧 FUNCIÓN 5: Agregar Columnas a Google Sheets

**En Google Sheets (Tab "Candidatos")**

Agrega estas dos columnas al final:

```
Columna L: "fecha_aceptacion_terminos" (Type: DateTime)
Columna M: "ip_aceptacion_terminos" (Type: Text)
```

---

## 🔧 FUNCIÓN 6: Actualizar CONFIG

**En la sección del CONFIG object**, agrega esta línea si no existe:

```javascript
get email_handoff() { return getConfig('EMAIL_HANDOFF', 'admin@rccc.org'); },
```

---

## ✅ CHECKLIST DESPUÉS DE COPIAR

- [ ] Copié acceptTerms() al final de Code.gs
- [ ] Copié sendEmailTermsAcceptedToAdmin() al final
- [ ] Copié validateToken() al final
- [ ] Actualicé doPost() con las nuevas acciones
- [ ] Agregué columnas L y M en Google Sheets
- [ ] Presioné Ctrl+S para guardar
- [ ] **NO ejecuté ninguna función** (solo guardar)
- [ ] El código está exactamente como está arriba (respetando espacios)

---

## 🧪 VERIFICACIÓN

Después de copiar:

1. En Google Apps Script, click en el archivo **Code.gs**
2. Verifica que las nuevas funciones estén al final
3. Presiona **Ctrl+S** para guardar
4. **No debe haber errores rojos** en el editor

Si todo está bien, el proxy2.php podrá llamar a estas funciones sin problemas.

---

## ⚠️ Si tienes errores

**Error**: "Identifier 'acceptTerms' has already been declared"
- **Solución**: Ya existe una función acceptTerms(). Reemplaza la antigua por la nueva.

**Error**: "Cannot read property 'split' of undefined"
- **Solución**: Verifica que data[i][3] (email) exista en tu sheet.

**Error**: "MailApp not defined"
- **Solución**: Asegúrate de estar en Google Apps Script (no en hojas de cálculo).

---

**¡Listo! Con estas funciones agregadas, el sistema completo funcionará.** 🚀

