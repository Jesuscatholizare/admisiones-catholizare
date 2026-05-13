/*******************************************************
 * Catholizare | Admisiones (Selección) - Backend (FULL)
 * Resend = transaccional (emails)
 * Brevo  = automatizaciones por grupos (listas)
 *
 * Optimización:
 * - Ya NO ejecuta el formateo pesado en cada request.
 * - getCandidates no devuelve 2999 ni filas vacías.
 *******************************************************/

/** ========= CONSTANTES ========= */
const CZ = {
  DEFAULT_APPLY_ROWS: 3000,
  EXAM_IDS: ['E1', 'E2', 'E3'],
  SCHEMA_VERSION: '2026-02-04-brevo-v1', // cambia si alteras schema/headers
  COLORS: {
    headerBg: '#001A55',
    headerFg: '#FFFFFF',
    gridFg:  '#111827',
    okBg:    '#D1FAE5',
    okFg:    '#065F46',
    warnBg:  '#FEF3C7',
    warnFg:  '#92400E',
    badBg:   '#FEE2E2',
    badFg:   '#991B1B',
    mutedBg: '#E5E7EB',
    mutedFg: '#374151',
  }
};

const PROP_KEYS = {
  // Core
  ADMISSIONS_SS_ID: 'ADMISSIONS_SS_ID',
  ADMIN_NOTIFY_EMAIL: 'ADMIN_NOTIFY_EMAIL',

  // Resend (transaccional)
  RESEND_API_KEY: 'RESEND_API_KEY',
  RESEND_FROM: 'RESEND_FROM',

  // URLs
  URL_E1_START: 'URL_E1_START',
  URL_E2_START: 'URL_E2_START',
  URL_E3_START: 'URL_E3_START',
  URL_TERMS: 'URL_TERMS',

  // Brevo (listas = grupos)
  BREVO_API_KEY: 'BREVO_API_KEY',
  BREVO_LIST_INTERESADOS: 'BREVO_LIST_INTERESADOS',
  BREVO_LIST_INCONCLUSOS: 'BREVO_LIST_INCONCLUSOS',
  BREVO_LIST_RECHAZADOS: 'BREVO_LIST_RECHAZADOS',
  BREVO_LIST_JUNIOR: 'BREVO_LIST_JUNIOR',
  BREVO_LIST_SENIOR: 'BREVO_LIST_SENIOR',
  BREVO_LIST_EXPERT: 'BREVO_LIST_EXPERT',

  // Interno
  CZ_SCHEMA_VERSION: 'CZ_SCHEMA_VERSION'
};

/**
 * Opcional: bootstrap de propiedades (solo estructura, no pongas llaves aquí).
 */
function bootstrapAdmissionsProperties() {
  const p = PropertiesService.getScriptProperties();
  p.setProperties({
    [PROP_KEYS.BREVO_LIST_INTERESADOS]: '',
    [PROP_KEYS.BREVO_LIST_INCONCLUSOS]: '',
    [PROP_KEYS.BREVO_LIST_RECHAZADOS]: '',
    [PROP_KEYS.BREVO_LIST_JUNIOR]: '',
    [PROP_KEYS.BREVO_LIST_SENIOR]: '',
    [PROP_KEYS.BREVO_LIST_EXPERT]: '',
  }, true);
}

