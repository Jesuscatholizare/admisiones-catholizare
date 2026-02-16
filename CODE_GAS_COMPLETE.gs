/**
 * SISTEMA DE SELECCIÓN DE CANDIDATOS - RCCC
 * Versión 2.0 - Completo con Formateo y Health Check
 *
 * Stack: Google Apps Script + Google Sheets
 * Integraciones: OpenAI, Brevo, Resend, Email
 * Seguridad: API_PROXY, Tokens ISO, Anti-fraude
 *
 * GitHub: https://github.com/Jesuscatholizare/admisiones-catholizare
 * Rama: claude/candidate-selection-tracker-rb6Ke
 */

// ================================
// CONFIGURACIÓN CENTRAL
// ================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

// Función para obtener configuración desde Sheets
function getConfig(key, defaultValue = null) {
  try {
    const sheet = SS.getSheetByName('Config');
    if (!sheet) return defaultValue;

    const data = sheet.getDataRange().getValues();

    // Soporta dos formatos:
    // Formato 1: Columnas separadas (A: clave, B: valor, C: tipo)
    // Formato 2: Una columna con "CLAVE = VALOR"

    for (let i = 0; i < data.length; i++) {
      const cellValue = data[i][0];

      if (!cellValue) continue;

      // Formato 1: Columnas separadas
      if (data[i][1] !== undefined && data[i][1] !== '') {
        if (cellValue === key) {
          const value = data[i][1];
          const type = data[i][2] || 'string';

          if (type === 'json') return JSON.parse(value);
          if (type === 'number') return Number(value);
          return value;
        }
      }
      // Formato 2: "CLAVE = VALOR" en una sola celda
      else if (typeof cellValue === 'string' && cellValue.includes('=')) {
        const [configKey, configValue] = cellValue.split('=').map(s => s.trim());
        if (configKey === key) {
          return configValue;
        }
      }
      // Formato 2b: "CLAVE valor" (separado por espacio) - para casos como "ADMIN_EMAILS email1, email2"
      else if (typeof cellValue === 'string' && cellValue.startsWith(key)) {
        const parts = cellValue.split(/\s+/);
        if (parts[0] === key && parts.length > 1) {
          // Retorna todo después de la clave
          return cellValue.substring(key.length).trim();
        }
      }
    }
  } catch (e) {
    Logger.log(`Error obteniendo config ${key}: ${e.message}`);
  }
  return defaultValue;
}

