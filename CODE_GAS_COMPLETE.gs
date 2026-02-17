/**
 * SISTEMA DE SELECCIÓN DE CANDIDATOS - RCCC
 * Versión 1.0 - Funcional y Robusta
 *
 * Stack: Google Apps Script + Google Sheets
 * Integraciones: OpenAI, Brevo, Resend
 * Seguridad: API_PROXY, Tokens con ventanas ISO, Anti-fraude
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
// FUNCIONES PRINCIPALES
// ================================

/**
 * POST: Procesa solicitudes desde api-proxy.php
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    Logger.log(`[doPost] Acción: ${action}`);

    switch(action) {
      case 'initial_registration':
        return handleRegistration(data);
      case 'submit_exam':
        return handleExamSubmit(data);
      default:
        return jsonResponse(false, 'Acción no válida');
    }
  } catch (error) {
    Logger.log(`[ERROR doPost] ${error.message}`);
    return jsonResponse(false, `Error: ${error.message}`);
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

    Logger.log(`[doGet] Acción: ${action}, Token: ${token?.substring(0, 20)}..., Exam: ${exam}`);

    // Si es para verificar token y obtener preguntas
    if (action === 'get_exam') {
      return getExamData(token, exam);
    }

    // Si es para renderizar WebApp
    if (token && exam) {
      return renderExamWebApp(token, exam);
    }

    // Dashboard admin
    if (action === 'dashboard') {
      return renderAdminDashboard();
    }

    return HtmlService.createHtmlOutput('<h1>Parámetros inválidos</h1>');

  } catch (error) {
    Logger.log(`[ERROR doGet] ${error.message}`);
    return HtmlService.createHtmlOutput(`<h1>Error: ${error.message}</h1>`);
  }
}

// ================================
// MÓDULO: REGISTRO
// ================================

function handleRegistration(data) {
  try {
    const candidate = data.candidate;
    const scheduled_date = data.scheduled_date;

    // Validaciones
    if (!candidate || !candidate.name || !candidate.email) {
      return jsonResponse(false, 'Faltan datos requeridos');
    }

    if (!isValidEmail(candidate.email)) {
      return jsonResponse(false, 'Email inválido');
    }

    if (!scheduled_date) {
      return jsonResponse(false, 'Fecha agendada requerida');
    }

    // Verificar email duplicado
    const sheet = SS.getSheetByName('Candidatos');
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
      'registered', // status
      registration_date, // last_interaction_date
      '', // final_category
      '', // final_status
      '' // notes
    ];

    sheet.appendRow(newRow);

    // Generar token E1
    const token = generateToken(candidate_id, 'E1');
    saveToken(token, candidate_id, 'E1', candidate.email, candidate.name, scheduled_date);

    // Registrar en Timeline
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

    // Enviar email de bienvenida (EML-01)
    sendWelcomeEmail(candidate.email, candidate.name, token, candidate_id, scheduled_date);

    // Notificar admin
    notifyAdminNewCandidate(candidate.name, candidate.email, candidate_id, scheduled_date);

    return jsonResponse(true, 'Registro exitoso. Revisa tu email.', {
      candidate_id: candidate_id,
      token: token,
      exam_url: `https://profesionales.catholizare.com/examen/?token=${token}&exam=E1`
    });

  } catch (error) {
    Logger.log(`[ERROR handleRegistration] ${error.message}`);
    return jsonResponse(false, `Error: ${error.message}`);
  }
}

// ================================
// MÓDULO: EXÁMENES
// ================================

function handleExamSubmit(data) {
  try {
    const { token, exam, answers, startedAt, finishedAt, blur_count = 0, copy_count = 0 } = data;

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
      return jsonResponse(false, `Tiempo excedido. Máximo: ${maxDuration} minutos`);
    }

    // Validar respuestas
    if (!answers || Object.keys(answers).length === 0) {
      return jsonResponse(false, 'Debes responder al menos una pregunta');
    }

    // Procesar respuestas con OpenAI
    const results = gradeExam(exam, answers);
    const score = results.score;
    const flags = results.flags;

    // Detectar IA
    const ai_detected = results.ai_detected || 0;

    // Determinar verdict
    let verdict = 'fail';
    const min_score = getMinScoreForExam(exam);

    if (score >= min_score && ai_detected === 0) {
      verdict = 'pass';
    } else if (ai_detected > 0) {
      verdict = 'review';
    }

    // Guardar resultado en Test_N
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

    // Actualizar status a pending_review (E1, E2 o E3)
    const newStatus = `pending_review_${exam}`;
    updateCandidateStatus(candidate_id, newStatus);
    updateLastInteraction(candidate_id);

    // Timeline
    addTimelineEvent(candidate_id, `TEST_${exam}_COMPLETADO`, {
      puntaje: score,
      veredicto: verdict,
      flags: flags
    });

    // Notificar admin
    notifyAdminExamCompleted(candidate_name, candidate_email, exam, score, verdict, flags);

    // Marcar token como usado
    markTokenAsUsed(token);

    return jsonResponse(true, `Examen ${exam} recibido. Estado: ${verdict}`, {
      verdict: verdict,
      score: score,
      flags: flags
    });

  } catch (error) {
    Logger.log(`[ERROR handleExamSubmit] ${error.message}`);
    return jsonResponse(false, `Error: ${error.message}`);
  }
}

// ================================
// MÓDULO: FLUJO DE ADMIN
// ================================

/**
 * Candidato acepta términos → Genera Token E2
 */
