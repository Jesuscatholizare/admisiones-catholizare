/**
 * SISTEMA DE SELECCIÓN DE CANDIDATOS - RCCC
 * Versión 3.0 - Completa y Restaurada
 *
 * Stack: Google Apps Script + Google Sheets
 * Integraciones: OpenAI, Brevo, Resend
 * Seguridad: API_PROXY, Tokens con ventanas ISO, Anti-fraude
 * Flujo: E1 → E2 → E3 → Entrevista → Aprobado
 *
 * GitHub: https://github.com/Jesuscatholizare/admisiones-catholizare
 * Rama: claude/candidate-selection-tracker-rb6Ke
 *
 * PASOS PARA USAR:
 * 1. Pega este código en Google Apps Script
 * 2. Guarda (Ctrl+S)
 * 3. Selecciona "initializeSpreadsheet" en el dropdown
 * 4. Presiona el botón Play (▶️)
 * 5. Espera a que termine (verifica en Execution Log)
 * 6. Vuelve a Google Sheets y verifica las hojas creadas
 */

// ============================================
// PASO 1: INICIALIZACIÓN DE SPREADSHEET
// Ejecutar UNA SOLA VEZ para crear las hojas
// ============================================

/**
 * Crea/ajusta automáticamente todas las hojas necesarias
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

  // Crear/ajustar hojas
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

  // Inicializar Config con valores por defecto
  _initConfigDefaults(ss);

  Logger.log('Spreadsheet inicializado correctamente.');
  Logger.log('Ahora configura las API keys en la hoja Config.');
}

function _setSheetHeaders(sheet, headers, bgColor, fgColor) {
  // Asegurar columnas suficientes
  const maxCols = sheet.getMaxColumns();
  if (maxCols < headers.length) {
    sheet.insertColumnsAfter(maxCols, headers.length - maxCols);
  }
  // Eliminar columnas extras
  const lastCol = sheet.getLastColumn();
  if (lastCol > headers.length) {
    sheet.deleteColumns(headers.length + 1, lastCol - headers.length);
  }
  // Escribir headers
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

  // Solo escribir si Config está vacía (para no sobreescribir datos reales)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    Logger.log('Config ya tiene datos. No se sobreescribe.');
    return;
  }

  const defaults = [
    ['OPENAI_API_KEY', '', 'string'],
    ['OPENAI_MODEL', 'gpt-4o-mini', 'string'],
    ['BREVO_API_KEY', '', 'string'],
    ['RESEND_API_KEY', '', 'string'],
    ['EMAIL_FROM', 'noreply@catholizare.com', 'string'],
    ['EMAIL_ADMIN', 'admin@catholizare.com', 'string'],
    ['EMAIL_SUPPORT', 'soporte@catholizare.com', 'string'],
    ['EMAIL_HANDOFF', 'catholizare@gmail.com', 'string'],
    ['TIMEZONE', 'America/Bogota', 'string'],
    ['APP_NAME', 'RCCC Evaluaciones', 'string'],
    ['HANDOFF_SPREADSHEET_ID', '', 'string'],
    ['EXAM_E1_DURATION_MIN', '120', 'number'],
    ['EXAM_E1_MIN_SCORE', '75', 'number'],
    ['EXAM_E2_DURATION_MIN', '120', 'number'],
    ['EXAM_E2_MIN_SCORE', '75', 'number'],
    ['EXAM_E3_DURATION_MIN', '120', 'number'],
    ['EXAM_E3_MIN_SCORE', '75', 'number'],
    ['CATEGORY_JUNIOR_MIN', '75', 'number'],
    ['CATEGORY_JUNIOR_MAX', '79', 'number'],
    ['CATEGORY_SENIOR_MIN', '80', 'number'],
    ['CATEGORY_SENIOR_MAX', '89', 'number'],
    ['CATEGORY_EXPERT_MIN', '90', 'number'],
    ['BREVO_LIST_INTERESADOS', '3', 'number'],
    ['BREVO_LIST_RECHAZADOS', '4', 'number'],
    ['BREVO_LIST_APROBADOS', '5', 'number'],
    ['BREVO_LIST_JUNIOR', '6', 'number'],
    ['BREVO_LIST_SENIOR', '7', 'number'],
    ['BREVO_LIST_EXPERT', '8', 'number'],
    ['INACTIVE_DAYS_THRESHOLD', '20', 'number']
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

// Función para obtener configuración desde Sheets
function getConfig(key, defaultValue) {
  if (defaultValue === undefined) defaultValue = null;
  try {
    const sheet = SS.getSheetByName('Config');
    if (!sheet) return defaultValue;

    const data = sheet.getDataRange().getValues();

    for (let i = 0; i < data.length; i++) {
      const cellValue = data[i][0];
      if (!cellValue) continue;

      // Formato columnas separadas (A: clave, B: valor, C: tipo)
      if (data[i][1] !== undefined && data[i][1] !== '') {
        if (cellValue === key) {
          const value = data[i][1];
          const type = data[i][2] || 'string';
          if (type === 'json') return JSON.parse(value);
          if (type === 'number') return Number(value);
          return value;
        }
      }
      // Formato "CLAVE = VALOR"
      else if (typeof cellValue === 'string' && cellValue.includes('=')) {
        const [configKey, configValue] = cellValue.split('=').map(s => s.trim());
        if (configKey === key) return configValue;
      }
    }
  } catch (e) {
    Logger.log('Error obteniendo config ' + key + ': ' + e.message);
  }
  return defaultValue;
}

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
  get handoff_spreadsheet_id() { return getConfig('HANDOFF_SPREADSHEET_ID', ''); },

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

  // Categorias
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

  get inactive_days() { return getConfig('INACTIVE_DAYS_THRESHOLD', 20); }
};

// ================================
// FUNCIONES PRINCIPALES (doPost / doGet)
// ================================

/**
 * POST: Procesa solicitudes desde api-proxy.php
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    Logger.log('[doPost] Accion: ' + action);

    switch(action) {
      case 'initial_registration':
        return handleRegistration(data);
      case 'submit_exam':
        return handleExamSubmit(data);
      default:
        return jsonResponse(false, 'Accion no valida');
    }
  } catch (error) {
    Logger.log('[ERROR doPost] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

/**
 * GET: Renderiza WebApp del examen + datos de candidato
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const token = e.parameter.token;
    const exam = e.parameter.exam;
    const pin = e.parameter.pin || '';

    Logger.log('[doGet] Accion: ' + action + ', Exam: ' + exam);

    // Si es para verificar token y obtener preguntas
    if (action === 'get_exam') {
      return getExamData(token, exam);
    }

    // Si es para renderizar WebApp de examen
    if (token && exam) {
      return renderExamWebApp(token, exam);
    }

    // Dashboard admin
    if (action === 'dashboard') {
      if (validateAdminPin(pin)) {
        return renderAdminDashboard();
      }
      return renderLoginPage();
    }

    return renderLoginPage();

  } catch (error) {
    Logger.log('[ERROR doGet] ' + error.message);
    return HtmlService.createHtmlOutput('<h1>Error: ' + error.message + '</h1>');
  }
}

// ================================
// MODULO: REGISTRO
// ================================

function handleRegistration(data) {
  try {
    const candidate = data.candidate;
    const scheduled_date = data.scheduled_date;

    if (!candidate || !candidate.name || !candidate.email) {
      return jsonResponse(false, 'Faltan datos requeridos');
    }

    if (!isValidEmail(candidate.email)) {
      return jsonResponse(false, 'Email invalido');
    }

    if (!scheduled_date) {
      return jsonResponse(false, 'Fecha agendada requerida');
    }

    // Verificar email duplicado
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) return jsonResponse(false, 'Hoja Candidatos no encontrada');

    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][3] === candidate.email) {
        return jsonResponse(false, 'Email ya registrado');
      }
    }

    // Generar candidate_id
    const candidate_id = generateCandidateId();
    const registration_date = new Date();

    // Agregar a Candidatos
    const newRow = [
      candidate_id,
      registration_date,
      candidate.name,
      candidate.email,
      candidate.phone || '',
      candidate.country || '',
      candidate.birthday || '',
      candidate.professional_type || '',
      candidate.therapeutic_approach || '',
      candidate.about || '',
      'registered',
      registration_date,
      '',
      '',
      ''
    ];

    sheet.appendRow(newRow);

    // Generar token E1
    const token = generateToken(candidate_id, 'E1');
    saveToken(token, candidate_id, 'E1', candidate.email, candidate.name, scheduled_date);

    // Timeline
    addTimelineEvent(candidate_id, 'CANDIDATO_REGISTRADO', {
      nombre: candidate.name,
      email: candidate.email,
      fecha_agendada: scheduled_date
    });

    // Agregar a lista Brevo "interesados"
    addContactToBrevoList(
      candidate.email,
      candidate.name.split(' ')[0] || '',
      candidate.name.split(' ').slice(1).join(' ') || '',
      CONFIG.brevo_list_interesados
    );

    // Enviar email de bienvenida
    sendWelcomeEmail(candidate.email, candidate.name, token, candidate_id, scheduled_date);

    // Notificar admin
    notifyAdminNewCandidate(candidate.name, candidate.email, candidate_id, scheduled_date);

    return jsonResponse(true, 'Registro exitoso. Revisa tu email.', {
      candidate_id: candidate_id,
      token: token,
      exam_url: 'https://profesionales.catholizare.com/examen/?token=' + token + '&exam=E1'
    });

  } catch (error) {
    Logger.log('[ERROR handleRegistration] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

// ================================
// MODULO: EXAMENES
// ================================

function handleExamSubmit(data) {
  try {
    const token = data.token;
    const exam = data.exam;
    const answers = data.answers;
    const startedAt = data.startedAt;
    const finishedAt = data.finishedAt;
    const blur_count = data.blur_count || 0;
    const copy_count = data.copy_count || 0;

    // Verificar token
    const tokenData = verifyToken(token, exam);
    if (!tokenData.valid) {
      return jsonResponse(false, tokenData.message);
    }

    const candidate_id = tokenData.candidate_id;
    const candidate_email = tokenData.email;
    const candidate_name = tokenData.name;

    // Validar tiempo
    const elapsedMinutes = (new Date(finishedAt) - new Date(startedAt)) / (1000 * 60);
    const maxDuration = getExamDuration(exam);

    if (elapsedMinutes > maxDuration + 5) {
      return jsonResponse(false, 'Tiempo excedido. Maximo: ' + maxDuration + ' minutos');
    }

    if (!answers || Object.keys(answers).length === 0) {
      return jsonResponse(false, 'Debes responder al menos una pregunta');
    }

    // Calificar con OpenAI
    const results = gradeExam(exam, answers);
    const score = results.score;
    const flags = results.flags;
    const ai_detected = results.ai_detected || 0;

    // Determinar verdict
    let verdict = 'fail';
    const min_score = getMinScoreForExam(exam);

    if (score >= min_score && ai_detected === 0) {
      verdict = 'pass';
    } else if (ai_detected > 0) {
      verdict = 'review';
    }

    // Guardar resultado en Test_EN
    saveExamResult(candidate_id, exam, {
      started_at: startedAt,
      finished_at: finishedAt,
      elapsed_seconds: Math.round(elapsedMinutes * 60),
      responses_json: JSON.stringify(answers),
      blur_events: blur_count,
      copy_attempts: copy_count,
      ai_detection_count: ai_detected,
      verdict: verdict,
      openai_score_json: JSON.stringify(results.scores),
      flags: JSON.stringify(flags)
    });

    // Actualizar status
    const newStatus = 'pending_review_' + exam;
    updateCandidateStatus(candidate_id, newStatus);
    updateLastInteraction(candidate_id);

    // Timeline
    addTimelineEvent(candidate_id, 'TEST_' + exam + '_COMPLETADO', {
      puntaje: score,
      veredicto: verdict,
      flags: flags
    });

    // Notificar admin
    notifyAdminExamCompleted(candidate_name, candidate_email, exam, score, verdict, flags);

    // Marcar token como usado
    markTokenAsUsed(token);

    return jsonResponse(true, 'Examen ' + exam + ' recibido. Estado: ' + verdict, {
      verdict: verdict,
      score: score,
      flags: flags
    });

  } catch (error) {
    Logger.log('[ERROR handleExamSubmit] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

// ================================
// MODULO: FLUJO DE ADMIN
// ================================

/**
 * Candidato acepta terminos -> Genera Token E2
 */