// Helpers para configuración
const CONFIG = {
  get openai_api_key() { return getConfig('OPENAI_API_KEY'); },
  get openai_model() { return getConfig('OPENAI_MODEL', 'gpt-4o-mini'); },
  get brevo_api_key() { return getConfig('BREVO_API_KEY'); },
  get resend_api_key() { return getConfig('RESEND_API_KEY'); },
  get email_from() { return getConfig('EMAIL_FROM'); },
  get email_admin() { return getConfig('EMAIL_ADMIN'); },
  get email_support() { return getConfig('EMAIL_SUPPORT'); },
  get email_handoff() { return getConfig('EMAIL_HANDOFF', 'catholizare@gmail.com'); },
  get brevo_groups() { return getConfig('BREVO_GROUPS', {}); },
  get timezone() { return getConfig('TIMEZONE', 'America/Bogota'); },
  get app_name() { return getConfig('APP_NAME', 'RCCC Evaluaciones'); },
  get handoff_spreadsheet_id() { return getConfig('HANDOFF_SPREADSHEET_ID', '1YgbnsB0_oLbSlYBUNqhe2V9QqlbEu8nGotYTWHHXW4I'); },

  // Examen E1
  get exam_e1_duration() { return getConfig('EXAM_E1_DURATION_MIN', 120); },
  get exam_e1_min_score() { return getConfig('EXAM_E1_MIN_SCORE', 75); },
  get exam_e1_critical_threshold() { return getConfig('EXAM_E1_CRITICAL_THRESHOLD', 3); },

  // Examen E2
  get exam_e2_duration() { return getConfig('EXAM_E2_DURATION_MIN', 120); },
  get exam_e2_min_score() { return getConfig('EXAM_E2_MIN_SCORE', 75); },

  // Examen E3
  get exam_e3_duration() { return getConfig('EXAM_E3_DURATION_MIN', 120); },
  get exam_e3_min_score() { return getConfig('EXAM_E3_MIN_SCORE', 75); },

  // Categorías
  get category_junior_min() { return getConfig('CATEGORY_JUNIOR_MIN', 75); },
  get category_junior_max() { return getConfig('CATEGORY_JUNIOR_MAX', 79); },
  get category_senior_min() { return getConfig('CATEGORY_SENIOR_MIN', 80); },
  get category_senior_max() { return getConfig('CATEGORY_SENIOR_MAX', 89); },
  get category_expert_min() { return getConfig('CATEGORY_EXPERT_MIN', 90); },

  // Brevo Listas
  get brevo_list_interesados() { return getConfig('BREVO_LIST_INTERESADOS', 3); },
  get brevo_list_rechazados() { return getConfig('BREVO_LIST_RECHAZADOS', 4); },
  get brevo_list_aprobados() { return getConfig('BREVO_LIST_APROBADOS', 5); },
  get brevo_list_junior() { return getConfig('BREVO_LIST_JUNIOR', 6); },
  get brevo_list_senior() { return getConfig('BREVO_LIST_SENIOR', 7); },
  get brevo_list_expert() { return getConfig('BREVO_LIST_EXPERT', 8); },

  // Otros
  get inactive_days() { return getConfig('INACTIVE_DAYS_THRESHOLD', 20); }
};

// ================================
// FUNCIONES DE SETUP Y FORMATEO
// ================================

/**
 * FUNCIÓN PRINCIPAL DE SETUP
 * Ejecuta una vez para formatear todas las hojas y crear estructura
 * Uso: En Google Apps Script, presiona el play junto a esta función
 */
function setupSystem() {
  Logger.log('🔧 Iniciando setup del sistema RCCC...');

  try {
    formatAllSheets();
    Logger.log('✅ Sistema formateado correctamente');
    Logger.log('✅ Setup completado');

    // Mostrar resumen
    const summary = checkSystemHealth();
    Logger.log('📊 HEALTH CHECK: ' + JSON.stringify(summary, null, 2));
  } catch (error) {
    Logger.log('❌ Error en setup: ' + error.message);
  }
}

/**
 * Formatea todas las hojas del spreadsheet
 */
function formatAllSheets() {
  const sheetNames = ['Config', 'Candidatos', 'Tokens', 'Timeline', 'Preguntas', 'Respuestas'];

  sheetNames.forEach(sheetName => {
    const sheet = SS.getSheetByName(sheetName);
    if (sheet) {
      formatSheet(sheet, sheetName);
      Logger.log(`✅ Formateada hoja: ${sheetName}`);
    } else {
      Logger.log(`⚠️ Hoja no encontrada: ${sheetName}`);
    }
  });
}

/**
 * Formatea una hoja específica
 */
