<?php
/**
 * API PROXY — RCCC Candidate Selection System
 *
 * Bridge between WordPress form and Google Apps Script
 * Provides security, rate limiting, and request validation
 *
 * Location: /profesionales.catholizare.com/api-proxy.php
 *
 * GitHub: https://github.com/Jesuscatholizare/admisiones-catholizare
 * Rama: claude/candidate-selection-tracker-rb6Ke
 */

// ================================
// CONFIGURACIÓN
// ================================

// ID de los Spreadsheets
const DEV_SPREADSHEET_ID = '18jo3Na2fVaCop6S3AA4Cws_QWPJ3q-rFMkEH5QhUGb8';
const PROD_SPREADSHEET_ID = '1LufXiDNC5KhcAJtZQZ6VApfCyTWLrFuswapgb-oogqA';

// URLs de Apps Script
const DEV_APPS_SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_DEV_SCRIPT_ID/usercopy';
const PROD_APPS_SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_PROD_SCRIPT_ID/usercopy';

// Detectar ambiente
$isProduction = getenv('APP_ENV') === 'production' || $_SERVER['HTTP_HOST'] === 'profesionales.catholizare.com';
$appsScriptUrl = $isProduction ? PROD_APPS_SCRIPT_URL : DEV_APPS_SCRIPT_URL;
$spreadsheetId = $isProduction ? PROD_SPREADSHEET_ID : DEV_SPREADSHEET_ID;

// Configuración de seguridad
const ALLOWED_ORIGINS = [
    'https://profesionales.catholizare.com',
    'https://www.profesionales.catholizare.com',
    'http://localhost:8000', // Para desarrollo local
];

const RATE_LIMIT = 100; // requests per hour
const RATE_LIMIT_WINDOW = 3600; // 1 hour

// ================================
// UTILIDADES
// ================================

/**
 * Logging para auditoría
 */
function logRequest($action, $data, $status = 'OK', $details = '') {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $logFile = $logDir . '/' . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
    $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 100);

    $log = sprintf(
        "[%s] IP=%s Action=%s Status=%s Details=%s UserAgent=%s\n",
        $timestamp,
        $ip,
        $action,
        $status,
        $details,
        $userAgent
    );

    file_put_contents($logFile, $log, FILE_APPEND);
}

/**
 * Validar origen de la solicitud
 */
function validateOrigin() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';

    if (empty($origin)) {
        return false;
    }

    // Validar que el origen es de nuestros dominios permitidos
    foreach (ALLOWED_ORIGINS as $allowed) {
        if (strpos($origin, $allowed) === 0) {
            return true;
        }
    }

    return false;
}

/**
 * Validar rate limiting por IP
 */
function checkRateLimit($ip) {
    $cacheDir = __DIR__ . '/cache';
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    $cacheFile = $cacheDir . '/rate_limit_' . md5($ip) . '.txt';
    $now = time();

    if (file_exists($cacheFile)) {
        $data = json_decode(file_get_contents($cacheFile), true);
        $windowStart = $data['windowStart'] ?? $now;
        $requestCount = $data['count'] ?? 0;

        // Si la ventana expiró, reiniciar
        if ($now - $windowStart > RATE_LIMIT_WINDOW) {
            file_put_contents($cacheFile, json_encode([
                'windowStart' => $now,
                'count' => 1
            ]));
            return true;
        }

        // Si alcanzó el límite
        if ($requestCount >= RATE_LIMIT) {
            return false;
        }

        // Incrementar contador
        $data['count']++;
        file_put_contents($cacheFile, json_encode($data));
        return true;
    } else {
        file_put_contents($cacheFile, json_encode([
            'windowStart' => $now,
            'count' => 1
        ]));
        return true;
    }
}

/**
 * Enviar respuesta JSON
 */
function sendJsonResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
    header('Access-Control-Allow-Credentials: true');

    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
    ];

    if ($data !== null) {
        $response['data'] = $data;
    }

    echo json_encode($response);
    exit;
}

/**
 * Validar datos de entrada
 */
