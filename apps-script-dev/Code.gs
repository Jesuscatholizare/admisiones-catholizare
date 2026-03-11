/**
 * SISTEMA DE SELECCIÓN DE CANDIDATOS - RCCC
 * Versión 3.0
 *
 * Stack: Google Apps Script + Google Sheets
 * Integraciones: OpenAI, Brevo, Resend
 * Seguridad: Tokens con ventanas ISO, Anti-fraude
 * Flujo: E1 → E2 → E3 → Entrevista → Aprobado
 *
 * GitHub: https://github.com/Jesuscatholizare/admisiones-catholizare
 */

// ============================================
// PASO 1: INICIALIZACIÓN DE SPREADSHEET
// Ejecutar UNA SOLA VEZ para crear las hojas
// ============================================
/**
 * Crea/ajusta automáticamente todas las hojas necesarias.
 * Ejecutar desde: Dropdown > initializeSpreadsheet > ▶️
 */
function initializeSpreadsheet() {
  Logger.log('Inicializando Spreadsheet RCCC...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const SHEETS_SCHEMA = {
    'Config': {
      headers: ['Clave', 'Valor', 'Tipo']
    },
    'Candidatos': {
      headers: ['candidate_id', 'registration_date', 'name', 'email', 'phone', 'country',
                'birthday', 'professional_type', 'therapeutic_approach', 'about',
                'status', 'last_interaction_date', 'final_category', 'final_status', 'notes']
    },
    'Tokens': {
      headers: ['token', 'candidate_id', 'exam', 'created_at', 'valid_from', 'valid_until',
                'used', 'status', 'email', 'name', 'scheduled_date']
    },
    'Timeline': {
      headers: ['timestamp', 'candidate_id', 'event_type', 'details_json', 'actor']
    },
    'Test_E1_Respuestas': {
      headers: ['candidate_id', 'started_at', 'finished_at', 'elapsed_seconds',
                'responses_json', 'blur_events', 'copy_attempts', 'ai_detection_count',
                'verdict', 'openai_score_json', 'flags']
    },
    'Test_E2_Respuestas': {
      headers: ['candidate_id', 'started_at', 'finished_at', 'elapsed_seconds',
                'responses_json', 'blur_events', 'copy_attempts', 'ai_detection_count',
                'verdict', 'openai_score_json', 'flags']
    },
    'Test_E3_Respuestas': {
      headers: ['candidate_id', 'started_at', 'finished_at', 'elapsed_seconds',
                'responses_json', 'blur_events', 'copy_attempts', 'ai_detection_count',
                'verdict', 'openai_score_json', 'flags']
    },
    'Resultados': {
      headers: ['timestamp', 'candidate_id', 'name', 'email', 'E1_score', 'E2_score', 'E3_score',
                'average_score', 'verdict', 'category', 'details_json']
    },
    'Notificaciones': {
      headers: ['timestamp', 'email', 'subject', 'provider', 'status', 'iso_timestamp']
    },
    'Preguntas': {
      headers: ['Cuestionario', 'N', 'id', 'type', 'category', 'ai_check', 'texto',
                'option_1', 'option_2', 'option_3', 'option_4', 'option_5',
                'correct', 'almost', 'rubric_max_points', 'rubric_criteria',
                'rubric_red_flags', 'rubric_raw']
    },
    'Usuarios': {
      headers: ['email', 'password_hash', 'role', 'created_date', 'last_login', 'status']
    },
    'Sessions': {
      headers: ['session_id', 'user_email', 'created_at', 'expires_at', 'ip_address', 'user_agent']
    },
    'Login_Audit': {
      headers: ['timestamp', 'email', 'attempt_type', 'success', 'ip_address', 'notes']
    }
  };

  const headerBg = '#001A55';
  const headerFg = '#FFFFFF';

  Object.keys(SHEETS_SCHEMA).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('Creada hoja: ' + sheetName);
    }
    _setSheetHeaders(sheet, SHEETS_SCHEMA[sheetName].headers, headerBg, headerFg);
    Logger.log('OK: ' + sheetName);
  });

  // Eliminar "Hoja 1" si existe
  try {
    const hoja1 = ss.getSheetByName('Hoja 1');
    if (hoja1) ss.deleteSheet(hoja1);
  } catch(e) {}

  _initConfigDefaults(ss);
  Logger.log('Spreadsheet inicializado. Configura las API keys en la hoja Config.');
}

function _setSheetHeaders(sheet, headers, bgColor, fgColor) {
  const maxCols = sheet.getMaxColumns();
  if (maxCols < headers.length) {
    sheet.insertColumnsAfter(maxCols, headers.length - maxCols);
  }
  const lastCol = sheet.getLastColumn();
  if (lastCol > headers.length) {
    sheet.deleteColumns(headers.length + 1, lastCol - headers.length);
  }
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setBackground(bgColor);
  range.setFontColor(fgColor);
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
  try { range.setRowHeight(30); } catch(e) {}
  sheet.setFrozenRows(1);
  try { sheet.autoResizeColumns(1, headers.length); } catch(e) {}
}

function _initConfigDefaults(ss) {
  const sheet = ss.getSheetByName('Config');
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    Logger.log('Config ya tiene datos. No se sobreescribe.');
    return;
  }
  const defaults = [
    ['OPENAI_API_KEY',          '',                       'string'],
    ['OPENAI_MODEL',            'gpt-4o-mini',            'string'],
    ['BREVO_API_KEY',           '',                       'string'],
    ['RESEND_API_KEY',          '',                       'string'],
    ['EMAIL_FROM',              'noreply@catholizare.com','string'],
    ['EMAIL_ADMIN',             'admin@catholizare.com',  'string'],
    ['EMAIL_SUPPORT',           'soporte@catholizare.com','string'],
    ['EMAIL_HANDOFF',           'catholizare@gmail.com',  'string'],
    ['TIMEZONE',                'America/Bogota',         'string'],
    ['APP_NAME',                'RCCC Evaluaciones',      'string'],
    ['HANDOFF_SPREADSHEET_ID',  '',                       'string'],
    ['ADMIN_PIN',               '',                       'string'],
    ['EXAM_E1_DURATION_MIN',    '120',                    'number'],
    ['EXAM_E1_MIN_SCORE',       '75',                     'number'],
    ['EXAM_E2_DURATION_MIN',    '120',                    'number'],
    ['EXAM_E2_MIN_SCORE',       '75',                     'number'],
    ['EXAM_E3_DURATION_MIN',    '120',                    'number'],
    ['EXAM_E3_MIN_SCORE',       '75',                     'number'],
    ['CATEGORY_JUNIOR_MIN',     '75',                     'number'],
    ['CATEGORY_JUNIOR_MAX',     '79',                     'number'],
    ['CATEGORY_SENIOR_MIN',     '80',                     'number'],
    ['CATEGORY_SENIOR_MAX',     '89',                     'number'],
    ['CATEGORY_EXPERT_MIN',     '90',                     'number'],
    ['BREVO_LIST_INTERESADOS',  '3',                      'number'],
    ['BREVO_LIST_RECHAZADOS',   '4',                      'number'],
    ['BREVO_LIST_APROBADOS',    '5',                      'number'],
    ['BREVO_LIST_JUNIOR',       '6',                      'number'],
    ['BREVO_LIST_SENIOR',       '7',                      'number'],
    ['BREVO_LIST_EXPERT',       '8',                      'number'],
    ['INACTIVE_DAYS_THRESHOLD', '20',                     'number']
  ];
  defaults.forEach((row, idx) => {
    sheet.getRange(idx + 2, 1, 1, 3).setValues([row]);
  });
  Logger.log('Config inicializada con valores por defecto.');
}

