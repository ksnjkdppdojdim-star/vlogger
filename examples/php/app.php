<?php
/**
 * Example PHP Application with VLogger
 * 
 * This example demonstrates how to integrate VLogger with a PHP application.
 * Compatible with PHP 7.4+ and 8.x
 */

// Check PHP version compatibility
if (version_compare(PHP_VERSION, '7.4.0', '<')) {
    die('VLogger requires PHP 7.4 or higher. Current version: ' . PHP_VERSION);
}

// Include VLogger
require_once '../../adapters/php/vlogger.php';

// Initialize VLogger
try {
    $logger = new VLogger();
    $logger->init();
} catch (Exception $e) {
    error_log('VLogger initialization failed: ' . $e->getMessage());
}

// Simple routing
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Set content type
header('Content-Type: application/json');

// CORS headers for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($requestMethod === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Mock data
$users = [
    ['id' => 1, 'name' => 'John Doe', 'email' => 'john@example.com'],
    ['id' => 2, 'name' => 'Jane Smith', 'email' => 'jane@example.com'],
    ['id' => 3, 'name' => 'Bob Johnson', 'email' => 'bob@example.com']
];

// Route handling
try {
    switch ($path) {
        case '/':
            handleHome();
            break;
            
        case '/users':
            handleUsers($requestMethod, $users);
            break;
            
        case (preg_match('/^\/users\/(\d+)$/', $path, $matches) ? true : false):
            $userId = (int)$matches[1];
            handleUser($requestMethod, $userId, $users);
            break;
            
        case '/login':
            handleLogin($requestMethod);
            break;
            
        case '/error':
            handleError();
            break;
            
        case '/slow':
            handleSlow();
            break;
            
        case '/health':
            handleHealth();
            break;
            
        case '/logs/dashboard.php':
            // Serve the dashboard if it exists
            $dashboardPath = __DIR__ . '/../../logs/dashboard.php';
            if (file_exists($dashboardPath)) {
                include $dashboardPath;
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Dashboard not found']);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode([
                'error' => 'Endpoint not found',
                'path' => $path
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

/**
 * Handle home route
 */
function handleHome() {
    echo json_encode([
        'message' => 'Welcome to VLogger PHP Example API',
        'timestamp' => date('c'),
        'php_version' => PHP_VERSION,
        'endpoints' => [
            'GET /',
            'GET /users',
            'POST /users',
            'GET /users/{id}',
            'PUT /users/{id}',
            'DELETE /users/{id}',
            'POST /login',
            'GET /error',
            'GET /slow',
            'GET /health'
        ]
    ]);
}

/**
 * Handle users collection
 */
function handleUsers($method, &$users) {
    switch ($method) {
        case 'GET':
            echo json_encode([
                'users' => $users,
                'total' => count($users)
            ]);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['name']) || !isset($input['email'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Name and email are required']);
                return;
            }
            
            $newUser = [
                'id' => max(array_column($users, 'id')) + 1,
                'name' => $input['name'],
                'email' => $input['email']
            ];
            
            $users[] = $newUser;
            
            http_response_code(201);
            echo json_encode($newUser);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
}

/**
 * Handle individual user
 */
function handleUser($method, $userId, &$users) {
    $userIndex = array_search($userId, array_column($users, 'id'));
    
    if ($userIndex === false) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found', 'id' => $userId]);
        return;
    }
    
    switch ($method) {
        case 'GET':
            echo json_encode($users[$userIndex]);
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($input && isset($input['name'])) {
                $users[$userIndex]['name'] = $input['name'];
            }
            if ($input && isset($input['email'])) {
                $users[$userIndex]['email'] = $input['email'];
            }
            
            echo json_encode($users[$userIndex]);
            break;
            
        case 'DELETE':
            array_splice($users, $userIndex, 1);
            http_response_code(204);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
}

/**
 * Handle login (demonstrates password sanitization)
 */
function handleLogin($method) {
    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['email']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required']);
        return;
    }
    
    // Mock authentication
    if ($input['email'] === 'john@example.com' && $input['password'] === 'password') {
        echo json_encode([
            'message' => 'Login successful',
            'user' => [
                'id' => 1,
                'name' => 'John Doe',
                'email' => 'john@example.com'
            ],
            'token' => 'mock-jwt-token-' . time()
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
}

/**
 * Handle error endpoint for testing
 */
function handleError() {
    throw new Exception('This is a test error for VLogger');
}

/**
 * Handle slow endpoint for testing performance monitoring
 */
function handleSlow() {
    $delay = isset($_GET['delay']) ? (int)$_GET['delay'] : 2;
    $delay = max(1, min(10, $delay)); // Limit between 1-10 seconds
    
    sleep($delay);
    
    echo json_encode([
        'message' => 'Slow response completed',
        'delay' => $delay . ' seconds'
    ]);
}

/**
 * Handle health check
 */
function handleHealth() {
    echo json_encode([
        'status' => 'healthy',
        'timestamp' => date('c'),
        'php_version' => PHP_VERSION,
        'memory_usage' => memory_get_usage(true),
        'peak_memory' => memory_get_peak_usage(true)
    ]);
}
?>