<?php
/**
 * API Proxy - Catholizare Sistema de Admisiones
 *
 * Comunica los HTMLs del servidor con Google Apps Script.
 * Centraliza las llamadas para evitar CORS y tener control de acceso.
 *
 * Uso:
 *   POST /proxy.php?action=registerCandidate   Body: JSON
 *   GET  /proxy.php?action=getExamData&token=...
 *
 * TODO: Reemplazar GAS_DEPLOYMENT_ID con el ID real del deployment de producción.
 */

// ============================================================
// CONFIGURACIÓN — editar estos valores
// ============================================================
$GAS_DEPLOYMENT_ID = 'YOUR_DEPLOYMENT_ID_HERE'; // ← REEMPLAZAR
$GAS_BASE_URL = "https://script.google.com/macros/s/{$GAS_DEPLOYMENT_ID}/exec";
// ============================================================

// ── CAPA 1: Control de origen (CORS) — debe ir primero, antes de cualquier lógica ──
//
// Cierra el proxy por origen: solo se aceptan peticiones cuyo Origin (o, en su
// defecto, Referer) pertenezca a catholizare.com o a cualquier subdominio
// *.catholizare.com. Las páginas del sitio llaman por POST desde el mismo
// dominio, así que el navegador siempre manda un Origin válido y NO hace falta
// cambiar el frontend.
//
// HONESTIDAD: esto es una BARRERA contra abuso automatizado y ataques
// cross-site (un navegador no puede falsificar el header Origin desde otra
// página). NO es seguridad definitiva: un atacante con curl puede omitir o
// falsificar Origin/Referer libremente. La protección real de las acciones
// sensibles es la CAPA 2 (validación del token de admin en el backend GAS).

/**
 * True si la URL (Origin o Referer) pertenece al sitio: dominio raíz
 * catholizare.com o cualquier subdominio *.catholizare.com, siempre https.
 */
function origin_pertenece_al_sitio($url) {
    if (!$url) return false;
    $parts = parse_url($url);
    if (empty($parts['host'])) return false;
    // Exigir https salvo que no venga esquema (Referer siempre trae esquema).
    if (isset($parts['scheme']) && strtolower($parts['scheme']) !== 'https') return false;
    $host = strtolower($parts['host']);
    return $host === 'catholizare.com'
        || substr($host, -strlen('.catholizare.com')) === '.catholizare.com';
}

$origin  = $_SERVER['HTTP_ORIGIN']  ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$method  = $_SERVER['REQUEST_METHOD'];

$origin_ok  = origin_pertenece_al_sitio($origin);
$referer_ok = origin_pertenece_al_sitio($referer);

// Excepción de diagnóstico: un "ping" de salud por GET es same-origin y el
// navegador NO envía header Origin en peticiones GET same-origin.
$es_ping = ($method === 'GET' && ($_GET['action'] ?? '') === 'health');

// ¿La petición pertenece al sitio?
//   - Con Origin presente: el Origin manda (caso navegador).
//   - Sin Origin pero con Referer: se valida por Referer.
//   - Sin Origin ni Referer: same-origin / server-side → se permite (ver nota
//     de honestidad arriba; las acciones sensibles las protege la Capa 2).
if ($es_ping) {
    $permitida = true;
} elseif ($origin !== '') {
    $permitida = $origin_ok;
} elseif ($referer !== '') {
    $permitida = $referer_ok;
} else {
    $permitida = true;
}

// Reflejar Access-Control-Allow-Origin SOLO para orígenes válidos del sitio.
// (Sin comodín "*": eso permitía a cualquier web leer las respuestas.)
if ($origin !== '' && $origin_ok) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400'); // cache preflight 24 h
header('Content-Type: application/json; charset=utf-8');

// Responder preflight inmediatamente (204 si el origen es válido, 403 si no).
if ($method === 'OPTIONS') {
    http_response_code(($origin === '' || $origin_ok) ? 204 : 403);
    exit();
}

// Rechazar peticiones cuyo Origin/Referer no pertenezca al sitio.
if (!$permitida) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Origen no autorizado']);
    exit();
}

// ── Obtener acción — acepta GET param o campo dentro del JSON body ────────────
$input = file_get_contents('php://input');
$data  = json_decode($input, true) ?? [];

$action = $_GET['action']    // 1.° prioridad: query string  ?action=xxx
       ?? $data['action']    // 2.° prioridad: campo en JSON body
       ?? null;

if (!$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No action specified']);
    exit();
}

// Whitelist de acciones permitidas
$allowed_actions = [
    // Candidatos
    'initial_registration',
    'submit_exam',
    'save_partial_exam',
    'acceptTerms',
    'declineTerms',
    // Datos
    'get_exam',
    'get_terms_content',
    'getDashboardData',
    // Acciones admin
    'approveExam',
    'autoApproveE1',
    'rejectExam',
    'assignCategory',
    // Auth admin
    'adminLogin',
    'verifyOTP',
    'verifyAdminToken',
    'getUserRole',
    // Acciones extras
    'resendWelcomeEmail',
    'sendEmailManual',
    'addToBrevoListManual',
    'markAsIncomplete',
    'resetCandidate',
    'pauseCandidate',
    'markDelayed',
    'deleteCandidate',
    'archiveCandidate',
    'unarchiveCandidate',
    'resetTokenAttempt',
    // Vistas admin
    'getExamResponses',
    'getAdminUsers',
    'generateAdminToken',
    'health',
    'gasDiagnostic',
    'registerInterviewResult',
    'handoff',
    'handoffCandidate',
    'uploadCandidateCV',
    'getNotificaciones',
    'getCandidateTimeline',
    'verifyAdminPin',
    // Aprobaciones firmadas con motivo
    'getApprovals',
    // Super Admin y gestión de usuarios
    'getPinStatus',
    'setAdminPin',
    'setUserPin',
    'getSessionLog',
    'getSystemConfigStatus',
    'toggleAdminUser',
    'setAdminUserName',
    'resetSystem',
];

if (!in_array($action, $allowed_actions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action not allowed: ' . $action]);
    exit();
}

// $input y $data ya fueron leídos arriba (antes del check de action)

// Construir URL de GAS
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Para GET, pasar todos los parámetros de la URL
    $params = $_GET; // incluye 'action' y cualquier otro parámetro
    $url = $GAS_BASE_URL . '?' . http_build_query($params);
    $options = [
        'http' => [
            'method'  => 'GET',
            'header'  => "Content-Type: application/json\r\n",
            'timeout' => 30,
            'follow_location' => 1,
        ]
    ];
} else {
    // Para POST, enviar JSON en el body con action incluida
    $data['action'] = $action;
    // Inyectar IP real del cliente para acciones que la necesiten
    $data['client_ip'] = isset($_SERVER['HTTP_X_FORWARDED_FOR'])
        ? trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0])
        : ($_SERVER['REMOTE_ADDR'] ?? '');
    $url = $GAS_BASE_URL;
    $options = [
        'http' => [
            'method'          => 'POST',
            'header'          => "Content-Type: application/json\r\n",
            'content'         => json_encode($data),
            'timeout'         => 30,
            'follow_location' => 1,
        ]
    ];
}

// Ejecutar request a GAS
$context = stream_context_create($options);
$response = @file_get_contents($url, false, $context);

if ($response === false) {
    $error = error_get_last();
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => 'Error al conectar con Google Apps Script',
        'error'   => $error['message'] ?? 'Unknown error'
    ]);
    exit();
}

// Retornar respuesta de GAS tal cual
echo $response;
