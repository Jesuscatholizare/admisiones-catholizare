# 🔐 Autenticación — Sistema de Roles y Acceso

## 🎯 Pregunta Usuario
> "¿Necesitamos un medio de autenticación o una contraseña para cada usuario?"

**Respuesta: DEPENDE DEL CONTEXTO. Aquí están las opciones:**

---

## 📋 Opción 1: Sin Contraseña (Recomendado para Admin Interno)

### ¿Cuándo usar?
- Admin accede desde dentro de organización RCCC
- No es público
- Acceso limitado a 2-5 personas admin

### Implementación
```javascript
// En onOpen():
function onOpen() {
  const currentUser = Session.getActiveUser().getEmail();
  const adminList = getConfigValue('ADMIN_EMAILS'); // "admin1@, admin2@, ..."

  if (adminList.includes(currentUser)) {
    // Mostrar menú admin
    createAdminMenu();
  } else {
    // Mostrar error
    SpreadsheetApp.getUi().alert('No tienes permiso. Contacta admin.');
  }
}
```

### Ventajas ✅
- Basado en Google Workspace (automático)
- Sin base de datos de contraseñas
- Google maneja autenticación
- Más seguro (2FA de Google)

### Desventajas ❌
- Solo funciona con cuentas Google de la organización
- No puedes dar acceso a externos fácilmente
- Si alguien accede a cuenta admin, accede todo

---

## 📋 Opción 2: Con Contraseña Simple (Para Candidatos)

### ¿Cuándo usar?
- Candidatos responden tests desde casa
- Necesitas control de quién accede
- Quieres llevar registro de logins

### Implementación

#### Estructura en Sheets (Nueva hoja: "Usuarios")
```
Columna A: Email (candidato o admin)
Columna B: Tipo (ADMIN, CANDIDATO, SUPER_ADMIN)
Columna C: Contraseña (HASH, NO PLAINTEXT)
Columna D: Estado (ACTIVO, INACTIVO, BLOQUEADO)
Columna E: Fecha_Creacion
Columna F: Ultimo_Login
```

#### Código de Autenticación
```javascript
function authenticateUser(email, password) {
  // 1. Buscar usuario en hoja "Usuarios"
  const userRow = findUserByEmail(email);

  if (!userRow) {
    logFailedAttempt(email, 'USUARIO_NO_EXISTE');
    return { success: false, reason: 'Email no registrado' };
  }

  // 2. Verificar contraseña (HASH no plaintext)
  const hashedPassword = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + SALT // Salt previene rainbow tables
  );

  const storedHash = getStoredPasswordHash(email);

  if (hashedPassword !== storedHash) {
    logFailedAttempt(email, 'CONTRASENA_INCORRECTA');
    return { success: false, reason: 'Contraseña incorrecta' };
  }

  // 3. Verificar estado
  const userStatus = getUserStatus(email);
  if (userStatus === 'BLOQUEADO') {
    return { success: false, reason: 'Usuario bloqueado. Contacta admin.' };
  }

  // 4. Generar session token (válido 8 horas)
  const sessionToken = generateSessionToken(email);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas

  // 5. Guardar session en Sheets
  saveSession(email, sessionToken, expiresAt);

  // 6. Registrar login exitoso
  logLoginSuccess(email);

  return {
    success: true,
    sessionToken: sessionToken,
    expiresAt: expiresAt,
    userType: getUserType(email),
  };
}
```

