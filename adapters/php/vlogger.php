<?php
/**
 * VLogger PHP Adapter
 * 
 * @author Jules Mahounou
 * @version 1.5.12
 * @license MIT
 * 
 * This adapter provides VLogger integration for PHP applications
 * including Laravel, Symfony, Phalcon, and vanilla PHP.
 * 
 * Supported Frameworks:
 * - Laravel
 * - Symfony
 * - Phalcon
 * - CodeIgniter
 * - CakePHP
 * - Vanilla PHP
 * 
 * Usage:
 * require_once 'vlogger.php';
 * $logger = new VLogger();
 * 
 * // Laravel: Add to middleware
 * // Symfony: Add as event listener
 * // Vanilla: Call manually
 * $logger->logRequest($_SERVER, $responseData);
 */

// Check PHP version compatibility
if (version_compare(PHP_VERSION, '7.4.0', '<')) {
    throw new Exception('VLogger requires PHP 7.4 or higher. Current version: ' . PHP_VERSION);
}
class VLogger {
    private $config;
    private $projectInfo;
    private $stats;
    private $startTime;
    
    /**
     * Create new VLogger instance
     * @param array $config Optional configuration
     */
    public function __construct($config = null) {
        $this->startTime = microtime(true);
        $this->config = $this->loadConfig($config);
        $this->projectInfo = $this->loadProjectInfo();
        
        $this->stats = [
            'totalRequests' => 0,
            'totalErrors' => 0,
            'endpoints' => [],
            'startedAt' => date('c')
        ];
        
        $this->ensureLogDirectory();
        $this->registerShutdownFunction();
        
        if ($this->config['dashboard']['enabled']) {
            $this->startDashboard();
        }
        
        error_log('[VLogger] PHP adapter initialized - Dashboard: ' . 
                 ($this->config['dashboard']['enabled'] ? 
                  'http://localhost:' . $this->config['dashboard']['port'] : 'disabled'));
    }
    
    /**
     * Initialize VLogger and start capturing
     */
    public function init() {
        // Capture current request if running in web context
        if (isset($_SERVER['REQUEST_METHOD'])) {
            $this->captureCurrentRequest();
        }
    }
    
    /**
     * Laravel middleware integration
     * @param \Illuminate\Http\Request $request
     * @param \Closure $next
     * @return mixed
     */
    public function laravelMiddleware($request, \Closure $next) {
        if ($this->shouldSkipRequest($request)) {
            return $next($request);
        }
        
        $startTime = microtime(true);
        $logEntry = $this->createLogEntry($request, $startTime);
        
        $response = $next($request);
        
        $this->captureResponse($logEntry, $response, $startTime);
        
        return $response;
    }
    
    /**
     * Symfony event listener
     * @param object $event Symfony request/response event
     */
    public function symfonyListener($event) {
        if (method_exists($event, 'getRequest')) {
            $request = $event->getRequest();
            
            if ($this->shouldSkipRequest($request)) {
                return;
            }
            
            $startTime = microtime(true);
            $logEntry = $this->createLogEntry($request, $startTime);
            
            // Store in request for later use in response event
            $request->attributes->set('vlogger_entry', $logEntry);
            $request->attributes->set('vlogger_start', $startTime);
        }
        
        if (method_exists($event, 'getResponse')) {
            $request = $event->getRequest();
            $response = $event->getResponse();
            $logEntry = $request->attributes->get('vlogger_entry');
            $startTime = $request->attributes->get('vlogger_start');
            
            if ($logEntry) {
                $this->captureResponse($logEntry, $response, $startTime);
            }
        }
    }
    
    /**
     * Manual logging for vanilla PHP or custom frameworks
     * @param array $requestData Request data ($_SERVER, $_GET, $_POST, etc.)
     * @param mixed $responseData Response data
     * @param int $statusCode HTTP status code
     * @param float $startTime Optional start time
     */
    public function logRequest($requestData, $responseData = null, $statusCode = 200, $startTime = null) {
        if ($startTime === null) {
            $startTime = $this->startTime;
        }
        
        $logEntry = $this->createLogEntryFromGlobals($requestData, $startTime);
        
        if ($responseData !== null) {
            $this->captureManualResponse($logEntry, $responseData, $statusCode, $startTime);
        }
        
        return $logEntry;
    }
    