/** ========= ROUTER ========= */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || '').trim();

    if (!action) {
      return jsonOut_({ ok:true, service:'catholizare-admisiones', ts: new Date().toISOString() });
    }

    // Setup ligero (solo hojas+headers una vez)
    ensureAdmissionsRuntime_();

    switch (action) {
      case 'health':
        return jsonOut_({ ok:true, service:'catholizare-admisiones', ts: new Date().toISOString() });

      // Exámenes
      case 'verifyToken':
        return jsonOut_(handleVerifyToken_(params));
      case 'getExamQuestions':
        return jsonOut_(handleGetExamQuestions_(params));

      // Admin data
      case 'getCandidates':
        return jsonOut_(handleGetCandidates_());
      case 'getCandidate':
        return jsonOut_(handleGetCandidate_(params));

      default:
        return jsonOut_({ success:false, message:'Unknown GET action: ' + action });
    }
  } catch (err) {
    return jsonOut_({ success:false, message:String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const payload = parseJson_(e);
    const action = String(payload.action || '').trim();
    if (!action) return jsonOut_({ success:false, message:'Missing action' });

    ensureAdmissionsRuntime_();

    switch (action) {
      // Registro inicial
      case 'initial_registration':
        return jsonOut_(handleInitialRegistration_(payload));

      // Exámenes
      case 'submitExam':
        return jsonOut_(handleSubmitExam_(payload));

      // Nodal acciones
      case 'resend_terms':
        return jsonOut_(handleResendTerms_(payload));
      case 'invite_e2':
        return jsonOut_(handleInviteExam_(payload, 'E2'));
      case 'invite_e3':
        return jsonOut_(handleInviteExam_(payload, 'E3'));
      case 'schedule_interview':
        return jsonOut_(handleScheduleInterview_(payload));
      case 'approve_e1':
        return jsonOut_(handleForceApproveExam_(payload, 'E1'));
      case 'approve_e2':
        return jsonOut_(handleForceApproveExam_(payload, 'E2'));
      case 'approve_e3':
        return jsonOut_(handleForceApproveExam_(payload, 'E3'));
      case 'final_approve':
        return jsonOut_(handleFinalApprove_(payload));
      case 'reject_candidate':
        return jsonOut_(handleRejectCandidate_(payload));
      case 'mark_incomplete':
        return jsonOut_(handleMarkIncomplete_(payload));

      // tags manuales desde dashboard
      case 'tag_candidate':
        return jsonOut_(handleTagCandidate_(payload));

      // compatibilidad con modal viejo (antes Resend audiences)
      case 'resend_add_to_audience':
        return jsonOut_(handleBrevoAddToGroupCompat_(payload));

      default:
        return jsonOut_({ success:false, message:'Unknown POST action: ' + action });
    }
  } catch (err) {
    return jsonOut_({ success:false, message:String(err && err.message ? err.message : err) });
  }
}

/** =======================================================
 *  Setup runtime (ligero) + Setup manual (pesado)
 * ======================================================= */

/**
 * Ligero: crea hojas y asegura headers 1 sola vez.
 * No aplica formatos/validaciones cada request (evita 2 min de delay).
 */
function ensureAdmissionsRuntime_() {
  const props = PropertiesService.getScriptProperties();
  const current = String(props.getProperty(PROP_KEYS.CZ_SCHEMA_VERSION) || '').trim();
  if (current === CZ.SCHEMA_VERSION) return;

  const ss = getAdmissionsSS_();
  const schema = getSchema_();

  Object.keys(schema).forEach(sheetName => {
    const spec = schema[sheetName];
    const sh = getOrCreateSheet_(ss, sheetName);
    ensureHeaderRow_(sh, spec.headers, spec.alias || {});
  });

  props.setProperty(PROP_KEYS.CZ_SCHEMA_VERSION, CZ.SCHEMA_VERSION);
}

/**
 * Pesado: si quieres formato/validaciones/condicionales:
 * ejecútalo MANUALMENTE desde Apps Script (una vez).
 */
function setupAdmissionsSpreadsheet() {
  const ss = getAdmissionsSS_();
  const schema = getSchema_();

  Object.keys(schema).forEach(sheetName => {
    const spec = schema[sheetName];
    const sh = getOrCreateSheet_(ss, sheetName);

    ensureHeaderRow_(sh, spec.headers, spec.alias || {});
    applyBaseFormatting_(sh, spec);
    applyColumnWidths_(sh, spec);
    applyNumberFormats_(sh, spec);
    applyValidations_(sh, spec);
    applyStatusConditionalFormatting_(sh, spec);
  });

  const leftover = ss.getSheetByName('Hoja 1');
  if (leftover) leftover.hideSheet();

  PropertiesService.getScriptProperties().setProperty(PROP_KEYS.CZ_SCHEMA_VERSION, CZ.SCHEMA_VERSION);
}

/** =======================================================
 *  ACTION: initial_registration  (FORM HTML)
 * ======================================================= */
function handleInitialRegistration_(payload) {
  const cand = payload.candidate || {};
  const scheduledDate = String(payload.scheduled_date || '').trim();

  const req = (k) => String(cand[k] || '').trim();
  const name = req('name');
  const email = req('email').toLowerCase();
  const phone = req('phone');
  const birthday = req('birthday');
  const country = req('country');
  const professional_type = req('professional_type');
  const therapeutic_approach = req('therapeutic_approach');
  const about = req('about');

  const missing = [];
  if (!name) missing.push('name');
  if (!email) missing.push('email');
  if (!phone) missing.push('phone');
  if (!birthday) missing.push('birthday');
  if (!country) missing.push('country');
  if (!professional_type) missing.push('professional_type');
  if (!therapeutic_approach) missing.push('therapeutic_approach');
  if (!about) missing.push('about');
  if (!scheduledDate) missing.push('scheduled_date');
  if (missing.length) return { success:false, message:'Missing fields: ' + missing.join(', ') };

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const ss = getAdmissionsSS_();
    const shC = ss.getSheetByName('Candidatos');
    const shT = ss.getSheetByName('Tokens');
    if (!shC || !shT) throw new Error('Missing required sheets: Candidatos/Tokens');

    const mapC = headerMap_(shC);
    const mapT = headerMap_(shT);

    const existing = findCandidateByEmail_(shC, mapC, email);

    let uid;
    let row;
    if (existing) {
      uid = existing.uid;
      row = existing.row;
      updateCandidateRow_(shC, mapC, row, { name, email, phone, birthday, country, professional_type, therapeutic_approach, about });
    } else {
      uid = generateUniqueUid_(shC, mapC);
      row = appendCandidate_(shC, mapC, {
        UID: uid,
        registration_date: new Date(),
        name, email, phone, country, birthday,
        professional_type, therapeutic_approach, about,
        E1_status: 'pending',
        E2_status: 'pending',
        E3_status: 'pending',
        interview_scheduled: false,
        interview_date: '',
        final_status: 'registered',
        category: '',
        notes: ''
      });
    }

    // Brevo -> interesados
    const env = getEnv_();
    brevoUpsertAndAdd_(email, {
      FIRSTNAME: name,
      UID: uid,
      ESTADO: 'interesado',
      CATEGORIA: ''
    }, env.BREVO_LIST_INTERESADOS);

    // revocar tokens E1 anteriores
    revokeActiveTokens_(shT, mapT, email, 'E1');

    const token = generateToken_('E1');
    const win = computeTokenWindowFromScheduledDate_(scheduledDate);

    appendToken_(shT, mapT, {
      token,
      exam_id: 'E1',
      email,
      created_date: new Date(),
      start_iso: win.startIso,
      end_iso: win.endIso,
      used: false,
      status: 'active',
      uid,
      name,
      scheduled_date: win.scheduledDate
    });

    const examUrl = buildExamUrl_(env.URL_E1_START, { exam_id:'E1', token, uid });

    // Resend transaccional
    sendResendInviteExam_({
      to: email,
      subject: 'Tu acceso al Examen E1 — Red de Psicólogos Católicos',
      name,
      examId: 'E1',
      examUrl,
      extraLine: `Fecha estimada seleccionada: <b>${escapeHtml_(scheduledDate)}</b>`
    });

    if (env.ADMIN_NOTIFY_EMAIL) {
      sendResend_({
        to: env.ADMIN_NOTIFY_EMAIL,
        subject: `Nuevo candidato registrado: ${name}`,
        html: `<p><b>${escapeHtml_(name)}</b> (${escapeHtml_(email)}) se registró y recibió E1.</p><p>UID: <code>${escapeHtml_(uid)}</code></p>`
      });
    }

    return { success:true, uid, token, exam_url: examUrl };
  } finally {
    lock.releaseLock();
  }
}

/** =======================================================
 *  EXÁMENES (GET) verifyToken / getExamQuestions
 * ======================================================= */
function handleVerifyToken_(params) {
  const token = String(params.token || '').trim();
  const examId = String(params.exam_id || '').trim();
  if (!token || !examId) return { success:false, message:'Missing token or exam_id' };

  const v = verifyToken_(token, examId);
  if (!v.success) return v;

  return { success:true, data: { uid: v.uid, email: v.email, name: v.name, exam_id: examId } };
}

function handleGetExamQuestions_(params) {
  const examId = String(params.exam_id || '').trim();
  if (!CZ.EXAM_IDS.includes(examId)) return { success:false, message:'Invalid exam_id' };

  const ss = getAdmissionsSS_();
  const shQ = ss.getSheetByName('Preguntas_' + examId);
  if (!shQ) return { success:false, message:'Missing sheet Preguntas_' + examId };

  const map = headerMap_(shQ);
  const lastRow = shQ.getLastRow();
  if (lastRow < 2) return { success:true, data:{ questions: [] } };

  const cols = shQ.getLastColumn();
  const values = shQ.getRange(2, 1, lastRow - 1, cols).getValues();

  const questions = [];
  values.forEach(r => {
    const id = String(r[(map.id||1)-1] || '').trim();
    const texto = String(r[(map.texto||2)-1] || '').trim();
    if (!id || !texto) return;

    const type = String(r[(map.type||0)-1] || '').trim() || 'multiple';
    const options = [];
    ['option_1','option_2','option_3','option_4','option_5'].forEach(h => {
      const c = map[h];
      if (!c) return;
      const v = String(r[c-1] || '').trim();
      if (v) options.push(v);
    });

    questions.push({
      id,
      question: texto,
      type: (type === 'open' ? 'open' : 'multiple'),
      options
    });
  });

  return { success:true, data:{ questions } };
}

/** =======================================================
 *  EXÁMENES (POST) submitExam
 * ======================================================= */