#### Página de Login (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #0066CC, #003366);
      margin: 0;
    }
    .login-box {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      width: 300px;
    }
    h1 { color: #333; text-align: center; }
    input {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #0066CC;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover { background: #0052A3; }
    .error { color: red; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>🔐 Sistema de Admisiones</h1>
    <input type="email" id="email" placeholder="Email">
    <input type="password" id="password" placeholder="Contraseña">
    <button onclick="login()">Ingresar</button>
    <div id="error" class="error"></div>
  </div>

  <script>
    function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (!email || !password) {
        showError('Completa email y contraseña');
        return;
      }

      google.script.run.withSuccessHandler(onAuthSuccess)
                      .withFailureHandler(onAuthError)
                      .authenticateUser(email, password);
    }

    function onAuthSuccess(result) {
      if (result.success) {
        // Guardar token en localStorage
        localStorage.setItem('sessionToken', result.sessionToken);
        localStorage.setItem('expiresAt', result.expiresAt);
        localStorage.setItem('userType', result.userType);

        // Redirigir según tipo de usuario
        if (result.userType === 'ADMIN' || result.userType === 'SUPER_ADMIN') {
          window.location.href = '?page=dashboard';
        } else if (result.userType === 'CANDIDATO') {
          window.location.href = '?page=candidato-dashboard';
        }
      } else {
        showError(result.reason);
      }
    }

    function onAuthError(error) {
      showError('Error en servidor: ' + error);
    }

    function showError(msg) {
      document.getElementById('error').textContent = msg;
    }
  </script>
</body>
</html>
```

### Ventajas ✅
- Control granular (crear/bloquear usuarios)
- Candidatos pueden acceder de cualquier lugar
- Registro de logins

### Desventajas ❌
- Base de datos de contraseñas (más riesgo)
- Admin debe gestionar contraseñas
- Requiere más código

---

## 📋 Opción 3: OAuth Google (Para Terceros)

### ¿Cuándo usar?
- Candidatos de diferentes organizaciones
- No tienen cuenta Google corporativa
- Necesitas "Sign in with Google"

### Implementación
Usar Google Sign-In API:
```html
<div id="g_id_onload"
     data-client_id="YOUR_CLIENT_ID.apps.googleusercontent.com"
     data-callback="handleCredentialResponse">
</div>
```

### Ventajas ✅
- Estándar de industria
- Candidato no necesita contraseña nueva
- Google maneja seguridad

### Desventajas ❌
- Más complejo de implementar
- Requiere configurar Google Console
- No valdría la pena para candidatos internos

---

## 🎯 RECOMENDACIÓN FINAL

**Para tu caso (RCCC)**, te recomiendo **OPCIÓN 1 + OPCIÓN 2 Combinadas**:

### Admin
- Usa **Opción 1** (sin contraseña, basado en Google)
- Automático cuando abre Spreadsheet
- Máximo seguro

### Candidatos
- Usa **Opción 2** (contraseña simple)
- Acceden a página de login separada
- Responden tests autenticados

### Implementación (Híbrida)
```
doGet() → Detecta quién accede

  Si es ADMIN (validado por Google):
    → Mostrar dashboard admin

  Si es CANDIDATO (debe loguearse):
    → Mostrar página login
    → Después de autenticarse → candidato dashboard
```

---

## 📊 Estructura de Seguridad Recomendada

### Hoja: "Usuarios" (Nueva)
```
A: Email
B: Tipo (ADMIN, CANDIDATO, SUPER_ADMIN)
C: Password_Hash (SHA-256)
D: Estado (ACTIVO, INACTIVO, BLOQUEADO)
E: Fecha_Creacion
F: Ultimo_Login
G: Intentos_Fallidos (se resetea cada 24h)
H: Bloqueado_Hasta (si intentos_fallidos > 5)
```

### Hoja: "Sessions" (Nueva - temporal)
```
A: Email
B: Session_Token
C: Expires_At
D: IP_Address (opcional)
E: Device_Type (Web/Mobile)
```

### Hoja: "Login_Audit" (Nueva - auditoría)
```
A: Email
B: Timestamp
C: Evento (LOGIN_EXITOSO, FALLO_CONTRASENA, USUARIO_BLOQUEADO)
D: IP (si aplica)
E: Detalles
```

---

## 🛡️ Medidas Anti-Fraude

### 1. Límite de Intentos Fallidos
```javascript
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

if (failedAttempts > MAX_FAILED_ATTEMPTS) {
  // Bloquear usuario por 30 minutos
  blockUserTemporarily(email, LOCKOUT_DURATION_MINUTES);
  sendAlertEmail(email, 'Se bloqueó tu cuenta por intentos fallidos');
}
```

### 2. Expiración de Sesiones
```javascript
// Session válida solo 8 horas
// Después, debe loguearse de nuevo
if (sessionExpired()) {
  redirectToLogin('Tu sesión expiró. Inicia sesión nuevamente.');
}
```

### 3. Validación de Token en AJAX
```javascript
// Cada vez que candidato envía respuesta:
function submitTest(testData) {
  // 1. Validar que sessionToken es válido
  const sessionValid = validateSessionToken(sessionToken);
  if (!sessionValid) {
    return { error: 'Sesión expirada' };
  }

  // 2. Verificar que es el candidato correcto
  const candidateId = getCandidateFromToken(sessionToken);
  if (candidateId !== testData.candidateId) {
    logSecurityEvent('INTENTO_SUPLANTACION', {
      sessionFor: candidateId,
      attemptedFor: testData.candidateId
    });
    return { error: 'No autorizado' };
  }

  // 3. Proceder normalmente
  return saveTest(testData);
}
```

---

## 🎯 Tu Decisión

Responde estas preguntas:

```
1. ¿Los candidatos tienen cuenta Google corporativa RCCC?
   SÍ → Usa Opción 1 (sin contraseña)
   NO → Usa Opción 2 (con contraseña)

2. ¿Cuántos admins accederán?
   1-5 personas → Opción 1 es perfecta
   Más de 5 → Considera Opción 2

3. ¿Candidatos accederán desde casa o desde RCCC?
   Desde casa → Opción 2 (contraseña)
   Desde RCCC → Opción 1 (Google corporativo)
```

Dime tus respuestas y ajusto el código. 👉