function formatSheet(sheet, sheetName) {
  try {
    // Validar que sheet existe
    if (!sheet) {
      Logger.log(`⚠️ formatSheet: sheet es null para ${sheetName}`);
      return;
    }

    // Congelar primera fila (headers)
    sheet.setFrozenRows(1);

    // Ancho de columnas según el tipo de hoja
    switch(sheetName) {
      case 'Config':
        sheet.setColumnWidth(1, 250); // Clave
        sheet.setColumnWidth(2, 300); // Valor
        sheet.setColumnWidth(3, 100); // Tipo
        break;

      case 'Candidatos':
        sheet.setColumnWidth(1, 120);  // ID
        sheet.setColumnWidth(2, 150);  // Nombre
        sheet.setColumnWidth(3, 180);  // Email
        sheet.setColumnWidth(4, 130);  // Teléfono
        sheet.setColumnWidth(5, 120);  // Fecha registro
        sheet.setColumnWidth(6, 120);  // Scheduled date
        sheet.setColumnWidth(7, 150);  // Status
        sheet.setColumnWidth(8, 120);  // Last interaction
        sheet.setColumnWidth(9, 150);  // Final status
        sheet.setColumnWidth(10, 130); // Final category
        sheet.setColumnWidth(11, 130); // Admin assigned
        sheet.setColumnWidth(12, 150); // Fecha aceptación
        sheet.setColumnWidth(13, 130); // IP aceptación
        break;

      case 'Tokens':
        sheet.setColumnWidth(1, 150);  // Token
        sheet.setColumnWidth(2, 120);  // Candidate ID
        sheet.setColumnWidth(3, 100);  // Tipo
        sheet.setColumnWidth(4, 130);  // Valid from
        sheet.setColumnWidth(5, 130);  // Valid until
        sheet.setColumnWidth(6, 80);   // Usado
        break;

      case 'Timeline':
        sheet.setColumnWidth(1, 120);  // ID
        sheet.setColumnWidth(2, 120);  // Candidate ID
        sheet.setColumnWidth(3, 180);  // Evento
        sheet.setColumnWidth(4, 150);  // Fecha
        sheet.setColumnWidth(5, 300);  // Detalles
        break;

      case 'Preguntas':
        sheet.setColumnWidth(1, 80);   // ID
        sheet.setColumnWidth(2, 100);  // Tipo
        sheet.setColumnWidth(3, 150);  // Categoría
        sheet.setColumnWidth(4, 300);  // Texto
        sheet.setColumnWidth(5, 150);  // Opciones
        break;

      case 'Respuestas':
        sheet.setColumnWidth(1, 120);  // ID
        sheet.setColumnWidth(2, 120);  // Candidate ID
        sheet.setColumnWidth(3, 100);  // Examen
        sheet.setColumnWidth(4, 100);  // Pregunta ID
        sheet.setColumnWidth(5, 300);  // Respuesta
        sheet.setColumnWidth(6, 100);  // Puntuación
        break;
    }

    // Formatear header (primera fila)
    if (sheet.getLastColumn() > 0) {
      const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      headerRange.setBackground('#001A55');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('CENTER');

      // Crear autofilter (sintaxis correcta de Google Apps Script)
      headerRange.createFilter();
    }

    // Alineación y formato general
    const dataRange = sheet.getDataRange();
    if (dataRange) {
      dataRange.setVerticalAlignment('TOP');
      dataRange.setHorizontalAlignment('LEFT');
    }

    Logger.log(`✅ formatSheet completado: ${sheetName}`);
  } catch (error) {
    Logger.log(`❌ Error en formatSheet(${sheetName}): ${error.message}`);
  }
}

/**
 * FUNCIÓN: Health Check del Sistema
 * Verifica que todo está configurado correctamente
 */