function acceptTerms(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];

        sheet.getRange(i + 1, 11).setValue('pending_review_E2');

        const token = generateToken(candidateId, 'E2');
        const scheduled_date = new Date().toISOString().split('T')[0];
        saveToken(token, candidateId, 'E2', email, name, scheduled_date);

        sendEmailE2(email, name, token, candidateId);

        addTimelineEvent(candidateId, 'TERMINOS_ACEPTADOS', {
          email: email,
          token_e2_generado: token
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

/**
 * Obtiene lista de candidatos para el dashboard
 */
function getCandidatesForAdmin() {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) {
      return { success: false, error: 'Sheet Candidatos no encontrada', candidates: [] };
    }

    const data = sheet.getDataRange().getValues();
    const candidates = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        candidates.push({
          candidato_id: data[i][0],
          registration_date: data[i][1],
          nombre: data[i][2],
          email: data[i][3],
          telefono: data[i][4],
          status: data[i][10],
          last_interaction: data[i][11],
          final_category: data[i][12],
          final_status: data[i][13],
          notes: data[i][14]
        });
      }
    }

    return { success: true, candidates: candidates };
  } catch (error) {
    Logger.log('[getCandidatesForAdmin Error] ' + error.message);
    return { success: false, error: error.message, candidates: [] };
  }
}

/**
 * Admin aprueba examen E1/E2/E3
 */
