<?php
/**
 * PROXY2.PHP - Puente Seguro
 * Valida, registra y retransmite requests a Google Apps Script
 *
 * Ubicación: profesionales.catholizare.com/proxy2.php
 * Fecha: 2026-02-15
 */

// ====================================
// CONFIGURACIÓN
// ====================================

define('DEBUG', true);
define('LOG_FILE', __DIR__ . '/logs/proxy.log');
define('CACHE_FILE', __DIR__ . '/cache/cache.json');
define('MAX_REQUESTS_PER_IP', 10);
define('TIME_WINDOW', 60); // segundos

// URLs de GAS (actualizar con tus valores)
define('GAS_DEPLOYMENT_URL', 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercopy');

// Headers CORS permitidos
$allowed_origins = [
    'https://profesionales.catholizare.com',
    'https://www.catholizare.com',
    'http://localhost',
    'http://localhost:3000'
];

// ====================================
// CORS HEADERS
// ====================================

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header("Access-Control-Allow-Origin: https://profesionales.catholizare.com");
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Max-Age: 3600');

// Responder a preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(json_encode(['status' => 'ok']));
}

// ====================================
// FUNCIONES AUXILIARES
// ====================================

function log_request($action, $data, $status = 'INFO') {
    if (!DEBUG) return;

    $log_dir = dirname(LOG_FILE);
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0755, true);
    }

    $timestamp = date('Y-m-d H:i:s');
    $ip = get_client_ip();
    $message = "[{$timestamp}] [{$status}] [{$ip}] Action: {$action} | Data: " . json_encode($data) . "\n";

    @file_put_contents(LOG_FILE, $message, FILE_APPEND);
}

function get_client_ip() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function error_response($message, $code = 400) {
    http_response_code($code);
    return json_encode([
        'success' => false,
        'error' => $message
    ]);
}

function success_response($data = [], $message = 'Success') {
    return json_encode([
        'success' => true,
        'message' => $message,
        ...$data
    ]);
}

// ====================================
// VALIDACIÓN Y RATE LIMITING
// ====================================

function check_rate_limit($ip) {
    $cache_dir = dirname(CACHE_FILE);
    if (!is_dir($cache_dir)) {
        @mkdir($cache_dir, 0755, true);
    }

    $cache = file_exists(CACHE_FILE) ? json_decode(file_get_contents(CACHE_FILE), true) : [];
    $now = time();

    // Limpiar entradas antiguas
    foreach ($cache as $cached_ip => $data) {
        if ($now - $data['timestamp'] > TIME_WINDOW) {
            unset($cache[$cached_ip]);
        }
    }

    if (!isset($cache[$ip])) {
        $cache[$ip] = [
            'count' => 1,
            'timestamp' => $now
        ];
    } else {
        $cache[$ip]['count']++;
    }

    @file_put_contents(CACHE_FILE, json_encode($cache));

    return $cache[$ip]['count'] <= MAX_REQUESTS_PER_IP;
}

function validate_token($token) {
    // Validar formato básico
    if (empty($token) || strlen($token) < 10) {
        return false;
    }

    // Validar que tiene formato esperado
    // Formato: E1_xxxxx, T1_xxxxx, etc.
    if (!preg_match('/^[A-Z0-9]{1,2}_[a-zA-Z0-9]+$/', $token)) {
        return false;
    }

    return true;
}

function validate_action($action) {
    $allowed_actions = [
        'handleRegistration',
        'acceptTerms',
        'handleExamSubmit',
        'getCandidatesForAdmin',
        'approveExamAdmin',
        'rejectExamAdmin',
        'assignCategoryAndApprove',
        'performHandoff',
        'validateToken'
    ];

    return in_array($action, $allowed_actions);
}

// ====================================
// MAIN REQUEST HANDLER
// ====================================

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die(error_response('Method not allowed', 405));
}

$ip = get_client_ip();

// Verificar rate limit
if (!check_rate_limit($ip)) {
    log_request('RATE_LIMIT_EXCEEDED', ['ip' => $ip], 'WARNING');
    die(error_response('Rate limit exceeded. Maximum ' . MAX_REQUESTS_PER_IP . ' requests per minute', 429));
}

// Obtener y validar JSON
$raw_data = file_get_contents('php://input');
$data = json_decode($raw_data, true);

if (!$data) {
    log_request('INVALID_JSON', ['raw' => substr($raw_data, 0, 100)], 'ERROR');
    die(error_response('Invalid JSON format', 400));
}

$action = $data['action'] ?? null;

if (!$action) {
    log_request('MISSING_ACTION', $data, 'WARNING');
    die(error_response('Missing action parameter', 400));
}

if (!validate_action($action)) {
    log_request('INVALID_ACTION', ['action' => $action], 'WARNING');
    die(error_response('Invalid action: ' . $action, 400));
}

// Validar token si es necesario (excepto en handleRegistration)
if ($action !== 'handleRegistration' && $action !== 'validateToken') {
    $token = $data['token'] ?? null;

    if (!$token || !validate_token($token)) {
        log_request('INVALID_TOKEN', ['action' => $action, 'token' => substr($token ?? '', 0, 10)], 'WARNING');
        die(error_response('Invalid or missing token', 401));
    }
}

log_request($action, ['candidate' => $data['candidateId'] ?? 'N/A'], 'INFO');

// ====================================
// RELAY TO GAS
// ====================================

$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => GAS_DEPLOYMENT_URL,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Forwarded-For: ' . $ip,
        'User-Agent: RCCC-Proxy/1.0'
    ],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);

curl_close($ch);

// ====================================
// HANDLE RESPONSE
// ====================================

if ($curl_error) {
    log_request($action, ['error' => $curl_error], 'ERROR');
    http_response_code(502);
    die(json_encode([
        'success' => false,
        'error' => 'Gateway error: Could not reach backend'
    ]));
}

if ($http_code !== 200) {
    log_request($action, ['http_code' => $http_code, 'response' => substr($response, 0, 200)], 'ERROR');
    http_response_code($http_code);
    die($response);
}

// Validar que la respuesta de GAS sea JSON válido
$gas_response = json_decode($response, true);

if ($gas_response === null) {
    log_request($action, ['response' => substr($response, 0, 200)], 'ERROR');
    http_response_code(502);
    die(json_encode([
        'success' => false,
        'error' => 'Invalid response from backend'
    ]));
}

log_request($action, ['success' => $gas_response['success'] ?? false], 'SUCCESS');

// Retornar respuesta de GAS
http_response_code(200);
die(json_encode($gas_response));

?>