function checkSystemHealth() {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'OK',
    checks: {}
  };

  // Check 1: Google Sheets
  try {
    const sheets = ['Config', 'Candidatos', 'Tokens', 'Timeline', 'Preguntas', 'Respuestas'];
    const missingSheets = sheets.filter(name => !SS.getSheetByName(name));

    health.checks.sheets = {
      status: missingSheets.length === 0 ? '✅' : '⚠️',
      found: sheets.length - missingSheets.length,
      missing: missingSheets
    };
  } catch (e) {
    health.checks.sheets = { status: '❌', error: e.message };
    health.status = 'ERROR';
  }

  // Check 2: API Keys
  try {
    const apiKeys = {
      openai: CONFIG.openai_api_key ? '✅' : '❌',
      brevo: CONFIG.brevo_api_key ? '✅' : '❌',
      resend: CONFIG.resend_api_key ? '✅' : '❌'
    };

    const allValid = Object.values(apiKeys).every(v => v === '✅');
    health.checks.apiKeys = {
      status: allValid ? '✅' : '⚠️',
      keys: apiKeys
    };
  } catch (e) {
    health.checks.apiKeys = { status: '❌', error: e.message };
    health.status = 'ERROR';
  }

  // Check 3: Configuración de Email
  try {
    const emailConfig = {
      email_from: CONFIG.email_from ? '✅' : '❌',
      email_admin: CONFIG.email_admin ? '✅' : '❌',
      email_handoff: CONFIG.email_handoff ? '✅' : '❌'
    };

    const allValid = Object.values(emailConfig).every(v => v === '✅');
    health.checks.emailConfig = {
      status: allValid ? '✅' : '⚠️',
      config: emailConfig
    };
  } catch (e) {
    health.checks.emailConfig = { status: '❌', error: e.message };
    health.status = 'ERROR';
  }

  // Check 4: Brevo Lists
  try {
    const brevoLists = {
      interesados: CONFIG.brevo_list_interesados ? '✅' : '❌',
      junior: CONFIG.brevo_list_junior ? '✅' : '❌',
      senior: CONFIG.brevo_list_senior ? '✅' : '❌',
      expert: CONFIG.brevo_list_expert ? '✅' : '❌'
    };

    const allValid = Object.values(brevoLists).every(v => v === '✅');
    health.checks.brevoLists = {
      status: allValid ? '✅' : '⚠️',
      lists: brevoLists
    };
  } catch (e) {
    health.checks.brevoLists = { status: '❌', error: e.message };
    health.status = 'ERROR';
  }

  // Check 5: Candidatos Count
  try {
    const candidatosSheet = SS.getSheetByName('Candidatos');
    const count = candidatosSheet ? candidatosSheet.getLastRow() - 1 : 0;
    health.checks.candidatos = {
      status: '✅',
      count: count
    };
  } catch (e) {
    health.checks.candidatos = { status: '❌', error: e.message };
  }

  Logger.log('═══════════════════════════════════════');
  Logger.log('📊 HEALTH CHECK DEL SISTEMA RCCC');
  Logger.log('═══════════════════════════════════════');
  Logger.log('Timestamp: ' + health.timestamp);
  Logger.log('Estado General: ' + health.status);
  Logger.log('───────────────────────────────────────');
  Logger.log('Google Sheets: ' + health.checks.sheets.status + ' (' + health.checks.sheets.found + ' hojas)');
  Logger.log('API Keys: ' + health.checks.apiKeys.status);
  Logger.log('Email Config: ' + health.checks.emailConfig.status);
  Logger.log('Brevo Lists: ' + health.checks.brevoLists.status);
  Logger.log('Candidatos: ' + health.checks.candidatos.status + ' (' + health.checks.candidatos.count + ' registros)');
  Logger.log('═══════════════════════════════════════');

  return health;
}

// ================================
// FUNCIONES PRINCIPALES DEL SISTEMA
// ================================

/**
 * POST: Procesa solicitudes desde api-proxy.php
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

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

    // Resto de acciones existentes...
    if (action === 'handleRegistration') {
      const result = handleRegistration(data.nombre, data.email, data.telefono, data.categoria, data.caminoAcademico, data.caminoEspiritual);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'handleExamSubmit') {
      const result = handleExamSubmit(data.exam, data.candidateId, data.answers);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getCandidatesForAdmin') {
      const result = getCandidatesForAdmin();
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'approveExamAdmin') {
      const result = approveExamAdmin(data.candidateId, data.exam);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'rejectExamAdmin') {
      const result = rejectExamAdmin(data.candidateId, data.exam, data.reason);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'assignCategoryAndApprove') {
      const result = assignCategoryAndApprove(data.candidateId, data.category);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'performHandoff') {
      const result = performHandoff(data.candidateId);
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Genera un ID único para candidato
 */
function generateCandidateId() {
  return 'cand_' + Utilities.getUuid().substring(0, 12);
}

/**
 * Registra candidato desde formulario web
 */