function approveExamAdmin(candidateId, exam) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];

        if (exam === 'E1') {
          sheet.getRange(i + 1, 11).setValue('awaiting_terms_acceptance');
          sendEmailTerms(email, name, candidateId);

        } else if (exam === 'E2') {
          const token = generateToken(candidateId, 'E3');
          const scheduled_date = new Date().toISOString().split('T')[0];
          saveToken(token, candidateId, 'E3', email, name, scheduled_date);
          sheet.getRange(i + 1, 11).setValue('pending_review_E3');
          sendEmailE3(email, name, token, candidateId);

        } else if (exam === 'E3') {
          sheet.getRange(i + 1, 11).setValue('awaiting_interview');
          sendEmailAwaitingInterview(email, name, candidateId);
        }

        addTimelineEvent(candidateId, 'EXAMEN_' + exam + '_APROBADO_ADMIN', {
          exam: exam,
          fecha: new Date().toISOString()
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

/**
 * Admin rechaza examen
 */
function rejectExamAdmin(candidateId, exam, reason) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];

        sheet.getRange(i + 1, 11).setValue('rejected');

        moveContactBetweenLists(email, CONFIG.brevo_list_interesados, CONFIG.brevo_list_rechazados);
        sendEmailRejected(email, name, exam, reason);

        addTimelineEvent(candidateId, 'EXAMEN_' + exam + '_RECHAZADO_ADMIN', {
          exam: exam,
          razon: reason
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

/**
 * Admin asigna categoria (JUNIOR/SENIOR/EXPERT) y aprueba
 */
function assignCategoryAndApprove(candidateId, category) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];

        let toListId;
        if (category === 'JUNIOR') toListId = CONFIG.brevo_list_junior;
        else if (category === 'SENIOR') toListId = CONFIG.brevo_list_senior;
        else if (category === 'EXPERT') toListId = CONFIG.brevo_list_expert;
        else toListId = CONFIG.brevo_list_aprobados;

        moveContactBetweenLists(email, CONFIG.brevo_list_interesados, toListId);

        sheet.getRange(i + 1, 11).setValue('approved_' + category.toLowerCase());
        sheet.getRange(i + 1, 13).setValue(category);

        sendEmailApproved(email, name, category);

        addTimelineEvent(candidateId, 'CANDIDATO_CATEGORIZADO_APROBADO', {
          category: category,
          lista_brevo: toListId
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

/**
 * Handoff: Transferir candidato a Spreadsheet Onboarding
 */
function performHandoff(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];
        const phone = data[i][4];
        const category = data[i][12] || '';

        const handoffId = CONFIG.handoff_spreadsheet_id;
        if (!handoffId) {
          Logger.log('[performHandoff] HANDOFF_SPREADSHEET_ID no configurado');
          return { success: false, error: 'HANDOFF_SPREADSHEET_ID no configurado' };
        }

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
          spreadsheet_id: handoffId,
          category: category
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

/**
 * Estadisticas para el dashboard
 */
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
      else if (status === 'rejected') rejected++;
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
  const random = Math.random().toString(36).substring(2, 8);
  return exam + '_' + candidate_id.substring(0, 8) + '_' + timestamp + '_' + random;
}

function saveToken(token, candidate_id, exam, email, name, scheduled_date) {
  const sheet = SS.getSheetByName('Tokens');
  if (!sheet) {
    Logger.log('[saveToken] Hoja Tokens no encontrada');
    return;
  }

  let valid_from, valid_until;

  if (scheduled_date) {
    const parts = scheduled_date.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

    valid_from = new Date(dateObj);
    valid_from.setHours(6, 1, 0);

    valid_until = new Date(dateObj);
    valid_until.setDate(valid_until.getDate() + 1);
    valid_until.setHours(23, 59, 59);
  } else {
    valid_from = new Date();
    valid_until = new Date(valid_from.getTime() + 48 * 60 * 60 * 1000);
  }

  const row = [
    token,
    candidate_id,
    exam,
    new Date(),
    Utilities.formatDate(valid_from, CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    Utilities.formatDate(valid_until, CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ss"),
    false,
    'active',
    email,
    name,
    scheduled_date || ''
  ];

  sheet.appendRow(row);
  Logger.log('[saveToken] Token guardado: ' + token);
}

function verifyToken(token, exam) {
  const sheet = SS.getSheetByName('Tokens');
  if (!sheet) return { valid: false, message: 'Hoja Tokens no encontrada' };

  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token && data[i][2] === exam) {
      const used = data[i][6];
      const status = data[i][7];
      const valid_from = new Date(data[i][4]);
      const valid_until = new Date(data[i][5]);

      if (used) return { valid: false, message: 'Token ya fue usado' };
      if (status !== 'active') return { valid: false, message: 'Token no activo' };
      if (now < valid_from) return { valid: false, message: 'Examen aun no disponible' };
      if (now > valid_until) return { valid: false, message: 'Token expirado' };

      return {
        valid: true,
        candidate_id: data[i][1],
        email: data[i][8],
        name: data[i][9]
      };
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

/**
 * Carga banco de preguntas desde hoja "Preguntas"
 */
function getQuestionsForExam(exam) {
  try {
    const sheet = SS.getSheetByName('Preguntas');
    if (!sheet) {
      Logger.log('[getQuestionsForExam] Hoja "Preguntas" no encontrada');
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const questions = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === exam) {
        questions.push({
          n: data[i][1],
          id: data[i][2],
          type: data[i][3],
          category: data[i][4],
          ai_check: data[i][5] === 'TRUE' || data[i][5] === true,
          texto: data[i][6],
          options: [data[i][7], data[i][8], data[i][9], data[i][10], data[i][11]].filter(o => o),
          correct: data[i][12],
          rubric_max_points: data[i][14] || 2,
          rubric_criteria: data[i][15] || '',
          rubric_red_flags: data[i][16] || '',
          rubric_raw: data[i][17] || ''
        });
      }
    }

    Logger.log('[getQuestionsForExam] Cargadas ' + questions.length + ' preguntas para ' + exam);
    return questions;
  } catch (error) {
    Logger.log('[getQuestionsForExam Error] ' + error.message);
    return [];
  }
}

/**
 * Califica examen: multiple (automatica) + abierta (OpenAI)
 */
function gradeExam(exam, answers) {
  try {
    const questions = getQuestionsForExam(exam);
    if (!questions.length) {
      return { score: 0, scores: {}, ai_detected: 0, flags: ['ERROR: No questions found'] };
    }

    const results = { score: 0, scores: {}, ai_detected: 0, flags: [] };
    let totalScore = 0;
    let maxScore = 0;
    let aiDetectCount = 0;

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
        Logger.log('[gradeExam Question Error] Q' + question.id + ': ' + e.message);
        results.scores[question.id] = { score: 0, feedback: 'Error: ' + e.message, type: question.type };
      }
    }

    results.score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    results.ai_detected = aiDetectCount;
    results.maxScore = maxScore;
    results.totalScore = totalScore;

    Logger.log('[gradeExam] ' + exam + ': ' + results.score + '% | IA: ' + aiDetectCount);
    return results;

  } catch (error) {
    Logger.log('[gradeExam Fatal Error] ' + error.message);
    return { score: 0, scores: {}, ai_detected: 0, flags: ['FATAL ERROR: ' + error.message] };
  }
}

/**
 * Evalua respuesta abierta con OpenAI segun rubrica
 */
function evaluateOpenWithRubric(question, answer) {
  try {
    const apiKey = CONFIG.openai_api_key;
    if (!apiKey) {
      return { score: 0, ai_probability: 0, feedback: 'Error: No OpenAI API key', type: 'open' };
    }

    const prompt = 'Eres evaluador de respuestas psicologicas para la Red de Psicologos Catolicos.\n\n' +
      'PREGUNTA: ' + question.texto + '\n\n' +
      'RESPUESTA DEL CANDIDATO: "' + answer + '"\n\n' +
      'RUBRICA DE EVALUACION:\n' + question.rubric_criteria + '\n\n' +
      'RED FLAGS (Penalizaciones): ' + question.rubric_red_flags + '\n\n' +
      'EVALUA en JSON:\n' +
      '{\n' +
      '  "score": <0-' + question.rubric_max_points + '>,\n' +
      '  "ai_probability": <0-100>,\n' +
      '  "rubric_level": "excelente|aceptable|rechazada",\n' +
      '  "reasoning": "<breve justificacion>",\n' +
      '  "feedback": "<mensaje para el candidato>"\n' +
      '}\n\n' +
      'Devuelve SOLO el JSON sin explicacion adicional.';

    const payload = {
      model: CONFIG.openai_model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un evaluador academico experto. Responde SIEMPRE en JSON valido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const httpCode = response.getResponseCode();

    if (httpCode !== 200) {
      Logger.log('[OpenAI Error] ' + httpCode + ': ' + response.getContentText());
      return { score: 0, ai_probability: 0, feedback: 'OpenAI Error ' + httpCode, type: 'open' };
    }

    const result = JSON.parse(response.getContentText());
    if (result.choices && result.choices[0]) {
      const content = result.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        score: Math.min(parseInt(parsed.score) || 0, question.rubric_max_points),
        ai_probability: parseInt(parsed.ai_probability) || 0,
        rubric_level: parsed.rubric_level || 'unknown',
        reasoning: parsed.reasoning || '',
        feedback: parsed.feedback || '',
        type: 'open'
      };
    }

    return { score: 0, ai_probability: 0, feedback: 'OpenAI: No response', type: 'open' };

  } catch (error) {
    Logger.log('[evaluateOpenWithRubric Error] ' + error.message);
    return { score: 0, ai_probability: 0, feedback: 'Error: ' + error.message, type: 'open' };
  }
}

/**
 * Obtiene datos del examen para el frontend (preguntas via token)
 */
function getExamData(token, exam) {
  try {
    const tokenData = verifyToken(token, exam);
    if (!tokenData.valid) {
      return jsonResponse(false, tokenData.message);
    }

    const questions = getQuestionsForExam(exam);
    const duration = getExamDuration(exam);

    return jsonResponse(true, 'OK', {
      candidate_id: tokenData.candidate_id,
      candidate_name: tokenData.name,
      exam: exam,
      duration_minutes: duration,
      questions: questions.map(q => ({
        id: q.id,
        n: q.n,
        tipo: q.type,
        texto: q.texto,
        opciones: q.options
      }))
    });
  } catch (error) {
    Logger.log('[getExamData Error] ' + error.message);
    return jsonResponse(false, 'Error: ' + error.message);
  }
}

// ================================
// MODULO: BREVO - GESTION DE LISTAS
// ================================

function addContactToBrevoList(email, firstName, lastName, listId) {
  try {
    const apiKey = CONFIG.brevo_api_key;
    if (!apiKey) {
      Logger.log('[addContactToBrevoList] No Brevo API key');
      return { success: false, error: 'No API key' };
    }

    const payload = {
      email: email,
      firstName: firstName || '',
      lastName: lastName || '',
      updateEnabled: true,
      listIds: [listId]
    };

    const options = {
      method: 'post',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/contacts', options);
    const httpCode = response.getResponseCode();

    if (httpCode === 201 || httpCode === 204) {
      return { success: true };
    } else {
      Logger.log('[Brevo Error] ' + httpCode + ': ' + response.getContentText());
      return { success: false, error: 'HTTP ' + httpCode };
    }
  } catch (error) {
    Logger.log('[addContactToBrevoList Error] ' + error.message);
    return { success: false, error: error.message };
  }
}

function moveContactBetweenLists(email, fromListId, toListId) {
  try {
    const apiKey = CONFIG.brevo_api_key;
    if (!apiKey) return { success: false };

    const removeOptions = {
      method: 'post',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ emails: [email] }),
      muteHttpExceptions: true
    };

    UrlFetchApp.fetch(
      'https://api.brevo.com/v3/contacts/lists/' + fromListId + '/contacts/remove',
      removeOptions
    );

    const addOptions = {
      method: 'post',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ emails: [email] }),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(
      'https://api.brevo.com/v3/contacts/lists/' + toListId + '/contacts/add',
      addOptions
    );

    Logger.log('[Brevo] Contacto ' + email + ': lista ' + fromListId + ' -> ' + toListId);
    return { success: response.getResponseCode() === 204 };

  } catch (error) {
    Logger.log('[moveContactBetweenLists Error] ' + error.message);
    return { success: false };
  }
}

// ================================
// MODULO: EMAILS (BREVO + RESEND + MAILAPP)
// ================================

function sendEmail(to, subject, htmlBody) {
  const brevoKey = CONFIG.brevo_api_key;
  const resendKey = CONFIG.resend_api_key;

  if (brevoKey) {
    const brevoResult = sendViaBrevo(to, subject, htmlBody, brevoKey);
    if (brevoResult.success) {
      logNotificationEvent(to, subject, 'BREVO', 'SENT');
      return { success: true, provider: 'BREVO', messageId: brevoResult.messageId };
    }
    Logger.log('[Email] Brevo fallo: ' + brevoResult.error);
  }

  if (resendKey) {
    const resendResult = sendViaResend(to, subject, htmlBody, resendKey);
    if (resendResult.success) {
      logNotificationEvent(to, subject, 'RESEND', 'SENT');
      return { success: true, provider: 'RESEND', messageId: resendResult.messageId };
    }
    Logger.log('[Email] Resend fallo: ' + resendResult.error);
  }

  try {
    MailApp.sendEmail(to, subject, htmlBody.replace(/<[^>]*>/g, ''), { htmlBody: htmlBody });
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
      to: [{ email: to }],
      sender: { name: CONFIG.app_name || 'RCCC', email: CONFIG.email_from || 'noreply@rccc.org' },
      subject: subject,
      htmlContent: htmlBody
    };

    const options = {
      method: 'post',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 201) {
      return { success: true, messageId: result.messageId };
    }
    return { success: false, error: 'Brevo: ' + response.getResponseCode() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function sendViaResend(to, subject, htmlBody, apiKey) {
  try {
    const payload = {
      from: CONFIG.email_from || 'noreply@rccc.org',
      to: to,
      subject: subject,
      html: htmlBody
    };

    const options = {
      method: 'post',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.resend.com/emails', options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200) {
      return { success: true, messageId: result.id };
    }
    return { success: false, error: 'Resend: ' + response.getResponseCode() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function logNotificationEvent(email, subject, provider, status) {
  try {
    const sheet = SS.getSheetByName('Notificaciones');
    if (sheet) {
      sheet.appendRow([new Date(), email, subject, provider, status, new Date().toISOString()]);
    }
  } catch (error) {
    Logger.log('[logNotificationEvent Error] ' + error.message);
  }
}

// ================================
// EMAILS ESPECIFICOS
// ================================

function sendWelcomeEmail(email, name, token, candidate_id, scheduled_date) {
  try {
    const exam_url = 'https://profesionales.catholizare.com/examen/?token=' + token + '&exam=E1';
    let formatted_date = scheduled_date;
    try {
      formatted_date = new Date(scheduled_date).toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch(e) {}

    const htmlBody = '<html><head><style>' +
      'body{font-family:Arial,sans-serif;color:#333;}' +
      '.container{max-width:600px;margin:0 auto;padding:20px;}' +
      '.header{background:linear-gradient(135deg,#001A55 0%,#0966FF 100%);color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;}' +
      '.content{background:#f9f9f9;padding:20px;}' +
      '.btn{display:inline-block;background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;margin:20px 0;}' +
      '</style></head><body>' +
      '<div class="container">' +
      '<div class="header"><h1>Bienvenido ' + name + '</h1><p>Red de Psicologos Catolicos</p></div>' +
      '<div class="content">' +
      '<p>Tu registro ha sido exitoso.</p>' +
      '<p><strong>Tu examen E1 esta agendado para:</strong><br>' + formatted_date + '</p>' +
      '<p>Accede al examen:</p>' +
      '<a href="' + exam_url + '" class="btn">Acceder al Examen E1</a>' +
      '<p style="font-size:12px;">O copia: <code>' + exam_url + '</code></p>' +
      '<hr><p style="color:#666;font-size:12px;">' +
      '<strong>Instrucciones:</strong><br>' +
      '&bull; Duracion: 2 horas<br>' +
      '&bull; No se permite copiar/pegar<br>' +
      '&bull; Maximo 3 cambios de ventana' +
      '</p></div></div></body></html>';

    return sendEmail(email, 'Bienvenido a ' + (CONFIG.app_name || 'RCCC'), htmlBody);
  } catch (error) {
    Logger.log('[sendWelcomeEmail Error] ' + error.message);
    return { success: false, error: error.message };
  }
}

function sendEmailTerms(email, name, candidateId) {
  const termsUrl = 'https://profesionales.catholizare.com/terminos/?uid=' + candidateId;
  const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
    '<h2>Hola ' + name + '</h2>' +
    '<p>Aprobaste el Examen E1. Ahora necesitas aceptar los Terminos y Condiciones.</p>' +
    '<a href="' + termsUrl + '" style="background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Ver y Aceptar Terminos</a>' +
    '<p style="font-size:12px;">O copia: ' + termsUrl + '</p>' +
    '</body></html>';
  return sendEmail(email, 'Paso siguiente: Acepta los Terminos', htmlBody);
}

function sendEmailE2(email, name, token, candidateId) {
  const examUrl = 'https://profesionales.catholizare.com/examen/?token=' + token + '&exam=E2';
  const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
    '<h2>Hola ' + name + '</h2>' +
    '<p>Has aceptado los terminos. Ya puedes tomar el Examen E2.</p>' +
    '<a href="' + examUrl + '" style="background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Acceder al Examen E2</a>' +
    '</body></html>';
  return sendEmail(email, 'Accede al Examen E2', htmlBody);
}

function sendEmailE3(email, name, token, candidateId) {
  const examUrl = 'https://profesionales.catholizare.com/examen/?token=' + token + '&exam=E3';
  const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
    '<h2>Hola ' + name + '</h2>' +
    '<p>Excelente! Aprobaste E2. Ahora puedes tomar el Examen E3 (examen final).</p>' +
    '<a href="' + examUrl + '" style="background:#0966FF;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Acceder al Examen E3</a>' +
    '</body></html>';
  return sendEmail(email, 'Accede al Examen E3 (Final)', htmlBody);
}

function sendEmailAwaitingInterview(email, name, candidateId) {
  const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
    '<h2>Hola ' + name + '</h2>' +
    '<p>Felicidades! Has completado los 3 examenes. Pronto te contactaremos para agendar tu entrevista personal.</p>' +
    '<p>Gracias por tu paciencia.</p>' +
    '</body></html>';
  return sendEmail(email, 'Entrevista Personal - Pendiente de Agendamiento', htmlBody);
}

function sendEmailRejected(email, name, exam, reason) {
  const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
    '<h2>Hola ' + name + '</h2>' +
    '<p>Gracias por participar en nuestro proceso de seleccion.</p>' +
    '<p>Despues de revisar tu examen ' + exam + ', hemos decidido no continuar con tu candidatura en este momento.</p>' +
    (reason ? '<p><strong>Retroalimentacion:</strong> ' + reason + '</p>' : '') +
    '<p>Te animamos a seguir creciendo profesionalmente. Puedes aplicar nuevamente en el futuro.</p>' +
    '</body></html>';
  return sendEmail(email, 'Resultado de tu proceso en RCCC', htmlBody);
}

function sendEmailApproved(email, name, category) {
  const categoryMessages = {
    'JUNIOR': 'Fundamentos Solidos (Junior)',
    'SENIOR': 'Muy Competente (Senior)',
    'EXPERT': 'Excepcional (Expert)'
  };
  const catText = categoryMessages[category] || category;

  const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
    '<div style="background:linear-gradient(135deg,#001A55 0%,#0966FF 100%);color:white;padding:20px;text-align:center;border-radius:8px;">' +
    '<h1>Felicidades ' + name + '!</h1></div>' +
    '<div style="padding:20px;">' +
    '<p>Nos complace informarte que has sido <strong>APROBADO</strong> en el proceso de seleccion de RCCC.</p>' +
    '<p><strong>Categoria asignada:</strong> ' + catText + '</p>' +
    '<p>Pronto recibiras mas informacion sobre los proximos pasos.</p>' +
    '</div></body></html>';
  return sendEmail(email, 'Aprobado en RCCC - ' + catText, htmlBody);
}

function sendHandoffNotification(email, name, category) {
  const adminEmail = CONFIG.email_handoff || CONFIG.email_admin;
  if (!adminEmail) return;

  const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
    '<h2>Nuevo candidato para Onboarding</h2>' +
    '<p><strong>Nombre:</strong> ' + name + '</p>' +
    '<p><strong>Email:</strong> ' + email + '</p>' +
    '<p><strong>Categoria:</strong> ' + category + '</p>' +
    '<p>Ha sido transferido al sistema de Onboarding.</p>' +
    '</body></html>';
  return sendEmail(adminEmail, 'Handoff: ' + name + ' (' + category + ')', htmlBody);
}

// ================================
// MODULO: CANDIDATOS
// ================================

function generateCandidateId() {
  const date = new Date();
  const yyyymmdd = Utilities.formatDate(date, CONFIG.timezone || 'America/Bogota', 'yyyyMMdd');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return 'CANDIDATO_' + yyyymmdd + '_' + random;
}

function updateCandidateStatus(candidate_id, newStatus) {
  const sheet = SS.getSheetByName('Candidatos');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidate_id) {
      sheet.getRange(i + 1, 11).setValue(newStatus);
      break;
    }
  }
}

function updateLastInteraction(candidate_id) {
  const sheet = SS.getSheetByName('Candidatos');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidate_id) {
      sheet.getRange(i + 1, 12).setValue(new Date());
      break;
    }
  }
}

// ================================
// MODULO: TIMELINE
// ================================

function addTimelineEvent(candidate_id, event_type, details) {
  if (!details) details = {};
  try {
    const sheet = SS.getSheetByName('Timeline');
    if (!sheet) return;

    sheet.appendRow([
      new Date(),
      candidate_id,
      event_type,
      JSON.stringify(details),
      'SISTEMA'
    ]);
    Logger.log('[Timeline] ' + event_type + ' para ' + candidate_id);
  } catch (error) {
    Logger.log('[Timeline Error] ' + error.message);
  }
}

// ================================
// MODULO: GUARDADO DE RESULTADOS
// ================================

function saveExamResult(candidate_id, exam, resultData) {
  try {
    const sheetName = 'Test_' + exam + '_Respuestas';
    const sheet = SS.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log('[saveExamResult] Hoja ' + sheetName + ' no encontrada');
      return;
    }

    sheet.appendRow([
      candidate_id,
      resultData.started_at,
      resultData.finished_at,
      resultData.elapsed_seconds,
      resultData.responses_json,
      resultData.blur_events,
      resultData.copy_attempts,
      resultData.ai_detection_count,
      resultData.verdict,
      resultData.openai_score_json,
      resultData.flags
    ]);

    Logger.log('[saveExamResult] Resultado guardado en ' + sheetName);
  } catch (error) {
    Logger.log('[saveExamResult Error] ' + error.message);
  }
}

// ================================
// MODULO: NOTIFICACIONES ADMIN
// ================================

function notifyAdminNewCandidate(name, email, candidate_id, scheduled_date) {
  try {
    const adminEmail = CONFIG.email_admin;
    if (!adminEmail) return;

    const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
      '<div style="background:#4CAF50;color:white;padding:20px;text-align:center;">' +
      '<h1>Nuevo Candidato Registrado</h1></div>' +
      '<div style="padding:20px;">' +
      '<p><strong>Nombre:</strong> ' + name + '</p>' +
      '<p><strong>Email:</strong> ' + email + '</p>' +
      '<p><strong>ID Candidato:</strong> ' + candidate_id + '</p>' +
      '<p><strong>Examen agendado:</strong> ' + scheduled_date + '</p>' +
      '</div></body></html>';

    return sendEmail(adminEmail, 'Nuevo Candidato: ' + name, htmlBody);
  } catch (error) {
    Logger.log('[notifyAdminNewCandidate Error] ' + error.message);
    return { success: false, error: error.message };
  }
}

function notifyAdminExamCompleted(name, email, exam, score, verdict, flags) {
  try {
    const adminEmail = CONFIG.email_admin;
    if (!adminEmail) return;

    const verdictColor = verdict === 'pass' ? '#4CAF50' : (verdict === 'review' ? '#FF9800' : '#f44336');
    const verdictText = verdict === 'pass' ? 'APROBADO' : (verdict === 'review' ? 'REVISAR' : 'NO APROBADO');

    const htmlBody = '<html><body style="font-family:Arial,sans-serif;">' +
      '<div style="background:' + verdictColor + ';color:white;padding:20px;text-align:center;">' +
      '<h1>Examen ' + exam + ' Completado</h1></div>' +
      '<div style="padding:20px;">' +
      '<p><strong>Candidato:</strong> ' + name + '</p>' +
      '<p><strong>Email:</strong> ' + email + '</p>' +
      '<p style="font-size:2em;text-align:center;color:' + verdictColor + ';">' + score + '%</p>' +
      '<p style="text-align:center;font-size:1.2em;color:' + verdictColor + ';"><strong>' + verdictText + '</strong></p>' +
      (flags && flags.length > 0 ? '<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:10px;"><strong>Alertas:</strong><br>' + flags.join('<br>') + '</div>' : '') +
      '</div></body></html>';

    return sendEmail(adminEmail, 'Examen ' + exam + ' - ' + name + ' (' + verdictText + ')', htmlBody);
  } catch (error) {
    Logger.log('[notifyAdminExamCompleted Error] ' + error.message);
    return { success: false, error: error.message };
  }
}

// ================================
// MODULO: ADMIN DASHBOARD HTML
// ================================

function validateAdminPin(pin) {
  try {
    const configSheet = SS.getSheetByName('Config');
    if (!configSheet) return false;

    const data = configSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'ADMIN_PIN') {
        return String(pin) === String(data[i][1]);
      }
    }
  } catch (e) {
    Logger.log('Error validando PIN: ' + e);
  }
  return false;
}