function handleSubmitExam_(payload) {
  const token = String(payload.token || '').trim();
  const examId = String(payload.exam_id || '').trim();
  const answers = payload.answers || {};
  const blurCount = Number(payload.blur_count || 0);

  if (!token || !CZ.EXAM_IDS.includes(examId)) return { success:false, message:'Invalid token or exam_id' };

  const v = verifyToken_(token, examId);
  if (!v.success) return v;

  const ss = getAdmissionsSS_();
  const shQ = ss.getSheetByName('Preguntas_' + examId);
  const shR = ss.getSheetByName('Resultados');
  const shT = ss.getSheetByName('Tokens');
  const shC = ss.getSheetByName('Candidatos');

  const mapQ = headerMap_(shQ);
  const mapR = headerMap_(shR);
  const mapT = headerMap_(shT);
  const mapC = headerMap_(shC);

  const cfg = getExamConfig_(ss, examId);

  const qRows = shQ.getLastRow();
  const qCols = shQ.getLastColumn();
  const qVals = (qRows >= 2) ? shQ.getRange(2, 1, qRows - 1, qCols).getValues() : [];

  let total = 0;
  let totalMax = 0;
  const detail = [];

  qVals.forEach(r => {
    const qid = String(r[(mapQ.id||1)-1] || '').trim();
    const texto = String(r[(mapQ.texto||2)-1] || '').trim();
    if (!qid || !texto) return;

    const qType = String(r[(mapQ.type||0)-1] || '').trim() || 'multiple';
    const maxPts = (cfg.points[qType] != null) ? Number(cfg.points[qType]) : 1;
    totalMax += maxPts;

    const key = 'q_' + qid;
    const ans = (answers[key] != null) ? String(answers[key]).trim() : '';

    let pts = 0;
    if (qType === 'multiple') {
      const correct = String(r[(mapQ.correct||0)-1] || '').trim();
      const almost  = String(r[(mapQ.almost||0)-1] || '').trim();
      if (ans && correct && ans === correct) pts = maxPts;
      else if (ans && almost && ans === almost) pts = Math.max(0, maxPts * 0.5);
      else pts = 0;
    } else {
      if (ans) pts = maxPts; // open (MVP)
    }

    total += pts;
    detail.push({ id: qid, type: qType, answered: !!ans, pts, maxPts });
  });

  const pct = (totalMax > 0) ? (total / totalMax) : 0;

  let verdict = 'review';
  if (pct >= cfg.ok) verdict = 'pass';
  else if (pct < cfg.critical) verdict = 'fail';
  else verdict = 'review';

  const flags = [];
  if (blurCount >= 5) flags.push('high_blur');
  if (flags.length && verdict === 'pass') verdict = 'review';

  appendRowByHeaders_(shR, mapR, {
    timestamp: new Date(),
    uid: v.uid,
    exam_id: examId,
    token,
    name: v.name,
    email: v.email,
    startedAt: '',
    finishedAt: new Date(),
    total,
    totalMax,
    pct,
    elapsedSec: '',
    blur: blurCount,
    copy: 0,
    verdict,
    flags: flags.join(','),
    openai_calls: 0,
    critical_errors: 0,
    details_json: JSON.stringify({ detail, answers }),
    next_exam_granted: false,
    u_score: '',
    v_flags: ''
  });

  markTokenUsed_(shT, mapT, token);

  const candRow = findCandidateByUidRow_(shC, mapC, v.uid);
  if (candRow) {
    safeSet_(shC, mapC, candRow, `${examId}_status`, verdict);
    safeSet_(shC, mapC, candRow, `${examId}_score`, pct);
    safeSet_(shC, mapC, candRow, `${examId}_date`, new Date());

    if (examId === 'E1') {
      if (verdict === 'pass') safeSet_(shC, mapC, candRow, 'final_status', 'pending_admin_approval_E1');
      if (verdict === 'review') safeSet_(shC, mapC, candRow, 'final_status', 'pending_review_E1');
      if (verdict === 'fail') safeSet_(shC, mapC, candRow, 'final_status', 'rejected_E1');
    }
    if (examId === 'E2') {
      if (verdict === 'pass') safeSet_(shC, mapC, candRow, 'final_status', 'E3_sent');
      if (verdict === 'review') safeSet_(shC, mapC, candRow, 'final_status', 'pending_review_E2');
      if (verdict === 'fail') safeSet_(shC, mapC, candRow, 'final_status', 'rejected_E2');
    }
    if (examId === 'E3') {
      if (verdict === 'pass') safeSet_(shC, mapC, candRow, 'final_status', 'awaiting_interview');
      if (verdict === 'review') safeSet_(shC, mapC, candRow, 'final_status', 'pending_review_E3');
      if (verdict === 'fail') safeSet_(shC, mapC, candRow, 'final_status', 'rejected_E3');
    }
  }

  const env = getEnv_();
  if (env.ADMIN_NOTIFY_EMAIL) {
    sendResend_({
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: `Resultado ${examId} (${verdict}) — ${v.name}`,
      html: `<p><b>${escapeHtml_(v.name)}</b> (${escapeHtml_(v.email)})</p>
             <p>UID: <code>${escapeHtml_(v.uid)}</code></p>
             <p>Examen: <b>${escapeHtml_(examId)}</b> — Veredicto: <b>${escapeHtml_(verdict)}</b></p>
             <p>Puntaje: ${(pct*100).toFixed(1)}%</p>`
    });
  }

  return { success:true, verdict, pct };
}

/** =======================================================
 *  NODAL: resend_terms / invite_e2/e3 / schedule_interview
 * ======================================================= */
function handleResendTerms_(payload) {
  const uid = String(payload.uid || '').trim();
  if (!uid) return { success:false, message:'Missing uid' };

  const env = getEnv_();
  if (!env.URL_TERMS) return { success:false, message:'Missing URL_TERMS in Script Properties' };

  const { shC, mapC, row } = getCandidateByUid_(uid);
  const email = String(shC.getRange(row, mapC.email).getValue() || '').trim().toLowerCase();
  const name = String(shC.getRange(row, mapC.name).getValue() || '').trim();

  sendResend_({
    to: email,
    subject: 'Términos y documentos — Red de Psicólogos Católicos',
    html: `<p>Hola ${escapeHtml_(name)},</p>
           <p>Aquí puedes revisar y aceptar los términos/documentos:</p>
           <p><a href="${escapeHtml_(env.URL_TERMS)}">Abrir términos</a></p>
           <p>— Catholizare</p>`
  });

  safeSet_(shC, mapC, row, 'final_status', 'awaiting_terms');
  return { success:true };
}

function handleInviteExam_(payload, examId) {
  const uid = String(payload.uid || '').trim();
  if (!uid) return { success:false, message:'Missing uid' };
  if (!CZ.EXAM_IDS.includes(examId)) return { success:false, message:'Invalid exam' };

  const env = getEnv_();
  const startUrl =
    examId === 'E2' ? env.URL_E2_START :
    examId === 'E3' ? env.URL_E3_START : '';

  if (!startUrl) return { success:false, message:`Missing URL_${examId}_START in Script Properties` };

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const ss = getAdmissionsSS_();
    const { shC, mapC, row } = getCandidateByUid_(uid);
    const email = String(shC.getRange(row, mapC.email).getValue() || '').trim().toLowerCase();
    const name = String(shC.getRange(row, mapC.name).getValue() || '').trim();

    const shT = ss.getSheetByName('Tokens');
    const mapT = headerMap_(shT);

    revokeActiveTokens_(shT, mapT, email, examId);

    const token = generateToken_(examId);
    const now = new Date();
    const startIso = formatIsoLocal_(now);
    const endIso = formatIsoLocal_(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    appendToken_(shT, mapT, {
      token,
      exam_id: examId,
      email,
      created_date: new Date(),
      start_iso: startIso,
      end_iso: endIso,
      used: false,
      status: 'active',
      uid,
      name,
      scheduled_date: ''
    });

    const examUrl = buildExamUrl_(startUrl, { exam_id: examId, token, uid });

    sendResendInviteExam_({
      to: email,
      subject: `Acceso al examen ${examId} — Catholizare`,
      name,
      examId,
      examUrl,
      extraLine: ''
    });

    safeSet_(shC, mapC, row, `${examId}_status`, 'sent');
    safeSet_(shC, mapC, row, 'final_status', `${examId}_sent`);

    return { success:true, token, exam_url: examUrl };
  } finally {
    lock.releaseLock();
  }
}

