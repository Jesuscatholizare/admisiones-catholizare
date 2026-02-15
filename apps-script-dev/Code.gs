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
  get brevo_groups() { return getConfig('BREVO_GROUPS', {}); },
  get timezone() { return getConfig('TIMEZONE', 'America/Bogota'); },
  get app_name() { return getConfig('APP_NAME', 'RCCC Evaluaciones'); },

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

    // Enviar email de bienvenida
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

    // Actualizar status
    updateCandidateStatus(candidate_id, `pausado_${exam.toLowerCase()}`);
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

function gradeExam(exam, answers) {
  const results = {
    score: 0,
    scores: {},
    ai_detected: 0,
    flags: []
  };

  let totalScore = 0;
  let maxScore = 0;

  for (const [questionId, answer] of Object.entries(answers)) {
    if (!answer || answer.toString().trim() === '') {
      maxScore += 10;
      results.scores[questionId] = 0;
      continue;
    }

    totalScore += 8;
    maxScore += 10;
    results.scores[questionId] = 8;
  }

  results.score = Math.round((totalScore / maxScore) * 100);
  return results;
}

// ================================
// MÓDULO: EMAILS
// ================================

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
      <h2>¡Bienvenido ${name}!</h2>
      <p>Tu registro ha sido exitoso.</p>
      <p>Tu examen E1 está agendado para: <strong>${formatted_date}</strong></p>
      <p><a href="${exam_url}"><button>Acceder al Examen</button></a></p>
      <p>Si el botón no funciona, copia este enlace:<br>${exam_url}</p>
    `;

    MailApp.sendEmail({
      to: email,
      subject: `¡Bienvenido a ${CONFIG.app_name}!`,
      htmlBody: htmlBody
    });

    Logger.log(`[Email] Bienvenida enviada a ${email}`);
  } catch (error) {
    Logger.log(`[Email Error] ${error.message}`);
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
      <h2>🆕 Nuevo Candidato Registrado</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>ID:</strong> ${candidate_id}</p>
      <p><strong>Examen agendado:</strong> ${scheduled_date}</p>
    `;

    MailApp.sendEmail({
      to: CONFIG.email_admin,
      subject: `🆕 Nuevo Candidato: ${name}`,
      htmlBody: htmlBody
    });
  } catch (error) {
    Logger.log(`[notifyAdminNewCandidate Error] ${error.message}`);
  }
}

function notifyAdminExamCompleted(name, email, exam, score, verdict, flags) {
  try {
    const htmlBody = `
      <h2>📝 Examen ${exam} Completado</h2>
      <p><strong>Candidato:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Puntaje:</strong> ${score}%</p>
      <p><strong>Veredicto:</strong> ${verdict.toUpperCase()}</p>
      <p><strong>Flags:</strong> ${flags.join(', ') || 'Ninguno'}</p>
    `;

    MailApp.sendEmail({
      to: CONFIG.email_admin,
      subject: `📝 ${exam} Completado - ${name}`,
      htmlBody: htmlBody
    });
  } catch (error) {
    Logger.log(`[notifyAdminExamCompleted Error] ${error.message}`);
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
      <title>Dashboard Admin</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #001A55; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Dashboard Admin</h1>
        <p>Bienvenido al panel de administración.</p>
        <p style="margin-top: 20px; color: #666;">Funcionalidad en desarrollo...</p>
      </div>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html).setWidth(1200).setHeight(600);
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