function renderLoginPage() {
  const html = '<!DOCTYPE html><html lang="es"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Admin Login - Catholizare</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box;}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;' +
    'background:linear-gradient(135deg,#001A55 0%,#0966FF 100%);' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;}' +
    '.card{background:white;padding:40px;border-radius:16px;' +
    'box-shadow:0 10px 40px rgba(0,0,0,0.2);width:90%;max-width:400px;text-align:center;}' +
    'h1{color:#001A55;margin-bottom:10px;}' +
    'p{color:#666;margin-bottom:30px;}' +
    'input{width:100%;padding:14px;margin-bottom:15px;border:2px solid #ddd;border-radius:8px;font-size:1em;}' +
    'button{width:100%;padding:14px;background:linear-gradient(135deg,#001A55 0%,#0966FF 100%);' +
    'color:white;border:none;border-radius:8px;font-weight:600;font-size:1em;cursor:pointer;}' +
    '</style></head><body>' +
    '<div class="card">' +
    '<h1>Admin Panel</h1>' +
    '<p>Ingresa tu PIN para acceder</p>' +
    '<form onsubmit="login(event)">' +
    '<input type="password" id="pin" placeholder="PIN" required>' +
    '<button type="submit">Ingresar</button>' +
    '</form></div>' +
    '<script>function login(e){e.preventDefault();' +
    'var pin=document.getElementById("pin").value;' +
    'window.location.href="?action=dashboard&pin="+encodeURIComponent(pin);}</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html);
}