// ================================
// CONFIGURACIÓN CENTRAL
// ================================
const SS = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Mapa de aliases: clave interna v3.0 → nombre real en Script Properties.
 * Permite que el código use nombres descriptivos mientras las Properties
 * usan los nombres cortos que ya tienes configurados.
 */
const PROP_ALIASES = {
  'BREVO_LIST_INTERESADOS': 'INTERESADOS',
  'BREVO_LIST_RECHAZADOS':  'RECHAZADOS',   // en Props puede aparecer como "RECHAZADOS:"
  'BREVO_LIST_APROBADOS':   'APROBADOS',
  'BREVO_LIST_JUNIOR':      'JUNIOR',
  'BREVO_LIST_SENIOR':      'SENIOR',
  'BREVO_LIST_EXPERT':      'EXPERT',
};

/**
 * Lee una clave de configuración.
 * Orden de prioridad:
 *   1. Script Properties (nombre exacto)
 *   2. Script Properties (alias del mapa PROP_ALIASES)
 *   3. Hoja "Config" de Google Sheets (fallback)
 *   4. defaultValue
 */
function getConfig(key, defaultValue) {
  if (defaultValue === undefined) defaultValue = null;
  try {
    const props = PropertiesService.getScriptProperties();

    // 1. Nombre exacto en Script Properties
    let raw = props.getProperty(key);

    // 2. Alias (ej: BREVO_LIST_JUNIOR → JUNIOR)
    if (raw === null && PROP_ALIASES[key]) {
      raw = props.getProperty(PROP_ALIASES[key]);
      // Algunos nombres tienen colon al final (ej: "RECHAZADOS:")
      if (raw === null) raw = props.getProperty(PROP_ALIASES[key] + ':');
    }

    if (raw !== null && raw !== '') {
      // Si es número puro, convertir
      if (!isNaN(raw) && raw.trim() !== '') return Number(raw);
      // Si parece JSON, parsear
      if (raw.startsWith('{') || raw.startsWith('[')) {
        try { return JSON.parse(raw); } catch(e) {}
      }
      return raw;
    }

    // 3. Fallback: hoja Config
    const sheet = SS.getSheetByName('Config');
    if (!sheet) return defaultValue;
    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      const cellValue = data[i][0];
      if (!cellValue) continue;
      if (data[i][1] !== undefined && data[i][1] !== '') {
        if (cellValue === key) {
          const value = data[i][1];
          const type  = data[i][2] || 'string';
          if (type === 'json')   return JSON.parse(value);
          if (type === 'number') return Number(value);
          return value;
        }
      }
    }
  } catch (e) {
    Logger.log('Error obteniendo config ' + key + ': ' + e.message);
  }
  return defaultValue;
}

/**
 * Función de diagnóstico: verifica que todas las claves críticas
 * están resueltas. Ejecutar desde el editor GAS para validar.
 * Dropdown → testConfig → ▶️
 */
function testConfig() {
  const keys = [
    'OPENAI_API_KEY', 'OPENAI_MODEL',
    'BREVO_API_KEY', 'RESEND_API_KEY',
    'EMAIL_FROM', 'EMAIL_ADMIN',
    'BREVO_LIST_INTERESADOS', 'BREVO_LIST_RECHAZADOS',
    'BREVO_LIST_JUNIOR', 'BREVO_LIST_SENIOR', 'BREVO_LIST_EXPERT',
    'ADMIN_PIN', 'TIMEZONE'
  ];
  Logger.log('=== TEST CONFIG ===');
  keys.forEach(k => {
    const v = getConfig(k);
    const display = (k.includes('KEY') || k.includes('PIN'))
      ? (v ? '***' + String(v).slice(-4) : 'FALTA')
      : (v !== null ? String(v) : 'FALTA');
    Logger.log((v !== null ? '✓' : '✗') + ' ' + k + ': ' + display);
  });
  Logger.log('==================');
}

const CONFIG = {
  get openai_api_key()          { return getConfig('OPENAI_API_KEY'); },
  get openai_model()            { return getConfig('OPENAI_MODEL', 'gpt-4o-mini'); },
  get brevo_api_key()           { return getConfig('BREVO_API_KEY'); },
  get resend_api_key()          { return getConfig('RESEND_API_KEY'); },
  get email_from()              { return getConfig('EMAIL_FROM'); },
  get email_admin()             { return getConfig('EMAIL_ADMIN'); },
  get email_support()           { return getConfig('EMAIL_SUPPORT'); },
  get email_handoff()           { return getConfig('EMAIL_HANDOFF', 'catholizare@gmail.com'); },
  get timezone()                { return getConfig('TIMEZONE', 'America/Bogota'); },
  get app_name()                { return getConfig('APP_NAME', 'RCCC Evaluaciones'); },
  get handoff_spreadsheet_id()  { return getConfig('HANDOFF_SPREADSHEET_ID', ''); },
  get admin_pin()               { return getConfig('ADMIN_PIN', ''); },
  // Exámenes
  get exam_e1_duration()        { return getConfig('EXAM_E1_DURATION_MIN', 120); },
  get exam_e1_min_score()       { return getConfig('EXAM_E1_MIN_SCORE', 75); },
  get exam_e2_duration()        { return getConfig('EXAM_E2_DURATION_MIN', 120); },
  get exam_e2_min_score()       { return getConfig('EXAM_E2_MIN_SCORE', 75); },
  get exam_e3_duration()        { return getConfig('EXAM_E3_DURATION_MIN', 120); },
  get exam_e3_min_score()       { return getConfig('EXAM_E3_MIN_SCORE', 75); },
  // Categorías
  get category_junior_min()     { return getConfig('CATEGORY_JUNIOR_MIN', 75); },
  get category_junior_max()     { return getConfig('CATEGORY_JUNIOR_MAX', 79); },
  get category_senior_min()     { return getConfig('CATEGORY_SENIOR_MIN', 80); },
  get category_senior_max()     { return getConfig('CATEGORY_SENIOR_MAX', 89); },
  get category_expert_min()     { return getConfig('CATEGORY_EXPERT_MIN', 90); },
  // Brevo listas
  get brevo_list_interesados()  { return getConfig('BREVO_LIST_INTERESADOS', 3); },
  get brevo_list_rechazados()   { return getConfig('BREVO_LIST_RECHAZADOS', 4); },
  get brevo_list_aprobados()    { return getConfig('BREVO_LIST_APROBADOS', 5); },
  get brevo_list_junior()       { return getConfig('BREVO_LIST_JUNIOR', 6); },
  get brevo_list_senior()       { return getConfig('BREVO_LIST_SENIOR', 7); },
  get brevo_list_expert()       { return getConfig('BREVO_LIST_EXPERT', 8); },
  get inactive_days()           { return getConfig('INACTIVE_DAYS_THRESHOLD', 20); }
};

