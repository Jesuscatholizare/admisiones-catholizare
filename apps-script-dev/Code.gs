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
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        const value = data[i][1];
        const type = data[i][2] || 'string';

        if (type === 'json') return JSON.parse(value);
        if (type === 'number') return Number(value);
        return value;
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
// WEBAPP: RENDERIZAR EXAMEN
// ================================

function renderExamWebApp(token, exam) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Examen ${exam}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          background: linear-gradient(135deg, #001A55 0%, #0966FF 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .exam-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 800px;
          width: 100%;
          padding: 40px;
        }
        .exam-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 20px;
        }
        .exam-header h1 {
          color: #001A55;
          margin-bottom: 10px;
        }
        .timer {
          font-size: 2em;
          font-weight: bold;
          color: #0966FF;
          margin-top: 10px;
          font-family: 'Courier New', monospace;
        }
        .timer.warning {
          color: #ff6600;
        }
        .timer.critical {
          color: #dc2626;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .warning-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #92400e;
        }
        .form-group {
          margin: 20px 0;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #001A55;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-family: Arial, sans-serif;
          font-size: 14px;
        }
        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }
        button {
          background: #0966FF;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          margin-top: 20px;
        }
        button:hover {
          background: #001A55;
        }
        button:disabled {
          opacity: 0.5;
          cursor: wait;
        }
      </style>
    </head>
    <body>
      <div class="exam-container">
        <div class="exam-header">
          <h1>Examen ${exam}</h1>
          <p>Red de Psicólogos Católicos</p>
          <div class="timer" id="timer">02:00:00</div>
        </div>

        <div class="warning-box">
          ⚠️ <strong>Protecciones activas:</strong> No se permite copiar/pegar, cambiar de ventana ni usar herramientas externas.
        </div>

        <form id="examForm">
          <div class="form-group">
            <label>Pregunta 1</label>
            <input type="text" name="q1" placeholder="Respuesta" required>
          </div>

          <div class="form-group">
            <label>Pregunta 2</label>
            <textarea name="q2" placeholder="Respuesta abierta" required></textarea>
          </div>

          <button type="submit" id="submitBtn">Enviar Examen</button>
        </form>
      </div>

      <script>
        const TOKEN = '${token}';
        const EXAM = '${exam}';
        const DURATION_SECONDS = 120 * 60;

        let startTime = new Date();
        let blurCount = 0;
        let copyCount = 0;

        function updateTimer() {
          const elapsed = Math.floor((new Date() - startTime) / 1000);
          const remaining = DURATION_SECONDS - elapsed;

          if (remaining <= 0) {
            document.getElementById('timer').textContent = '00:00:00';
            document.getElementById('submitBtn').click();
            return;
          }

          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;

          const timerEl = document.getElementById('timer');
          timerEl.textContent =
            String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');

          if (remaining < 5 * 60) timerEl.classList.add('critical');
          else if (remaining < 10 * 60) timerEl.classList.add('warning');

          setTimeout(updateTimer, 1000);
        }

        document.addEventListener('copy', e => e.preventDefault());
        document.addEventListener('paste', e => e.preventDefault());
        document.addEventListener('cut', e => e.preventDefault());

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            blurCount++;
            alert(\`⚠️ Cambio de ventana detectado (\${blurCount}/3)\`);
            if (blurCount >= 3) {
              document.getElementById('submitBtn').click();
            }
          }
        });

        document.getElementById('examForm').addEventListener('submit', async e => {
          e.preventDefault();

          const formData = new FormData(e.target);
          const answers = Object.fromEntries(formData);

          const payload = {
            action: 'submit_exam',
            token: TOKEN,
            exam: EXAM,
            answers: answers,
            startedAt: startTime.toISOString(),
            finishedAt: new Date().toISOString(),
            blur_count: blurCount,
            copy_count: copyCount
          };

          try {
            const res = await fetch('https://profesionales.catholizare.com/api-proxy.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
              alert('✅ Examen recibido. ' + data.message);
              window.location.href = 'https://profesionales.catholizare.com';
            } else {
              alert('❌ ' + data.message);
            }
          } catch (error) {
            alert('Error al enviar: ' + error.message);
          }
        });

        updateTimer();
      </script>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html).setWidth(1000).setHeight(800);
}

// ================================
// WEBAPP: DASHBOARD ADMIN
// ================================

function renderAdminDashboard() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Dashboard Admin - RCCC</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
          color: #333;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

        /* Header */
        .header {
          background: linear-gradient(135deg, #001A55 0%, #0966FF 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header h1 { margin-bottom: 10px; }
        .header p { opacity: 0.9; }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #0966FF; }
        .stat-label { color: #666; margin-top: 10px; font-size: 0.9em; }

        /* Tabs */
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #ddd;
        }
        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          font-size: 1em;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }
        .tab.active {
          color: #0966FF;
          border-bottom-color: #0966FF;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* Filters */
        .filters {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .filter-input {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          flex: 1;
          min-width: 150px;
        }

        /* Table */
        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: #f5f5f5;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #001A55;
          border-bottom: 2px solid #ddd;
        }
        td {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }
        tr:hover { background: #fafafa; }

        /* Status badges */
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85em;
          font-weight: 600;
        }
        .badge.pass { background: #d4edda; color: #155724; }
        .badge.fail { background: #f8d7da; color: #721c24; }
        .badge.review { background: #fff3cd; color: #856404; }

        /* Buttons */
        button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #0966FF;
          color: white;
        }
        .btn-primary:hover { background: #001A55; }
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        .btn-secondary:hover { background: #5a6268; }

        /* Modal */
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          justify-content: center;
          align-items: center;
        }
        .modal.active { display: flex; }
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal-header { font-size: 1.5em; margin-bottom: 20px; }
        .modal-body { margin-bottom: 20px; }
        .modal-footer { display: flex; gap: 10px; justify-content: flex-end; }

        .loading { text-align: center; color: #999; padding: 40px; }
        .error { color: #721c24; background: #f8d7da; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Dashboard Admin</h1>
          <p>Red de Psicólogos Católicos - Sistema de Selección de Candidatos</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number" id="total-candidates">0</div>
            <div class="stat-label">Candidatos Totales</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="completed-exams">0</div>
            <div class="stat-label">Exámenes Completados</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="approved-candidates">0</div>
            <div class="stat-label">Aprobados</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="pending-review">0</div>
            <div class="stat-label">Pendientes de Revisión</div>
          </div>
        </div>

        <div class="tabs">
          <button class="tab active" onclick="showTab('candidates')">Candidatos</button>
          <button class="tab" onclick="showTab('exams')">Exámenes</button>
          <button class="tab" onclick="showTab('results')">Resultados</button>
        </div>

        <!-- TAB: Candidatos -->
        <div id="candidates" class="tab-content active">
          <div class="filters">
            <input type="text" class="filter-input" id="search-candidate" placeholder="Buscar por nombre o email...">
            <select class="filter-input" id="filter-status">
              <option value="">Todos los estados</option>
              <option value="registered">Registrado</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="incomplete">Incompleto</option>
            </select>
          </div>
          <div class="table-container">
            <table id="candidates-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="candidates-body">
                <tr><td colspan="6" class="loading">Cargando candidatos...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: Exámenes -->
        <div id="exams" class="tab-content">
          <div class="filters">
            <select class="filter-input" id="filter-exam">
              <option value="">Todos los exámenes</option>
              <option value="E1">Examen E1</option>
              <option value="E2">Examen E2</option>
              <option value="E3">Examen E3</option>
            </select>
            <select class="filter-input" id="filter-verdict">
              <option value="">Todos los resultados</option>
              <option value="pass">Aprobado</option>
              <option value="fail">No Aprobado</option>
              <option value="review">Por Revisar</option>
            </select>
          </div>
          <div class="table-container">
            <table id="exams-table">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Examen</th>
                  <th>Puntaje</th>
                  <th>Veredicto</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="exams-body">
                <tr><td colspan="6" class="loading">Cargando exámenes...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: Resultados -->
        <div id="results" class="tab-content">
          <div class="table-container">
            <table id="results-table">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Prom. E1</th>
                  <th>Prom. E2</th>
                  <th>Prom. E3</th>
                  <th>Promedio Final</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="results-body">
                <tr><td colspan="7" class="loading">Cargando resultados...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal para detalles -->
      <div id="detailModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">Detalles del Candidato</div>
          <div class="modal-body" id="modal-body">
            <!-- Contenido dinámico -->
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="closeModal()">Cerrar</button>
          </div>
        </div>
      </div>

      <script>
        // Cargar datos iniciales
        function loadDashboard() {
          google.script.run.withSuccessHandler(updateStats).getDashboardStats();
          google.script.run.withSuccessHandler(loadCandidates).getAllCandidates();
        }

        function showTab(tabName) {
          // Ocultar todos los tabs
          document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

          // Mostrar tab seleccionado
          document.getElementById(tabName).classList.add('active');
          event.target.classList.add('active');

          if (tabName === 'exams') {
            google.script.run.withSuccessHandler(loadExams).getAllExams();
          } else if (tabName === 'results') {
            google.script.run.withSuccessHandler(loadResults).getAllResults();
          }
        }

        function updateStats(stats) {
          document.getElementById('total-candidates').textContent = stats.totalCandidates || 0;
          document.getElementById('completed-exams').textContent = stats.completedExams || 0;
          document.getElementById('approved-candidates').textContent = stats.approvedCandidates || 0;
          document.getElementById('pending-review').textContent = stats.pendingReview || 0;
        }

        function loadCandidates(data) {
          const tbody = document.getElementById('candidates-body');
          if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hay candidatos</td></tr>';
            return;
          }
          tbody.innerHTML = data.map(c => \`
            <tr>
              <td>\${c.id}</td>
              <td>\${c.nombre}</td>
              <td>\${c.email}</td>
              <td><span class="badge \${c.estado === 'completed' ? 'pass' : 'fail'}">\${c.estado}</span></td>
              <td>\${c.fecha_registro}</td>
              <td><button class="btn-primary" onclick="showCandidateDetails('\${c.id}')">Ver</button></td>
            </tr>
          \`).join('');
        }

        function loadExams(data) {
          const tbody = document.getElementById('exams-body');
          if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hay exámenes</td></tr>';
            return;
          }
          tbody.innerHTML = data.map(e => \`
            <tr>
              <td>\${e.nombre}</td>
              <td>\${e.exam}</td>
              <td>\${e.score}%</td>
              <td><span class="badge \${e.verdict}">\${e.verdict}</span></td>
              <td>\${e.fecha}</td>
              <td><button class="btn-primary" onclick="reviewExam('\${e.id}', '\${e.exam}')">Revisar</button></td>
            </tr>
          \`).join('');
        }

        function loadResults(data) {
          const tbody = document.getElementById('results-body');
          if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No hay resultados</td></tr>';
            return;
          }
          tbody.innerHTML = data.map(r => \`
            <tr>
              <td>\${r.nombre}</td>
              <td>\${r.e1 || '-'}</td>
              <td>\${r.e2 || '-'}</td>
              <td>\${r.e3 || '-'}</td>
              <td><strong>\${r.promedio || '-'}</strong></td>
              <td><span class="badge \${r.estado === 'APROBADO' ? 'pass' : 'fail'}">\${r.estado}</span></td>
              <td><button class="btn-primary" onclick="approveResult('\${r.id}')">Aprobar</button></td>
            </tr>
          \`).join('');
        }

        function showCandidateDetails(candidateId) {
          google.script.run.withSuccessHandler(showModal).getCandidateDetails(candidateId);
        }

        function showModal(html) {
          document.getElementById('modal-body').innerHTML = html;
          document.getElementById('detailModal').classList.add('active');
        }

        function closeModal() {
          document.getElementById('detailModal').classList.remove('active');
        }

        function reviewExam(candidateId, exam) {
          alert('Funcionalidad en desarrollo: Revisar ' + exam);
        }

        function approveResult(resultId) {
          if (confirm('¿Confirmar aprobación de resultado?')) {
            google.script.run.withSuccessHandler(loadDashboard).approveResult(resultId);
            alert('Resultado aprobado');
          }
        }

        // Cargar al abrir
        window.addEventListener('load', loadDashboard);
      </script>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html).setWidth(1400).setHeight(1000);
}

/**
 * Funciones backend para el dashboard
 */
function getDashboardStats() {
  const candidatosSheet = SS.getSheetByName('Candidatos');
  const data = candidatosSheet.getDataRange().getValues();

  let totalCandidates = data.length - 1;
  let completedExams = 0;
  let approvedCandidates = 0;
  let pendingReview = 0;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][10];
    if (status === 'completed') completedExams++;
    if (status === 'approved') approvedCandidates++;
    if (status === 'review') pendingReview++;
  }

  return {
    totalCandidates,
    completedExams,
    approvedCandidates,
    pendingReview
  };
}

function getAllCandidates() {
  const sheet = SS.getSheetByName('Candidatos');
  const data = sheet.getDataRange().getValues();

  return data.slice(1).map(row => ({
    id: row[0],
    nombre: row[1],
    email: row[2],
    telefono: row[3],
    estado: row[10],
    fecha_registro: row[8]
  }));
}

function getAllExams() {
  const sheets = ['Test_1', 'Test_2', 'Test_3'];
  const exams = [];

  for (const sheetName of sheets) {
    try {
      const sheet = SS.getSheetByName(sheetName);
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        exams.push({
          id: data[i][0],
          nombre: data[i][0],
          exam: sheetName.replace('Test_', 'E'),
          score: data[i][11],
          verdict: data[i][10],
          fecha: data[i][3]
        });
      }
    } catch (e) {
      Logger.log(`Error reading ${sheetName}: ${e.message}`);
    }
  }

  return exams;
}

function getAllResults() {
  const sheet = SS.getSheetByName('Resultados');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => ({
    id: row[0],
    nombre: row[1],
    e1: row[4],
    e2: row[5],
    e3: row[6],
    promedio: row[7],
    estado: row[8]
  }));
}

function getCandidateDetails(candidateId) {
  const sheet = SS.getSheetByName('Candidatos');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      return \`
        <p><strong>ID:</strong> \${data[i][0]}</p>
        <p><strong>Nombre:</strong> \${data[i][1]}</p>
        <p><strong>Email:</strong> \${data[i][2]}</p>
        <p><strong>Teléfono:</strong> \${data[i][3]}</p>
        <p><strong>Estado:</strong> \${data[i][10]}</p>
        <p><strong>Fecha Registro:</strong> \${data[i][8]}</p>
      \`;
    }
  }
  return '<p>Candidato no encontrado</p>';
}

function approveResult(resultId) {
  const sheet = SS.getSheetByName('Resultados');
  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === resultId) {
      sheet.getRange(i + 1, 10).setValue('APROBADO');
      sheet.getRange(i + 1, 16).setValue(new Date());
      return true;
    }
  }
  return false;
}

// ================================
// FUNCIÓN: OBTENER DATOS EXAMEN
// ================================

function getExamData(token, exam) {
  const tokenData = verifyToken(token, exam);

  if (!tokenData.valid) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: tokenData.message
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    candidate: {
      id: tokenData.candidate_id,
      name: tokenData.name,
      email: tokenData.email
    },
    exam: exam,
    duration_minutes: getExamDuration(exam)
  })).setMimeType(ContentService.MimeType.JSON);
}

// ================================
// MÓDULO: GENERACIÓN DE RESULTADOS
// ================================

/**
 * Genera resultado final cuando admin aprueba Test 3
 * Calcula promedio, categoriza candidato, envía email
 */
function generateAndApproveResult(candidateId, adminNotes = '') {
  try {
    // 1. Obtener calificaciones de los 3 tests
    const test1Score = getTestScore(candidateId, 'Test_1');
    const test2Score = getTestScore(candidateId, 'Test_2');
    const test3Score = getTestScore(candidateId, 'Test_3');

    // Validar que todos los tests estén calificados
    if (test1Score === null || test2Score === null || test3Score === null) {
      Logger.log(`[generateAndApproveResult] No todos los tests están calificados para ${candidateId}`);
      return {
        success: false,
        error: 'No todos los tests están calificados. Completa los 3 exámenes primero.'
      };
    }

    // 2. Calcular promedio
    const averageScore = (test1Score + test2Score + test3Score) / 3;

    // 3. Determinar estado final y categoría
    const minScore = CONFIG.exam_e1_min_score || 75;
    const finalStatus = averageScore >= minScore ? 'APROBADO' : 'RECHAZADO';
    const category = categorizeCandidateByScore(averageScore);

    // 4. Obtener datos del candidato
    const candidate = getCandidateData(candidateId);
    if (!candidate) {
      return { success: false, error: 'Candidato no encontrado' };
    }

    // 5. Calcular duración total
    const registrationDate = new Date(candidate.fecha_registro);
    const completionDate = new Date();
    const daysDuration = Math.floor((completionDate - registrationDate) / (1000 * 60 * 60 * 24));

    // 6. Crear/actualizar fila en "Resultados"
    const resultsSheet = SS.getSheetByName('Resultados');
    if (!resultsSheet) {
      Logger.log('[generateAndApproveResult] Hoja "Resultados" no encontrada');
      return { success: false, error: 'Hoja de resultados no configurada' };
    }

    // Buscar si ya existe resultado
    const existingResult = findResultRow(candidateId);
    const newRow = [
      candidateId,
      candidate.nombre,
      candidate.email,
      candidate.telefono,
      test1Score,
      test2Score,
      test3Score,
      Math.round(averageScore * 100) / 100,  // Promedio con 2 decimales
      finalStatus,
      category,  // Nueva columna para categoría
      adminNotes,
      candidate.fecha_registro,
      completionDate.toISOString(),
      daysDuration,
      finalStatus === 'APROBADO' ? 'SÍ' : 'NO',  // Email enviado (se actualiza después)
      completionDate.toISOString()
    ];

    if (existingResult) {
      // Actualizar resultado existente
      for (let j = 1; j <= newRow.length; j++) {
        resultsSheet.getRange(existingResult + 1, j).setValue(newRow[j - 1]);
      }
    } else {
      // Crear nuevo resultado
      resultsSheet.appendRow(newRow);
    }

    // 7. Actualizar estado de candidato
    updateCandidateStatus(candidateId, 'completed');
    updateCandidateFinalStatus(candidateId, finalStatus, category);

    // 8. Registrar en Timeline
    addTimelineEvent(candidateId, 'RESULTADO_GENERADO', {
      test1: test1Score,
      test2: test2Score,
      test3: test3Score,
      promedio: averageScore,
      estado: finalStatus,
      categoria: category,
      admin_notes: adminNotes
    });

    // 9. Enviar email con resultado
    const emailResult = sendFinalResultEmail(
      candidate.email,
      candidate.nombre,
      {
        test1: test1Score,
        test2: test2Score,
        test3: test3Score,
        average: averageScore,
        status: finalStatus,
        category: category,
        registrationDate: candidate.fecha_registro,
        completionDate: completionDate.toISOString(),
        daysDuration: daysDuration
      }
    );

    // 10. Actualizar estado de email
    if (emailResult && emailResult.success) {
      const resultsSheet2 = SS.getSheetByName('Resultados');
      const resultRow = findResultRow(candidateId);
      if (resultRow) {
        resultsSheet2.getRange(resultRow + 1, 15).setValue('SÍ');  // Email_Enviado
      }
    }

    Logger.log(`[generateAndApproveResult] ✅ Resultado generado para ${candidateId}: ${finalStatus} (${category})`);

    return {
      success: true,
      candidateId: candidateId,
      averageScore: averageScore,
      finalStatus: finalStatus,
      category: category,
      emailSent: emailResult ? emailResult.success : false
    };

  } catch (error) {
    Logger.log(`[generateAndApproveResult Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene calificación de un examen específico
 */
function getTestScore(candidateId, testSheet) {
  try {
    const sheet = SS.getSheetByName(testSheet);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        // La columna 11 contiene la calificación numérica
        const score = parseFloat(data[i][11]);
        return isNaN(score) ? null : score;
      }
    }
    return null;
  } catch (error) {
    Logger.log(`[getTestScore Error] ${error.message}`);
    return null;
  }
}