function acceptTerms(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        // Obtener datos del candidato
        const email = data[i][3];
        const name = data[i][2];

        // Actualizar estado a awaiting_terms_acceptance → pending_review_E2 (tras generar token)
        // Primero update status
        sheet.getRange(i + 1, 11).setValue('pending_review_E2'); // Nueva columna para status

        // Generar Token E2
        const token = generateToken(candidateId, 'E2');
        const scheduled_date = new Date().toISOString().split('T')[0]; // Hoy mismo

        saveToken(token, candidateId, 'E2', email, name, scheduled_date);

        // Enviar Email E2 (EML-04)
        sendEmailE2(email, name, token, candidateId);

        // Timeline
        addTimelineEvent(candidateId, 'TERMINOS_ACEPTADOS', {
          email: email,
          token_e2_generado: token
        });

        Logger.log(`[acceptTerms] ${candidateId} accepted terms, E2 token generated`);
        return { success: true, token: token };
      }
    }

    return { success: false, error: 'Candidato no encontrado' };

  } catch (error) {
    Logger.log(`[acceptTerms Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene lista de candidatos para el dashboard administrativo
 */
function getCandidatesForAdmin() {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) {
      return { success: false, error: 'Sheet Candidatos not found', candidates: [] };
    }

    const data = sheet.getDataRange().getValues();
    const candidates = [];

    // Header row starts at index 0
    // Columns: A=candidato_id, B=nombre, C=email, D=telefono, E=fecha_registro, F=scheduled_date, G=status, H=last_interaction, I=final_status, J=final_category, K=admin_assigned_category

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
          // Enviar Email Términos (EML-02)
          sheet.getRange(i + 1, 11).setValue('awaiting_terms_acceptance');
          sendEmailTerms(email, name, candidateId);

        } else if (exam === 'E2') {
          // Generar Token E3
          const token = generateToken(candidateId, 'E3');
          const scheduled_date = new Date().toISOString().split('T')[0];
          saveToken(token, candidateId, 'E3', email, name, scheduled_date);

          sheet.getRange(i + 1, 11).setValue('pending_review_E3');
          sendEmailE3(email, name, token, candidateId);

        } else if (exam === 'E3') {
          // Cambiar a awaiting_interview
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

    return { success: false, error: 'Candidato no encontrado' };

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
        const email = data[i][3];
        const name = data[i][2];

        // Cambiar a rejected
        sheet.getRange(i + 1, 11).setValue('rejected');

        // Agregar a lista Brevo rechazados
        moveContactBetweenLists(
          email,
          CONFIG.brevo_list_interesados,
          CONFIG.brevo_list_rechazados
        );

        // Enviar email de rechazo
        sendEmailRejected(email, name, exam, reason);

        addTimelineEvent(candidateId, `EXAMEN_${exam}_RECHAZADO_ADMIN`, {
          exam: exam,
          razon: reason
        });

        Logger.log(`[rejectExamAdmin] ${candidateId} - ${exam} rejected`);
        return { success: true };
      }
    }

    return { success: false };

  } catch (error) {
    Logger.log(`[rejectExamAdmin Error] ${error.message}`);
    return { success: false };
  }
}

/**
 * Admin asigna categoría (JUNIOR/SENIOR/EXPERT) y aprueba
 * Esto mueve el contacto a la lista correspondiente
 */
function assignCategoryAndApprove(candidateId, category) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        const email = data[i][3];
        const name = data[i][2];

        // Determinar list ID según categoría
        let toListId;
        if (category === 'JUNIOR') toListId = CONFIG.brevo_list_junior;
        else if (category === 'SENIOR') toListId = CONFIG.brevo_list_senior;
        else if (category === 'EXPERT') toListId = CONFIG.brevo_list_expert;
        else toListId = CONFIG.brevo_list_aprobados;

        // Mover contacto a lista de su categoría
        moveContactBetweenLists(
          email,
          CONFIG.brevo_list_interesados,
          toListId
        );

        // Actualizar candidato
        sheet.getRange(i + 1, 11).setValue('approved_' + category.toLowerCase());
        sheet.getRange(i + 1, 13).setValue(category); // admin_assigned_category

        // Enviar email de aprobación final (EML-07)
        sendEmailApproved(email, name, category);

        addTimelineEvent(candidateId, 'CANDIDATO_CATEGORIZADO_APROBADO', {
          category: category,
          lista_brevo: toListId
        });

        Logger.log(`[assignCategoryAndApprove] ${candidateId} - ${category}`);
        return { success: true, category: category };
      }
    }

    return { success: false };

  } catch (error) {
    Logger.log(`[assignCategoryAndApprove Error] ${error.message}`);
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
        // Obtener datos del candidato
        const email = data[i][3];
        const name = data[i][2];
        const phone = data[i][4];
        const category = data[i][13] || '';

        // Acceder a spreadsheet de Onboarding
        const onboardingSpreadsheet = SpreadsheetApp.openById(CONFIG.handoff_spreadsheet_id);
        const handoffSheet = onboardingSpreadsheet.getSheetByName('Candidatos') ||
                           onboardingSpreadsheet.getSheets()[0];

        // Agregar fila en Onboarding
        const handoffRow = [
          candidateId,
          name,
          email,
          phone,
          category,
          'onboarding_pending',
          new Date().toISOString(),
          'Transferido desde Sistema de Selección'
        ];

        handoffSheet.appendRow(handoffRow);

        // Actualizar status en Selección
        sheet.getRange(i + 1, 11).setValue('handoff_completed');

        // Notificar a email de Handoff
        sendHandoffNotification(email, name, category);

        addTimelineEvent(candidateId, 'HANDOFF_COMPLETADO', {
          email_notificacion: CONFIG.email_handoff,
          spreadsheet_id: CONFIG.handoff_spreadsheet_id,
          category: category
        });

        Logger.log(`[performHandoff] ${candidateId} transferred to onboarding`);
        return { success: true };
      }
    }

    return { success: false };

  } catch (error) {
    Logger.log(`[performHandoff Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ================================
// MÓDULO: TOKENS
// ================================

function generateToken(candidate_id, exam) {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8);
  return `${exam}_${candidate_id.substring(0, 8)}_${timestamp}_${random}`;
}

function saveToken(token, candidate_id, exam, email, name, scheduled_date) {
  const sheet = SS.getSheetByName('Tokens');

  let valid_from, valid_until;

  if (scheduled_date) {
    const [year, month, day] = scheduled_date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

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
    false, // used
    'active',
    email,
    name,
    scheduled_date || ''
  ];

  sheet.appendRow(row);
  Logger.log(`[saveToken] Token guardado: ${token}`);
}

function verifyToken(token, exam) {
  const sheet = SS.getSheetByName('Tokens');
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
      if (now < valid_from) return { valid: false, message: `Examen disponible a partir de ${valid_from.toLocaleString(CONFIG.timezone)}` };
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
// MÓDULO: OPENAI
// ================================

/**
 * Carga banco de preguntas desde sheet "Preguntas"
 * Estructura CSV: Cuestionario, N, id, type, category, ai_check, texto, option_1...5, correct, rubric_max_points, rubric_criteria, rubric_red_flags, rubric_raw
 */
function getQuestionsForExam(exam) {
  try {
    const sheet = SS.getSheetByName('Preguntas');
    if (!sheet) {
      Logger.log(`[getQuestionsForExam] Hoja "Preguntas" no encontrada`);
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const questions = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === exam) {
        questions.push({
          n: data[i][1],
          id: data[i][2],
          type: data[i][3],                 // "multiple" o "open"
          category: data[i][4],
          ai_check: data[i][5] === 'TRUE' || data[i][5] === true,
          texto: data[i][6],
          options: [data[i][7], data[i][8], data[i][9], data[i][10], data[i][11]].filter(o => o),
          correct: data[i][12],             // "option_1", "option_2", etc.
          rubric_max_points: data[i][14] || 2,
          rubric_criteria: data[i][16] || '',
          rubric_red_flags: data[i][17] || '',
          rubric_raw: data[i][18] || ''
        });
      }
    }

    Logger.log(`[getQuestionsForExam] Cargadas ${questions.length} preguntas para ${exam}`);
    return questions;
  } catch (error) {
    Logger.log(`[getQuestionsForExam Error] ${error.message}`);
    return [];
  }
}

/**
 * Califica examen con lógica inteligente: múltiple (automática) + abierta (OpenAI)
 */
function gradeExam(exam, answers) {
  try {
    const questions = getQuestionsForExam(exam);
    if (!questions.length) {
      Logger.log(`[gradeExam] No questions found for ${exam}`);
      return {
        score: 0,
        scores: {},
        ai_detected: 0,
        flags: ['ERROR: No questions found']
      };
    }

    const results = {
      score: 0,
      scores: {},
      ai_detected: 0,
      flags: []
    };

    let totalScore = 0;
    let maxScore = 0;
    let aiDetectCount = 0;

    // Evaluar cada pregunta
    for (const question of questions) {
      const answer = answers[question.id] || '';
      maxScore += question.rubric_max_points;

      if (!answer || answer.toString().trim() === '') {
        results.scores[question.id] = {
          score: 0,
          feedback: 'Respuesta vacía',
          type: question.type
        };
        continue;
      }

      try {
        if (question.type === 'multiple') {
          // MÚLTIPLE: Comparar directamente (2pts o 0pts, sin penalización)
          if (answer === question.correct) {
            totalScore += question.rubric_max_points;
            results.scores[question.id] = {
              score: question.rubric_max_points,
              feedback: '✓ Correcto',
              type: 'multiple'
            };
          } else {
            results.scores[question.id] = {
              score: 0,
              feedback: '✗ Incorrecto',
              correct_answer: question.correct,
              type: 'multiple'
            };
          }

        } else if (question.type === 'open') {
          // ABIERTA: OpenAI evalúa con rúbrica
          const aiScore = evaluateOpenWithRubric(
            question,
            answer.toString()
          );
          totalScore += aiScore.score;
          results.scores[question.id] = aiScore;

          // Detectar IA si está configurado
          if (question.ai_check && aiScore.ai_probability > 60) {
            aiDetectCount++;
            results.flags.push(`Q${question.n}: Posible IA (${aiScore.ai_probability}%)`);
          }
        }
      } catch (e) {
        Logger.log(`[gradeExam Question Error] Q${question.id}: ${e.message}`);
        results.scores[question.id] = {
          score: 0,
          feedback: `Error: ${e.message}`,
          type: question.type
        };
      }
    }

    results.score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    results.ai_detected = aiDetectCount;
    results.maxScore = maxScore;
    results.totalScore = totalScore;

    Logger.log(`[gradeExam Complete] ${exam}: ${results.score}% | Detected: ${aiDetectCount} | Flags: ${results.flags.length}`);
    return results;

  } catch (error) {
    Logger.log(`[gradeExam Fatal Error] ${error.message}`);
    return {
      score: 0,
      scores: {},
      ai_detected: 0,
      flags: [`FATAL ERROR: ${error.message}`]
    };
  }
}

/**
 * Evalúa respuesta abierta con OpenAI según rúbrica
 */
function evaluateOpenWithRubric(question, answer) {
  try {
    const apiKey = CONFIG.openai_api_key;
    if (!apiKey) {
      return {
        score: 0,
        ai_probability: 0,
        feedback: 'Error: No OpenAI API key',
        type: 'open'
      };
    }

    const prompt = `Eres evaluador de respuestas psicológicas para la Red de Psicólogos Católicos.

PREGUNTA: ${question.texto}

RESPUESTA DEL CANDIDATO: "${answer}"

RÚBRICA DE EVALUACIÓN:
${question.rubric_criteria}

RED FLAGS (Penalizaciones): ${question.rubric_red_flags}

EVALÚA en JSON:
{
  "score": <0-${question.rubric_max_points}>,
  "ai_probability": <0-100>,
  "rubric_level": "excelente|aceptable|rechazada",
  "reasoning": "<breve justificación>",
  "feedback": "<mensaje para el candidato>"
}

Devuelve SOLO el JSON sin explicación adicional.`;

    const payload = {
      model: CONFIG.openai_model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un evaluador académico experto. Responde SIEMPRE en JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    };

    const options = {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const httpCode = response.getResponseCode();

    if (httpCode !== 200) {
      Logger.log(`[OpenAI Error] ${httpCode}: ${response.getContentText()}`);
      return {
        score: 0,
        ai_probability: 0,
        feedback: `OpenAI Error ${httpCode}`,
        type: 'open'
      };
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

    return {
      score: 0,
      ai_probability: 0,
      feedback: 'OpenAI: No response',
      type: 'open'
    };

  } catch (error) {
    Logger.log(`[evaluateOpenWithRubric Error] ${error.message}`);
    return {
      score: 0,
      ai_probability: 0,
      feedback: `Error: ${error.message}`,
      type: 'open'
    };
  }
}

// ================================
// MÓDULO: BREVO - GESTIÓN DE LISTAS
// ================================

/**
 * Agrega/mueve contacto a una lista de Brevo
 */
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
      updateEnabled: true,  // Actualiza si existe
      listIds: [listId]
    };

    const options = {
      method: 'post',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/contacts', options);
    const httpCode = response.getResponseCode();

    if (httpCode === 201 || httpCode === 204) {
      Logger.log(`[Brevo] Contacto ${email} agregado a lista ${listId}`);
      return { success: true };
    } else {
      Logger.log(`[Brevo Error] ${httpCode}: ${response.getContentText()}`);
      return { success: false, error: `HTTP ${httpCode}` };
    }
  } catch (error) {
    Logger.log(`[addContactToBrevoList Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Mueve contacto de una lista a otra (usado cuando se asigna categoría)
 */
function moveContactBetweenLists(email, fromListId, toListId) {
  try {
    const apiKey = CONFIG.brevo_api_key;
    if (!apiKey) return { success: false };

    // Remover de lista antigua
    const removePayload = {
      emails: [email]
    };

    const removeOptions = {
      method: 'post',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(removePayload),
      muteHttpExceptions: true
    };

    UrlFetchApp.fetch(
      `https://api.brevo.com/v3/contacts/lists/${fromListId}/contacts/remove`,
      removeOptions
    );

    // Agregar a nueva lista
    const addPayload = {
      emails: [email]
    };

    const addOptions = {
      method: 'post',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(addPayload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(
      `https://api.brevo.com/v3/contacts/lists/${toListId}/contacts/add`,
      addOptions
    );

    Logger.log(`[Brevo] Contacto ${email}: ${fromListId} → ${toListId}`);
    return { success: response.getResponseCode() === 204 };

  } catch (error) {
    Logger.log(`[moveContactBetweenLists Error] ${error.message}`);
    return { success: false };
  }
}

// MÓDULO: EMAILS (BREVO + RESEND)
// ================================

/**
 * Envía email usando Brevo (primario) o Resend (fallback)
 */
function sendEmail(to, subject, htmlBody, templateId = null) {
  const brevoKey = CONFIG.brevo_api_key;
  const resendKey = CONFIG.resend_api_key;

  // Intentar con Brevo primero
  if (brevoKey) {
    const brevoResult = sendViaBrevo(to, subject, htmlBody, brevoKey);
    if (brevoResult.success) {
      logNotificationEvent(to, subject, 'BREVO', 'SENT');
      return { success: true, provider: 'BREVO', messageId: brevoResult.messageId };
    }
    Logger.log(`[Email] Brevo falló: ${brevoResult.error}`);
  }

  // Fallback a Resend
  if (resendKey) {
    const resendResult = sendViaResend(to, subject, htmlBody, resendKey);
    if (resendResult.success) {
      logNotificationEvent(to, subject, 'RESEND', 'SENT');
      return { success: true, provider: 'RESEND', messageId: resendResult.messageId };
    }
    Logger.log(`[Email] Resend falló: ${resendResult.error}`);
  }

  // Fallback a MailApp como último recurso
  try {
    MailApp.sendEmail(to, subject, htmlBody.replace(/<[^>]*>/g, ''), { htmlBody: htmlBody });
    logNotificationEvent(to, subject, 'MAILAPP', 'SENT');
    Logger.log(`[Email] Enviado vía MailApp a ${to}`);
    return { success: true, provider: 'MAILAPP' };
  } catch (e) {
    logNotificationEvent(to, subject, 'FAILED', 'ERROR: ' + e.message);
    Logger.log(`[Email] Error crítico: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Envía email vía Brevo API
 */
function sendViaBrevo(to, subject, htmlBody, apiKey) {
  try {
    const sender = {
      name: 'RCCC Evaluaciones',
      email: CONFIG.email_from || 'noreply@rccc.org'
    };

    const payload = {
      to: [{ email: to }],
      sender: sender,
      subject: subject,
      htmlContent: htmlBody
    };

    const options = {
      method: 'post',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 201) {
      Logger.log(`[Brevo] Email enviado. ID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } else {
      return { success: false, error: `Brevo: ${response.getResponseCode()}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Envía email vía Resend API (fallback)
 */
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
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.resend.com/emails', options);
    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200) {
      Logger.log(`[Resend] Email enviado. ID: ${result.id}`);
      return { success: true, messageId: result.id };
    } else {
      return { success: false, error: `Resend: ${response.getResponseCode()}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Registra intentos de envío de email en Timeline
 */
function logNotificationEvent(email, subject, provider, status) {
  try {
    const sheet = SS.getSheetByName('Notificaciones');
    if (sheet) {
      sheet.appendRow([
        new Date(),
        email,
        subject,
        provider,
        status,
        new Date().toISOString()
      ]);
    }
  } catch (error) {
    Logger.log(`[logNotificationEvent Error] ${error.message}`);
  }
}

function sendWelcomeEmail(email, name, token, candidate_id, scheduled_date) {
  try {
    const exam_url = `https://profesionales.catholizare.com/examen/?token=${token}&exam=E1`;
    const formatted_date = new Date(scheduled_date).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlBody = `
      <html>
      <head><style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #001A55 0%, #0966FF 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; }
        .btn { display: inline-block; background: #0966FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; margin-top: 20px; }
      </style></head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido ${name}!</h1>
            <p>Red de Psicólogos Católicos</p>
          </div>
          <div class="content">
            <p>Tu registro ha sido exitoso en nuestro sistema de evaluación.</p>
            <p><strong>Tu examen E1 está agendado para:</strong><br>${formatted_date}</p>
            <p>Accede al examen haciendo clic en el botón:</p>
            <a href="${exam_url}" class="btn">Acceder al Examen E1</a>
            <p style="font-size: 12px;">Si el botón no funciona, copia este enlace:<br><code>${exam_url}</code></p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              <strong>Instrucciones importantes:</strong><br>
              • Duración: 2 horas<br>
              • No se permite copiar/pegar<br>
              • Máximo 3 cambios de ventana<br>
              • Si excedes el tiempo, se enviará automáticamente
            </p>
          </div>
          <div class="footer">
            <p>Sistema de Admisiones RCCC</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return sendEmail(email, `¡Bienvenido a ${CONFIG.app_name}!`, htmlBody);
  } catch (error) {
    Logger.log(`[sendWelcomeEmail Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ================================
// MÓDULO: CANDIDATOS
// ================================

function generateCandidateId() {
  const date = new Date();
  const yyyymmdd = Utilities.formatDate(date, CONFIG.timezone, 'yyyyMMdd');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `CANDIDATO_${yyyymmdd}_${random}`;
}

function updateCandidateStatus(candidate_id, newStatus) {
  const sheet = SS.getSheetByName('Candidatos');
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
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidate_id) {
      sheet.getRange(i + 1, 12).setValue(new Date());
      break;
    }
  }
}

// ================================
// MÓDULO: TIMELINE
// ================================

function addTimelineEvent(candidate_id, event_type, details = {}) {
  try {
    const sheet = SS.getSheetByName('Timeline');
    const row = [
      new Date(),
      candidate_id,
      event_type,
      JSON.stringify(details),
      'SISTEMA'
    ];
    sheet.appendRow(row);
    Logger.log(`[Timeline] ${event_type} para ${candidate_id}`);
  } catch (error) {
    Logger.log(`[Timeline Error] ${error.message}`);
  }
}

// ================================
// MÓDULO: GUARDADO DE RESULTADOS
// ================================

function saveExamResult(candidate_id, exam, resultData) {
  try {
    const sheetName = `Test_${exam}`;
    const sheet = SS.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log(`[saveExamResult] Hoja ${sheetName} no encontrada`);
      return;
    }

    const row = [
      candidate_id,
      exam,
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
    ];

    sheet.appendRow(row);
    Logger.log(`[saveExamResult] Resultado guardado para ${candidate_id}`);
  } catch (error) {
    Logger.log(`[saveExamResult Error] ${error.message}`);
  }
}

// ================================
// MÓDULO: NOTIFICACIONES ADMIN
// ================================

function notifyAdminNewCandidate(name, email, candidate_id, scheduled_date) {
  try {
    const htmlBody = `
      <html>
      <head><style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #001A55; }
      </style></head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆕 Nuevo Candidato Registrado</h1>
          </div>
          <div class="content">
            <div class="field"><span class="label">Nombre:</span> ${name}</div>
            <div class="field"><span class="label">Email:</span> ${email}</div>
            <div class="field"><span class="label">ID Candidato:</span> ${candidate_id}</div>
            <div class="field"><span class="label">Examen agendado:</span> ${scheduled_date}</div>
            <hr>
            <p style="color: #666; font-size: 12px;">Sistema de Admisiones RCCC</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return sendEmail(CONFIG.email_admin, `🆕 Nuevo Candidato: ${name}`, htmlBody);
  } catch (error) {
    Logger.log(`[notifyAdminNewCandidate Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

function notifyAdminExamCompleted(name, email, exam, score, verdict, flags) {
  try {
    const verdictColor = verdict === 'pass' ? '#4CAF50' : (verdict === 'review' ? '#FF9800' : '#f44336');
    const verdictText = verdict === 'pass' ? 'APROBADO ✅' : (verdict === 'review' ? 'REVISAR ⚠️' : 'NO APROBADO ❌');

    const htmlBody = `
      <html>
      <head><style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${verdictColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #001A55; }
        .score { font-size: 2em; text-align: center; color: ${verdictColor}; margin: 20px 0; }
        .flags { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
      </style></head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Examen ${exam} Completado</h1>
          </div>
          <div class="content">
            <div class="field"><span class="label">Candidato:</span> ${name}</div>
            <div class="field"><span class="label">Email:</span> ${email}</div>
            <div class="score">${score}%</div>
            <div class="field" style="text-align: center; font-size: 1.2em; color: ${verdictColor};"><strong>${verdictText}</strong></div>
            ${flags && flags.length > 0 ? `<div class="flags"><strong>Alertas:</strong><br>${flags.join('<br>')}</div>` : ''}
            <hr>
            <p style="color: #666; font-size: 12px;">Sistema de Admisiones RCCC</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return sendEmail(CONFIG.email_admin, `📝 ${exam} Completado - ${name}`, htmlBody);
  } catch (error) {
    Logger.log(`[notifyAdminExamCompleted Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ================================
// MÓDULO: UTILIDADES
// ================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getExamDuration(exam) {
  const key = `exam_${exam.toLowerCase()}_duration`;
  return CONFIG[key] || 120;
}

function getMinScoreForExam(exam) {
  const key = `exam_${exam.toLowerCase()}_min_score`;
  return CONFIG[key] || 75;
}

function jsonResponse(success, message, data = null) {
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
// FUNCIONES DE SETUP Y FORMATEO (NUEVAS)
// ================================

/**
 * FUNCIÓN PRINCIPAL DE SETUP
 * Ejecuta una vez para formatear todas las hojas y crear estructura
 * Uso: En Google Apps Script, presiona el play junto a esta función
 */
function setupSystem() {
  Logger.log('Iniciando setup del sistema RCCC...');

  try {
    formatAllSheets();
    Logger.log('Sistema formateado correctamente');
    Logger.log('Setup completado');

    // Mostrar resumen
    const summary = checkSystemHealth();
    Logger.log('HEALTH CHECK: ' + JSON.stringify(summary, null, 2));
  } catch (error) {
    Logger.log('Error en setup: ' + error.message);
  }
}

/**
 * Formatea todas las hojas del spreadsheet
 * Obtiene dinámicamente todas las hojas que existan
 */
function formatAllSheets() {
  // Obtener TODAS las hojas del spreadsheet dinámicamente
  const allSheets = SS.getSheets();

  Logger.log('Formateando ' + allSheets.length + ' hojas...');

  allSheets.forEach(sheet => {
    const sheetName = sheet.getName();
    try {
      formatSheet(sheet, sheetName);
      Logger.log('✓ Formateada hoja: ' + sheetName);
    } catch (error) {
      Logger.log('✗ Error al formatear ' + sheetName + ': ' + error.message);
    }
  });

  Logger.log('Formateo completo de todas las hojas');
}

/**
 * Formatea una hoja específica
 */
function formatSheet(sheet, sheetName) {
  try {
    // Validar que sheet existe
    if (!sheet) {
      Logger.log('formatSheet: sheet es null para ' + sheetName);
      return;
    }

    // Congelar primera fila (headers)
    try {
      sheet.setFrozenRows(1);
    } catch (e) {
      Logger.log('No se pudo congelar fila en ' + sheetName);
    }

    // Auto-ajustar ancho de columnas al contenido
    const lastColumn = sheet.getLastColumn();
    if (lastColumn > 0) {
      // Auto-fit columns (expandir al contenido)
      try {
        sheet.autoResizeColumns(1, lastColumn);
      } catch (e) {
        Logger.log('Auto-resize columns no disponible para ' + sheetName);
      }
    }

    // Formatear header (primera fila)
    if (lastColumn > 0) {
      const headerRange = sheet.getRange(1, 1, 1, lastColumn);
      headerRange.setBackground('#001A55');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('CENTER');

      // Crear autofilter
      try {
        headerRange.createFilter();
      } catch (e) {
        Logger.log('No se pudo crear filtro en ' + sheetName);
      }
    }

    // Alineación y formato general
    const dataRange = sheet.getDataRange();
    if (dataRange) {
      dataRange.setVerticalAlignment('TOP');
      dataRange.setHorizontalAlignment('LEFT');
    }

  } catch (error) {
    Logger.log('Error en formatSheet(' + sheetName + '): ' + error.message);
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

  // Check 1: Google Sheets (obtiene dinámicamente)
  try {
    const allSheets = SS.getSheets();
    const requiredSheets = ['Config', 'Candidatos', 'Tokens', 'Timeline'];
    const sheetNames = allSheets.map(s => s.getName());
    const missingRequired = requiredSheets.filter(name => !sheetNames.includes(name));

    health.checks.sheets = {
      status: missingRequired.length === 0 ? 'OK' : 'WARNING',
      total: allSheets.length,
      names: sheetNames,
      required: requiredSheets,
      missing: missingRequired
    };
  } catch (e) {
    health.checks.sheets = { status: 'ERROR', error: e.message };
    health.status = 'ERROR';
  }

  // Check 2: API Keys
  try {
    const apiKeys = {
      openai: CONFIG.openai_api_key ? 'OK' : 'MISSING',
      brevo: CONFIG.brevo_api_key ? 'OK' : 'MISSING',
      resend: CONFIG.resend_api_key ? 'OK' : 'MISSING'
    };

    const allValid = !Object.values(apiKeys).includes('MISSING');
    health.checks.apiKeys = {
      status: allValid ? 'OK' : 'WARNING',
      keys: apiKeys
    };
  } catch (e) {
    health.checks.apiKeys = { status: 'ERROR', error: e.message };
    health.status = 'ERROR';
  }

  // Check 3: Configuración de Email
  try {
    const emailConfig = {
      email_from: CONFIG.email_from ? 'OK' : 'MISSING',
      email_admin: CONFIG.email_admin ? 'OK' : 'MISSING',
      email_handoff: CONFIG.email_handoff ? 'OK' : 'MISSING'
    };

    const allValid = !Object.values(emailConfig).includes('MISSING');
    health.checks.emailConfig = {
      status: allValid ? 'OK' : 'WARNING',
      config: emailConfig
    };
  } catch (e) {
    health.checks.emailConfig = { status: 'ERROR', error: e.message };
    health.status = 'ERROR';
  }

  // Check 4: Brevo Lists
  try {
    const brevoLists = {
      interesados: CONFIG.brevo_list_interesados ? 'OK' : 'MISSING',
      junior: CONFIG.brevo_list_junior ? 'OK' : 'MISSING',
      senior: CONFIG.brevo_list_senior ? 'OK' : 'MISSING',
      expert: CONFIG.brevo_list_expert ? 'OK' : 'MISSING'
    };

    const allValid = !Object.values(brevoLists).includes('MISSING');
    health.checks.brevoLists = {
      status: allValid ? 'OK' : 'WARNING',
      lists: brevoLists
    };
  } catch (e) {
    health.checks.brevoLists = { status: 'ERROR', error: e.message };
    health.status = 'ERROR';
  }

  // Check 5: Candidatos Count
  try {
    const candidatosSheet = SS.getSheetByName('Candidatos');
    const count = candidatosSheet ? candidatosSheet.getLastRow() - 1 : 0;
    health.checks.candidatos = {
      status: 'OK',
      count: count
    };
  } catch (e) {
    health.checks.candidatos = { status: 'ERROR', error: e.message };
  }

  Logger.log('=====================================');
  Logger.log('HEALTH CHECK DEL SISTEMA RCCC');
  Logger.log('=====================================');
  Logger.log('Timestamp: ' + health.timestamp);
  Logger.log('Estado General: ' + health.status);
  Logger.log('-------------------------------------');
  Logger.log('Google Sheets: ' + health.checks.sheets.status + ' (' + health.checks.sheets.total + ' hojas encontradas)');
  Logger.log('  Hojas: ' + health.checks.sheets.names.join(', '));
  Logger.log('API Keys: ' + health.checks.apiKeys.status);
  Logger.log('Email Config: ' + health.checks.emailConfig.status);
  Logger.log('Brevo Lists: ' + health.checks.brevoLists.status);
  Logger.log('Candidatos: ' + health.checks.candidatos.status + ' (' + health.checks.candidatos.count + ' registros)');
  Logger.log('=====================================');

  return health;
}