// ================================
// ROUTER PRINCIPAL (doPost / doGet)
// ================================
/**
 * POST: Recibe acciones desde proxy.php
 */
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;
    Logger.log('[doPost] Accion: ' + action);

    switch(action) {
      case 'initial_registration': return handleRegistration(data);
      case 'submit_exam':          return handleExamSubmit(data);
      case 'acceptTerms':          return handleAcceptTerms(data);
      case 'approveExam':          return handleApproveExam(data);
      case 'rejectExam':           return handleRejectExam(data);
      case 'assignCategory':       return handleAssignCategory(data);
      case 'adminLogin':           return handleAdminLogin(data);
      case 'verifyOTP':            return handleVerifyOTP(data);
      default:
        return jsonResponse(false, 'Accion no valida: ' + action);
    }
  } catch (error) {
    Logger.log('[ERROR doPost] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

/**
 * GET: Sirve datos al frontend
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const token  = e.parameter.token;
    const exam   = e.parameter.exam;
    Logger.log('[doGet] Accion: ' + action + ', Exam: ' + exam);

    if (action === 'get_exam')          return getExamData(token, exam);
    if (action === 'getDashboardData')  return handleGetDashboardData();
    if (action === 'health')            return jsonResponse(true, 'OK', checkSystemHealth());

    return jsonResponse(false, 'Accion no valida');
  } catch (error) {
    Logger.log('[ERROR doGet] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

// ================================
// MODULO: REGISTRO
// ================================
function handleRegistration(data) {
  try {
    const candidate     = data.candidate;
    const scheduled_date = data.scheduled_date;

    if (!candidate || !candidate.name || !candidate.email)
      return jsonResponse(false, 'Faltan datos requeridos');
    if (!isValidEmail(candidate.email))
      return jsonResponse(false, 'Email invalido');
    if (!scheduled_date)
      return jsonResponse(false, 'Fecha agendada requerida');

    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) return jsonResponse(false, 'Hoja Candidatos no encontrada');

    // Verificar email duplicado
    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][3] === candidate.email)
        return jsonResponse(false, 'Email ya registrado');
    }

    const candidate_id        = generateCandidateId();
    const registration_date   = new Date();

    sheet.appendRow([
      candidate_id, registration_date,
      candidate.name, candidate.email,
      candidate.phone || '', candidate.country || '',
      candidate.birthday || '', candidate.professional_type || '',
      candidate.therapeutic_approach || '', candidate.about || '',
      'registered', registration_date, '', '', ''
    ]);

    const token = generateToken(candidate_id, 'E1');
    saveToken(token, candidate_id, 'E1', candidate.email, candidate.name, scheduled_date);

    addTimelineEvent(candidate_id, 'CANDIDATO_REGISTRADO', {
      nombre: candidate.name, email: candidate.email, fecha_agendada: scheduled_date
    });

    addContactToBrevoList(
      candidate.email,
      candidate.name.split(' ')[0] || '',
      candidate.name.split(' ').slice(1).join(' ') || '',
      CONFIG.brevo_list_interesados
    );

    sendWelcomeEmail(candidate.email, candidate.name, token, candidate_id, scheduled_date);
    notifyAdminNewCandidate(candidate.name, candidate.email, candidate_id, scheduled_date);

    return jsonResponse(true, 'Registro exitoso. Revisa tu email.', {
      candidate_id: candidate_id,
      token: token
    });
  } catch (error) {
    Logger.log('[ERROR handleRegistration] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

// ================================
// MODULO: TÉRMINOS Y CONDICIONES
// ================================
function handleAcceptTerms(data) {
  try {
    const candidateId = data.candidate_id;
    if (!candidateId) return jsonResponse(false, 'candidate_id requerido');

    const result = acceptTerms(candidateId);
    if (result.success) {
      return jsonResponse(true, 'Términos aceptados. Token E2 enviado a tu email.', {
        candidate_id: candidateId
      });
    }
    return jsonResponse(false, result.error || 'Error al aceptar términos');
  } catch (error) {
    Logger.log('[ERROR handleAcceptTerms] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

function acceptTerms(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name  = data[i][2];
        sheet.getRange(i + 1, 11).setValue('pending_review_E2');
        const token          = generateToken(candidateId, 'E2');
        const scheduled_date = new Date().toISOString().split('T')[0];
        saveToken(token, candidateId, 'E2', email, name, scheduled_date);
        sendEmailE2(email, name, token, candidateId);
        addTimelineEvent(candidateId, 'TERMINOS_ACEPTADOS', {
          email: email, token_e2_generado: token
        });
        return { success: true, token: token };
      }
    }
    return { success: false, error: 'Candidato no encontrado' };
  } catch (error) {
    Logger.log('[acceptTerms Error] ' + error.message);
    return { success: false, error: error.message };
  }
}

// ================================
// MODULO: EXAMENES
// ================================
function handleExamSubmit(data) {
  try {
    const token      = data.token;
    const exam       = data.exam;
    const answers    = data.answers;
    const startedAt  = data.startedAt;
    const finishedAt = data.finishedAt;
    const blur_count = data.blur_count || 0;
    const copy_count = data.copy_count || 0;

    const tokenData = verifyToken(token, exam);
    if (!tokenData.valid) return jsonResponse(false, tokenData.message);

    const candidate_id    = tokenData.candidate_id;
    const candidate_email = tokenData.email;
    const candidate_name  = tokenData.name;

    const elapsedMinutes = (new Date(finishedAt) - new Date(startedAt)) / (1000 * 60);
    const maxDuration    = getExamDuration(exam);
    if (elapsedMinutes > maxDuration + 5)
      return jsonResponse(false, 'Tiempo excedido. Maximo: ' + maxDuration + ' minutos');
    if (!answers || Object.keys(answers).length === 0)
      return jsonResponse(false, 'Debes responder al menos una pregunta');

    const results     = gradeExam(exam, answers);
    const score       = results.score;
    const flags       = results.flags;
    const ai_detected = results.ai_detected || 0;

    let verdict  = 'fail';
    const min_score = getMinScoreForExam(exam);
    if (score >= min_score && ai_detected === 0) verdict = 'pass';
    else if (ai_detected > 0)                    verdict = 'review';

    saveExamResult(candidate_id, exam, {
      started_at: startedAt, finished_at: finishedAt,
      elapsed_seconds: Math.round(elapsedMinutes * 60),
      responses_json: JSON.stringify(answers),
      blur_events: blur_count, copy_attempts: copy_count,
      ai_detection_count: ai_detected, verdict: verdict,
      openai_score_json: JSON.stringify(results.scores),
      flags: JSON.stringify(flags)
    });

    updateCandidateStatus(candidate_id, 'pending_review_' + exam);
    updateLastInteraction(candidate_id);
    addTimelineEvent(candidate_id, 'TEST_' + exam + '_COMPLETADO', {
      puntaje: score, veredicto: verdict, flags: flags
    });
    notifyAdminExamCompleted(candidate_name, candidate_email, exam, score, verdict, flags);
    markTokenAsUsed(token);

    return jsonResponse(true, 'Examen ' + exam + ' recibido. Estado: ' + verdict, {
      verdict: verdict, score: score, flags: flags
    });
  } catch (error) {
    Logger.log('[ERROR handleExamSubmit] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

// ================================
// MODULO: ACCIONES ADMIN (desde dashboard)
// ================================

/**
 * GET /exec?action=getDashboardData
 * Retorna candidatos + estadísticas para el dashboard.
 */
function handleGetDashboardData() {
  try {
    const candidatesResult = getCandidatesForAdmin();
    const stats            = getDashboardStats();
    return jsonResponse(true, 'OK', {
      candidates: candidatesResult.candidates || [],
      stats:      stats
    });
  } catch (error) {
    Logger.log('[ERROR handleGetDashboardData] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

/**
 * POST action=approveExam
 * Body: { candidateId, exam, notes }
 */
function handleApproveExam(data) {
  try {
    const candidateId = data.candidateId;
    const exam        = data.exam;
    if (!candidateId || !exam) return jsonResponse(false, 'candidateId y exam requeridos');
    const result = approveExamAdmin(candidateId, exam);
    if (result.success) return jsonResponse(true, 'Examen ' + exam + ' aprobado');
    return jsonResponse(false, result.error || 'Error al aprobar');
  } catch (error) {
    Logger.log('[ERROR handleApproveExam] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

/**
 * POST action=rejectExam
 * Body: { candidateId, exam, reason }
 */
function handleRejectExam(data) {
  try {
    const candidateId = data.candidateId;
    const exam        = data.exam;
    const reason      = data.reason || '';
    if (!candidateId || !exam) return jsonResponse(false, 'candidateId y exam requeridos');
    const result = rejectExamAdmin(candidateId, exam, reason);
    if (result.success) return jsonResponse(true, 'Candidato rechazado');
    return jsonResponse(false, 'Error al rechazar');
  } catch (error) {
    Logger.log('[ERROR handleRejectExam] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

/**
 * POST action=assignCategory
 * Body: { candidateId, category, comments }
 */
function handleAssignCategory(data) {
  try {
    const candidateId = data.candidateId;
    const category    = data.category;
    if (!candidateId || !category) return jsonResponse(false, 'candidateId y category requeridos');
    const result = assignCategoryAndApprove(candidateId, category);
    if (result.success) return jsonResponse(true, 'Categoría asignada: ' + result.category, result);
    return jsonResponse(false, 'Error al asignar categoría');
  } catch (error) {
    Logger.log('[ERROR handleAssignCategory] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

/**
 * POST action=adminLogin
 * Body: { email, password, pin }
 * Por ahora valida solo por PIN (simple). Expandir con auth completo según necesidad.
 */
function handleAdminLogin(data) {
  try {
    const pin = data.pin || data.password || '';
    if (validateAdminPin(pin)) {
      return jsonResponse(true, 'Acceso concedido', { requiresOTP: false });
    }
    return jsonResponse(false, 'Credenciales inválidas');
  } catch (error) {
    Logger.log('[ERROR handleAdminLogin] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

/**
 * POST action=verifyOTP
 * Placeholder: OTP no implementado aún. Retorna error informativo.
 */
function handleVerifyOTP(data) {
  return jsonResponse(false, 'OTP no implementado en esta versión');
}

// ================================
// MODULO: FLUJO DE ADMIN (helpers)
// ================================
function getCandidatesForAdmin() {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) return { success: false, error: 'Sheet Candidatos no encontrada', candidates: [] };
    const data       = sheet.getDataRange().getValues();
    const candidates = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        candidates.push({
          candidato_id:     data[i][0],
          registration_date: data[i][1],
          nombre:           data[i][2],
          email:            data[i][3],
          telefono:         data[i][4],
          status:           data[i][10],
          last_interaction: data[i][11],
          final_category:   data[i][12],
          final_status:     data[i][13],
          notes:            data[i][14]
        });
      }
    }
    return { success: true, candidates: candidates };
  } catch (error) {
    Logger.log('[getCandidatesForAdmin Error] ' + error.message);
    return { success: false, error: error.message, candidates: [] };
  }
}

function approveExamAdmin(candidateId, exam) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name  = data[i][2];
        if (exam === 'E1') {
          sheet.getRange(i + 1, 11).setValue('awaiting_terms_acceptance');
          sendEmailTerms(email, name, candidateId);
        } else if (exam === 'E2') {
          const token          = generateToken(candidateId, 'E3');
          const scheduled_date = new Date().toISOString().split('T')[0];
          saveToken(token, candidateId, 'E3', email, name, scheduled_date);
          sheet.getRange(i + 1, 11).setValue('pending_review_E3');
          sendEmailE3(email, name, token, candidateId);
        } else if (exam === 'E3') {
          sheet.getRange(i + 1, 11).setValue('awaiting_interview');
          sendEmailAwaitingInterview(email, name, candidateId);
        }
        addTimelineEvent(candidateId, 'EXAMEN_' + exam + '_APROBADO_ADMIN', {
          exam: exam, fecha: new Date().toISOString()
        });
        return { success: true };
      }
    }
    return { success: false, error: 'Candidato no encontrado' };
  } catch (error) {
    Logger.log('[approveExamAdmin Error] ' + error.message);
    return { success: false, error: error.message };
  }
}

function rejectExamAdmin(candidateId, exam, reason) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name  = data[i][2];
        sheet.getRange(i + 1, 11).setValue('rejected');
        moveContactBetweenLists(email, CONFIG.brevo_list_interesados, CONFIG.brevo_list_rechazados);
        sendEmailRejected(email, name, exam, reason);
        addTimelineEvent(candidateId, 'EXAMEN_' + exam + '_RECHAZADO_ADMIN', {
          exam: exam, razon: reason
        });
        return { success: true };
      }
    }
    return { success: false };
  } catch (error) {
    Logger.log('[rejectExamAdmin Error] ' + error.message);
    return { success: false };
  }
}

function assignCategoryAndApprove(candidateId, category) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name  = data[i][2];
        let toListId;
        if (category === 'JUNIOR')      toListId = CONFIG.brevo_list_junior;
        else if (category === 'SENIOR') toListId = CONFIG.brevo_list_senior;
        else if (category === 'EXPERT') toListId = CONFIG.brevo_list_expert;
        else                            toListId = CONFIG.brevo_list_aprobados;
        moveContactBetweenLists(email, CONFIG.brevo_list_interesados, toListId);
        sheet.getRange(i + 1, 11).setValue('approved_' + category.toLowerCase());
        sheet.getRange(i + 1, 13).setValue(category);
        sendEmailApproved(email, name, category);
        addTimelineEvent(candidateId, 'CANDIDATO_CATEGORIZADO_APROBADO', {
          category: category, lista_brevo: toListId
        });
        return { success: true, category: category };
      }
    }
    return { success: false };
  } catch (error) {
    Logger.log('[assignCategoryAndApprove Error] ' + error.message);
    return { success: false };
  }
}

function performHandoff(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email    = data[i][3];
        const name     = data[i][2];
        const phone    = data[i][4];
        const category = data[i][12] || '';
        const handoffId = CONFIG.handoff_spreadsheet_id;
        if (!handoffId) return { success: false, error: 'HANDOFF_SPREADSHEET_ID no configurado' };
        const onboardingSpreadsheet = SpreadsheetApp.openById(handoffId);
        const handoffSheet = onboardingSpreadsheet.getSheetByName('Candidatos') ||
                             onboardingSpreadsheet.getSheets()[0];
        handoffSheet.appendRow([
          candidateId, name, email, phone, category,
          'onboarding_pending', new Date().toISOString(),
          'Transferido desde Sistema de Seleccion'
        ]);
        sheet.getRange(i + 1, 11).setValue('handoff_completed');
        sendHandoffNotification(email, name, category);
        addTimelineEvent(candidateId, 'HANDOFF_COMPLETADO', {
          email_notificacion: CONFIG.email_handoff,
          spreadsheet_id: handoffId, category: category
        });
        return { success: true };
      }
    }
    return { success: false };
  } catch (error) {
    Logger.log('[performHandoff Error] ' + error.message);
    return { success: false, error: error.message };
  }
}