/**
 * Obtiene datos del candidato
 */
function getCandidateData(candidateId) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        return {
          id: data[i][0],
          nombre: data[i][1],
          email: data[i][2],
          telefono: data[i][3],
          fecha_registro: data[i][8]
        };
      }
    }
    return null;
  } catch (error) {
    Logger.log(`[getCandidateData Error] ${error.message}`);
    return null;
  }
}

/**
 * Busca si ya existe un resultado para este candidato
 */
function findResultRow(candidateId) {
  try {
    const sheet = SS.getSheetByName('Resultados');
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        return i;
      }
    }
    return null;
  } catch (error) {
    Logger.log(`[findResultRow Error] ${error.message}`);
    return null;
  }
}

/**
 * Categoriza candidato basado en promedio final
 */
function categorizeCandidateByScore(score) {
  const juniorMin = CONFIG.category_junior_min || 75;
  const juniorMax = CONFIG.category_junior_max || 79;
  const seniorMin = CONFIG.category_senior_min || 80;
  const seniorMax = CONFIG.category_senior_max || 89;
  const expertMin = CONFIG.category_expert_min || 90;

  if (score >= expertMin) {
    return 'EXPERT';
  } else if (score >= seniorMin && score <= seniorMax) {
    return 'SENIOR';
  } else if (score >= juniorMin && score <= juniorMax) {
    return 'JUNIOR';
  } else {
    return 'REJECTED';
  }
}

