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

// ── CORS — debe ir primero, antes de cualquier lógica ────────────────────────
$allowed_origins = [
    'https://catholizare.com',
    'https://www.catholizare.com',
    'https://profesionales.catholizare.com',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Permite peticiones sin Origin (ej. llamadas server-side, Postman, etc.)
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400'); // cache preflight 24 h
header('Content-Type: application/json; charset=utf-8');

// Responder preflight inmediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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
    'acceptTerms',
    // Datos
    'get_exam',
    'getDashboardData',
    // Acciones admin
    'approveExam',
    'rejectExam',
    'assignCategory',
    // Auth admin
    'adminLogin',
    'verifyOTP',
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