function handleScheduleInterview_(payload) {
  const uid = String(payload.uid || '').trim();
  const interviewDate = String(payload.interview_date || '').trim();
  if (!uid || !interviewDate) return { success:false, message:'Missing uid or interview_date' };

  const { shC, mapC, row } = getCandidateByUid_(uid);
  safeSet_(shC, mapC, row, 'interview_scheduled', true);
  safeSet_(shC, mapC, row, 'interview_date', interviewDate);
  safeSet_(shC, mapC, row, 'final_status', 'awaiting_interview');

  return { success:true };
}

function handleForceApproveExam_(payload, examId) {
  const uid = String(payload.uid || '').trim();
  if (!uid) return { success:false, message:'Missing uid' };

  const { shC, mapC, row } = getCandidateByUid_(uid);
  safeSet_(shC, mapC, row, `${examId}_status`, 'pass');
  safeSet_(shC, mapC, row, `${examId}_date`, new Date());
  return { success:true };
}

/** =======================================================
 *  FINAL DECISION: approve/reject/incomplete
 * ======================================================= */
function handleFinalApprove_(payload) {
  const uid = String(payload.uid || '').trim();
  const category = String(payload.category || '').trim(); // Junior|Senior|Expert
  if (!uid || !category) return { success:false, message:'Missing uid or category' };
  if (!['Junior','Senior','Expert'].includes(category)) return { success:false, message:'Invalid category' };

  const env = getEnv_();
  const { shC, mapC, row } = getCandidateByUid_(uid);
  const email = String(shC.getRange(row, mapC.email).getValue() || '').trim().toLowerCase();
  const name = String(shC.getRange(row, mapC.name).getValue() || '').trim();

  safeSet_(shC, mapC, row, 'final_status', 'approved');
  safeSet_(shC, mapC, row, 'category', category);

  // Brevo -> lista por categoría
  const listId =
    category === 'Junior' ? env.BREVO_LIST_JUNIOR :
    category === 'Senior' ? env.BREVO_LIST_SENIOR :
    env.BREVO_LIST_EXPERT;

  brevoUpsertAndAdd_(email, {
    FIRSTNAME: name,
    UID: uid,
    ESTADO: 'aprobado',
    CATEGORIA: category.toLowerCase()
  }, listId);

  // Resend -> bienvenida (transaccional)
  sendResend_({
    to: email,
    subject: 'Bienvenido/a — Red de Psicólogos Católicos',
    html: `<p>Hola ${escapeHtml_(name)},</p>
           <p>Tu proceso fue aprobado con categoría <b>${escapeHtml_(category)}</b>.</p>
           <p>— Catholizare</p>`
  });

  if (env.ADMIN_NOTIFY_EMAIL) {
    sendResend_({
      to: env.ADMIN_NOTIFY_EMAIL,
      subject: `Aprobado (${category}) — ${name}`,
      html: `<p><b>${escapeHtml_(name)}</b> aprobado como <b>${escapeHtml_(category)}</b>.</p>
             <p>UID: <code>${escapeHtml_(uid)}</code></p>`
    });
  }

  return { success:true };
}

function handleRejectCandidate_(payload) {
  const uid = String(payload.uid || '').trim();
  const reason = String(payload.reason || '').trim();
  if (!uid) return { success:false, message:'Missing uid' };

  const env = getEnv_();
  const { shC, mapC, row } = getCandidateByUid_(uid);
  const email = String(shC.getRange(row, mapC.email).getValue() || '').trim().toLowerCase();
  const name = String(shC.getRange(row, mapC.name).getValue() || '').trim();

  safeSet_(shC, mapC, row, 'final_status', 'rejected');
  if (reason) appendNote_(shC, mapC, row, `Rechazado: ${reason}`);

  brevoUpsertAndAdd_(email, {
    FIRSTNAME: name,
    UID: uid,
    ESTADO: 'rechazado',
    CATEGORIA: ''
  }, env.BREVO_LIST_RECHAZADOS);

  return { success:true };
}

function handleMarkIncomplete_(payload) {
  const uid = String(payload.uid || '').trim();
  const reason = String(payload.reason || '').trim();
  if (!uid) return { success:false, message:'Missing uid' };

  const env = getEnv_();
  const { shC, mapC, row } = getCandidateByUid_(uid);
  const email = String(shC.getRange(row, mapC.email).getValue() || '').trim().toLowerCase();
  const name = String(shC.getRange(row, mapC.name).getValue() || '').trim();

  safeSet_(shC, mapC, row, 'final_status', 'incomplete');
  if (reason) appendNote_(shC, mapC, row, `Inconcluso: ${reason}`);

  brevoUpsertAndAdd_(email, {
    FIRSTNAME: name,
    UID: uid,
    ESTADO: 'inconcluso',
    CATEGORIA: ''
  }, env.BREVO_LIST_INCONCLUSOS);

  return { success:true };
}

/** =======================================================
 *  TAGS MANUALES (desde dashboard)
 * ======================================================= */
function handleTagCandidate_(payload) {
  const uid = String(payload.uid || '').trim();
  const tag = String(payload.tag || '').trim().toLowerCase();
  if (!uid || !tag) return { success:false, message:'Missing uid or tag' };

  const allowed = ['interesados','inconclusos','rechazados'];
  if (!allowed.includes(tag)) return { success:false, message:'Invalid tag' };

  const env = getEnv_();
  const { shC, mapC, row } = getCandidateByUid_(uid);
  const email = String(shC.getRange(row, mapC.email).getValue() || '').trim().toLowerCase();
  const name = String(shC.getRange(row, mapC.name).getValue() || '').trim();

  let listId = '';
  let estado = '';
  if (tag === 'interesados') { listId = env.BREVO_LIST_INTERESADOS; estado = 'interesado'; }
  if (tag === 'inconclusos') { listId = env.BREVO_LIST_INCONCLUSOS; estado = 'inconcluso'; }
  if (tag === 'rechazados')  { listId = env.BREVO_LIST_RECHAZADOS;  estado = 'rechazado'; }

  brevoUpsertAndAdd_(email, { FIRSTNAME: name, UID: uid, ESTADO: estado, CATEGORIA: '' }, listId);
  appendNote_(shC, mapC, row, `Brevo: agregado a lista ${tag}`);

  return { success:true };
}

/**
 * Compatibilidad con dashboard viejo:
 * payload: { uid, audience_key }
 * audience_key: interesados|inconclusos|rechazados|junior|senior|expert
 */
