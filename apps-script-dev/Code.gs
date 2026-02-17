/**
 * SISTEMA DE ADMISIONES - PSICÓLOGOS CATÓLICOS
 * Versión 2.0 - Desde Cero
 *
 * Stack: Google Apps Script + Google Sheets + Brevo
 * Flujo: E1 → E2 → E3 → Entrevista → Aprobado
 * Autenticación: Email + Contraseña (admin)
 */

// ============================================
// 🔴 PASO 1: INICIALIZACIÓN DE SPREADSHEET
// ============================================

/**
 * Ejecutar una sola vez: Crea/ajusta automáticamente todas las hojas
 * Menú: Extensiones > Apps Script > Ejecutar > initializeSpreadsheet()
 */
function initializeSpreadsheet() {
  Logger.log('🔧 Inicializando Spreadsheet...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Definir esquema de hojas
  const SHEETS_SCHEMA = {
    'Candidatos': {
      headers: ['UID', 'registration_date', 'name', 'email', 'phone', 'country', 'birthday',
                'professional_type', 'therapeutic_approach', 'about',
                'E1_status', 'E1_score', 'E1_date',
                'E2_status', 'E2_score', 'E2_date',
                'E3_status', 'E3_score', 'E3_date',
                'interview_scheduled', 'interview_date',
                'final_status', 'category', 'notes'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Resultados': {
      headers: ['timestamp', 'uid', 'exam_id', 'email', 'name', 'E1_score', 'E2_score', 'E3_score',
                'average_score', 'verdict', 'category', 'details_json'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Tokens': {
      headers: ['token', 'exam_id', 'email', 'uid', 'created_date', 'start_iso', 'end_iso',
                'used', 'status', 'scheduled_date'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Config': {
      headers: ['Clave', 'Valor', 'Tipo'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Usuarios': {
      headers: ['email', 'password_hash', 'role', 'created_date', 'last_login', 'status'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Sessions': {
      headers: ['session_id', 'user_email', 'created_at', 'expires_at', 'ip_address', 'user_agent'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Login_Audit': {
      headers: ['timestamp', 'email', 'attempt_type', 'success', 'ip_address', 'notes'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Preguntas_E1': {
      headers: ['id', 'texto', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5',
                'correct', 'almost', 'type', 'category'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Preguntas_E2': {
      headers: ['id', 'texto', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5',
                'correct', 'almost', 'type', 'category'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    },
    'Preguntas_E3': {
      headers: ['id', 'texto', 'option_1', 'option_2', 'option_3', 'option_4', 'option_5',
                'correct', 'almost', 'type', 'category'],
      colors: {
        header_bg: '#001A55',
        header_fg: '#FFFFFF'
      }
    }
  };

  // Crear/ajustar hojas
  Object.keys(SHEETS_SCHEMA).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`✅ Creada hoja: ${sheetName}`);
    }

    // Ajustar headers
    const spec = SHEETS_SCHEMA[sheetName];
    setHeaders(sheet, spec.headers);
    formatSheet(sheet, spec.colors.header_bg, spec.colors.header_fg);
  });

  // Eliminar "Hoja 1" si existe
  const sheet1 = ss.getSheetByName('Hoja 1');
  if (sheet1) {
    ss.deleteSheet(sheet1);
    Logger.log('✅ Eliminada "Hoja 1"');
  }

  // Inicializar Config con valores por defecto
  initializeConfig(ss);

  Logger.log('✅✅✅ Spreadsheet inicializado correctamente');
}

// Helpers de inicialización
function setHeaders(sheet, headers) {
  const lastCol = sheet.getLastColumn();
  if (lastCol > headers.length) {
    sheet.deleteColumns(headers.length + 1, lastCol - headers.length);
  }

  // Asegurar suficientes columnas
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  // Escribir headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontBold(true);
  headerRange.setHorizontalAlignment('center');
}

function formatSheet(sheet, bgColor, fgColor) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground(bgColor);
  headerRange.setFontColor(fgColor);
  headerRange.setHeight(30);

  // Congelar fila 1
  sheet.setFrozenRows(1);

  // Auto-ancho de columnas
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function initializeConfig(ss) {
  const sheet = ss.getSheetByName('Config');
  if (!sheet) return;

  const defaultConfig = [
    ['ADMIN_PIN', '1234', 'string'],
    ['ADMIN_EMAIL', 'admin@example.com', 'string'],
    ['TIMEZONE', 'America/Bogota', 'string'],
    ['BREVO_API_KEY', '', 'string'],
    ['BREVO_FROM_EMAIL', 'noreply@catholizare.com', 'string'],
    ['OPENAI_API_KEY', '', 'string'],
    ['E1_TOKEN_DURATION_HOURS', '24', 'number'],
    ['E2_TOKEN_DURATION_HOURS', '24', 'number'],
    ['E3_TOKEN_DURATION_HOURS', '24', 'number']
  ];

  // Limpiar Config (menos primera fila)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  // Escribir config por defecto
  defaultConfig.forEach((row, idx) => {
    const range = sheet.getRange(idx + 2, 1, 1, 3);
    range.setValues([row]);
  });

  Logger.log('✅ Config inicializada');
}

// ============================================
// 🔐 PASO 2: AUTENTICACIÓN ADMIN
// ============================================

function doGet(e) {
  const action = e.parameter.action || 'login';
  const pin = e.parameter.pin || '';

  if (action === 'dashboard' && validateAdminPin(pin)) {
    return renderDashboard();
  }

  return renderLoginPage();
}

function renderLoginPage() {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Admin Login — Catholizare</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #001A55 0%, #0966FF 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .login-card {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 90%;
          max-width: 400px;
          text-align: center;
        }
        .login-card h1 {
          color: #001A55;
          margin-bottom: 10px;
          font-size: 1.8em;
        }
        .login-card p {
          color: #666;
          margin-bottom: 30px;
          font-size: 0.95em;
        }
        input {
          width: 100%;
          padding: 14px;
          margin-bottom: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1em;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #0966FF;
          box-shadow: 0 0 0 3px rgba(9,102,255,0.1);
        }
        button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #001A55 0%, #0966FF 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1em;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover {
          transform: translateY(-2px);
        }
        .error {
          color: #dc3545;
          margin-bottom: 15px;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="login-card">
        <h1>🔐 Admin Panel</h1>
        <p>Ingresa tu PIN para acceder</p>
        <form onsubmit="handleLogin(event)">
          <input type="password" id="pinInput" placeholder="PIN" required>
          <div class="error" id="errorMsg"></div>
          <button type="submit">Ingresar</button>
        </form>
      </div>

      <script>
        function handleLogin(e) {
          e.preventDefault();
          const pin = document.getElementById('pinInput').value;
          window.location.href = '?action=dashboard&pin=' + encodeURIComponent(pin);
        }
      </script>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html);
}

function validateAdminPin(pin) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('Config');
    if (!configSheet) return false;

    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'ADMIN_PIN') {
        const correctPin = String(data[i][1]);
        return String(pin) === correctPin;
      }
    }
  } catch (e) {
    Logger.log('Error validando PIN: ' + e);
  }
  return false;
}