/**
 * Actualiza el estado final del candidato en hoja Candidatos
 */
function updateCandidateFinalStatus(candidateId, finalStatus, category) {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === candidateId) {
        // Columna 13: Estado Final (APROBADO_JUNIOR, APROBADO_SENIOR, APROBADO_EXPERT, RECHAZADO, INCONCLUISO)
        const finalStatusValue = finalStatus === 'APROBADO'
          ? `APROBADO_${category}`
          : 'RECHAZADO';

        sheet.getRange(i + 1, 13).setValue(finalStatusValue);
        sheet.getRange(i + 1, 14).setValue(new Date().toISOString());
        break;
      }
    }
  } catch (error) {
    Logger.log(`[updateCandidateFinalStatus Error] ${error.message}`);
  }
}

/**
 * Envía email final con resultado
 */
function sendFinalResultEmail(email, name, resultData) {
  try {
    const {
      test1, test2, test3, average, status, category,
      registrationDate, completionDate, daysDuration
    } = resultData;

    const statusColor = status === 'APROBADO' ? '#4CAF50' : '#f44336';
    const statusText = status === 'APROBADO' ? '✅ APROBADO' : '❌ RECHAZADO';
    const categoryText = category ? `(${category.toUpperCase()})` : '';

    const htmlBody = `
      <html>
      <head><style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header {
          background: ${statusColor};
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .score-box {
          background: white;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
          text-align: center;
          border-left: 4px solid ${statusColor};
        }
        .score-item { margin: 10px 0; }
        .score-label { color: #666; font-size: 0.9em; }
        .score-value { font-size: 2em; font-weight: bold; color: ${statusColor}; }
        .average-box { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .average-value { font-size: 3em; font-weight: bold; }
        table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; color: #001A55; }
        .next-steps { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { color: #666; font-size: 0.9em; text-align: center; margin-top: 20px; }
      </style></head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tu Resultado Final</h1>
            <p>Red de Psicólogos Católicos</p>
          </div>
          <div class="content">
            <p>Estimado(a) <strong>${name}</strong>,</p>
            <p>Nos complace informarte que hemos completado la evaluación de tu proceso de selección.</p>

            <div class="score-box">
              <div class="score-label">RESULTADO FINAL</div>
              <div class="score-value" style="color: ${statusColor};">${statusText} ${categoryText}</div>
            </div>

            <h3>📊 Calificaciones Detalladas</h3>
            <table>
              <tr>
                <th>Evaluación</th>
                <th>Calificación</th>
              </tr>
              <tr>
                <td>Evaluación 1</td>
                <td><strong>${test1}/100</strong></td>
              </tr>
              <tr>
                <td>Evaluación 2</td>
                <td><strong>${test2}/100</strong></td>
              </tr>
              <tr>
                <td>Evaluación 3</td>
                <td><strong>${test3}/100</strong></td>
              </tr>
            </table>

            <div class="average-box">
              <div style="color: rgba(255,255,255,0.8); margin-bottom: 5px;">PROMEDIO FINAL</div>
              <div class="average-value">${Math.round(average * 100) / 100}</div>
            </div>

            ${status === 'APROBADO' ? `
            <div class="next-steps">
              <h3>✅ ¡Felicitaciones!</h3>
              <p>Has superado el proceso de evaluación con éxito. Perteneces a la categoría <strong>${category}</strong>.</p>
              <p>El siguiente paso es una entrevista personal. Nos comunicaremos contigo en los próximos días para agendar.</p>
            </div>
            ` : `
            <div class="next-steps">
              <h3>📋 Información Importante</h3>
              <p>Lamentamos informarte que en esta ocasión tu resultado fue negativo. Si deseas recibir retroalimentación sobre tu desempeño, por favor contacta a nuestro equipo de admisiones.</p>
              <p><strong>Email de contacto:</strong> ${CONFIG.email_admin || 'admin@rccc.org'}</p>
            </div>
            `}

            <h3>📅 Resumen del Proceso</h3>
            <table>
              <tr>
                <th>Concepto</th>
                <th>Valor</th>
              </tr>
              <tr>
                <td>Fecha de Registro</td>
                <td>${registrationDate}</td>
              </tr>
              <tr>
                <td>Fecha de Finalización</td>
                <td>${completionDate.substring(0, 10)}</td>
              </tr>
              <tr>
                <td>Duración Total</td>
                <td>${daysDuration} días</td>
              </tr>
            </table>

            <div class="footer">
              <p>Sistema de Admisiones RCCC<br>
              Red de Psicólogos Católicos</p>
              <p style="margin-top: 20px; color: #999; font-size: 0.8em;">
                Este es un mensaje automático. Por favor no responder a este email.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = status === 'APROBADO'
      ? `✅ Resultado: APROBADO - Sistema RCCC`
      : `📋 Resultado: RECHAZADO - Sistema RCCC`;

    return sendEmail(email, subject, htmlBody);

  } catch (error) {
    Logger.log(`[sendFinalResultEmail Error] ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * EML-02: Email de Términos (después E1 aprobado)
 */
function sendEmailTerms(email, name, candidateId) {
  const htmlBody = `
    <html><body style="font-family: Arial; color: #333;">
      <h2>Aceptación de Términos - Red de Psicólogos Católicos</h2>
      <p>Estimado(a) ${name},</p>
      <p>¡Felicitaciones! Tu examen E1 ha sido aprobado.</p>
      <p>Antes de continuar con el Examen E2, necesitamos que aceptes nuestros términos y condiciones.</p>
      <p><strong><a href="https://profesionales.catholizare.com/terminos/?uid=${candidateId}" style="background: #0966FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Leer y Aceptar Términos</a></strong></p>
      <p>Una vez aceptados, recibirás tu Examen E2.</p>
    </body></html>
  `;
  return sendEmail(email, '✅ Aceptación de Términos - RCCC', htmlBody);
}

/**
 * EML-03: Email de Rechazo de E1/E2/E3
 */
function sendEmailRejected(email, name, exam, reason) {
  const htmlBody = `
    <html><body style="font-family: Arial; color: #333;">
      <h2>Resultado de Evaluación</h2>
      <p>Estimado(a) ${name},</p>
      <p>Lamentamos informarte que tu resultado en el ${exam} no fue favorable para continuar en esta ocasión.</p>
      <p><strong>Motivo:</strong> ${reason || 'No alcanzó el puntaje mínimo requerido.'}</p>
      <p>Si tienes preguntas, contacta a: ${CONFIG.email_admin}</p>
    </body></html>
  `;
  return sendEmail(email, `❌ Resultado ${exam} - RCCC`, htmlBody);
}

/**
 * EML-04: Email para E2 (después aceptar términos)
 */
function sendEmailE2(email, name, token, candidateId) {
  const htmlBody = `
    <html><body style="font-family: Arial; color: #333;">
      <h2>Examen E2 - Red de Psicólogos Católicos</h2>
      <p>Estimado(a) ${name},</p>
      <p>Agradecemos tu aceptación de nuestros términos.</p>
      <p>Ahora tienes acceso a tu <strong>Examen E2</strong>:</p>
      <p><strong><a href="https://profesionales.catholizare.com/examen/?token=${token}&exam=E2" style="background: #0966FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Acceder a Examen E2</a></strong></p>
      <p><strong>Duración:</strong> 2 horas<br><strong>Fecha límite:</strong> 30 días desde hoy</p>
    </body></html>
  `;
  return sendEmail(email, '📝 Examen E2 - RCCC', htmlBody);
}

/**
 * EML-05: Email para E3 (después E2 aprobado)
 */
function sendEmailE3(email, name, token, candidateId) {
  const htmlBody = `
    <html><body style="font-family: Arial; color: #333;">
      <h2>Examen E3 - Fase Final</h2>
      <p>Estimado(a) ${name},</p>
      <p>¡Excelente! Has aprobado el Examen E2.</p>
      <p>Aquí viene la fase final del proceso de selección:</p>
      <p><strong><a href="https://profesionales.catholizare.com/examen/?token=${token}&exam=E3" style="background: #0966FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Acceder a Examen E3</a></strong></p>
      <p>Este es el último paso antes de nuestra evaluación final.</p>
    </body></html>
  `;
  return sendEmail(email, '📋 Examen E3 - RCCC', htmlBody);
}

/**
 * EML-06: Email Entrevista (después E3 aprobado)
 */
function sendEmailAwaitingInterview(email, name, candidateId) {
  const htmlBody = `
    <html><body style="font-family: Arial; color: #333;">
      <h2>¡Siguiente Paso: Entrevista Personal!</h2>
      <p>Estimado(a) ${name},</p>
      <p>¡Felicitaciones! Has completado satisfactoriamente los tres exámenes.</p>
      <p>El siguiente paso es una <strong>entrevista personal</strong> con nuestro equipo.</p>
      <p>Nos comunicaremos contigo en los próximos días para agendar una cita.</p>
      <p>Gracias por tu dedicación en este proceso.</p>
    </body></html>
  `;
  return sendEmail(email, '📅 Entrevista Personal - RCCC', htmlBody);
}

/**
 * EML-07: Email Bienvenida Final (después aprobación definitiva)
 */
function sendEmailApproved(email, name, category) {
  const categoryLabel = {
    'JUNIOR': 'Nivel Junior',
    'SENIOR': 'Nivel Senior',
    'EXPERT': 'Nivel Expert'
  };

  const htmlBody = `
    <html><body style="font-family: Arial; color: #333;">
      <h2 style="color: #4CAF50;">¡Bienvenido a la Red!</h2>
      <p>Estimado(a) ${name},</p>
      <p>¡Excelente noticia! <strong>¡Has sido aprobado(a)</strong> para formar parte de la Red de Psicólogos Católicos.</p>
      <p><strong>Tu Nivel:</strong> ${categoryLabel[category] || category}</p>
      <p>En los próximos días recibirás instrucciones para completar tu proceso de onboarding.</p>
      <p>Bienvenido(a) a nuestra comunidad de profesionales.</p>
    </body></html>
  `;
  return sendEmail(email, `✅ ¡Aprobado! Bienvenido a RCCC - ${categoryLabel[category]}`, htmlBody);
}

/**
 * Email de Notificación para Handoff
 */
function sendHandoffNotification(email, name, category) {
  const htmlBody = `
    <html><body style="font-family: Arial; color: #333;">
      <h2>Proceso de Onboarding Iniciado</h2>
      <p>Estimado(a) ${name},</p>
      <p>Tu candidatura ha sido transferida al proceso de onboarding.</p>
      <p>El equipo de incorporación se comunicará contigo en breve.</p>
      <p>Categoría asignada: <strong>${category}</strong></p>
    </body></html>
  `;
  return sendEmail(CONFIG.email_handoff, `🎉 Handoff Completado: ${name} (${category})`, htmlBody);
}

// ================================
// TRIGGER: DETECTAR INCONCLUSOS
// ================================

function triggerMarkIncompleteByInactivity() {
  try {
    const sheet = SS.getSheetByName('Candidatos');
    const data = sheet.getDataRange().getValues();
    const threshold_days = CONFIG.inactive_days;
    const now = new Date();

    for (let i = 1; i < data.length; i++) {
      const candidate_id = data[i][0];
      const status = data[i][10];
      const last_interaction = new Date(data[i][11]);

      if (!status || status === 'completed' || status === 'rejected' || status === 'incomplete') {
        continue;
      }

      const days_inactive = (now - last_interaction) / (1000 * 60 * 60 * 24);

      if (days_inactive > threshold_days) {
        sheet.getRange(i + 1, 11).setValue('incomplete');
        sheet.getRange(i + 1, 13).setValue('INCONCLUSO');
        sheet.getRange(i + 1, 14).setValue(`Inconcluso por inactividad (${Math.floor(days_inactive)} días)`);

        addTimelineEvent(candidate_id, 'INCONCLUSO_MARCADO', {
          dias_inactivo: Math.floor(days_inactive),
          threshold_dias: threshold_days
        });

        Logger.log(`[triggerMarkIncompleteByInactivity] ${candidate_id} marcado como inconcluso`);
      }
    }
  } catch (error) {
    Logger.log(`[triggerMarkIncompleteByInactivity Error] ${error.message}`);
  }
}