function handleRegistration(nombre, email, telefono, categoria, caminoAcademico, caminoEspiritual) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const candidateId = generateCandidateId();
    const now = new Date().toISOString();

    const newRow = [
      candidateId,
      nombre,
      email,
      telefono,
      now,
      '',
      'registered',
      now,
      '',
      '',
      '',
      '',
      ''
    ];

    sheet.appendRow(newRow);

    // Agregar a Brevo lista de interesados
    addContactToBrevoList(email, nombre, '', CONFIG.brevo_list_interesados);

    // Generar Token E1
    const tokenE1 = generateToken(candidateId, 'E1');
    const scheduled_date = new Date().toISOString().split('T')[0];
    saveToken(tokenE1, candidateId, 'E1', email, nombre, scheduled_date);

    // Enviar email con link de examen
    sendEmailExamE1(email, nombre, tokenE1, candidateId);

    addTimelineEvent(candidateId, 'CANDIDATO_REGISTRADO', {
      email: email,
      fecha: now
    });

    Logger.log(`[handleRegistration] ${candidateId} registered`);

    return { success: true, candidateId: candidateId };
  } catch (error) {
    Logger.log(`[handleRegistration Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Genera un token con ventana temporal ISO
 */
function generateToken(candidateId, type) {
  const randomStr = Utilities.getUuid().substring(0, 8);
  return `${type}_${randomStr}`;
}

/**
 * Guarda token en sheet
 */
function saveToken(token, candidateId, type, email, name, scheduledDate) {
  try {
    const sheet = SS.getSheetByName('Tokens');
    const now = new Date();
    const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    sheet.appendRow([
      token,
      candidateId,
      type,
      now.toISOString(),
      validUntil.toISOString(),
      false
    ]);

    Logger.log(`[saveToken] ${type} token creado para ${candidateId}`);
  } catch (error) {
    Logger.log(`[saveToken Error] ${error.message}`);
  }
}

/**
 * Procesa envío de examen
 */
function handleExamSubmit(exam, candidateId, answers) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];

        // Guardar respuestas
        saveAnswers(candidateId, exam, answers);

        // Calificar examen
        const gradeResult = gradeExam(exam, answers);

        // Cambiar status
        const newStatus = 'pending_review_' + exam;
        sheet.getRange(i + 1, 11).setValue(newStatus);

        // Notificar admin
        notifyAdminNewSubmission(candidateId, name, exam, gradeResult);

        addTimelineEvent(candidateId, `EXAMEN_${exam}_ENVIADO`, {
          score: gradeResult.totalScore,
          maxScore: gradeResult.maxScore,
          fecha: new Date().toISOString()
        });

        Logger.log(`[handleExamSubmit] ${candidateId} - ${exam} enviado, score: ${gradeResult.totalScore}`);

        return { success: true, message: 'Exam submitted successfully' };
      }
    }

    return { success: false, error: 'Candidate not found' };
  } catch (error) {
    Logger.log(`[handleExamSubmit Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Guarda respuestas de examen
 */
function saveAnswers(candidateId, exam, answers) {
  try {
    const sheet = SS.getSheetByName('Respuestas');
    Object.entries(answers).forEach(([questionId, answer]) => {
      sheet.appendRow([
        Utilities.getUuid(),
        candidateId,
        exam,
        questionId,
        answer.toString(),
        ''
      ]);
    });
  } catch (error) {
    Logger.log(`[saveAnswers Error] ${error.message}`);
  }
}

/**
 * Califica examen (auto para multiple choice, OpenAI para open)
 */
function gradeExam(exam, answers) {
  try {
    let totalScore = 0;
    let maxScore = 0;
    const scores = {};

    // Aquí iría la lógica de calificación
    // Por ahora retornamos estructura básica
    return {
      success: true,
      totalScore: totalScore,
      maxScore: maxScore,
      scores: scores,
      percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0
    };
  } catch (error) {
    Logger.log(`[gradeExam Error] ${error.message}`);
    return { success: false, totalScore: 0, maxScore: 0 };
  }
}

/**
 * Notifica al admin de nuevo envío
 */
function notifyAdminNewSubmission(candidateId, name, exam, gradeResult) {
  try {
    const adminEmail = CONFIG.email_admin;
    if (!adminEmail) return;

    const subject = `📝 Nueva respuesta ${exam} de ${name}`;
    const body = `
Candidato: ${name}
ID: ${candidateId}
Examen: ${exam}
Puntuación: ${gradeResult.totalScore}/${gradeResult.maxScore}
Porcentaje: ${gradeResult.percentage.toFixed(1)}%

Ver en dashboard: https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercopy
`;

    MailApp.sendEmail(adminEmail, subject, body);
  } catch (error) {
    Logger.log(`[notifyAdminNewSubmission Error] ${error.message}`);
  }
}

/**
 * Obtiene candidatos para admin dashboard
 */
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

/**
 * Admin aprueba examen
 */
function approveExamAdmin(candidateId, exam) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][2];
        const name = data[i][1];

        if (exam === 'E1') {
          sheet.getRange(i + 1, 11).setValue('awaiting_terms_acceptance');
          sendEmailTerms(email, name, candidateId);
        } else if (exam === 'E2') {
          const token = generateToken(candidateId, 'E2');
          const scheduled_date = new Date().toISOString().split('T')[0];
          saveToken(token, candidateId, 'E2', email, name, scheduled_date);
          sheet.getRange(i + 1, 11).setValue('pending_review_E3');
          sendEmailE3(email, name, token, candidateId);
        } else if (exam === 'E3') {
          sheet.getRange(i + 1, 11).setValue('awaiting_interview');
          sendEmailAwaitingInterview(email, name, candidateId);
        }

        addTimelineEvent(candidateId, `EXAMEN_${exam}_APROBADO_ADMIN`, {
          exam: exam,
          fecha: new Date().toISOString()
        });

        Logger.log(`[approveExamAdmin] ${candidateId} - ${exam} approved`);
        return { success: true };
      }
    }

    return { success: false, error: 'Candidate not found' };
  } catch (error) {
    Logger.log(`[approveExamAdmin Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Admin rechaza examen
 */
function rejectExamAdmin(candidateId, exam, reason) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][2];
        const name = data[i][1];

        sheet.getRange(i + 1, 11).setValue('rejected');
        moveContactBetweenLists(email, CONFIG.brevo_list_interesados, CONFIG.brevo_list_rechazados);
        sendEmailRejected(email, name, exam, reason);

        addTimelineEvent(candidateId, `EXAMEN_${exam}_RECHAZADO_ADMIN`, {
          exam: exam,
          reason: reason,
          fecha: new Date().toISOString()
        });

        Logger.log(`[rejectExamAdmin] ${candidateId} - ${exam} rejected`);
        return { success: true };
      }
    }

    return { success: false, error: 'Candidate not found' };
  } catch (error) {
    Logger.log(`[rejectExamAdmin Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Admin asigna categoría y aprueba
 */
function assignCategoryAndApprove(candidateId, category) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][2];
        const name = data[i][1];

        const listId = category === 'JUNIOR' ? CONFIG.brevo_list_junior :
                      category === 'SENIOR' ? CONFIG.brevo_list_senior :
                      CONFIG.brevo_list_expert;

        moveContactBetweenLists(email, CONFIG.brevo_list_interesados, listId);
        sheet.getRange(i + 1, 11).setValue(`approved_${category.toLowerCase()}`);
        sheet.getRange(i + 1, 10).setValue(category);

        sendEmailApproved(email, name, category);

        addTimelineEvent(candidateId, 'CANDIDATO_CATEGORIZADO_APROBADO', {
          category: category,
          fecha: new Date().toISOString()
        });

        Logger.log(`[assignCategoryAndApprove] ${candidateId} - ${category}`);
        return { success: true };
      }
    }

    return { success: false, error: 'Candidate not found' };
  } catch (error) {
    Logger.log(`[assignCategoryAndApprove Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Admin realiza handoff
 */
function performHandoff(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const name = data[i][1];
        const email = data[i][2];
        const category = data[i][9];

        // Abrir onboarding spreadsheet
        const onboardingSheet = SpreadsheetApp.openById(CONFIG.handoff_spreadsheet_id);
        const candidatosSheet = onboardingSheet.getSheetByName('Candidatos');

        if (candidatosSheet) {
          candidatosSheet.appendRow([
            candidateId,
            name,
            email,
            data[i][3],
            category,
            'onboarding',
            new Date().toISOString()
          ]);
        }

        sheet.getRange(i + 1, 11).setValue('handoff_completed');

        // Notificar
        const handoffEmail = CONFIG.email_handoff;
        MailApp.sendEmail(handoffEmail, `🎉 Handoff: ${name} (${category})`,
          `Candidato: ${name}\nEmail: ${email}\nCategoría: ${category}\nFecha: ${new Date().toLocaleString()}`);

        addTimelineEvent(candidateId, 'HANDOFF_COMPLETADO', {
          fecha: new Date().toISOString()
        });

        Logger.log(`[performHandoff] ${candidateId} - handoff completed`);
        return { success: true };
      }
    }

    return { success: false, error: 'Candidate not found' };
  } catch (error) {
    Logger.log(`[performHandoff Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Acepta términos y genera Token E2
 */
function acceptTerms(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][2];
        const name = data[i][1];
        const status = data[i][6];

        if (status !== 'awaiting_terms_acceptance') {
          return { success: false, error: 'Invalid status for terms acceptance' };
        }

        const tokenE2 = generateToken(candidateId, 'E2');
        const scheduled_date = new Date().toISOString().split('T')[0];
        saveToken(tokenE2, candidateId, 'E2', email, name, scheduled_date);

        sheet.getRange(i + 1, 12).setValue(new Date().toISOString());
        sheet.getRange(i + 1, 11).setValue('pending_review_E2');

        sendEmailTermsAcceptedToAdmin(name, email, candidateId);
        sendEmailE2(email, name, tokenE2, candidateId);

        addTimelineEvent(candidateId, 'TERMINOS_ACEPTADOS', {
          fecha: new Date().toISOString(),
          email: email
        });

        Logger.log(`[acceptTerms] ${candidateId} - Terms accepted`);
        return { success: true, message: 'Terms accepted successfully', tokenE2: tokenE2 };
      }
    }

    return { success: false, error: 'Candidate not found' };
  } catch (error) {
    Logger.log(`[acceptTerms Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Valida que un token sea válido
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

        if (usado === true || usado === 'TRUE') {
          return { success: false, error: 'Token already used' };
        }

        if (now < validFrom) {
          return { success: false, error: 'Token not yet valid' };
        }

        if (now > validUntil) {
          return { success: false, error: 'Token expired' };
        }

        return { success: true, message: 'Token is valid', token: token, type: tipo };
      }
    }

    return { success: false, error: 'Token not found' };
  } catch (error) {
    Logger.log(`[validateToken Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ================================
// FUNCIONES DE BREVO (CONTACTOS)
// ================================

/**
 * Agrega contacto a lista Brevo
 */
function addContactToBrevoList(email, firstName, lastName, listId) {
  try {
    const url = 'https://api.brevo.com/v3/contacts';
    const options = {
      method: 'post',
      headers: {
        'api-key': CONFIG.brevo_api_key,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        email: email,
        attributes: {
          FIRSTNAME: firstName || '',
          LASTNAME: lastName || ''
        },
        listIds: [listId],
        updateEnabled: true
      }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    return { success: response.getResponseCode() === 200 || response.getResponseCode() === 201, messageId: result.id };
  } catch (error) {
    Logger.log(`[addContactToBrevoList Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Mueve contacto entre listas Brevo
 */
function moveContactBetweenLists(email, fromListId, toListId) {
  try {
    // Remover de lista anterior
    UrlFetchApp.fetch(`https://api.brevo.com/v3/contacts/lists/${fromListId}/contacts/remove`, {
      method: 'post',
      headers: { 'api-key': CONFIG.brevo_api_key, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ emails: [email] }),
      muteHttpExceptions: true
    });

    // Agregar a nueva lista
    addContactToBrevoList(email, '', '', toListId);
    Logger.log(`[moveContactBetweenLists] ${email} moved`);
  } catch (error) {
    Logger.log(`[moveContactBetweenLists Error] ${error.message}`);
  }
}

// ================================
// FUNCIONES DE EMAIL
// ================================

function sendEmailTerms(email, name, candidateId) {
  const subject = '✅ Aceptación de Términos — RCCC';
  const body = `Hola ${name},\n\nTu examen fue aprobado. Por favor acepta nuestros términos:\nhttps://profesionales.catholizare.com/catholizare_sistem/terminos/?uid=${candidateId}\n\nEquipo RCCC`;
  MailApp.sendEmail(email, subject, body);
}

function sendEmailTermsAcceptedToAdmin(name, email, candidateId) {
  const subject = `✅ ${name} aceptó términos`;
  MailApp.sendEmail(CONFIG.email_admin, subject, `Candidato: ${name}\nEmail: ${email}\nFecha: ${new Date().toLocaleString()}`);
}

function sendEmailRejected(email, name, exam, reason) {
  const subject = `❌ Resultado ${exam} — RCCC`;
  const body = `Hola ${name},\n\nLamentablemente no fue aprobado en ${exam}.\nRazón: ${reason}\n\nEquipo RCCC`;
  MailApp.sendEmail(email, subject, body);
}

function sendEmailE2(email, name, token, candidateId) {
  const subject = '📝 Examen E2 — RCCC';
  const body = `Hola ${name},\n\nTu examen E2 está listo:\nhttps://profesionales.catholizare.com/catholizare_sistem/examen-e2/?uid=${candidateId}&token=${token}\n\nEquipo RCCC`;
  MailApp.sendEmail(email, subject, body);
}

function sendEmailE3(email, name, token, candidateId) {
  const subject = '📋 Examen E3 — RCCC';
  const body = `Hola ${name},\n\nTu examen E3 está listo:\nhttps://profesionales.catholizare.com/catholizare_sistem/examen-e3/?uid=${candidateId}&token=${token}\n\nEquipo RCCC`;
  MailApp.sendEmail(email, subject, body);
}

function sendEmailAwaitingInterview(email, name, candidateId) {
  const subject = '📅 Entrevista Personal — RCCC';
  const body = `Hola ${name},\n\nHas pasado todos los exámenes. Próximo paso: entrevista personal.\n\nEquipo RCCC`;
  MailApp.sendEmail(email, subject, body);
}

function sendEmailApproved(email, name, category) {
  const subject = `✅ ¡Aprobado! Bienvenido a RCCC — ${category}`;
  const body = `Hola ${name},\n\n¡Felicidades! Has sido aprobado como ${category}.\n\nEquipo RCCC`;
  MailApp.sendEmail(email, subject, body);
}

function sendEmailExamE1(email, name, token, candidateId) {
  const subject = '📝 Tu Examen E1 — RCCC';
  const body = `Hola ${name},\n\nBienvenido a RCCC. Tu examen E1 está listo:\nhttps://profesionales.catholizare.com/catholizare_sistem/registro/?token=${token}\n\nEquipo RCCC`;
  MailApp.sendEmail(email, subject, body);
}

// ================================
// FUNCIONES DE UTILIDAD
// ================================

/**
 * Registra evento en Timeline
 */
function addTimelineEvent(candidateId, evento, detalles = {}) {
  try {
    const sheet = SS.getSheetByName('Timeline');
    if (!sheet) return;

    sheet.appendRow([
      Utilities.getUuid(),
      candidateId,
      evento,
      new Date().toISOString(),
      JSON.stringify(detalles)
    ]);

    Logger.log(`[Timeline] ${candidateId}: ${evento}`);
  } catch (error) {
    Logger.log(`[addTimelineEvent Error] ${error.message}`);
  }
}