function validatePayload($data) {
    if (empty($data['action'])) {
        return ['valid' => false, 'error' => 'Action no especificada'];
    }

    $action = $data['action'];

    if ($action === 'initial_registration') {
        $required = ['nombre', 'email', 'telefono', 'fecha_examen'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return ['valid' => false, 'error' => "Campo requerido: $field"];
            }
        }

        // Validar email
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'error' => 'Email inválido'];
        }

        // Validar teléfono (básico)
        if (!preg_match('/^\+?[0-9]{7,15}$/', preg_replace('/\s+/', '', $data['telefono']))) {
            return ['valid' => false, 'error' => 'Teléfono inválido'];
        }

        // Validar fecha (YYYY-MM-DD)
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['fecha_examen'])) {
            return ['valid' => false, 'error' => 'Formato de fecha inválido (use YYYY-MM-DD)'];
        }

        return ['valid' => true];
    }

    if ($action === 'submit_exam') {
        $required = ['token', 'exam', 'answers', 'startedAt', 'finishedAt'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return ['valid' => false, 'error' => "Campo requerido: $field"];
            }
        }

        // Validar que exam es E1, E2 o E3
        if (!in_array($data['exam'], ['E1', 'E2', 'E3'])) {
            return ['valid' => false, 'error' => 'Examen inválido'];
        }

        return ['valid' => true];
    }

    return ['valid' => false, 'error' => 'Acción no válida'];
}

// ================================
// HANDLER PRINCIPAL
// ================================

// Configurar headers CORS
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo aceptar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Solo se aceptan solicitudes POST', null, 405);
}

// Validar origen
if (!validateOrigin()) {
    logRequest('INVALID_ORIGIN', [], 'BLOCKED', 'Origin no permitido: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'NONE'));
    sendJsonResponse(false, 'Origen no autorizado', null, 403);
}

// Validar rate limiting
$clientIp = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
if (!checkRateLimit($clientIp)) {
    logRequest('RATE_LIMIT_EXCEEDED', [], 'BLOCKED', "IP: $clientIp");
    sendJsonResponse(false, 'Límite de solicitudes excedido. Intenta más tarde.', null, 429);
}

// Obtener y validar payload
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if ($payload === null) {
    logRequest('INVALID_JSON', [], 'ERROR', 'JSON malformado');
    sendJsonResponse(false, 'Payload JSON inválido', null, 400);
}

// Validar estructura del payload
$validation = validatePayload($payload);
if (!$validation['valid']) {
    logRequest($payload['action'] ?? 'UNKNOWN', $payload, 'REJECTED', $validation['error']);
    sendJsonResponse(false, $validation['error'], null, 400);
}

// ================================
// REENVIAR A GOOGLE APPS SCRIPT
// ================================

try {
    // Preparar headers
    $headers = [
        'Content-Type: application/json',
        'User-Agent: RCCC-API-Proxy/1.0'
    ];

    // Configurar opciones curl
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $appsScriptUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $rawInput);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    // Ejecutar solicitud
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Manejar errores de conexión
    if ($curlError) {
        logRequest($payload['action'], $payload, 'ERROR', "cURL Error: $curlError");
        sendJsonResponse(false, 'Error al conectar con servidor de procesamiento', null, 500);
    }

    // Parsear respuesta
    $appsScriptResponse = json_decode($response, true);

    // Logear solicitud exitosa
    $logStatus = $appsScriptResponse['success'] ? 'SUCCESS' : 'FAILED';
    logRequest(
        $payload['action'],
        ['action' => $payload['action']],
        $logStatus,
        $appsScriptResponse['message'] ?? ''
    );

    // Reenviar respuesta de Apps Script
    http_response_code($appsScriptResponse['success'] ? 200 : 400);
    header('Content-Type: application/json');
    echo json_encode($appsScriptResponse);

} catch (Exception $e) {
    logRequest($payload['action'] ?? 'UNKNOWN', [], 'ERROR', "Exception: " . $e->getMessage());
    sendJsonResponse(false, 'Error interno del servidor', null, 500);
}
?>