function handleBrevoAddToGroupCompat_(payload) {
  const uid = String(payload.uid || '').trim();
  const key = String(payload.audience_key || '').trim().toLowerCase();
  if (!uid || !key) return { success:false, message:'Missing uid or audience_key' };

  const env = getEnv_();
  const { shC, mapC, row } = getCandidateByUid_(uid);
  const email = String(shC.getRange(row, mapC.email).getValue() || '').trim().toLowerCase();
  const name = String(shC.getRange(row, mapC.name).getValue() || '').trim();

  let listId = '';
  let estado = '';
  let cat = '';

  if (key === 'interesados') { listId = env.BREVO_LIST_INTERESADOS; estado = 'interesado'; }
  if (key === 'inconclusos') { listId = env.BREVO_LIST_INCONCLUSOS; estado = 'inconcluso'; }
  if (key === 'rechazados')  { listId = env.BREVO_LIST_RECHAZADOS;  estado = 'rechazado'; }

  if (key === 'junior') { listId = env.BREVO_LIST_JUNIOR; estado='aprobado'; cat='junior'; }
  if (key === 'senior') { listId = env.BREVO_LIST_SENIOR; estado='aprobado'; cat='senior'; }
  if (key === 'expert') { listId = env.BREVO_LIST_EXPERT; estado='aprobado'; cat='expert'; }

  if (!listId) return { success:false, message:'Brevo list not configured for: ' + key };

  brevoUpsertAndAdd_(email, { FIRSTNAME: name, UID: uid, ESTADO: estado, CATEGORIA: cat }, listId);
  return { success:true };
}

/** =======================================================
 *  Admin Data (GET): sin 2999 vacíos
 * ======================================================= */
function handleGetCandidates_() {
  const ss = getAdmissionsSS_();
  const shC = ss.getSheetByName('Candidatos');
  const mapC = headerMap_(shC);

  const uidCol = mapC.UID || mapC.uid;
  if (!uidCol) return { success:false, message:"Candidatos missing UID header" };

  const last = lastDataRowByCol_(shC, uidCol);
  if (last < 2) return { success:true, data:[] };

  const width = shC.getLastColumn();
  const numRows = last - 1;

  const display = shC.getRange(2, 1, numRows, width).getDisplayValues();
  const rawReg = mapC.registration_date
    ? shC.getRange(2, mapC.registration_date, numRows, 1).getValues()
    : Array.from({length:numRows}, () => ['']);

  const rows = [];
  for (let i=0;i<numRows;i++){
    const r = display[i];

    const uid = String(r[(uidCol||1)-1] || '').trim();
    const email = String(r[(mapC.email||0)-1] || '').trim();
    const name = String(r[(mapC.name||0)-1] || '').trim();
    if (!uid && !email && !name) continue;

    const regVal = rawReg[i] ? rawReg[i][0] : '';
    const ts = (regVal instanceof Date) ? regVal.getTime() : 0;

    rows.push({
      UID: uid,
      registration_date: mapC.registration_date ? r[mapC.registration_date-1] : '',
      name,
      email,
      country: String(r[(mapC.country||0)-1] || '').trim(),
      E1_status: String(r[(mapC.E1_status||0)-1] || '').trim(),
      E2_status: String(r[(mapC.E2_status||0)-1] || '').trim(),
      E3_status: String(r[(mapC.E3_status||0)-1] || '').trim(),
      final_status: String(r[(mapC.final_status||0)-1] || '').trim(),
      category: String(r[(mapC.category||0)-1] || '').trim(),
      _ts: ts
    });
  }

  rows.sort((a,b) => (b._ts||0) - (a._ts||0));
  rows.forEach(x => delete x._ts);

  return { success:true, data: rows };
}

function handleGetCandidate_(params) {
  const uid = String(params.uid || '').trim();
  if (!uid) return { success:false, message:'Missing uid' };

  const { shC, row } = getCandidateByUid_(uid);
  const width = shC.getLastColumn();
  const headers = shC.getRange(1,1,1,width).getValues()[0];
  const vals = shC.getRange(row,1,1,width).getValues()[0];

  const obj = {};
  headers.forEach((h,i) => { if (h) obj[String(h)] = vals[i]; });

  return { success:true, data: obj };
}

/** =======================================================
 *  Resend (transaccional)
 * ======================================================= */
function sendResendInviteExam_({ to, subject, name, examId, examUrl, extraLine }) {
  const html =
    `<div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#0B1220">
      <h2 style="margin:0 0 12px 0;color:#001A55">Hola ${escapeHtml_(name)}</h2>
      <p>Aquí tienes tu acceso al <b>${escapeHtml_(examId)}</b>:</p>
      <p style="margin:16px 0">
        <a href="${escapeHtml_(examUrl)}"
           style="display:inline-block;background:#0966FF;color:#fff;text-decoration:none;
                  padding:12px 18px;border-radius:10px;font-weight:700">
          Abrir ${escapeHtml_(examId)}
        </a>
      </p>
      ${extraLine ? `<p style="color:#475569;font-size:14px;margin:0">${extraLine}</p>` : ``}
      <hr style="border:none;border-top:1px solid #D9E2F1;margin:18px 0">
      <p style="color:#475569;font-size:13px;margin:0">Si tienes dudas, responde a este correo.</p>
    </div>`;

  sendResend_({ to, subject, html });
}

function sendResend_({ to, subject, html }) {
  const env = getEnv_();
  if (!env.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY in Script Properties');
  if (!env.RESEND_FROM) throw new Error('Missing RESEND_FROM in Script Properties');

  const url = 'https://api.resend.com/emails';
  const body = { from: env.RESEND_FROM, to: [to], subject, html };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY }
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Resend email error ' + code + ': ' + res.getContentText());
  }
}

/** =======================================================
 *  Brevo (listas = grupos)
 * ======================================================= */
function brevoUpsertAndAdd_(email, attributes, listId) {
  const env = getEnv_();
  if (!env.BREVO_API_KEY) throw new Error('Missing BREVO_API_KEY');
  if (!listId) throw new Error('Missing Brevo listId');

  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Missing email for Brevo');

  // 1) upsert contacto (PUT /contacts/{email})
  const putUrl = 'https://api.brevo.com/v3/contacts/' + encodeURIComponent(cleanEmail);
  const putBody = { email: cleanEmail, attributes: attributes || {}, updateEnabled: true };

  const putRes = UrlFetchApp.fetch(putUrl, {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify(putBody),
    muteHttpExceptions: true,
    headers: { 'api-key': env.BREVO_API_KEY, 'accept': 'application/json' }
  });

  const putCode = putRes.getResponseCode();
  if (![200,201,202,204].includes(putCode)) {
    throw new Error('Brevo upsert error ' + putCode + ': ' + putRes.getContentText());
  }

  // 2) add to list
  const addUrl = `https://api.brevo.com/v3/contacts/lists/${encodeURIComponent(String(listId))}/contacts/add`;
  const addBody = { emails: [cleanEmail] };

  const addRes = UrlFetchApp.fetch(addUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(addBody),
    muteHttpExceptions: true,
    headers: { 'api-key': env.BREVO_API_KEY, 'accept': 'application/json' }
  });

  const addCode = addRes.getResponseCode();
  if (addCode < 200 || addCode >= 300) {
    throw new Error('Brevo add-to-list error ' + addCode + ': ' + addRes.getContentText());
  }
}