function renderAdminDashboard() {
  const stats = getDashboardStats();
  const candidatesResult = getCandidatesForAdmin();
  const candidates = candidatesResult.candidates || [];

  let rows = '';
  candidates.forEach(function(c) {
    const statusBadge = getStatusBadge(c.status);
    rows += '<tr>' +
      '<td>' + (c.candidato_id || '') + '</td>' +
      '<td>' + (c.nombre || '') + '</td>' +
      '<td>' + (c.email || '') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' +
      '<button onclick="approveExam(\'' + c.candidato_id + '\',\'E1\')" style="background:#4CAF50;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:2px;">Aprobar E1</button>' +
      '<button onclick="approveExam(\'' + c.candidato_id + '\',\'E2\')" style="background:#2196F3;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:2px;">Aprobar E2</button>' +
      '<button onclick="approveExam(\'' + c.candidato_id + '\',\'E3\')" style="background:#9C27B0;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:2px;">Aprobar E3</button>' +
      '<button onclick="rejectExam(\'' + c.candidato_id + '\')" style="background:#f44336;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:2px;">Rechazar</button>' +
      '<button onclick="assignCategory(\'' + c.candidato_id + '\')" style="background:#FF9800;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;margin:2px;">Categorizar</button>' +
      '</td>' +
      '</tr>';
  });

  const html = '<!DOCTYPE html><html lang="es"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Dashboard Admin - Catholizare</title>' +
    '<style>' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#f5f7fa;margin:0;padding:20px;}' +
    '.header{background:linear-gradient(135deg,#001A55 0%,#0966FF 100%);color:white;padding:20px;border-radius:8px;margin-bottom:20px;}' +
    '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:20px;}' +
    '.stat{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border-left:4px solid #0966FF;text-align:center;}' +
    '.stat-value{font-size:2em;font-weight:700;color:#001A55;}' +
    '.stat-label{color:#666;font-size:0.9em;}' +
    'table{width:100%;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);border-collapse:collapse;}' +
    'th{background:#001A55;color:white;padding:12px;text-align:left;}' +
    'td{padding:10px 12px;border-bottom:1px solid #eee;}' +
    'tr:hover{background:#f9f9f9;}' +
    '.badge{padding:3px 8px;border-radius:12px;font-size:0.8em;font-weight:600;}' +
    '.search{padding:10px;margin-bottom:15px;border:2px solid #ddd;border-radius:8px;width:300px;font-size:1em;}' +
    '</style></head><body>' +
    '<div class="header"><h1>Panel Administrativo - Catholizare</h1><p>Gestion de Candidatos</p></div>' +
    '<div class="stats">' +
    '<div class="stat"><div class="stat-value">' + stats.total + '</div><div class="stat-label">Totales</div></div>' +
    '<div class="stat"><div class="stat-value">' + stats.pending + '</div><div class="stat-label">En Proceso</div></div>' +
    '<div class="stat"><div class="stat-value">' + stats.approved + '</div><div class="stat-label">Aprobados</div></div>' +
    '<div class="stat"><div class="stat-value">' + stats.rejected + '</div><div class="stat-label">Rechazados</div></div>' +
    '</div>' +
    '<input type="text" id="searchInput" class="search" placeholder="Buscar candidato..." onkeyup="filterTable()">' +
    '<table id="candidatesTable">' +
    '<thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Estado</th><th>Acciones</th></tr></thead>' +
    '<tbody id="tableBody">' + rows + '</tbody>' +
    '</table>' +
    '<script>' +
    'function filterTable(){' +
    'var filter=document.getElementById("searchInput").value.toLowerCase();' +
    'var rows=document.querySelectorAll("#tableBody tr");' +
    'rows.forEach(function(row){' +
    'var text=row.textContent.toLowerCase();' +
    'row.style.display=text.includes(filter)?"":"none";' +
    '});}' +
    'function approveExam(candidateId,exam){' +
    'if(!confirm("Aprobar examen "+exam+" para "+candidateId+"?")){return;}' +
    'google.script.run.withSuccessHandler(function(r){' +
    'alert(r.success?"Aprobado correctamente":"Error: "+r.error);' +
    'if(r.success)location.reload();' +
    '}).approveExamAdmin(candidateId,exam);}' +
    'function rejectExam(candidateId){' +
    'var reason=prompt("Razon del rechazo (opcional):");' +
    'if(reason===null)return;' +
    'var exam=prompt("Examen a rechazar (E1/E2/E3):");' +
    'if(!exam)return;' +
    'google.script.run.withSuccessHandler(function(r){' +
    'alert(r.success?"Rechazado correctamente":"Error: "+r.error);' +
    'if(r.success)location.reload();' +
    '}).rejectExamAdmin(candidateId,exam,reason);}' +
    'function assignCategory(candidateId){' +
    'var cat=prompt("Categoria (JUNIOR/SENIOR/EXPERT):");' +
    'if(!cat)return;' +
    'cat=cat.toUpperCase();' +
    'if(!["JUNIOR","SENIOR","EXPERT"].includes(cat)){alert("Categoria invalida");return;}' +
    'google.script.run.withSuccessHandler(function(r){' +
    'alert(r.success?"Categoria asignada: "+r.category:"Error: "+r.error);' +
    'if(r.success)location.reload();' +
    '}).assignCategoryAndApprove(candidateId,cat);}' +
    '</script></body></html>';

  return HtmlService.createHtmlOutput(html);
}

