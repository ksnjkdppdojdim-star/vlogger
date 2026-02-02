/**
 * VLogger Core - Universal Multi-Language Logging System
 * 
 * @author Jules Mahounou
 * @version 1.5.12
 * @license MIT
 * 
 * This is the core VLogger implementation that provides:
 * - Request/Response interception and logging
 * - Data sanitization for security
 * - Performance monitoring
 * - File-based storage with rotation
 * - Real-time dashboard server
 * - Statistics aggregation
 * 
 * Usage:
 * const VLogger = require('./vlogger');
 * const logger = new VLogger(config);
 * app.use(logger.middleware());
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { createHash } = require('crypto');

/**
 * Main VLogger class
 * Handles all logging operations, configuration, and dashboard
 */
class VLogger {
  /**
   * Create a new VLogger instance
   * @param {Object} config - Configuration object (optional)
   */
  constructor(config = null) {
    // Load configuration
    this.config = this.loadConfig(config);
    this.projectInfo = this.loadProjectInfo();
    
    // Initialize stats and state
    this.stats = {
      totalRequests: 0,
      totalErrors: 0,
      endpoints: new Map(),
      startedAt: new Date().toISOString(),
      uptime: 0
    };
    
    this.logQueue = [];
    this.startTime = Date.now();
    this.dashboardServer = null;
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Start dashboard if enabled
    if (this.config.dashboard.enabled) {
      this.startDashboard();
    }
    
    // Start cleanup interval
    this.startCleanupInterval();
    
    console.log(`[VLogger] Initialized - Dashboard: ${this.config.dashboard.enabled ? `http://localhost:${this.config.dashboard.port}` : 'disabled'}`);
  }

  /**
   * Load configuration from file or use defaults
   * @param {Object} providedConfig - Config provided to constructor
   * @returns {Object} Complete configuration object
   */
  loadConfig(providedConfig) {
    const defaultConfig = {
      mode: 'development',
      storage: {
        type: 'file',
        path: './logs',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        format: 'json'
      },
      capture: {
        requests: true,
        responses: true,
        headers: true,
        queryParams: true,
        body: true,
        performance: true,
        errors: true,
        fileSystem: {
          enabled: false,
          watchPaths: []
        }
      },
      sanitize: {
        headers: ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
        bodyFields: ['password', 'token', 'secret', 'key', 'pass'],
        queryParams: ['api_key', 'token', 'password']
      },
      filters: {
        excludePaths: ['/favicon.ico', '/health', '/ping'],
        excludeStaticFiles: true,
        minDuration: 0,
        captureOnlyErrors: false
      },
      documentation: {
        autoGenerate: true,
        outputPath: './docs',
        format: 'markdown',
        includeExamples: true,
        groupByTag: true
      },
      dashboard: {
        enabled: true,
        port: 3333,
        openBrowser: false
      },
      debug: false
    };

    // Try to load from vlogger.config.json
    let fileConfig = {};
    try {
      if (fs.existsSync('./vlogger.config.json')) {
        fileConfig = JSON.parse(fs.readFileSync('./vlogger.config.json', 'utf8'));
      }
    } catch (error) {
      console.warn('[VLogger] Warning: Could not load vlogger.config.json:', error.message);
    }

    // Merge configurations: defaults < file < provided
    return this.deepMerge(defaultConfig, fileConfig, providedConfig || {});
  }

  /**
   * Deep merge multiple objects
   */
  deepMerge(...objects) {
    return objects.reduce((prev, obj) => {
      Object.keys(obj).forEach(key => {
        const pVal = prev[key];
        const oVal = obj[key];
        
        if (Array.isArray(pVal) && Array.isArray(oVal)) {
          prev[key] = pVal.concat(...oVal);
        } else if (pVal && oVal && typeof pVal === 'object' && typeof oVal === 'object') {
          prev[key] = this.deepMerge(pVal, oVal);
        } else {
          prev[key] = oVal;
        }
      });
      return prev;
    }, {});
  }

  /**
   * Load project information from vlogger.info file
   * @returns {Object} Project information
   */
  loadProjectInfo() {
    const defaultInfo = {
      name: 'Unknown Project',
      version: '1.5.12',
      description: '',
      author: '',
      email: '',
      license: 'MIT',
      links: {},
      team: {},
      api: {
        version: '1.0',
        baseUrl: '',
        description: ''
      }
    };

    try {
      if (fs.existsSync('./vlogger.info')) {
        const fileInfo = JSON.parse(fs.readFileSync('./vlogger.info', 'utf8'));
        return { ...defaultInfo, ...fileInfo };
      }
    } catch (error) {
      console.warn('[VLogger] Warning: Could not load vlogger.info:', error.message);
    }

    return defaultInfo;
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logDir = this.config.storage.path;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Get middleware function for Express/Connect-style apps
   * @returns {Function} Middleware function
   */
  middleware() {
    return (req, res, next) => {
      // Skip if should be filtered
      if (this.shouldSkipRequest(req)) {
        return next();
      }

      const startTime = Date.now();
      const logEntry = this.createLogEntry(req, startTime);

      // Intercept response
      this.interceptResponse(res, logEntry, startTime);

      next();
    };
  }

  /**
   * Check if request should be skipped based on filters
   * @param {Object} req - Request object
   * @returns {boolean} True if should skip
   */
  shouldSkipRequest(req) {
    const { filters } = this.config;
    
    // Check excluded paths
    if (filters.excludePaths.includes(req.path)) {
      return true;
    }

    // Check static files
    if (filters.excludeStaticFiles) {
      const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf'];
      if (staticExtensions.some(ext => req.path.endsWith(ext))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create initial log entry from request
   * @param {Object} req - Request object
   * @param {number} startTime - Request start timestamp
   * @returns {Object} Log entry object
   */
  createLogEntry(req, startTime) {
    const entry = {
      id: `${startTime}-${createHash('md5').update(req.url + req.method + Math.random()).digest('hex').substring(0, 8)}`,
      timestamp: new Date(startTime).toISOString(),
      method: req.method,
      path: req.path || req.url,
      fullUrl: req.protocol ? `${req.protocol}://${req.get('Host')}${req.originalUrl || req.url}` : req.url,
      query: this.sanitizeObject(req.query || {}, this.config.sanitize.queryParams),
      headers: this.sanitizeObject(req.headers || {}, this.config.sanitize.headers),
      body: this.sanitizeObject(req.body, this.config.sanitize.bodyFields),
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      response: null,
      performance: {
        startTime: startTime,
        duration: 0,
        memory: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      },
      isError: false,
      error: null
    };

    return entry;
  }

  /**
   * Intercept response to capture response data
   * @param {Object} res - Response object
   * @param {Object} logEntry - Log entry to update
   * @param {number} startTime - Request start time
   */
  interceptResponse(res, logEntry, startTime) {
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Override send method
    res.send = (data) => {
      this.captureResponse(logEntry, res, data, startTime);
      return originalSend.call(res, data);
    };

    // Override json method
    res.json = (data) => {
      this.captureResponse(logEntry, res, data, startTime);
      return originalJson.call(res, data);
    };

    // Override end method for cases where send/json aren't used
    res.end = (data, encoding) => {
      if (!logEntry.response) {
        this.captureResponse(logEntry, res, data, startTime);
      }
      return originalEnd.call(res, data, encoding);
    };
  }

  /**
   * Capture response data and finalize log entry
   * @param {Object} logEntry - Log entry to update
   * @param {Object} res - Response object
   * @param {any} data - Response data
   * @param {number} startTime - Request start time
   */
  captureResponse(logEntry, res, data, startTime) {
    if (logEntry.response) return; // Already captured

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Capture response
    logEntry.response = {
      status: res.statusCode,
      statusText: res.statusMessage || '',
      headers: this.sanitizeObject(res.getHeaders(), this.config.sanitize.headers),
      body: this.sanitizeResponseBody(data),
      duration: duration,
      size: Buffer.byteLength(JSON.stringify(data || ''), 'utf8')
    };

    // Update performance
    logEntry.performance.duration = duration;
    logEntry.performance.memory = process.memoryUsage().heapUsed / 1024 / 1024;

    // Check if error
    logEntry.isError = res.statusCode >= 400;

    // Apply final filters
    if (this.shouldLogEntry(logEntry)) {
      this.saveLog(logEntry);
      this.updateStats(logEntry);
    }
  }

  /**
   * Check if log entry should be saved based on filters
   * @param {Object} logEntry - Log entry to check
   * @returns {boolean} True if should log
   */
  shouldLogEntry(logEntry) {
    const { filters } = this.config;

    // Check capture only errors
    if (filters.captureOnlyErrors && !logEntry.isError) {
      return false;
    }

    // Check minimum duration
    if (logEntry.performance.duration < filters.minDuration) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize object by replacing sensitive fields
   * @param {Object} obj - Object to sanitize
   * @param {Array} sensitiveFields - Fields to sanitize
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize response body
   * @param {any} body - Response body
   * @returns {any} Sanitized body
   */
  sanitizeResponseBody(body) {
    if (!body) return body;
    
    try {
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        return this.sanitizeObject(parsed, this.config.sanitize.bodyFields);
      } else if (typeof body === 'object') {
        return this.sanitizeObject(body, this.config.sanitize.bodyFields);
      }
    } catch (e) {
      // If not JSON, return as is
    }
    
    return body;
  }

  /**
   * Save log entry to file
   * @param {Object} logEntry - Log entry to save
   */
  saveLog(logEntry) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `vlogger-${today}.json`;
      const filepath = path.join(this.config.storage.path, filename);

      // Read existing logs or create empty array
      let logs = [];
      if (fs.existsSync(filepath)) {
        try {
          logs = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
          logs = [];
        }
      }

      // Add new log
      logs.push(logEntry);

      // Write back to file
      fs.writeFileSync(filepath, JSON.stringify(logs, null, 2));

      // Check if file rotation is needed
      this.checkFileRotation(filepath);

    } catch (error) {
      console.error('[VLogger] Error saving log:', error.message);
    }
  }

  /**
   * Check if file needs rotation and rotate if necessary
   * @param {string} filepath - Path to log file
   */
  checkFileRotation(filepath) {
    try {
      const stats = fs.statSync(filepath);
      if (stats.size > this.config.storage.maxFileSize) {
        this.rotateFile(filepath);
      }
    } catch (error) {
      console.error('[VLogger] Error checking file rotation:', error.message);
    }
  }

  /**
   * Rotate log file
   * @param {string} filepath - Path to file to rotate
   */
  rotateFile(filepath) {
    try {
      const timestamp = Date.now();
      const ext = path.extname(filepath);
      const basename = path.basename(filepath, ext);
      const dirname = path.dirname(filepath);
      const newPath = path.join(dirname, `${basename}-${timestamp}${ext}`);

      // Rename current file
      fs.renameSync(filepath, newPath);
      
      console.log(`[VLogger] Rotated log file: ${newPath}`);
      
      // Clean old files
      this.cleanOldFiles();
    } catch (error) {
      console.error('[VLogger] Error rotating file:', error.message);
    }
  }

  /**
   * Clean old log files based on maxFiles setting
   */
  cleanOldFiles() {
    try {
      const logDir = this.config.storage.path;
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith('vlogger-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          mtime: fs.statSync(path.join(logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

      if (files.length > this.config.storage.maxFiles) {
        const filesToDelete = files.slice(this.config.storage.maxFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`[VLogger] Deleted old log file: ${file.name}`);
        });
      }
    } catch (error) {
      console.error('[VLogger] Error cleaning old files:', error.message);
    }
  }

  /**
   * Update statistics with new log entry
   * @param {Object} logEntry - Log entry to process
   */
  updateStats(logEntry) {
    this.stats.totalRequests++;
    this.stats.uptime = Date.now() - this.startTime;

    if (logEntry.isError) {
      this.stats.totalErrors++;
    }

    // Update endpoint stats
    const endpointKey = `${logEntry.method}:${logEntry.path}`;
    if (!this.stats.endpoints.has(endpointKey)) {
      this.stats.endpoints.set(endpointKey, {
        method: logEntry.method,
        path: logEntry.path,
        calls: 0,
        errors: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        statusCodes: {}
      });
    }

    const endpoint = this.stats.endpoints.get(endpointKey);
    endpoint.calls++;
    endpoint.totalDuration += logEntry.performance.duration;
    endpoint.avgDuration = endpoint.totalDuration / endpoint.calls;
    endpoint.minDuration = Math.min(endpoint.minDuration, logEntry.performance.duration);
    endpoint.maxDuration = Math.max(endpoint.maxDuration, logEntry.performance.duration);

    if (logEntry.isError) {
      endpoint.errors++;
    }

    // Status code tracking
    const status = logEntry.response.status;
    endpoint.statusCodes[status] = (endpoint.statusCodes[status] || 0) + 1;
  }

  /**
   * Start dashboard server
   */
  startDashboard() {
    const port = this.config.dashboard.port;
    
    this.dashboardServer = http.createServer((req, res) => {
      this.handleDashboardRequest(req, res);
    });

    this.dashboardServer.listen(port, () => {
      console.log(`[VLogger] Dashboard running on http://localhost:${port}`);
      
      if (this.config.dashboard.openBrowser) {
        this.openBrowser(`http://localhost:${port}`);
      }
    });
  }

  /**
   * Handle dashboard HTTP requests
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  handleDashboardRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
      if (pathname === '/') {
        this.serveDashboardHTML(res);
      } else if (pathname === '/api/stats') {
        this.serveStats(res);
      } else if (pathname === '/api/logs') {
        this.serveLogs(res);
      } else if (pathname === '/api/project') {
        this.serveProjectInfo(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (error) {
      console.error('[VLogger] Dashboard error:', error);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }

  /**
   * Serve dashboard HTML page
   * @param {Object} res - Response object
   */
  serveDashboardHTML(res) {
    const html = this.generateDashboardHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve statistics data
   * @param {Object} res - Response object
   */
  serveStats(res) {
    const stats = {
      ...this.stats,
      endpoints: Array.from(this.stats.endpoints.entries()).map(([key, value]) => ({
        endpoint: key,
        ...value
      }))
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
  }

  /**
   * Serve logs data
   * @param {Object} res - Response object
   */
  serveLogs(res) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `vlogger-${today}.json`;
      const filepath = path.join(this.config.storage.path, filename);
      
      let logs = [];
      if (fs.existsSync(filepath)) {
        logs = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      }
      
      // Return last 100 logs by default
      const recentLogs = logs.slice(-100).reverse();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(recentLogs, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load logs' }));
    }
  }

  /**
   * Serve project information
   * @param {Object} res - Response object
   */
  serveProjectInfo(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.projectInfo, null, 2));
  }

  /**
   * Start cleanup interval for old logs
   */
  startCleanupInterval() {
    // Clean up every hour
    setInterval(() => {
      this.cleanOldFiles();
    }, 60 * 60 * 1000);
  }

  /**
   * Generate dashboard HTML
   * @returns {string} Dashboard HTML content
   */
  generateDashboardHTML() {
    // This will be loaded from the dashboard directory
    try {
      return fs.readFileSync(path.join(__dirname, '../dashboard/index.html'), 'utf8');
    } catch (error) {
      // Fallback simple HTML
      return `
<!DOCTYPE html>
<html>
<head>
    <title>VLogger Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .logs { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 VLogger Dashboard</h1>
            <p>Real-time API monitoring and logging</p>
        </div>
        
        <div class="stats" id="stats">
            <!-- Stats will be loaded here -->
        </div>
        
        <div class="logs">
            <h2>Recent Logs</h2>
            <div id="logs">
                <!-- Logs will be loaded here -->
            </div>
        </div>
    </div>
    
    <script>
        function loadStats() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('stats').innerHTML = \`
                        <div class="stat-card">
                            <h3>Total Requests</h3>
                            <p style="font-size: 2em; margin: 0;">\${data.totalRequests}</p>
                        </div>
                        <div class="stat-card">
                            <h3>Total Errors</h3>
                            <p style="font-size: 2em; margin: 0; color: red;">\${data.totalErrors}</p>
                        </div>
                        <div class="stat-card">
                            <h3>Uptime</h3>
                            <p style="font-size: 1.5em; margin: 0;">\${Math.round(data.uptime / 1000)}s</p>
                        </div>
                        <div class="stat-card">
                            <h3>Endpoints</h3>
                            <p style="font-size: 2em; margin: 0;">\${data.endpoints.length}</p>
                        </div>
                    \`;
                });
        }
        
        function loadLogs() {
            fetch('/api/logs')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('logs').innerHTML = data.map(log => \`
                        <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                            <strong>\${log.method} \${log.path}</strong> 
                            <span style="color: \${log.isError ? 'red' : 'green'};">\${log.response?.status || 'N/A'}</span>
                            <span style="color: #666;">(\${log.performance.duration}ms)</span>
                            <br>
                            <small>\${log.timestamp}</small>
                        </div>
                    \`).join('');
                });
        }
        
        loadStats();
        loadLogs();
        setInterval(loadStats, 5000);
        setInterval(loadLogs, 10000);
    </script>
</body>
</html>`;
    }
  }

  /**
   * Open browser (platform-independent)
   * @param {string} url - URL to open
   */
  openBrowser(url) {
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
    require('child_process').exec(start + ' ' + url);
  }

  /**
   * Stop VLogger and cleanup resources
   */
  stop() {
    if (this.dashboardServer) {
      this.dashboardServer.close();
      console.log('[VLogger] Dashboard server stopped');
    }
    
    console.log('[VLogger] Stopped');
  }
}

module.exports = VLogger;