/** =======================================================
 *  Schema
 * ======================================================= */
function getSchema_() {
  const questionSchema = (opt = {}) => ({
    headers: ['id','texto','option_1','option_2','option_3','option_4','option_5','correct','almost','dims_json','type','rubric_json','ai_check','category'],
    alias: Object.assign({}, opt.firstHeaderAlias || {}),
    widths: { id: 60, texto: 520, option_1: 320, option_2: 320, option_3: 320, option_4: 320, option_5: 320, correct: 70, almost: 70, dims_json: 220, type: 90, rubric_json: 520, ai_check: 90, category: 160 },
    validations: [
      { header: 'type', type: 'list', values: ['multiple','open'] },
      { header: 'ai_check', type: 'boolean' }
    ]
  });

  return {
    'Candidatos': {
      headers: [
        'UID','registration_date','name','email','phone','country','birthday',
        'professional_type','therapeutic_approach','about',
        'E1_status','E1_score','E1_date',
        'E2_status','E2_score','E2_date',
        'E3_status','E3_score','E3_date',
        'interview_scheduled','interview_date',
        'final_status','category','notes'
      ],
      alias: {
        'uid': 'UID',
        'Uid': 'UID',
        'fehca de entrevista': 'interview_date',
        'fecha de entrevista': 'interview_date'
      },
      widths: { UID:190, registration_date:160, name:200, email:250, phone:140, country:140, birthday:120, professional_type:160, therapeutic_approach:220, about:340,
        E1_status:120, E1_score:90, E1_date:150, E2_status:120, E2_score:90, E2_date:150, E3_status:120, E3_score:90, E3_date:150,
        interview_scheduled:160, interview_date:160, final_status:200, category:120, notes:420 },
      formats: {
        registration_date:'yyyy-mm-dd hh:mm',
        birthday:'yyyy-mm-dd',
        E1_date:'yyyy-mm-dd hh:mm',
        E2_date:'yyyy-mm-dd hh:mm',
        E3_date:'yyyy-mm-dd hh:mm',
        interview_date:'yyyy-mm-dd hh:mm',
        E1_score:'0.00',
        E2_score:'0.00',
        E3_score:'0.00'
      },
      validations: [
        { header:'E1_status', type:'list', values:['pending','sent','pass','review','fail',''] },
        { header:'E2_status', type:'list', values:['pending','sent','pass','review','fail',''] },
        { header:'E3_status', type:'list', values:['pending','sent','pass','review','fail',''] },
        { header:'interview_scheduled', type:'boolean' },
        { header:'final_status', type:'list', values:[
          'registered','pending_admin_approval_E1','pending_review_E1','rejected_E1','awaiting_terms',
          'E2_sent','pending_review_E2','rejected_E2','E3_sent','pending_review_E3','rejected_E3',
          'awaiting_interview','approved','rejected','incomplete','pending','migrado',''
        ]},
        { header:'category', type:'list', values:['Junior','Senior','Expert',''] },
      ],
      statusConditionalHeaders: ['E1_status','E2_status','E3_status','final_status']
    },
    'Resultados': {
      headers: ['timestamp','uid','exam_id','token','name','email','startedAt','finishedAt','total','totalMax','pct','elapsedSec','blur','copy','verdict','flags','openai_calls','critical_errors','details_json','next_exam_granted','u_score','v_flags'],
      validations: [
        { header:'exam_id', type:'list', values:['E1','E2','E3',''] },
        { header:'verdict', type:'list', values:['pass','review','fail',''] },
        { header:'next_exam_granted', type:'boolean' }
      ],
      formats: { timestamp:'yyyy-mm-dd hh:mm', pct:'0.00', total:'0', totalMax:'0', elapsedSec:'0' },
      widths: { timestamp:170, uid:190, exam_id:80, token:320, name:200, email:240, startedAt:190, finishedAt:190, total:80, totalMax:90, pct:80, elapsedSec:90, blur:70, copy:70, verdict:90, flags:240, openai_calls:110, critical_errors:130, details_json:520, next_exam_granted:160, u_score:90, v_flags:240 },
      statusConditionalHeaders: ['verdict']
    },
    'Tokens': {
      headers: ['token','exam_id','email','created_date','start_iso','end_iso','used','status','uid','name','scheduled_date'],
      validations: [
        { header:'exam_id', type:'list', values:['E1','E2','E3',''] },
        { header:'used', type:'boolean' },
        { header:'status', type:'list', values:['active','used','expired','revoked',''] }
      ],
      formats: { created_date:'yyyy-mm-dd hh:mm', scheduled_date:'yyyy-mm-dd' },
      widths: { token:340, exam_id:80, email:240, created_date:170, start_iso:210, end_iso:210, used:80, status:110, uid:190, name:200, scheduled_date:140 }
    },
    'Config': {
      headers: ['exam_id','ACCEPTING_RESPONSES','duration_min','max_q','global_ok','global_warn','critical_threshold','scoring_json','weights_json'],
      validations: [
        { header:'exam_id', type:'list', values:['E1','E2','E3'] },
        { header:'ACCEPTING_RESPONSES', type:'boolean' }
      ],
      widths: { exam_id:80, ACCEPTING_RESPONSES:180, duration_min:120, max_q:90, global_ok:90, global_warn:110, critical_threshold:160, scoring_json:420, weights_json:320 }
    },
    'Preguntas_E1': questionSchema(),
    'Preguntas_E2': questionSchema(),
    'Preguntas_E3': questionSchema({ firstHeaderAlias: { 'x':'id' } }),
  };
}

/** =======================================================
 *  Exam Config reader
 * ======================================================= */
function getExamConfig_(ss, examId) {
  const sh = ss.getSheetByName('Config');
  if (!sh) return { ok:0.80, warn:0.60, critical:0.50, points:{ multiple:1, open:1 } };

  const map = headerMap_(sh);
  const last = sh.getLastRow();
  if (last < 2) return { ok:0.80, warn:0.60, critical:0.50, points:{ multiple:1, open:1 } };

  const values = sh.getRange(2,1,last-1, sh.getLastColumn()).getValues();
  for (const r of values) {
    const id = String(r[(map.exam_id||1)-1] || '').trim();
    if (id !== examId) continue;

    const ok = Number(r[(map.global_ok||0)-1] || 0.80);
    const warn = Number(r[(map.global_warn||0)-1] || 0.60);
    const critical = Number(r[(map.critical_threshold||0)-1] || 0.50);

    let points = { multiple:1, open:1 };
    try {
      const sj = String(r[(map.scoring_json||0)-1] || '').trim();
      if (sj) points = JSON.parse(sj);
    } catch(_) {}

    return { ok, warn, critical, points };
  }
  return { ok:0.80, warn:0.60, critical:0.50, points:{ multiple:1, open:1 } };
}

/** =======================================================
 *  Token verify + mark used
 * ======================================================= */