function getStatusBadge(status) {
  const statusMap = {
    'registered': '<span class="badge" style="background:#E3F2FD;color:#1565C0;">Registrado</span>',
    'pending_review_E1': '<span class="badge" style="background:#FFF3E0;color:#E65100;">Rev. E1</span>',
    'pending_review_E2': '<span class="badge" style="background:#FFF3E0;color:#E65100;">Rev. E2</span>',
    'pending_review_E3': '<span class="badge" style="background:#FFF3E0;color:#E65100;">Rev. E3</span>',
    'awaiting_terms_acceptance': '<span class="badge" style="background:#F3E5F5;color:#6A1B9A;">Terminos</span>',
    'awaiting_interview': '<span class="badge" style="background:#E8F5E9;color:#1B5E20;">Entrevista</span>',
    'rejected': '<span class="badge" style="background:#FFEBEE;color:#B71C1C;">Rechazado</span>',
    'approved_junior': '<span class="badge" style="background:#E8F5E9;color:#1B5E20;">Junior</span>',
    'approved_senior': '<span class="badge" style="background:#E8F5E9;color:#1B5E20;">Senior</span>',
    'approved_expert': '<span class="badge" style="background:#E8F5E9;color:#1B5E20;">Expert</span>',
    'handoff_completed': '<span class="badge" style="background:#F3E5F5;color:#4A148C;">Handoff</span>'
  };
  return statusMap[status] || '<span class="badge" style="background:#ECEFF1;color:#455A64;">' + (status || 'N/A') + '</span>';
}