function renderDashboard() {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Dashboard Admin — Catholizare</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f5f7fa;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #001A55 0%, #0966FF 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid #0966FF;
        }
        .stat-value {
          font-size: 2em;
          font-weight: 700;
          color: #001A55;
        }
        .stat-label {
          color: #666;
          font-size: 0.9em;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Panel Administrativo — Catholizare</h1>
          <p>Gestión de Candidatos</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" id="totalCandidates">0</div>
            <div class="stat-label">Candidatos Totales</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="pendingCount">0</div>
            <div class="stat-label">En Proceso</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="approvedCount">0</div>
            <div class="stat-label">Aprobados</div>
          </div>
        </div>

        <p style="color: #666; text-align: center;">
          Dashboard en construcción. Vuelve pronto.
        </p>
      </div>

      <script>
        google.script.run.withSuccessHandler(data => {
          document.getElementById('totalCandidates').textContent = data.total;
          document.getElementById('pendingCount').textContent = data.pending;
          document.getElementById('approvedCount').textContent = data.approved;
        }).getDashboardStats();
      </script>
    </body>
    </html>
  `);
}

// ============================================
// 📊 PASO 3: FUNCIONES PARA DASHBOARD
// ============================================

function getDashboardStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const candidatesSheet = ss.getSheetByName('Candidatos');

    if (!candidatesSheet) {
      return { total: 0, pending: 0, approved: 0 };
    }

    const data = candidatesSheet.getDataRange().getValues();
    let total = data.length - 1; // Menos header
    let pending = 0;
    let approved = 0;

    // Encontrar columna de final_status
    const headerRow = data[0];
    const statusColIdx = headerRow.indexOf('final_status');

    if (statusColIdx >= 0) {
      for (let i = 1; i < data.length; i++) {
        const status = String(data[i][statusColIdx] || '');
        if (status.includes('pending') || status.includes('awaiting')) pending++;
        if (status === 'approved') approved++;
      }
    }

    return { total, pending, approved };
  } catch (e) {
    Logger.log('Error en getDashboardStats: ' + e);
    return { total: 0, pending: 0, approved: 0 };
  }
}

function getCandidatesForAdmin() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const candidatesSheet = ss.getSheetByName('Candidatos');

    if (!candidatesSheet) return { candidates: [] };

    const data = candidatesSheet.getDataRange().getValues();
    const headers = data[0];

    const candidates = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      candidates.push({
        uid: row[headers.indexOf('UID')] || '',
        name: row[headers.indexOf('name')] || '',
        email: row[headers.indexOf('email')] || '',
        status: row[headers.indexOf('final_status')] || '',
        category: row[headers.indexOf('category')] || '',
        registration_date: row[headers.indexOf('registration_date')] || ''
      });
    }

    return { candidates };
  } catch (e) {
    Logger.log('Error en getCandidatesForAdmin: ' + e);
    return { candidates: [] };
  }
}

// ============================================
// 👤 PASO 4: REGISTRO DE CANDIDATOS
// ============================================

function registerCandidate(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const candidatesSheet = ss.getSheetByName('Candidatos');

    if (!candidatesSheet) {
      return { success: false, error: 'Hoja Candidatos no existe' };
    }

    // Validar datos obligatorios
    if (!formData.name || !formData.email) {
      return { success: false, error: 'Nombre y email son obligatorios' };
    }

    // Generar UID único
    const uid = 'CZ-' + Utilities.getUuid().substring(0, 12).toUpperCase();

    // Preparar fila
    const headers = candidatesSheet.getRange(1, 1, 1, candidatesSheet.getLastColumn()).getValues()[0];
    const newRow = [];

    headers.forEach(header => {
      switch(header) {
        case 'UID': newRow.push(uid); break;
        case 'registration_date': newRow.push(new Date()); break;
        case 'name': newRow.push(formData.name); break;
        case 'email': newRow.push(formData.email); break;
        case 'phone': newRow.push(formData.phone || ''); break;
        case 'country': newRow.push(formData.country || ''); break;
        case 'birthday': newRow.push(formData.birthday || ''); break;
        case 'professional_type': newRow.push(formData.professional_type || ''); break;
        case 'therapeutic_approach': newRow.push(formData.therapeutic_approach || ''); break;
        case 'about': newRow.push(formData.about || ''); break;
        case 'E1_status': newRow.push('pending'); break;
        case 'E2_status': newRow.push('pending'); break;
        case 'E3_status': newRow.push('pending'); break;
        case 'final_status': newRow.push('registered'); break;
        default: newRow.push('');
      }
    });

    // Agregar fila
    candidatesSheet.appendRow(newRow);

    return {
      success: true,
      uid: uid,
      message: 'Candidato registrado exitosamente'
    };
  } catch (e) {
    Logger.log('Error registrando candidato: ' + e);
    return { success: false, error: e.message };
  }
}

// ============================================
// 🔧 PASO 5: UTILIDADES
// ============================================

function getEnv(key) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('Config');
    if (!configSheet) return null;

    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }
  } catch (e) {
    Logger.log('Error en getEnv: ' + e);
  }
  return null;
}

// ============================================
// 📝 NOTAS
// ============================================
/*
PASOS PARA USAR:

1. Abre Google Sheets (tu spreadsheet)
2. Extensiones > Apps Script
3. Copia TODO el contenido de este archivo
4. Guarda (Ctrl+S)
5. Ejecuta initializeSpreadsheet() desde el dropdown
6. Espera a que termine
7. Vuelve a Google Sheets
8. Verifica que las hojas están creadas

PARA PROBAR:
- Ve a: Extensiones > Implementar > Nueva implementación
- Tipo: Aplicación web
- Ejecutar como: Tu email
- Acceso: Cualquiera (incluso sin iniciar sesión)
- Copia la URL y abre en navegador
- Usa PIN: 1234 (por defecto)

PARA MODIFICAR ADMIN PIN:
- Ve a hoja Config
- Fila 2, Columna B: cambia "1234" a tu PIN

ESTRUCTURA DE HOJAS:
✅ Candidatos - Registro base
✅ Resultados - Resultados finales
✅ Tokens - Tokens de exámenes
✅ Config - Configuración
✅ Usuarios - Admin users
✅ Sessions - Sesiones activas
✅ Login_Audit - Auditoría
✅ Preguntas_E1, E2, E3 - Bancos de preguntas
*/