    /**
     * Capture current request automatically
     */
    private function captureCurrentRequest() {
        if ($this->shouldSkipCurrentRequest()) {
            return;
        }
        
        $startTime = $_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true);
        $logEntry = $this->createLogEntryFromGlobals($_SERVER, $startTime);
        
        // Store for capturing response later
        $GLOBALS['vlogger_entry'] = $logEntry;
        $GLOBALS['vlogger_start'] = $startTime;
    }
    
    /**
     * Load configuration
     */
    private function loadConfig($providedConfig) {
        $defaultConfig = [
            'storage' => [
                'path' => './logs',
                'maxFileSize' => 10 * 1024 * 1024, // 10MB
                'maxFiles' => 10
            ],
            'capture' => [
                'requests' => true,
                'responses' => true,
                'headers' => true,
                'body' => true,
                'performance' => true
            ],
            'sanitize' => [
                'headers' => ['authorization', 'cookie', 'x-api-key'],
                'bodyFields' => ['password', 'token', 'secret'],
                'queryParams' => ['api_key', 'token']
            ],
            'filters' => [
                'excludePaths' => ['/favicon.ico', '/health'],
                'excludeStaticFiles' => true,
                'minDuration' => 0
            ],
            'dashboard' => [
                'enabled' => true,
                'port' => 3333
            ]
        ];
        
        $fileConfig = [];
        if (file_exists('./vlogger.config.json')) {
            try {
                $fileConfig = json_decode(file_get_contents('./vlogger.config.json'), true) ?: [];
            } catch (Exception $e) {
                error_log('[VLogger] Warning: Could not load vlogger.config.json: ' . $e->getMessage());
            }
        }
        
        return array_merge_recursive($defaultConfig, $fileConfig, $providedConfig ?: []);
    }
    
    /**
     * Load project information
     */
    private function loadProjectInfo() {
        $defaultInfo = [
            'name' => 'PHP Project',
            'version' => '1.5.12',
            'description' => 'PHP application with VLogger',
            'api' => [
                'version' => '1.0',
                'baseUrl' => 'http://localhost'
            ]
        ];
        
        if (file_exists('./vlogger.info')) {
            try {
                $fileInfo = json_decode(file_get_contents('./vlogger.info'), true);
                if ($fileInfo) {
                    return array_merge($defaultInfo, $fileInfo);
                }
            } catch (Exception $e) {
                error_log('[VLogger] Warning: Could not load vlogger.info: ' . $e->getMessage());
            }
        }
        
        if (file_exists('./composer.json')) {
            try {
                $composer = json_decode(file_get_contents('./composer.json'), true);
                if ($composer) {
                    return array_merge($defaultInfo, [
                        'name' => $composer['name'] ?? $defaultInfo['name'],
                        'description' => $composer['description'] ?? $defaultInfo['description'],
                        'version' => $composer['version'] ?? $defaultInfo['version']
                    ]);
                }
            } catch (Exception $e) {
                error_log('[VLogger] Warning: Could not load composer.json: ' . $e->getMessage());
            }
        }
        
        return $defaultInfo;
    }
    
    /**
     * Check if current request should be skipped
     */
    private function shouldSkipCurrentRequest() {
        $path = $_SERVER['REQUEST_URI'] ?? '';
        $path = parse_url($path, PHP_URL_PATH);
        
        return $this->shouldSkipPath($path);
    }
    
    /**
     * Check if request should be skipped
     */
    private function shouldSkipRequest($request) {
        $path = '';
        
        // Laravel/Illuminate request
        if (method_exists($request, 'path')) {
            $path = '/' . ltrim($request->path(), '/');
        }
        // Symfony request
        elseif (method_exists($request, 'getPathInfo')) {
            $path = $request->getPathInfo();
        }
        // Generic request object
        elseif (is_object($request) && isset($request->path)) {
            $path = $request->path;
        }
        
        return $this->shouldSkipPath($path);
    }
    
    /**
     * Check if path should be skipped
     */
    private function shouldSkipPath($path) {
        if (in_array($path, $this->config['filters']['excludePaths'])) {
            return true;
        }
        
        if ($this->config['filters']['excludeStaticFiles']) {
            $staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff'];
            foreach ($staticExtensions as $ext) {
                if (substr($path, -strlen($ext)) === $ext) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Create log entry from framework request object
     */
    private function createLogEntry($request, $startTime) {
        $method = '';
        $path = '';
        $fullUrl = '';
        $query = [];
        $headers = [];
        $body = null;
        $ip = '';
        
        // Laravel/Illuminate request
        if (method_exists($request, 'method')) {
            $method = $request->method();
            $path = '/' . ltrim($request->path(), '/');
            $fullUrl = $request->fullUrl();
            $query = $request->query();
            $headers = $request->headers->all();
            $body = $request->all();
            $ip = $request->ip();
        }
        // Symfony request
        elseif (method_exists($request, 'getMethod')) {
            $method = $request->getMethod();
            $path = $request->getPathInfo();
            $fullUrl = $request->getUri();
            $query = $request->query->all();
            $headers = $request->headers->all();
            $body = $request->request->all();
            $ip = $request->getClientIp();
        }
        
        return [
            'id' => $this->generateId($startTime),
            'timestamp' => date('c', $startTime),
            'method' => $method,
            'path' => $path,
            'fullUrl' => $fullUrl,
            'query' => $this->sanitizeObject($query, $this->config['sanitize']['queryParams']),
            'headers' => $this->sanitizeObject($headers, $this->config['sanitize']['headers']),
            'body' => $this->sanitizeObject($body, $this->config['sanitize']['bodyFields']),
            'ip' => $ip,
            'response' => null,
            'performance' => [
                'startTime' => $startTime,
                'duration' => 0,
                'memory' => memory_get_usage(true) / 1024 / 1024 // MB
            ],
            'isError' => false,
            'error' => null
        ];
    }
    
    /**
     * Create log entry from PHP globals
     */
    private function createLogEntryFromGlobals($serverData, $startTime) {
        $method = $serverData['REQUEST_METHOD'] ?? 'GET';
        $path = parse_url($serverData['REQUEST_URI'] ?? '', PHP_URL_PATH);
        $fullUrl = $this->getFullUrl($serverData);
        $query = $_GET ?? [];
        $headers = $this->getAllHeaders($serverData);
        $body = $this->getRequestBody();
        $ip = $this->getClientIP($serverData);
        
        return [
            'id' => $this->generateId($startTime),
            'timestamp' => date('c', $startTime),
            'method' => $method,
            'path' => $path,
            'fullUrl' => $fullUrl,
            'query' => $this->sanitizeObject($query, $this->config['sanitize']['queryParams']),
            'headers' => $this->sanitizeObject($headers, $this->config['sanitize']['headers']),
            'body' => $this->sanitizeObject($body, $this->config['sanitize']['bodyFields']),
            'ip' => $ip,
            'response' => null,
            'performance' => [
                'startTime' => $startTime,
                'duration' => 0,
                'memory' => memory_get_usage(true) / 1024 / 1024
            ],
            'isError' => false,
            'error' => null
        ];
    }
    
    /**
     * Generate unique ID for log entry
     */
    private function generateId($startTime) {
        return intval($startTime * 1000) . '-' . substr(md5(uniqid()), 0, 8);
    }
    
    /**
     * Get full URL from server data
     */
    private function getFullUrl($serverData) {
        $protocol = (!empty($serverData['HTTPS']) && $serverData['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $serverData['HTTP_HOST'] ?? $serverData['SERVER_NAME'] ?? 'localhost';
        $uri = $serverData['REQUEST_URI'] ?? '';
        
        return $protocol . '://' . $host . $uri;
    }
    
    /**
     * Get all HTTP headers
     */
    private function getAllHeaders($serverData) {
        $headers = [];
        
        if (function_exists('getallheaders')) {
            try {
                $headers = getallheaders() ?: [];
            } catch (Exception $e) {
                $headers = [];
            }
        } else {
            foreach ($serverData as $key => $value) {
                if (substr($key, 0, 5) === 'HTTP_') {
                    $headerName = str_replace(' ', '-', strtolower(str_replace('_', ' ', substr($key, 5))));
                    $headers[$headerName] = $value;
                }
            }
        }
        
        return $headers;
    }
    
    /**
     * Get request body
     */
    private function getRequestBody() {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        
        if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                try {
                    $input = file_get_contents('php://input');
                    return $input ? json_decode($input, true) : null;
                } catch (Exception $e) {
                    return null;
                }
            } elseif (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
                return $_POST;
            }
        }
        
        return $_POST ?? null;
    }
    
    /**
     * Get client IP address
     */
    private function getClientIP($serverData) {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (!empty($serverData[$key])) {
                $ip = $serverData[$key];
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                return $ip;
            }
        }
        
        return 'unknown';
    }
    
    /**
     * Capture framework response
     */
    private function captureResponse($logEntry, $response, $startTime) {
        $endTime = microtime(true);
        $duration = ($endTime - $startTime) * 1000; // Convert to milliseconds
        
        $status = 200;
        $statusText = 'OK';
        $headers = [];
        $body = null;
        
        // Laravel/Illuminate response
        if (method_exists($response, 'getStatusCode')) {
            $status = $response->getStatusCode();
            if (method_exists($response, 'headers')) {
                $headers = $response->headers->all();
            }
            if (method_exists($response, 'getContent')) {
                $body = $response->getContent();
            }
        }
        // Symfony response
        elseif (method_exists($response, 'getStatusCode')) {
            $status = $response->getStatusCode();
            $headers = $response->headers->all();
            $body = $response->getContent();
        }
        
        $logEntry['response'] = [
            'status' => $status,
            'statusText' => $statusText,
            'headers' => $this->sanitizeObject($headers, $this->config['sanitize']['headers']),
            'body' => $this->sanitizeResponseBody($body),
            'duration' => $duration,
            'size' => strlen(is_string($body) ? $body : json_encode($body))
        ];
        
        $logEntry['performance']['duration'] = $duration;
        $logEntry['performance']['memory'] = memory_get_usage(true) / 1024 / 1024;
        $logEntry['isError'] = $status >= 400;
        
        if ($this->shouldLogEntry($logEntry)) {
            $this->saveLog($logEntry);
            $this->updateStats($logEntry);
        }
    }
    
    /**
     * Capture manual response
     */
    private function captureManualResponse($logEntry, $responseData, $statusCode, $startTime) {
        $endTime = microtime(true);
        $duration = ($endTime - $startTime) * 1000;
        
        $logEntry['response'] = [
            'status' => $statusCode,
            'statusText' => '',
            'headers' => [],
            'body' => $this->sanitizeResponseBody($responseData),
            'duration' => $duration,
            'size' => strlen(is_string($responseData) ? $responseData : json_encode($responseData))
        ];
        
        $logEntry['performance']['duration'] = $duration;
        $logEntry['performance']['memory'] = memory_get_usage(true) / 1024 / 1024;
        $logEntry['isError'] = $statusCode >= 400;
        
        if ($this->shouldLogEntry($logEntry)) {
            $this->saveLog($logEntry);
            $this->updateStats($logEntry);
        }
    }
    
    /**
     * Check if log entry should be saved
     */
    private function shouldLogEntry($logEntry) {
        if (isset($this->config['filters']['captureOnlyErrors']) && 
            $this->config['filters']['captureOnlyErrors'] && !$logEntry['isError']) {
            return false;
        }
        
        if ($logEntry['performance']['duration'] < $this->config['filters']['minDuration']) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanitize object by replacing sensitive fields
     */
    private function sanitizeObject($obj, $sensitiveFields) {
        if (!is_array($obj)) {
            return $obj;
        }
        
        $sanitized = $obj;
        
        foreach ($sensitiveFields as $field) {
            $lowerField = strtolower($field);
            foreach ($sanitized as $key => $value) {
                if (strpos(strtolower($key), $lowerField) !== false) {
                    $sanitized[$key] = '[REDACTED]';
                }
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize response body
     */
    private function sanitizeResponseBody($body) {
        if (is_string($body)) {
            try {
                $decoded = json_decode($body, true);
                if ($decoded !== null) {
                    return $this->sanitizeObject($decoded, $this->config['sanitize']['bodyFields']);
                }
            } catch (Exception $e) {
                // Not JSON, return as is
            }
        } elseif (is_array($body)) {
            return $this->sanitizeObject($body, $this->config['sanitize']['bodyFields']);
        }
        
        return $body;
    }
    
    /**
     * Save log entry to file
     */
    private function saveLog($logEntry) {
        try {
            $today = date('Y-m-d');
            $filename = "vlogger-{$today}.json";
            $filepath = rtrim($this->config['storage']['path'], '/') . '/' . $filename;
            
            $logs = [];
            if (file_exists($filepath)) {
                try {
                    $content = file_get_contents($filepath);
                    $logs = json_decode($content, true) ?: [];
                } catch (Exception $e) {
                    $logs = [];
                }
            }
            
            $logs[] = $logEntry;
            
            $jsonData = json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if ($jsonData === false) {
                throw new Exception('Failed to encode log data to JSON');
            }
            
            if (file_put_contents($filepath, $jsonData, LOCK_EX) === false) {
                throw new Exception('Failed to write log file');
            }
            
            $this->checkFileRotation($filepath);
        } catch (Exception $e) {
            error_log('[VLogger] Error saving log: ' . $e->getMessage());
        }
    }
    
    /**
     * Update statistics
     */
    private function updateStats($logEntry) {
        $this->stats['totalRequests']++;
        
        if ($logEntry['isError']) {
            $this->stats['totalErrors']++;
        }
        
        $endpointKey = $logEntry['method'] . ':' . $logEntry['path'];
        if (!isset($this->stats['endpoints'][$endpointKey])) {
            $this->stats['endpoints'][$endpointKey] = [
                'method' => $logEntry['method'],
                'path' => $logEntry['path'],
                'calls' => 0,
                'errors' => 0,
                'totalDuration' => 0,
                'avgDuration' => 0,
                'minDuration' => PHP_FLOAT_MAX,
                'maxDuration' => 0,
                'statusCodes' => []
            ];
        }
        
        $endpoint = &$this->stats['endpoints'][$endpointKey];
        $endpoint['calls']++;
        $endpoint['totalDuration'] += $logEntry['performance']['duration'];
        $endpoint['avgDuration'] = $endpoint['totalDuration'] / $endpoint['calls'];
        $endpoint['minDuration'] = min($endpoint['minDuration'], $logEntry['performance']['duration']);
        $endpoint['maxDuration'] = max($endpoint['maxDuration'], $logEntry['performance']['duration']);
        
        if ($logEntry['isError']) {
            $endpoint['errors']++;
        }
        
        $status = $logEntry['response']['status'];
        $endpoint['statusCodes'][$status] = ($endpoint['statusCodes'][$status] ?? 0) + 1;
    }
    
    /**
     * Ensure log directory exists
     */
    private function ensureLogDirectory() {
        $logDir = $this->config['storage']['path'];
        if (!is_dir($logDir)) {
            if (!mkdir($logDir, 0755, true) && !is_dir($logDir)) {
                throw new Exception('Failed to create log directory: ' . $logDir);
            }
        }
    }
    
    /**
     * Check file rotation
     */
    private function checkFileRotation($filepath) {
        try {
            if (filesize($filepath) > $this->config['storage']['maxFileSize']) {
                $timestamp = time();
                $pathInfo = pathinfo($filepath);
                $newPath = $pathInfo['dirname'] . '/' . $pathInfo['filename'] . '-' . $timestamp . '.json';
                
                if (!rename($filepath, $newPath)) {
                    throw new Exception('Failed to rotate log file');
                }
                
                $this->cleanOldFiles();
                error_log('[VLogger] Rotated log file: ' . basename($newPath));
            }
        } catch (Exception $e) {
            error_log('[VLogger] Error rotating file: ' . $e->getMessage());
        }
    }
    
    /**
     * Clean old files
     */
    private function cleanOldFiles() {
        try {
            $logDir = $this->config['storage']['path'];
            $files = glob($logDir . '/vlogger-*.json');
            
            if ($files === false) {
                return;
            }
            
            usort($files, function($a, $b) {
                return filemtime($b) - filemtime($a);
            });
            
            if (count($files) > $this->config['storage']['maxFiles']) {
                $filesToDelete = array_slice($files, $this->config['storage']['maxFiles']);
                foreach ($filesToDelete as $file) {
                    if (unlink($file)) {
                        error_log('[VLogger] Deleted old log file: ' . basename($file));
                    }
                }
            }
        } catch (Exception $e) {
            error_log('[VLogger] Error cleaning old files: ' . $e->getMessage());
        }
    }
    
    /**
     * Register shutdown function to capture response
     */
    private function registerShutdownFunction() {
        register_shutdown_function(function() {
            try {
                if (isset($GLOBALS['vlogger_entry']) && isset($GLOBALS['vlogger_start'])) {
                    $logEntry = $GLOBALS['vlogger_entry'];
                    $startTime = $GLOBALS['vlogger_start'];
                    
                    // Capture final response
                    $status = http_response_code() ?: 200;
                    $headers = headers_list();
                    
                    // Get output buffer if available
                    $body = null;
                    if (ob_get_level() > 0) {
                        $body = ob_get_contents();
                    }
                    
                    $this->captureManualResponse($logEntry, $body, $status, $startTime);
                }
            } catch (Exception $e) {
                error_log('[VLogger] Error in shutdown function: ' . $e->getMessage());
            }
        });
    }
    
    /**
     * Start dashboard server (simplified for PHP)
     */
    private function startDashboard() {
        // In PHP, we create a simple dashboard script that can be accessed
        $dashboardScript = $this->config['storage']['path'] . '/dashboard.php';
        
        if (!file_exists($dashboardScript)) {
            $this->createDashboardScript($dashboardScript);
        }
        
        error_log('[VLogger] Dashboard script available at: ' . $dashboardScript);
    }
    
    /**
     * Create dashboard PHP script
     */
    private function createDashboardScript($filepath) {
        $script = '<?php
// VLogger Dashboard for PHP

// Check PHP version
if (version_compare(PHP_VERSION, "7.4.0", "<")) {
    die("VLogger requires PHP 7.4 or higher. Current version: " . PHP_VERSION);
}

header("Content-Type: text/html; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle API requests
$requestUri = $_SERVER["REQUEST_URI"] ?? "";
$path = parse_url($requestUri, PHP_URL_PATH);

if (strpos($path, "/api/") !== false) {
    header("Content-Type: application/json");
    
    if ($path === "/api/stats") {
        // Return basic stats
        echo json_encode([
            "totalRequests" => 0,
            "totalErrors" => 0,
            "endpoints" => [],
            "startedAt" => date("c")
        ]);
        exit;
    }
    
    if ($path === "/api/logs") {
        $logsDir = dirname(__FILE__);
        $today = date("Y-m-d");
        $logFile = $logsDir . "/vlogger-{$today}.json";
        
        $logs = [];
        if (file_exists($logFile)) {
            try {
                $logs = json_decode(file_get_contents($logFile), true) ?: [];
            } catch (Exception $e) {
                $logs = [];
            }
        }
        
        echo json_encode(array_slice(array_reverse($logs), 0, 50));
        exit;
    }
    
    if ($path === "/api/project") {
        echo json_encode([
            "name" => "PHP Project",
            "version" => "1.5.12",
            "description" => "PHP application with VLogger"
        ]);
        exit;
    }
    
    http_response_code(404);
    echo json_encode(["error" => "Not found"]);
    exit;
}

$logsDir = dirname(__FILE__);
$today = date("Y-m-d");
$logFile = $logsDir . "/vlogger-{$today}.json";

$logs = [];
if (file_exists($logFile)) {
    try {
        $logs = json_decode(file_get_contents($logFile), true) ?: [];
    } catch (Exception $e) {
        $logs = [];
    }
}

$totalRequests = count($logs);
$totalErrors = count(array_filter($logs, function($log) { 
    return isset($log["isError"]) && $log["isError"]; 
}));

?>
<!DOCTYPE html>
<html>
<head>
    <title>VLogger Dashboard - PHP</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
            margin: 0; padding: 20px; background: #f8f9fa; 
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: white; padding: 30px; border-radius: 12px; 
            margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); 
        }
        .stats { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 24px; margin-bottom: 24px; 
        }
        .stat-card { 
            background: white; padding: 24px; border-radius: 12px; 
            box-shadow: 0 4px 16px rgba(0,0,0,0.1); 
        }
        .stat-number { font-size: 2.5em; font-weight: 700; margin: 8px 0; }
        .stat-label { color: #6c757d; font-weight: 500; }
        .logs { 
            background: white; padding: 24px; border-radius: 12px; 
            box-shadow: 0 4px 16px rgba(0,0,0,0.1); 
        }
        .log-entry { 
            padding: 16px; border-bottom: 1px solid #e9ecef; 
            transition: background-color 0.2s ease; 
        }
        .log-entry:hover { background: #f8f9fa; }
        .log-entry:last-child { border-bottom: none; }
        .log-method { 
            font-weight: 600; padding: 4px 8px; border-radius: 4px; 
            font-size: 0.75rem; text-transform: uppercase; 
        }
        .method-get { background: #d4edda; color: #155724; }
        .method-post { background: #dbeafe; color: #1d4ed8; }
        .method-put { background: #fff3cd; color: #856404; }
        .method-delete { background: #f8d7da; color: #721c24; }
        .log-status { 
            padding: 4px 8px; border-radius: 4px; font-weight: 500; 
            font-size: 0.8rem; margin-left: 8px; 
        }
        .status-success { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .log-time { color: #adb5bd; font-size: 0.9em; display: block; margin-top: 4px; }
        .refresh-btn { 
            background: #007bff; color: white; border: none; 
            padding: 8px 16px; border-radius: 4px; cursor: pointer; 
            margin-bottom: 16px; 
        }
        .refresh-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 VLogger Dashboard - PHP</h1>
            <p>Real-time monitoring for your PHP application</p>
            <p><strong>PHP Version:</strong> <?= PHP_VERSION ?></p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-label">Total Requests</div>
                <div class="stat-number"><?= $totalRequests ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Errors</div>
                <div class="stat-number" style="color: #dc3545;"><?= $totalErrors ?></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Success Rate</div>
                <div class="stat-number" style="color: #28a745;">
                    <?= $totalRequests > 0 ? round((($totalRequests - $totalErrors) / $totalRequests) * 100, 1) : 100 ?>%
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Memory Usage</div>
                <div class="stat-number" style="color: #17a2b8;">
                    <?= round(memory_get_usage(true) / 1024 / 1024, 1) ?>MB
                </div>
            </div>
        </div>
        
        <div class="logs">
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
            <h2>Recent Requests</h2>
            <?php if (empty($logs)): ?>
                <p style="color: #6c757d; text-align: center; padding: 40px;">
                    No requests logged yet... Start making requests to see logs appear here.
                </p>
            <?php else: ?>
                <?php foreach (array_slice(array_reverse($logs), 0, 20) as $log): ?>
                    <?php
                    $method = strtolower($log["method"] ?? "get");
                    $status = $log["response"]["status"] ?? 200;
                    $isError = isset($log["isError"]) && $log["isError"];
                    $duration = round($log["performance"]["duration"] ?? 0);
                    ?>
                    <div class="log-entry">
                        <div>
                            <span class="log-method method-<?= $method ?>"><?= strtoupper($method) ?></span>
                            <strong><?= htmlspecialchars($log["path"] ?? "/") ?></strong>
                            <span class="log-status <?= $isError ? "status-error" : "status-success" ?>">
                                <?= $status ?>
                            </span>
                            <span style="color: #6c757d;">(<?= $duration ?>ms)</span>
                        </div>
                        <small class="log-time"><?= htmlspecialchars($log["timestamp"] ?? "") ?></small>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 10 seconds
        setTimeout(function() {
            location.reload();
        }, 10000);
        
        // Add some interactivity
        document.querySelectorAll(".log-entry").forEach(function(entry) {
            entry.addEventListener("click", function() {
                this.style.backgroundColor = this.style.backgroundColor ? "" : "#e3f2fd";
            });
        });
    </script>
</body>
</html>';

        try {
            if (file_put_contents($filepath, $script, LOCK_EX) === false) {
                throw new Exception('Failed to create dashboard script');
            }
        } catch (Exception $e) {
            error_log('[VLogger] Error creating dashboard script: ' . $e->getMessage());
        }
    }
}

?>