function getDashboardStats() {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    const data = sheet.getDataRange().getValues();
    let total = 0, pending = 0, approved = 0, rejected = 0;
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      total++;
      const status = String(data[i][10] || '');
      if (status.includes('pending') || status.includes('awaiting') || status === 'registered') pending++;
      else if (status.includes('approved')) approved++;
      else if (status === 'rejected')        rejected++;
    }
    return { total, pending, approved, rejected };
  } catch (e) {
    Logger.log('Error en getDashboardStats: ' + e);
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
}

// ================================
// MODULO: TOKENS
// ================================
function generateToken(candidate_id, exam) {
  const timestamp = Date.now().toString().slice(-6);
  const random    = Math.random().toString(36).substring(2, 8);
  return exam + '_' + candidate_id.substring(0, 8) + '_' + timestamp + '_' + random;
}

function saveToken(token, candidate_id, exam, email, name, scheduled_date) {
  const sheet = SS.getSheetByName('Tokens');
  if (!sheet) { Logger.log('[saveToken] Hoja Tokens no encontrada'); return; }
  let valid_from, valid_until;
  if (scheduled_date) {
    const parts    = scheduled_date.split('-').map(Number);
    const dateObj  = new Date(parts[0], parts[1] - 1, parts[2]);
    valid_from     = new Date(dateObj);
    valid_from.setHours(6, 1, 0);
    valid_until    = new Date(dateObj);
    valid_until.setDate(valid_until.getDate() + 1);
    valid_until.setHours(23, 59, 59);
  } else {
    valid_from  = new Date();
    valid_until = new Date(valid_from.getTime() + 48 * 60 * 60 * 1000);
  }
  sheet.appendRow([
    token, candidate_id, exam, new Date(),
    Utilities.formatDate(valid_from,  CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    Utilities.formatDate(valid_until, CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    false, 'active', email, name, scheduled_date || ''
  ]);
  Logger.log('[saveToken] Token guardado: ' + token);
}

function verifyToken(token, exam) {
  const sheet = SS.getSheetByName('Tokens');
  if (!sheet) return { valid: false, message: 'Hoja Tokens no encontrada' };
  const data = sheet.getDataRange().getValues();
  const now  = new Date();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][2] === exam) {
      const used        = data[i][6];
      const status      = data[i][7];
      const valid_from  = new Date(data[i][4]);
      const valid_until = new Date(data[i][5]);
      if (used)              return { valid: false, message: 'Token ya fue usado' };
      if (status !== 'active') return { valid: false, message: 'Token no activo' };
      if (now < valid_from)  return { valid: false, message: 'Examen aun no disponible' };
      if (now > valid_until) return { valid: false, message: 'Token expirado' };
      return { valid: true, candidate_id: data[i][1], email: data[i][8], name: data[i][9] };
    }
  }
  return { valid: false, message: 'Token no encontrado' };
}

