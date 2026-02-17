<?php
/**
 * API Proxy - Comunica HTMLs del servidor con Google Apps Script
 *
 * Los HTMLs hacen fetch() a este proxy en lugar de directamente a GAS
 * Esto evita problemas de CORS y permite mayor control
 *
 * Uso:
 * POST /proxy.php?action=registerCandidate
 * Body: JSON con datos del formulario
 */

// Headers de respuesta
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejo de preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración
$GAS_DEPLOYMENT_ID = 'YOUR_DEPLOYMENT_ID_HERE'; // ← REEMPLAZA CON TU ID
$GAS_BASE_URL = "https://script.google.com/macros/d/{$GAS_DEPLOYMENT_ID}/usercache/";

// Obtener acción
$action = $_GET['action'] ?? null;

if (!$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No action specified']);
    exit();
}

// Obtener body (JSON o form data)
$input = file_get_contents('php://input');
$data = json_decode($input, true) ?? $_POST ?? [];

// Whitelist de acciones permitidas
$allowed_actions = [
    'registerCandidate',
    'getDashboardData',
    'getExamData',
    'submitExam',
    'approveExam',
    'rejectExam',
    'assignCategory',
    'adminLogin',
    'verifyOTP',
    'acceptTerms'
];

if (!in_array($action, $allowed_actions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action not allowed']);
    exit();
}

// Preparar request a GAS
$url = $GAS_BASE_URL . '?action=' . urlencode($action);

$options = [
    'http' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'header' => "Content-Type: application/json\r\n",
        'content' => json_encode($data),
        'timeout' => 30
    ]
];

// Para GET requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    foreach ($data as $key => $value) {
        $url .= '&' . urlencode($key) . '=' . urlencode($value);
    }
    $options['http']['content'] = null;
}

// Hacer request a GAS
$context = stream_context_create($options);

try {
    $response = file_get_contents($url, false, $context);

    if ($response === false) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error connecting to Google Apps Script',
            'error' => error_get_last()['message'] ?? 'Unknown error'
        ]);
        exit();
    }

    // Retornar respuesta de GAS
    echo $response;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error',
        'error' => $e->getMessage()
    ]);
}
?>