function verifyToken_(token, examId) {
  const ss = getAdmissionsSS_();
  const shT = ss.getSheetByName('Tokens');
  const mapT = headerMap_(shT);

  const last = shT.getLastRow();
  if (last < 2) return { success:false, message:'Token not found' };

  const colToken = mapT.token, colExam = mapT.exam_id, colEmail = mapT.email, colStatus = mapT.status, colUsed = mapT.used;
  const colStart = mapT.start_iso, colEnd = mapT.end_iso, colUid = mapT.uid, colName = mapT.name;

  const values = shT.getRange(2,1,last-1, shT.getLastColumn()).getValues();

  for (let i=0;i<values.length;i++) {
    const r = values[i];
    if (String(r[colToken-1]||'').trim() !== token) continue;

    const ex = String(r[colExam-1]||'').trim();
    const email = String(r[colEmail-1]||'').trim().toLowerCase();
    const status = String(r[colStatus-1]||'').trim();
    const used = !!r[colUsed-1];
    const uid = String(r[colUid-1]||'').trim();
    const name = String(r[colName-1]||'').trim();

    if (ex !== examId) return { success:false, message:'Token no corresponde a este examen' };
    if (status !== 'active' || used) return { success:false, message:'Token no activo o ya usado' };

    const now = new Date();
    const start = parseIsoLocalString_(String(r[colStart-1]||''));
    const end = parseIsoLocalString_(String(r[colEnd-1]||''));

    if (start && now < start) return { success:false, message:'Token aún no está vigente' };
    if (end && now > end) return { success:false, message:'Token expiró' };

    return { success:true, uid, email, name };
  }

  return { success:false, message:'Token not found' };
}

function markTokenUsed_(shT, mapT, token) {
  const colToken = mapT.token;
  if (!colToken) return;

  const last = shT.getLastRow();
  if (last < 2) return;

  const vals = shT.getRange(2, colToken, last-1, 1).getValues();
  for (let i=0;i<vals.length;i++){
    if (String(vals[i][0]||'').trim() === token) {
      const row = i+2;
      if (mapT.used) shT.getRange(row, mapT.used).setValue(true);
      if (mapT.status) shT.getRange(row, mapT.status).setValue('used');
      return;
    }
  }
}

/** =======================================================
 *  INTERNAL UTILS
 * ======================================================= */
function getAdmissionsSS_() {
  const props = PropertiesService.getScriptProperties();
  const id = String(props.getProperty(PROP_KEYS.ADMISSIONS_SS_ID) || '').trim();
  if (id) return SpreadsheetApp.openById(id);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Missing ADMISSIONS_SS_ID (and no active spreadsheet).');
  return active;
}

function getEnv_() {
  const p = PropertiesService.getScriptProperties();
  const env = {};
  Object.keys(PROP_KEYS).forEach(k => env[k] = String(p.getProperty(PROP_KEYS[k]) || '').trim());
  return env;
}

function parseJson_(e) {
  if (!e || !e.postData) return {};
  const txt = e.postData.contents || '';
  if (!txt) return {};
  try { return JSON.parse(txt); }
  catch (_) { throw new Error('Invalid JSON body'); }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function headerMap_(sh) {
  const lastCol = sh.getLastColumn();
  const row = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  row.forEach((v, i) => {
    const key = String(v || '').trim();
    if (key) map[key] = i + 1;
  });
  return map;
}

function findCandidateByEmail_(shC, mapC, emailLower) {
  const col = mapC.email;
  if (!col) throw new Error('Candidatos missing email header');

  const last = shC.getLastRow();
  if (last < 2) return null;

  const values = shC.getRange(2, col, last - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    const v = String(values[i][0] || '').trim().toLowerCase();
    if (v && v === emailLower) {
      const row = i + 2;
      const uidCol = mapC.UID || mapC.uid;
      const uid = uidCol ? String(shC.getRange(row, uidCol).getValue() || '').trim() : '';
      return { row, uid };
    }
  }
  return null;
}

function findCandidateByUidRow_(shC, mapC, uid) {
  const col = mapC.UID || mapC.uid;
  if (!col) return null;

  const last = shC.getLastRow();
  if (last < 2) return null;

  const values = shC.getRange(2, col, last - 1, 1).getValues();
  for (let i=0;i<values.length;i++){
    if (String(values[i][0]||'').trim() === uid) return i+2;
  }
  return null;
}

function getCandidateByUid_(uid) {
  const ss = getAdmissionsSS_();
  const shC = ss.getSheetByName('Candidatos');
  const mapC = headerMap_(shC);

  const row = findCandidateByUidRow_(shC, mapC, uid);
  if (!row) throw new Error('UID not found: ' + uid);
  return { ss, shC, mapC, row };
}

function updateCandidateRow_(shC, mapC, row, data) {
  safeSet_(shC, mapC, row, 'name', data.name);
  safeSet_(shC, mapC, row, 'email', data.email);
  safeSet_(shC, mapC, row, 'phone', data.phone);
  safeSet_(shC, mapC, row, 'birthday', data.birthday);
  safeSet_(shC, mapC, row, 'country', data.country);
  safeSet_(shC, mapC, row, 'professional_type', data.professional_type);
  safeSet_(shC, mapC, row, 'therapeutic_approach', data.therapeutic_approach);
  safeSet_(shC, mapC, row, 'about', data.about);
}

function appendCandidate_(shC, mapC, data) {
  const row = shC.getLastRow() + 1;
  Object.keys(data).forEach(k => safeSet_(shC, mapC, row, k, data[k]));
  return row;
}

function safeSet_(sh, map, row, header, value) {
  const col = map[header];
  if (!col) return;
  sh.getRange(row, col).setValue(value);
}

function appendRowByHeaders_(sh, map, obj) {
  const row = sh.getLastRow() + 1;
  Object.keys(obj).forEach(k => {
    const col = map[k];
    if (col) sh.getRange(row, col).setValue(obj[k]);
  });
  return row;
}

function appendNote_(shC, mapC, row, note) {
  const col = mapC.notes;
  if (!col) return;
  const cur = String(shC.getRange(row, col).getValue() || '').trim();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const next = cur ? (cur + '\n' + `[${stamp}] ${note}`) : (`[${stamp}] ${note}`);
  shC.getRange(row, col).setValue(next);
}

function generateUniqueUid_(shC, mapC) {
  const col = mapC.UID || mapC.uid;
  if (!col) throw new Error('Candidatos missing UID header');

  const existing = new Set();
  const last = lastDataRowByCol_(shC, col);
  if (last >= 2) {
    shC.getRange(2, col, last - 1, 1).getValues().forEach(r => {
      const v = String(r[0] || '').trim();
      if (v) existing.add(v);
    });
  }

  for (let i = 0; i < 20; i++) {
    const uid = 'CZ-' + randomBase32_(10);
    if (!existing.has(uid)) return uid;
  }
  throw new Error('Unable to generate UID');
}

function generateToken_(examId) {
  return examId + '-' + randomBase32_(6) + '-' + randomBase32_(10);
}

function randomBase32_(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function computeTokenWindowFromScheduledDate_(scheduledDate) {
  const parts = scheduledDate.split('-').map(n => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error('Invalid scheduled_date');

  const start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
  const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);

  return { scheduledDate, startIso: formatIsoLocal_(start), endIso: formatIsoLocal_(end) };
}

function formatIsoLocal_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

function parseIsoLocalString_(s) {
  const t = String(s||'').trim();
  if (!t) return null;
  const parts = t.split('T');
  if (parts.length !== 2) return null;
  const d = parts[0].split('-').map(n=>parseInt(n,10));
  const h = parts[1].split(':').map(n=>parseInt(n,10));
  if (d.length!==3 || h.length<2) return null;
  return new Date(d[0], d[1]-1, d[2], h[0]||0, h[1]||0, h[2]||0);
}

function revokeActiveTokens_(shT, mapT, emailLower, examId) {
  const last = shT.getLastRow();
  if (last < 2) return;

  const colEmail = mapT.email, colExam = mapT.exam_id, colStatus = mapT.status, colUsed = mapT.used;
  if (!colEmail || !colExam || !colStatus) return;

  const width = shT.getLastColumn();
  const values = shT.getRange(2, 1, last - 1, width).getValues();

  const rowsToRevoke = [];
  for (let i=0;i<values.length;i++){
    const r = values[i];
    const email = String(r[colEmail - 1] || '').trim().toLowerCase();
    const ex = String(r[colExam - 1] || '').trim();
    const st = String(r[colStatus - 1] || '').trim();
    const used = colUsed ? !!r[colUsed - 1] : false;
    if (email === emailLower && ex === examId && st === 'active' && !used) rowsToRevoke.push(i+2);
  }

  rowsToRevoke.forEach(row => shT.getRange(row, colStatus).setValue('revoked'));
}

function appendToken_(shT, mapT, data) {
  const row = shT.getLastRow() + 1;
  Object.keys(data).forEach(k => safeSet_(shT, mapT, row, k, data[k]));
  return row;
}

function buildExamUrl_(base, params) {
  const b = String(base||'').trim();
  if (!b) throw new Error('Missing base exam URL in properties');
  const q = Object.keys(params)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])))
    .join('&');
  return b + (b.includes('?') ? '&' : '?') + q;
}