function markTokenAsUsed(token) {
  const sheet = SS.getSheetByName('Tokens');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      sheet.getRange(i + 1, 7).setValue(true);
      sheet.getRange(i + 1, 8).setValue('used');
      break;
    }
  }
}

// ================================
// MODULO: OPENAI
// ================================
function getQuestionsForExam(exam) {
  try {
    const sheet = SS.getSheetByName('Preguntas');
    if (!sheet) { Logger.log('[getQuestionsForExam] Hoja "Preguntas" no encontrada'); return []; }
    const data      = sheet.getDataRange().getValues();
    const questions = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === exam) {
        questions.push({
          n:               data[i][1],
          id:              data[i][2],
          type:            data[i][3],
          category:        data[i][4],
          ai_check:        data[i][5] === 'TRUE' || data[i][5] === true,
          texto:           data[i][6],
          options:         [data[i][7], data[i][8], data[i][9], data[i][10], data[i][11]].filter(o => o),
          correct:         data[i][12],
          rubric_max_points: data[i][14] || 2,
          rubric_criteria:   data[i][15] || '',
          rubric_red_flags:  data[i][16] || '',
          rubric_raw:        data[i][17] || ''
        });
      }
    }
    Logger.log('[getQuestionsForExam] ' + questions.length + ' preguntas para ' + exam);
    return questions;
  } catch (error) {
    Logger.log('[getQuestionsForExam Error] ' + error.message);
    return [];
  }
}