/**
 * Renderiza la WebApp del examen para el candidato
 */
function renderExamWebApp(token, exam) {
  const tokenData = verifyToken(token, exam);
  if (!tokenData.valid) {
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family:Arial;text-align:center;padding:50px;">' +
      '<h2 style="color:#f44336;">Token invalido</h2>' +
      '<p>' + tokenData.message + '</p>' +
      '</body></html>'
    );
  }

  const duration = getExamDuration(exam);
  const candidateName = tokenData.name;

  const html = '<!DOCTYPE html><html lang="es"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Examen ' + exam + ' - RCCC</title>' +
    '<style>' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#f5f7fa;margin:0;padding:20px;}' +
    '.header{background:linear-gradient(135deg,#001A55 0%,#0966FF 100%);color:white;padding:20px;border-radius:8px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;}' +
    '.timer{font-size:1.5em;font-weight:bold;}' +
    '.timer.warning{color:#FFD700;}' +
    '.timer.critical{color:#FF4444;animation:blink 1s infinite;}' +
    '@keyframes blink{50%{opacity:0;}}' +
    '.question{background:white;padding:20px;border-radius:8px;margin-bottom:15px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}' +
    '.question h3{color:#001A55;margin-bottom:15px;}' +
    '.option{display:block;padding:10px;margin:5px 0;border:2px solid #ddd;border-radius:6px;cursor:pointer;transition:all 0.2s;}' +
    '.option:hover{border-color:#0966FF;background:#f0f5ff;}' +
    'input[type="radio"]:checked+.option{border-color:#0966FF;background:#e8f0ff;}' +
    'textarea{width:100%;min-height:120px;padding:12px;border:2px solid #ddd;border-radius:6px;font-size:1em;resize:vertical;}' +
    'textarea:focus{outline:none;border-color:#0966FF;}' +
    '.submit-btn{background:linear-gradient(135deg,#001A55 0%,#0966FF 100%);color:white;padding:15px 40px;border:none;border-radius:8px;font-size:1.1em;font-weight:600;cursor:pointer;display:block;margin:20px auto;width:100%;max-width:400px;}' +
    '#alertBanner{background:#FF9800;color:white;padding:10px;text-align:center;border-radius:6px;margin-bottom:15px;display:none;}' +
    '</style></head><body>' +
    '<div id="alertBanner"></div>' +
    '<div class="header">' +
    '<div><h2>Examen ' + exam + '</h2><p>Candidato: ' + candidateName + '</p></div>' +
    '<div class="timer" id="timerDisplay">--:--</div>' +
    '</div>' +
    '<div id="questionsContainer"><p>Cargando preguntas...</p></div>' +
    '<button class="submit-btn" onclick="submitExam()">Enviar Examen</button>' +
    '<script>' +
    'var startedAt=new Date().toISOString();' +
    'var blurCount=0;var copyCount=0;' +
    'var duration=' + duration + ';' +
    'var endTime=new Date(Date.now()+duration*60*1000);' +
    'var timerInterval;' +
    // Anti-fraude
    'document.addEventListener("copy",function(e){e.preventDefault();copyCount++;showAlert("Copiar no esta permitido.");});' +
    'document.addEventListener("paste",function(e){e.preventDefault();copyCount++;showAlert("Pegar no esta permitido.");});' +
    'document.addEventListener("cut",function(e){e.preventDefault();copyCount++;showAlert("Cortar no esta permitido.");});' +
    'window.addEventListener("blur",function(){blurCount++;' +
    'if(blurCount>=3){showAlert("Advertencia: Has cambiado de ventana '+3+' veces. Se enviara automaticamente al llegar al limite.");}' +
    'if(blurCount>=5){submitExam();}});' +
    // Timer
    'function startTimer(){timerInterval=setInterval(function(){' +
    'var remaining=Math.max(0,endTime-new Date());' +
    'var mins=Math.floor(remaining/60000);' +
    'var secs=Math.floor((remaining%60000)/1000);' +
    'var display=String(mins).padStart(2,"0")+":"+String(secs).padStart(2,"0");' +
    'var el=document.getElementById("timerDisplay");' +
    'el.textContent=display;' +
    'el.className="timer"+(remaining<300000?" critical":remaining<600000?" warning":"");' +
    'if(remaining<=0){clearInterval(timerInterval);submitExam();}' +
    '},1000);}' +
    'function showAlert(msg){var b=document.getElementById("alertBanner");b.textContent=msg;b.style.display="block";setTimeout(function(){b.style.display="none";},4000);}' +
    // Cargar preguntas
    'google.script.run' +
    '.withSuccessHandler(function(res){' +
    'if(!res.success){document.getElementById("questionsContainer").innerHTML="<p style=color:red;>Error: "+res.message+"</p>";return;}' +
    'var html="";' +
    'res.data.questions.forEach(function(q){' +
    'html+="<div class=question><h3>"+q.n+". "+q.texto+"</h3>";' +
    'if(q.tipo==="multiple"){' +
    'q.opciones.forEach(function(opt,i){' +
    'html+="<label><input type=radio name=q_"+q.id+" value=option_"+(i+1)+"> <span class=option>"+opt+"</span></label>";' +
    '});' +
    '}else{' +
    'html+="<textarea name=q_"+q.id+" placeholder=Escribe tu respuesta aqui...></textarea>";' +
    '}' +
    'html+="</div>";' +
    '});' +
    'document.getElementById("questionsContainer").innerHTML=html;' +
    'startTimer();' +
    '})' +
    '.getExamData("' + token + '","' + exam + '");' +
    // Enviar
    'function submitExam(){' +
    'clearInterval(timerInterval);' +
    'var answers={};' +
    'document.querySelectorAll("input[type=radio]:checked").forEach(function(el){' +
    'var name=el.name.replace("q_","");answers[name]=el.value;});' +
    'document.querySelectorAll("textarea").forEach(function(el){' +
    'var name=el.name.replace("q_","");if(el.value.trim())answers[name]=el.value.trim();});' +
    'if(Object.keys(answers).length===0){showAlert("Debes responder al menos una pregunta.");return;}' +
    'var submitData={token:"' + token + '",exam:"' + exam + '",answers:answers,' +
    'startedAt:startedAt,finishedAt:new Date().toISOString(),' +
    'blur_count:blurCount,copy_count:copyCount};' +
    'document.querySelector(".submit-btn").disabled=true;' +
    'document.querySelector(".submit-btn").textContent="Enviando...";' +
    'google.script.run' +
    '.withSuccessHandler(function(res){' +
    'document.body.innerHTML="<div style=text-align:center;padding:50px;font-family:Arial;>" +' +
    '"<h2 style=color:"+(res.success?"#4CAF50":"#f44336")+";>"+' +
    '(res.success?"Examen enviado exitosamente":"Error al enviar")+"</h2>" +' +
    '"<p>"+res.message+"</p></div>";' +
    '})' +
    '.handleExamSubmit(submitData);}' +
    '</script></body></html>';

  return HtmlService.createHtmlOutput(html);
}