function escapeHtml_(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function lastDataRowByCol_(sh, col1Based) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 1;
  const vals = sh.getRange(2, col1Based, lastRow - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]).trim() !== '') return i + 2;
  }
  return 1;
}

/** =======================================================
 *  SHEET FORMATTERS (helpers)
 * ======================================================= */
function getOrCreateSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function ensureHeaderRow_(sh, headers, aliasMap) {
  const needCols = headers.length;
  if (sh.getMaxColumns() < needCols) sh.insertColumnsAfter(sh.getMaxColumns(), needCols - sh.getMaxColumns());

  let lastCol = Math.max(sh.getLastColumn(), needCols);
  if (lastCol < needCols) lastCol = needCols;

  const current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(v => normalizeHeader_(v));

  const buildIndex = () => {
    const idx = {};
    for (let c = 0; c < current.length; c++) {
      const key = current[c];
      if (key) idx[key] = c + 1;
    }
    return idx;
  };

  const findCol = (canonical, index) => {
    const can = normalizeHeader_(canonical);
    if (index[can]) return index[can];

    const aliases = Object.keys(aliasMap).filter(a => normalizeHeader_(aliasMap[a]) === can);
    for (const a of aliases) {
      const ak = normalizeHeader_(a);
      if (index[ak]) return index[ak];
    }
    return null;
  };

  for (let target = 1; target <= headers.length; target++) {
    const canonical = headers[target - 1];
    const index = buildIndex();
    const found = findCol(canonical, index);

    if (!found) {
      sh.insertColumnBefore(target);
      current.splice(target - 1, 0, normalizeHeader_(canonical));
      sh.getRange(1, target).setValue(canonical);
    } else if (found !== target) {
      const rangeCol = sh.getRange(1, found, sh.getMaxRows(), 1);
      sh.moveColumns(rangeCol, target);
      const moved = current.splice(found - 1, 1)[0];
      current.splice(target - 1, 0, moved);
    }

    sh.getRange(1, target).setValue(canonical);
    current[target - 1] = normalizeHeader_(canonical);
  }
}

function applyBaseFormatting_(sh, spec) {
  const headerRange = sh.getRange(1, 1, 1, spec.headers.length);
  headerRange
    .setBackground(CZ.COLORS.headerBg)
    .setFontColor(CZ.COLORS.headerFg)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sh.setFrozenRows(1);

  try {
    const filter = sh.getFilter();
    if (filter) filter.remove();
    const lastRow = Math.max(sh.getLastRow(), 2);
    sh.getRange(1, 1, lastRow, spec.headers.length).createFilter();
  } catch (_) {}

  sh.setRowHeight(1, 34);
  sh.getRange(2, 1, sh.getMaxRows() - 1, spec.headers.length)
    .setVerticalAlignment('middle')
    .setWrap(true)
    .setFontColor(CZ.COLORS.gridFg);
}

function applyColumnWidths_(sh, spec) {
  if (!spec.widths) return;
  const map = headerMap_(sh);
  Object.keys(spec.widths).forEach(h => {
    const col = map[h];
    if (col) sh.setColumnWidth(col, spec.widths[h]);
  });
}

function applyNumberFormats_(sh, spec) {
  if (!spec.formats) return;
  const map = headerMap_(sh);
  const lastRow = Math.max(sh.getLastRow(), 2);
  const applyRows = Math.max(lastRow, CZ.DEFAULT_APPLY_ROWS);

  Object.keys(spec.formats).forEach(h => {
    const col = map[h];
    if (!col) return;
    sh.getRange(2, col, applyRows - 1, 1).setNumberFormat(spec.formats[h]);
  });
}

function applyValidations_(sh, spec) {
  if (!spec.validations || !spec.validations.length) return;
  const map = headerMap_(sh);
  const lastRow = Math.max(sh.getLastRow(), 2);
  const applyRows = Math.max(lastRow, CZ.DEFAULT_APPLY_ROWS);

  spec.validations.forEach(v => {
    const col = map[v.header];
    if (!col) return;
    const range = sh.getRange(2, col, applyRows - 1, 1);

    let rule = null;
    if (v.type === 'list') {
      rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(v.values, true)
        .setAllowInvalid(true)
        .build();
    } else if (v.type === 'boolean') {
      rule = SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .setAllowInvalid(true)
        .build();
    }
    if (rule) range.setDataValidation(rule);
  });
}

function applyStatusConditionalFormatting_(sh, spec) {
  const headers = spec.statusConditionalHeaders || [];
  if (!headers.length) return;

  const map = headerMap_(sh);
  const lastRow = Math.max(sh.getLastRow(), 2);
  const applyRows = Math.max(lastRow, CZ.DEFAULT_APPLY_ROWS);

  const rules = [];
  headers.forEach(h => {
    const col = map[h];
    if (!col) return;
    const range = sh.getRange(2, col, applyRows - 1, 1);

    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('pass').setBackground(CZ.COLORS.okBg).setFontColor(CZ.COLORS.okFg).setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('review').setBackground(CZ.COLORS.warnBg).setFontColor(CZ.COLORS.warnFg).setRanges([range]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('fail').setBackground(CZ.COLORS.badBg).setFontColor(CZ.COLORS.badFg).setRanges([range]).build());

    ['pending','sent'].forEach(val => {
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(val).setBackground(CZ.COLORS.mutedBg).setFontColor(CZ.COLORS.mutedFg).setRanges([range]).build());
    });
  });

  sh.setConditionalFormatRules(rules);
}

function normalizeHeader_(v) {
  return String(v || '').trim().toLowerCase();
}
function myFunction() {
  
}