function gradeExam(exam, answers) {
  try {
    const questions = getQuestionsForExam(exam);
    if (!questions.length) return { score: 0, scores: {}, ai_detected: 0, flags: ['ERROR: No questions found'] };

    const results = { score: 0, scores: {}, ai_detected: 0, flags: [] };
    let totalScore = 0, maxScore = 0, aiDetectCount = 0;

    for (const question of questions) {
      const answer = answers[question.id] || '';
      maxScore += question.rubric_max_points;
      if (!answer || answer.toString().trim() === '') {
        results.scores[question.id] = { score: 0, feedback: 'Respuesta vacia', type: question.type };
        continue;
      }
      try {
        if (question.type === 'multiple') {
          if (answer === question.correct) {
            totalScore += question.rubric_max_points;
            results.scores[question.id] = { score: question.rubric_max_points, feedback: 'Correcto', type: 'multiple' };
          } else {
            results.scores[question.id] = { score: 0, feedback: 'Incorrecto', correct_answer: question.correct, type: 'multiple' };
          }
        } else if (question.type === 'open') {
          const aiScore = evaluateOpenWithRubric(question, answer.toString());
          totalScore += aiScore.score;
          results.scores[question.id] = aiScore;
          if (question.ai_check && aiScore.ai_probability > 60) {
            aiDetectCount++;
            results.flags.push('Q' + question.n + ': Posible IA (' + aiScore.ai_probability + '%)');
          }
        }
      } catch (e) {
        Logger.log('[gradeExam Q Error] Q' + question.id + ': ' + e.message);
        results.scores[question.id] = { score: 0, feedback: 'Error: ' + e.message, type: question.type };
      }
    }

    results.score       = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    results.ai_detected = aiDetectCount;
    results.maxScore    = maxScore;
    results.totalScore  = totalScore;
    Logger.log('[gradeExam] ' + exam + ': ' + results.score + '% | IA: ' + aiDetectCount);
    return results;
  } catch (error) {
    Logger.log('[gradeExam Fatal] ' + error.message);
    return { score: 0, scores: {}, ai_detected: 0, flags: ['FATAL ERROR: ' + error.message] };
  }
}