// ================================
// MODULO: UTILIDADES
// ================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getExamDuration(exam) {
  const key = 'exam_' + exam.toLowerCase() + '_duration';
  return CONFIG[key] || 120;
}

function getMinScoreForExam(exam) {
  const key = 'exam_' + exam.toLowerCase() + '_min_score';
  return CONFIG[key] || 75;
}

function jsonResponse(success, message, data) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };
  if (data) response.data = data;

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================
// MODULO: SETUP Y HEALTH CHECK
// ================================

/**
 * Verifica el estado del sistema
 */
function checkSystemHealth() {
  const health = { timestamp: new Date().toISOString(), status: 'OK', checks: {} };

  // Check Sheets
  try {
    const allSheets = SS.getSheets();
    const required = ['Config', 'Candidatos', 'Tokens', 'Timeline'];
    const names = allSheets.map(s => s.getName());
    const missing = required.filter(n => !names.includes(n));

    health.checks.sheets = {
      status: missing.length === 0 ? 'OK' : 'WARNING',
      total: allSheets.length,
      names: names,
      missing: missing
    };
  } catch (e) {
    health.checks.sheets = { status: 'ERROR', error: e.message };
    health.status = 'ERROR';
  }

  // Check API Keys
  try {
    health.checks.apiKeys = {
      openai: CONFIG.openai_api_key ? 'OK' : 'MISSING',
      brevo: CONFIG.brevo_api_key ? 'OK' : 'MISSING',
      resend: CONFIG.resend_api_key ? 'OK' : 'MISSING'
    };
  } catch (e) {
    health.checks.apiKeys = { status: 'ERROR', error: e.message };
  }

  // Check Email Config
  try {
    health.checks.email = {
      from: CONFIG.email_from ? 'OK' : 'MISSING',
      admin: CONFIG.email_admin ? 'OK' : 'MISSING'
    };
  } catch (e) {
    health.checks.email = { status: 'ERROR', error: e.message };
  }

  // Check Candidatos
  try {
    const sheet = SS.getSheetByName('Candidatos');
    health.checks.candidatos = {
      status: 'OK',
      count: sheet ? sheet.getLastRow() - 1 : 0
    };
  } catch (e) {
    health.checks.candidatos = { status: 'ERROR', error: e.message };
  }

  Logger.log('=== HEALTH CHECK ===');
  Logger.log('Estado: ' + health.status);
  Logger.log('Sheets: ' + JSON.stringify(health.checks.sheets));
  Logger.log('API Keys: ' + JSON.stringify(health.checks.apiKeys));
  Logger.log('Email: ' + JSON.stringify(health.checks.email));
  Logger.log('Candidatos: ' + JSON.stringify(health.checks.candidatos));
  Logger.log('===================');

  return health;
}
