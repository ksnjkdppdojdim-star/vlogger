<?php
/**
 * VLogger PHP Adapter
 * 
 * @author Jules Mahounou
 * @version 1.0.0
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

define('VLOGGER_BASE_PATH', dirname(__FILE__));

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
                'path' => VLOGGER_BASE_PATH . '/logs',
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
        
       $configPath = VLOGGER_BASE_PATH . '/vlogger.config.json';
        if (is_file($configPath)) {
            $fileConfig = json_decode(file_get_contents($configPath), true) ?: [];
        }

        
        return array_merge_recursive($defaultConfig, $fileConfig, $providedConfig ?: []);
    }
    
    /**
     * Load project information
     */
    private function loadProjectInfo() {
        $defaultInfo = [
            'name' => 'PHP Project',
            'version' => '1.0.0',
            'description' => 'PHP application with VLogger',
            'api' => [
                'version' => '1.0',
                'baseUrl' => 'http://localhost'
            ]
        ];
        
        $infoPath = VLOGGER_BASE_PATH . '/vlogger.info';
        $composerPath = VLOGGER_BASE_PATH . '/composer.json';

        if (is_file($infoPath)) {
            $fileInfo = json_decode(file_get_contents($infoPath), true);
            if ($fileInfo) {
                return array_merge($defaultInfo, $fileInfo);
            }
        }

        if (is_file($composerPath)) {
            $composer = json_decode(file_get_contents($composerPath), true);
            if ($composer) {
                return array_merge($defaultInfo, [
                    'name' => $composer['name'] ?? $defaultInfo['name'],
                    'description' => $composer['description'] ?? $defaultInfo['description'],
                    'version' => $composer['version'] ?? $defaultInfo['version']
                ]);
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
            $headers = getallheaders();
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
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                return json_decode(file_get_contents('php://input'), true);
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
            $decoded = json_decode($body, true);
            if ($decoded !== null) {
                return $this->sanitizeObject($decoded, $this->config['sanitize']['bodyFields']);
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
                $content = file_get_contents($filepath);
                $logs = json_decode($content, true) ?: [];
            }
            
            $logs[] = $logEntry;
            file_put_contents($filepath, json_encode($logs, JSON_PRETTY_PRINT));
            
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
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * Check file rotation
     */
    private function checkFileRotation($filepath) {
        if (filesize($filepath) > $this->config['storage']['maxFileSize']) {
            $timestamp = time();
            $pathInfo = pathinfo($filepath);
            $newPath = $pathInfo['dirname'] . '/' . $pathInfo['filename'] . '-' . $timestamp . '.json';
            
            rename($filepath, $newPath);
            $this->cleanOldFiles();
        }
    }
    
    /**
     * Clean old files
     */
    private function cleanOldFiles() {
        $logDir = $this->config['storage']['path'];
        $files = glob($logDir . '/vlogger-*.json');
        
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        if (count($files) > $this->config['storage']['maxFiles']) {
            $filesToDelete = array_slice($files, $this->config['storage']['maxFiles']);
            foreach ($filesToDelete as $file) {
                unlink($file);
            }
        }
    }
    
    /**
     * Register shutdown function to capture response
     */
    private function registerShutdownFunction() {
        register_shutdown_function(function() {
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
header("Content-Type: text/html; charset=UTF-8");

$logsDir = dirname(__FILE__);
$today = date("Y-m-d");
$logFile = $logsDir . "/vlogger-{$today}.json";

$logs = [];
if (file_exists($logFile)) {
    $logs = json_decode(file_get_contents($logFile), true) ?: [];
}

$totalRequests = count($logs);
$totalErrors = count(array_filter($logs, function($log) { return $log["isError"]; }));

?>
<!DOCTYPE html>
<html>
<head>
    <title>VLogger Dashboard - PHP</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; flex: 1; }
        .logs { background: white; padding: 20px; border-radius: 8px; }
        .log-entry { padding: 10px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 VLogger Dashboard - PHP</h1>
            <p>Real-time monitoring for your PHP application</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h3>Total Requests</h3>
                <p style="font-size: 2em; margin: 0;"><?= $totalRequests ?></p>
            </div>
            <div class="stat-card">
                <h3>Errors</h3>
                <p style="font-size: 2em; margin: 0; color: red;"><?= $totalErrors ?></p>
            </div>
        </div>
        
        <div class="logs">
            <h2>Recent Requests</h2>
            <?php foreach (array_slice(array_reverse($logs), 0, 20) as $log): ?>
                <div class="log-entry">
                    <strong><?= htmlspecialchars($log["method"]) ?> <?= htmlspecialchars($log["path"]) ?></strong>
                    <span style="color: <?= $log["isError"] ? "red" : "green" ?>;">
                        <?= $log["response"]["status"] ?? "N/A" ?>
                    </span>
                    <span style="color: #666;">(<?= round($log["performance"]["duration"] ?? 0) ?>ms)</span>
                    <br>
                    <small><?= $log["timestamp"] ?></small>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</body>
</html>';

        file_put_contents($filepath, $script);
    }
}

?>