function evaluateOpenWithRubric(question, answer) {
  try {
    const apiKey = CONFIG.openai_api_key;
    if (!apiKey) return { score: 0, ai_probability: 0, feedback: 'Error: No OpenAI API key', type: 'open' };

    const prompt =
      'Eres evaluador de respuestas psicologicas para la Red de Psicologos Catolicos.\n\n' +
      'PREGUNTA: ' + question.texto + '\n\n' +
      'RESPUESTA DEL CANDIDATO: "' + answer + '"\n\n' +
      'RUBRICA: ' + question.rubric_criteria + '\n\n' +
      'RED FLAGS: ' + question.rubric_red_flags + '\n\n' +
      'Responde SOLO en JSON:\n' +
      '{"score":<0-' + question.rubric_max_points + '>,"ai_probability":<0-100>,' +
      '"rubric_level":"excelente|aceptable|rechazada","reasoning":"<breve>","feedback":"<para el candidato>"}';

    const payload = {
      model: CONFIG.openai_model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres evaluador academico. Responde SIEMPRE en JSON valido.' },
        { role: 'user',   content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    };

    const options = {
      method:  'post',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const httpCode = response.getResponseCode();
    if (httpCode !== 200) {
      Logger.log('[OpenAI Error] ' + httpCode + ': ' + response.getContentText());
      return { score: 0, ai_probability: 0, feedback: 'OpenAI Error ' + httpCode, type: 'open' };
    }

    const result  = JSON.parse(response.getContentText());
    const content = result.choices[0].message.content;
    const parsed  = JSON.parse(content);
    return {
      score:        Math.min(parseInt(parsed.score) || 0, question.rubric_max_points),
      ai_probability: parseInt(parsed.ai_probability) || 0,
      rubric_level: parsed.rubric_level || 'unknown',
      reasoning:    parsed.reasoning   || '',
      feedback:     parsed.feedback    || '',
      type:         'open'
    };
  } catch (error) {
    Logger.log('[evaluateOpenWithRubric Error] ' + error.message);
    return { score: 0, ai_probability: 0, feedback: 'Error: ' + error.message, type: 'open' };
  }
}

function getExamData(token, exam) {
  try {
    const tokenData = verifyToken(token, exam);
    if (!tokenData.valid) return jsonResponse(false, tokenData.message);
    const questions = getQuestionsForExam(exam);
    const duration  = getExamDuration(exam);
    return jsonResponse(true, 'OK', {
      candidate_id:     tokenData.candidate_id,
      candidate_name:   tokenData.name,
      exam:             exam,
      duration_minutes: duration,
      questions: questions.map(q => ({
        id:      q.id,
        n:       q.n,
        tipo:    q.type,
        texto:   q.texto,
        opciones: q.options
      }))
    });
  } catch (error) {
    Logger.log('[getExamData Error] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

// ================================
// MODULO: BREVO
// ================================
function addContactToBrevoList(email, firstName, lastName, listId) {
  try {
    const apiKey = CONFIG.brevo_api_key;
    if (!apiKey) { Logger.log('[addContactToBrevoList] No Brevo API key'); return { success: false }; }
    const options = {
      method:  'post',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ email, firstName: firstName || '', lastName: lastName || '', updateEnabled: true, listIds: [listId] }),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/contacts', options);
    const httpCode = response.getResponseCode();
    return { success: httpCode === 201 || httpCode === 204 };
  } catch (error) {
    Logger.log('[addContactToBrevoList Error] ' + error.message);
    return { success: false };
  }
}

function moveContactBetweenLists(email, fromListId, toListId) {
  try {
    const apiKey = CONFIG.brevo_api_key;
    if (!apiKey) return { success: false };
    const opts = (method, url, body) => ({
      method, headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(body), muteHttpExceptions: true
    });
    UrlFetchApp.fetch('https://api.brevo.com/v3/contacts/lists/' + fromListId + '/contacts/remove',
      opts('post', '', { emails: [email] }));
    const r = UrlFetchApp.fetch('https://api.brevo.com/v3/contacts/lists/' + toListId + '/contacts/add',
      opts('post', '', { emails: [email] }));
    Logger.log('[Brevo] ' + email + ': lista ' + fromListId + ' -> ' + toListId);
    return { success: r.getResponseCode() === 204 };
  } catch (error) {
    Logger.log('[moveContactBetweenLists Error] ' + error.message);
    return { success: false };
  }
}

// ================================
// MODULO: EMAILS
// ================================
function sendEmail(to, subject, htmlBody) {
  const brevoKey  = CONFIG.brevo_api_key;
  const resendKey = CONFIG.resend_api_key;

  if (brevoKey) {
    const r = sendViaBrevo(to, subject, htmlBody, brevoKey);
    if (r.success) { logNotificationEvent(to, subject, 'BREVO', 'SENT'); return r; }
    Logger.log('[Email] Brevo fallo: ' + r.error);
  }
  if (resendKey) {
    const r = sendViaResend(to, subject, htmlBody, resendKey);
    if (r.success) { logNotificationEvent(to, subject, 'RESEND', 'SENT'); return r; }
    Logger.log('[Email] Resend fallo: ' + r.error);
  }
  try {
    MailApp.sendEmail(to, subject, htmlBody.replace(/<[^>]*>/g, ''), { htmlBody });
    logNotificationEvent(to, subject, 'MAILAPP', 'SENT');
    return { success: true, provider: 'MAILAPP' };
  } catch (e) {
    logNotificationEvent(to, subject, 'FAILED', 'ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

function sendViaBrevo(to, subject, htmlBody, apiKey) {
  try {
    const payload = {
      to:          [{ email: to }],
      sender:      { name: CONFIG.app_name || 'RCCC', email: CONFIG.email_from || 'noreply@rccc.org' },
      subject,
      htmlContent: htmlBody
    };
    const options = {
      method: 'post', headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload), muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', options);
    const result   = JSON.parse(response.getContentText());
    if (response.getResponseCode() === 201) return { success: true, messageId: result.messageId };
    return { success: false, error: 'Brevo: ' + response.getResponseCode() };
  } catch (error) { return { success: false, error: error.message }; }
}

function sendViaResend(to, subject, htmlBody, apiKey) {
  try {
    const payload = {
      from:    CONFIG.email_from || 'noreply@rccc.org',
      to, subject, html: htmlBody
    };
    const options = {
      method: 'post',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload), muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch('https://api.resend.com/emails', options);
    const result   = JSON.parse(response.getContentText());
    if (response.getResponseCode() === 200) return { success: true, messageId: result.id };
    return { success: false, error: 'Resend: ' + response.getResponseCode() };
  } catch (error) { return { success: false, error: error.message }; }
}

function logNotificationEvent(email, subject, provider, status) {
  try {
    const sheet = SS.getSheetByName('Notificaciones');
    if (sheet) sheet.appendRow([new Date(), email, subject, provider, status, new Date().toISOString()]);
  } catch (error) { Logger.log('[logNotificationEvent Error] ' + error.message); }
}

// ================================
// EMAILS ESPECÍFICOS
// ================================
function sendWelcomeEmail(email, name, token, candidate_id, scheduled_date) {
  const exam_url = 'https://profesionales.catholizare.com/catholizare_sistem/examen/?token=' + token + '&exam=E1';
  let formatted_date = scheduled_date;
  try { formatted_date = new Date(scheduled_date).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); } catch(e) {}
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
    '<div style="background:linear-gradient(135deg,#001A55,#0966FF);color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">' +
    '<h1>Bienvenido ' + name + '</h1><p>Red de Psicólogos Católicos</p></div>' +
    '<div style="background:#f9f9f9;padding:20px;">' +
    '<p>Tu registro ha sido exitoso.</p>' +
    '<p><strong>Examen E1 agendado para:</strong><br>' + formatted_date + '</p>' +
    '<p><a href="' + exam_url + '" style="display:inline-block;background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Acceder al Examen E1</a></p>' +
    '<p style="font-size:12px;color:#666;"><strong>Instrucciones:</strong> Duración 2h · No copy/paste · Max 3 cambios de ventana</p>' +
    '</div></div>';
  return sendEmail(email, 'Bienvenido a ' + (CONFIG.app_name || 'RCCC'), html);
}

function sendEmailTerms(email, name, candidateId) {
  const url = 'https://profesionales.catholizare.com/catholizare_sistem/terminos/?candidate_id=' + candidateId + '&email=' + encodeURIComponent(email);
  const html = '<div style="font-family:Arial;"><h2>Hola ' + name + '</h2><p>Aprobaste E1. Acepta los Términos y Condiciones para continuar.</p>' +
    '<a href="' + url + '" style="background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Aceptar Términos</a></div>';
  return sendEmail(email, 'Paso siguiente: Acepta los Términos', html);
}

function sendEmailE2(email, name, token, candidateId) {
  const url = 'https://profesionales.catholizare.com/catholizare_sistem/examen/?token=' + token + '&exam=E2';
  const html = '<div style="font-family:Arial;"><h2>Hola ' + name + '</h2><p>Has aceptado los términos. Ya puedes tomar el Examen E2.</p>' +
    '<a href="' + url + '" style="background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Acceder al Examen E2</a></div>';
  return sendEmail(email, 'Accede al Examen E2', html);
}

function sendEmailE3(email, name, token, candidateId) {
  const url = 'https://profesionales.catholizare.com/catholizare_sistem/examen/?token=' + token + '&exam=E3';
  const html = '<div style="font-family:Arial;"><h2>Hola ' + name + '</h2><p>¡Excelente! Aprobaste E2. Ahora puedes tomar el Examen E3 (final).</p>' +
    '<a href="' + url + '" style="background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Acceder al Examen E3</a></div>';
  return sendEmail(email, 'Accede al Examen E3 (Final)', html);
}

function sendEmailAwaitingInterview(email, name, candidateId) {
  const html = '<div style="font-family:Arial;"><h2>Hola ' + name + '</h2><p>¡Felicidades! Completaste los 3 exámenes. Pronto te contactaremos para agendar tu entrevista.</p></div>';
  return sendEmail(email, 'Entrevista Personal - Pendiente de Agendamiento', html);
}

function sendEmailRejected(email, name, exam, reason) {
  const html = '<div style="font-family:Arial;"><h2>Hola ' + name + '</h2>' +
    '<p>Gracias por participar. Después de revisar tu examen ' + exam + ', no continuaremos con tu candidatura en este momento.</p>' +
    (reason ? '<p><strong>Retroalimentación:</strong> ' + reason + '</p>' : '') +
    '<p>Te animamos a seguir creciendo profesionalmente.</p></div>';
  return sendEmail(email, 'Resultado de tu proceso en RCCC', html);
}

function sendEmailApproved(email, name, category) {
  const labels = { JUNIOR: 'Fundamentos Sólidos (Junior)', SENIOR: 'Muy Competente (Senior)', EXPERT: 'Excepcional (Expert)' };
  const html = '<div style="font-family:Arial;">' +
    '<div style="background:linear-gradient(135deg,#001A55,#0966FF);color:white;padding:20px;text-align:center;border-radius:8px;">' +
    '<h1>¡Felicidades ' + name + '!</h1></div>' +
    '<div style="padding:20px;"><p>Has sido <strong>APROBADO</strong> en el proceso de selección de RCCC.</p>' +
    '<p><strong>Categoría:</strong> ' + (labels[category] || category) + '</p></div></div>';
  return sendEmail(email, 'Aprobado en RCCC - ' + (labels[category] || category), html);
}

function sendHandoffNotification(email, name, category) {
  const adminEmail = CONFIG.email_handoff || CONFIG.email_admin;
  if (!adminEmail) return;
  const html = '<div style="font-family:Arial;"><h2>Nuevo candidato para Onboarding</h2>' +
    '<p><strong>Nombre:</strong> ' + name + '</p><p><strong>Email:</strong> ' + email + '</p>' +
    '<p><strong>Categoría:</strong> ' + category + '</p></div>';
  return sendEmail(adminEmail, 'Handoff: ' + name + ' (' + category + ')', html);
}

// ================================
// MODULO: CANDIDATOS
// ================================
function generateCandidateId() {
  const yyyymmdd = Utilities.formatDate(new Date(), CONFIG.timezone || 'America/Bogota', 'yyyyMMdd');
  const random   = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return 'CANDIDATO_' + yyyymmdd + '_' + random;
}

function updateCandidateStatus(candidate_id, newStatus) {
  const sheet = SS.getSheetByName('Candidatos');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidate_id) { sheet.getRange(i + 1, 11).setValue(newStatus); break; }
  }
}

function updateLastInteraction(candidate_id) {
  const sheet = SS.getSheetByName('Candidatos');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidate_id) { sheet.getRange(i + 1, 12).setValue(new Date()); break; }
  }
}

// ================================
// MODULO: TIMELINE
// ================================
function addTimelineEvent(candidate_id, event_type, details) {
  try {
    const sheet = SS.getSheetByName('Timeline');
    if (!sheet) return;
    sheet.appendRow([new Date(), candidate_id, event_type, JSON.stringify(details || {}), 'SISTEMA']);
    Logger.log('[Timeline] ' + event_type + ' para ' + candidate_id);
  } catch (error) { Logger.log('[Timeline Error] ' + error.message); }
}

// ================================
// MODULO: GUARDADO DE RESULTADOS
// ================================
function saveExamResult(candidate_id, exam, resultData) {
  try {
    const sheet = SS.getSheetByName('Test_' + exam + '_Respuestas');
    if (!sheet) { Logger.log('[saveExamResult] Hoja Test_' + exam + '_Respuestas no encontrada'); return; }
    sheet.appendRow([
      candidate_id, resultData.started_at, resultData.finished_at,
      resultData.elapsed_seconds, resultData.responses_json,
      resultData.blur_events, resultData.copy_attempts,
      resultData.ai_detection_count, resultData.verdict,
      resultData.openai_score_json, resultData.flags
    ]);
  } catch (error) { Logger.log('[saveExamResult Error] ' + error.message); }
}

// ================================
// MODULO: NOTIFICACIONES ADMIN
// ================================
function notifyAdminNewCandidate(name, email, candidate_id, scheduled_date) {
  try {
    const adminEmail = CONFIG.email_admin;
    if (!adminEmail) return;
    const html = '<div style="font-family:Arial;">' +
      '<div style="background:#4CAF50;color:white;padding:20px;text-align:center;"><h1>Nuevo Candidato Registrado</h1></div>' +
      '<div style="padding:20px;">' +
      '<p><strong>Nombre:</strong> ' + name + '</p><p><strong>Email:</strong> ' + email + '</p>' +
      '<p><strong>ID:</strong> ' + candidate_id + '</p><p><strong>Examen agendado:</strong> ' + scheduled_date + '</p>' +
      '</div></div>';
    return sendEmail(adminEmail, 'Nuevo Candidato: ' + name, html);
  } catch (error) { Logger.log('[notifyAdminNewCandidate Error] ' + error.message); }
}

function notifyAdminExamCompleted(name, email, exam, score, verdict, flags) {
  try {
    const adminEmail = CONFIG.email_admin;
    if (!adminEmail) return;
    const color   = verdict === 'pass' ? '#4CAF50' : (verdict === 'review' ? '#FF9800' : '#f44336');
    const label   = verdict === 'pass' ? 'APROBADO'  : (verdict === 'review' ? 'REVISAR' : 'NO APROBADO');
    const html = '<div style="font-family:Arial;">' +
      '<div style="background:' + color + ';color:white;padding:20px;text-align:center;"><h1>Examen ' + exam + ' Completado</h1></div>' +
      '<div style="padding:20px;">' +
      '<p><strong>Candidato:</strong> ' + name + '</p><p><strong>Email:</strong> ' + email + '</p>' +
      '<p style="font-size:2em;text-align:center;color:' + color + ';">' + score + '%</p>' +
      '<p style="text-align:center;color:' + color + ';"><strong>' + label + '</strong></p>' +
      (flags && flags.length > 0 ? '<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:10px;"><strong>Alertas:</strong><br>' + flags.join('<br>') + '</div>' : '') +
      '</div></div>';
    return sendEmail(adminEmail, 'Examen ' + exam + ' - ' + name + ' (' + label + ')', html);
  } catch (error) { Logger.log('[notifyAdminExamCompleted Error] ' + error.message); }
}

// ================================
// MODULO: AUTH ADMIN
// ================================
function validateAdminPin(pin) {
  try {
    const savedPin = CONFIG.admin_pin;
    if (!savedPin) return false;
    return String(pin) === String(savedPin);
  } catch (e) {
    Logger.log('Error validando PIN: ' + e);
    return false;
  }
}

// ================================
// MODULO: UTILIDADES
// ================================
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getExamDuration(exam) {
  return CONFIG['exam_' + exam.toLowerCase() + '_duration'] || 120;
}

function getMinScoreForExam(exam) {
  return CONFIG['exam_' + exam.toLowerCase() + '_min_score'] || 75;
}

function jsonResponse(success, message, data) {
  const response = { success, message, timestamp: new Date().toISOString() };
  if (data) response.data = data;
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================
// MODULO: HEALTH CHECK
// ================================
function checkSystemHealth() {
  const health = { timestamp: new Date().toISOString(), status: 'OK', checks: {} };

  try {
    const names   = SS.getSheets().map(s => s.getName());
    const required = ['Config', 'Candidatos', 'Tokens', 'Timeline', 'Preguntas'];
    const missing  = required.filter(n => !names.includes(n));
    health.checks.sheets = { status: missing.length === 0 ? 'OK' : 'WARNING', total: names.length, missing };
  } catch (e) { health.checks.sheets = { status: 'ERROR', error: e.message }; health.status = 'ERROR'; }

  health.checks.apiKeys = {
    openai: CONFIG.openai_api_key ? 'OK' : 'MISSING',
    brevo:  CONFIG.brevo_api_key  ? 'OK' : 'MISSING',
    resend: CONFIG.resend_api_key ? 'OK' : 'MISSING'
  };
  health.checks.email = {
    from:  CONFIG.email_from  ? 'OK' : 'MISSING',
    admin: CONFIG.email_admin ? 'OK' : 'MISSING'
  };
  health.checks.adminPin = { status: CONFIG.admin_pin ? 'OK' : 'MISSING' };

  Logger.log('=== HEALTH CHECK ===\n' + JSON.stringify(health, null, 2));
  return health;
}
