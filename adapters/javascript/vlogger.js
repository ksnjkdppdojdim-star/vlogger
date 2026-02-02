/**
 * VLogger JavaScript/Node.js Adapter
 * 
 * @author Jules Mahounou
 * @version 1.5.12
 * @license MIT
 * 
 * This adapter provides VLogger integration for JavaScript/Node.js applications
 * including Express, Nest.js, Fastify, Koa, and vanilla Node.js HTTP servers.
 * 
 * Supported Frameworks:
 * - Express.js
 * - Nest.js
 * - Fastify
 * - Koa.js
 * - Next.js
 * - Vanilla Node.js HTTP
 * 
 * Usage:
 * const VLogger = require('./vlogger');
 * const logger = new VLogger();
 * 
 * // Express
 * app.use(logger.middleware());
 * 
 * // Fastify
 * fastify.register(logger.fastifyPlugin());
 * 
 * // Koa
 * app.use(logger.koaMiddleware());
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { createHash } = require('crypto');

/**
 * VLogger JavaScript Adapter
 * Provides logging capabilities for Node.js applications
 */
class VLogger {
  /**
   * Create a new VLogger instance
   * @param {Object} config - Configuration object (optional)
   */
  constructor(config = null) {
    this.config = this.loadConfig(config);
    this.projectInfo = this.loadProjectInfo();
    this.stats = {
      totalRequests: 0,
      totalErrors: 0,
      endpoints: new Map(),
      startedAt: new Date().toISOString()
    };
    
    this.startTime = Date.now();
    this.dashboardServer = null;
    
    this.ensureLogDirectory();
    
    if (this.config.dashboard.enabled) {
      this.startDashboard();
    }
    
    this.startCleanupInterval();
    
    console.log(`[VLogger] JavaScript adapter initialized - Dashboard: ${this.config.dashboard.enabled ? `http://localhost:${this.config.dashboard.port}` : 'disabled'}`);
  }

  /**
   * Load configuration from files or use defaults
   */
  loadConfig(providedConfig) {
    const defaultConfig = {
      storage: { path: './logs', maxFileSize: 10485760, maxFiles: 10 },
      capture: { requests: true, responses: true, headers: true, body: true, performance: true },
      sanitize: { 
        headers: ['authorization', 'cookie', 'x-api-key'], 
        bodyFields: ['password', 'token', 'secret'],
        queryParams: ['api_key', 'token']
      },
      filters: { 
        excludePaths: ['/favicon.ico', '/health'], 
        excludeStaticFiles: true,
        minDuration: 0 
      },
      dashboard: { enabled: true, port: 3333 }
    };

    let fileConfig = {};
    try {
      if (fs.existsSync('./vlogger.config.json')) {
        fileConfig = JSON.parse(fs.readFileSync('./vlogger.config.json', 'utf8'));
      }
    } catch (error) {
      console.warn('[VLogger] Warning: Could not load vlogger.config.json');
    }

    return this.deepMerge(defaultConfig, fileConfig, providedConfig || {});
  }

  /**
   * Load project information
   */
  loadProjectInfo() {
    const defaultInfo = {
      name: 'Node.js Project',
      version: '1.5.12',
      description: 'Node.js application with VLogger',
      api: { version: '1.0', baseUrl: 'http://localhost:3000' }
    };

    try {
      if (fs.existsSync('./vlogger.info')) {
        return { ...defaultInfo, ...JSON.parse(fs.readFileSync('./vlogger.info', 'utf8')) };
      }
      if (fs.existsSync('./package.json')) {
        const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        return {
          ...defaultInfo,
          name: pkg.name || defaultInfo.name,
          version: pkg.version || defaultInfo.version,
          description: pkg.description || defaultInfo.description,
          author: pkg.author || ''
        };
      }
    } catch (error) {
      console.warn('[VLogger] Warning: Could not load project info');
    }

    return defaultInfo;
  }

  /**
   * Express/Connect middleware
   * @returns {Function} Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      if (this.shouldSkipRequest(req)) {
        return next();
      }

      const startTime = Date.now();
      const logEntry = this.createLogEntry(req, startTime);

      this.interceptResponse(res, logEntry, startTime);
      next();
    };
  }

  /**
   * Fastify plugin
   * @returns {Function} Fastify plugin function
   */
  fastifyPlugin() {
    return (fastify, opts, done) => {
      fastify.addHook('onRequest', async (request, reply) => {
        if (this.shouldSkipRequest(request)) return;

        const startTime = Date.now();
        request.vloggerStart = startTime;
        request.vloggerEntry = this.createLogEntry(request, startTime);
      });

      fastify.addHook('onSend', async (request, reply, payload) => {
        if (request.vloggerEntry) {
          this.captureFastifyResponse(request.vloggerEntry, request, reply, payload);
        }
        return payload;
      });

      done();
    };
  }

  /**
   * Koa middleware
   * @returns {Function} Koa middleware function
   */
  koaMiddleware() {
    return async (ctx, next) => {
      if (this.shouldSkipRequest(ctx.request)) {
        return await next();
      }

      const startTime = Date.now();
      const logEntry = this.createLogEntry(ctx.request, startTime);

      await next();

      this.captureKoaResponse(logEntry, ctx, startTime);
    };
  }

  /**
   * Next.js middleware (for API routes)
   * @returns {Function} Next.js middleware function
   */
  nextjsMiddleware() {
    return (handler) => {
      return async (req, res) => {
        if (this.shouldSkipRequest(req)) {
          return handler(req, res);
        }

        const startTime = Date.now();
        const logEntry = this.createLogEntry(req, startTime);

        this.interceptResponse(res, logEntry, startTime);
        return handler(req, res);
      };
    };
  }

  /**
   * Raw HTTP server wrapper
   * @param {Function} originalHandler - Original request handler
   * @returns {Function} Wrapped request handler
   */
  httpServerWrapper(originalHandler) {
    return (req, res) => {
      if (this.shouldSkipRequest(req)) {
        return originalHandler(req, res);
      }

      const startTime = Date.now();
      const logEntry = this.createLogEntry(req, startTime);

      this.interceptResponse(res, logEntry, startTime);
      return originalHandler(req, res);
    };
  }

  /**
   * Check if request should be skipped
   */
  shouldSkipRequest(req) {
    const path = req.path || req.url || '';
    
    if (this.config.filters.excludePaths.includes(path)) {
      return true;
    }

    if (this.config.filters.excludeStaticFiles) {
      const staticExtensions = ['.js', '.css', '.png', '.jpg', '.ico', '.svg', '.woff'];
      if (staticExtensions.some(ext => path.endsWith(ext))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create log entry from request
   */
  createLogEntry(req, startTime) {
    return {
      id: `${startTime}-${createHash('md5').update((req.url || '') + (req.method || '') + Math.random()).digest('hex').substring(0, 8)}`,
      timestamp: new Date(startTime).toISOString(),
      method: req.method,
      path: req.path || req.url,
      fullUrl: this.getFullUrl(req),
      query: this.sanitizeObject(req.query || {}, this.config.sanitize.queryParams),
      headers: this.sanitizeObject(req.headers || {}, this.config.sanitize.headers),
      body: this.sanitizeObject(req.body, this.config.sanitize.bodyFields),
      ip: this.getClientIP(req),
      response: null,
      performance: { startTime, duration: 0, memory: process.memoryUsage().heapUsed / 1024 / 1024 },
      isError: false,
      error: null
    };
  }

  /**
   * Get full URL from request
   */
  getFullUrl(req) {
    if (req.protocol && req.get) {
      return `${req.protocol}://${req.get('Host')}${req.originalUrl || req.url}`;
    }
    return req.url || '';
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           'unknown';
  }

  /**
   * Intercept Express response
   */
  interceptResponse(res, logEntry, startTime) {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    res.send = (data) => {
      this.captureResponse(logEntry, res, data, startTime);
      return originalSend.call(res, data);
    };

    res.json = (data) => {
      this.captureResponse(logEntry, res, data, startTime);
      return originalJson.call(res, data);
    };

    res.end = (data) => {
      if (!logEntry.response) {
        this.captureResponse(logEntry, res, data, startTime);
      }
      return originalEnd.call(res, data);
    };
  }

  /**
   * Capture Fastify response
   */
  captureFastifyResponse(logEntry, request, reply, payload) {
    const duration = Date.now() - logEntry.performance.startTime;
    
    logEntry.response = {
      status: reply.statusCode,
      statusText: reply.statusMessage || '',
      headers: this.sanitizeObject(reply.getHeaders(), this.config.sanitize.headers),
      body: this.sanitizeResponseBody(payload),
      duration: duration,
      size: Buffer.byteLength(JSON.stringify(payload || ''), 'utf8')
    };

    logEntry.performance.duration = duration;
    logEntry.isError = reply.statusCode >= 400;

    if (this.shouldLogEntry(logEntry)) {
      this.saveLog(logEntry);
      this.updateStats(logEntry);
    }
  }

  /**
   * Capture Koa response
   */
  captureKoaResponse(logEntry, ctx, startTime) {
    const duration = Date.now() - startTime;
    
    logEntry.response = {
      status: ctx.status,
      statusText: ctx.message || '',
      headers: this.sanitizeObject(ctx.response.headers, this.config.sanitize.headers),
      body: this.sanitizeResponseBody(ctx.body),
      duration: duration,
      size: Buffer.byteLength(JSON.stringify(ctx.body || ''), 'utf8')
    };

    logEntry.performance.duration = duration;
    logEntry.isError = ctx.status >= 400;

    if (this.shouldLogEntry(logEntry)) {
      this.saveLog(logEntry);
      this.updateStats(logEntry);
    }
  }

  /**
   * Capture standard response
   */
  captureResponse(logEntry, res, data, startTime) {
    if (logEntry.response) return;

    const duration = Date.now() - startTime;

    logEntry.response = {
      status: res.statusCode,
      statusText: res.statusMessage || '',
      headers: this.sanitizeObject(res.getHeaders ? res.getHeaders() : {}, this.config.sanitize.headers),
      body: this.sanitizeResponseBody(data),
      duration: duration,
      size: Buffer.byteLength(JSON.stringify(data || ''), 'utf8')
    };

    logEntry.performance.duration = duration;
    logEntry.performance.memory = process.memoryUsage().heapUsed / 1024 / 1024;
    logEntry.isError = res.statusCode >= 400;

    if (this.shouldLogEntry(logEntry)) {
      this.saveLog(logEntry);
      this.updateStats(logEntry);
    }
  }

  /**
   * Check if log entry should be saved
   */
  shouldLogEntry(logEntry) {
    if (this.config.filters.captureOnlyErrors && !logEntry.isError) {
      return false;
    }
    if (logEntry.performance.duration < this.config.filters.minDuration) {
      return false;
    }
    return true;
  }

  /**
   * Sanitize object by replacing sensitive fields
   */
  sanitizeObject(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    sensitiveFields.forEach(field => {
      const lowerField = field.toLowerCase();
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes(lowerField)) {
          sanitized[key] = '[REDACTED]';
        }
      });
    });
    return sanitized;
  }

  /**
   * Sanitize response body
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
      // Not JSON, return as is
    }
    
    return body;
  }

  /**
   * Save log entry to file
   */
  saveLog(logEntry) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `vlogger-${today}.json`;
      const filepath = path.join(this.config.storage.path, filename);

      let logs = [];
      if (fs.existsSync(filepath)) {
        try {
          logs = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
          logs = [];
        }
      }

      logs.push(logEntry);
      fs.writeFileSync(filepath, JSON.stringify(logs, null, 2));

      this.checkFileRotation(filepath);
    } catch (error) {
      console.error('[VLogger] Error saving log:', error.message);
    }
  }

  /**
   * Update statistics
   */
  updateStats(logEntry) {
    this.stats.totalRequests++;

    if (logEntry.isError) {
      this.stats.totalErrors++;
    }

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

    const status = logEntry.response.status;
    endpoint.statusCodes[status] = (endpoint.statusCodes[status] || 0) + 1;
  }

  /**
   * Deep merge utility
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
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logDir = this.config.storage.path;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Check file rotation
   */
  checkFileRotation(filepath) {
    try {
      const stats = fs.statSync(filepath);
      if (stats.size > this.config.storage.maxFileSize) {
        const timestamp = Date.now();
        const ext = path.extname(filepath);
        const basename = path.basename(filepath, ext);
        const dirname = path.dirname(filepath);
        const newPath = path.join(dirname, `${basename}-${timestamp}${ext}`);

        fs.renameSync(filepath, newPath);
        this.cleanOldFiles();
      }
    } catch (error) {
      console.error('[VLogger] Error checking file rotation:', error.message);
    }
  }

  /**
   * Clean old files
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
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > this.config.storage.maxFiles) {
        files.slice(this.config.storage.maxFiles).forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('[VLogger] Error cleaning old files:', error.message);
    }
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
      console.log(`[VLogger] Dashboard available at http://localhost:${port}`);
    });
  }

  /**
   * Handle dashboard requests
   */
  handleDashboardRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');

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
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }

  /**
   * Serve dashboard HTML
   */
  serveDashboardHTML(res) {
    try {
      const dashboardPath = path.join(__dirname, '../../dashboard/index.html');
      if (fs.existsSync(dashboardPath)) {
        const html = fs.readFileSync(dashboardPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.generateFallbackDashboard());
      }
    } catch (error) {
      res.writeHead(500);
      res.end('Error loading dashboard');
    }
  }

  /**
   * Generate fallback dashboard HTML
   */
  generateFallbackDashboard() {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>VLogger Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 24px; }
        .stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2.5em; font-weight: 700; margin: 8px 0; }
        .stat-label { color: #6c757d; font-weight: 500; }
        .logs { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .log-entry { padding: 16px; border-bottom: 1px solid #e9ecef; }
        .log-entry:last-child { border-bottom: none; }
        .log-method { font-weight: 600; color: #495057; }
        .log-path { margin-left: 8px; }
        .log-status { padding: 4px 8px; border-radius: 4px; font-size: 0.9em; font-weight: 500; }
        .status-success { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .log-duration { color: #6c757d; margin-left: 8px; }
        .log-time { color: #adb5bd; font-size: 0.9em; display: block; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 VLogger Dashboard</h1>
            <p>Real-time monitoring for your JavaScript application</p>
        </div>
        
        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-label">Total Requests</div>
                <div class="stat-number" id="total-requests">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Errors</div>
                <div class="stat-number" style="color: #dc3545;" id="total-errors">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Uptime</div>
                <div class="stat-number" style="color: #28a745;" id="uptime">0s</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Endpoints</div>
                <div class="stat-number" style="color: #17a2b8;" id="endpoints">0</div>
            </div>
        </div>
        
        <div class="logs">
            <h2>Recent Requests</h2>
            <div id="logs">
                <p style="color: #6c757d; text-align: center; padding: 40px;">No requests logged yet...</p>
            </div>
        </div>
    </div>
    
    <script>
        function formatDuration(ms) {
            if (ms < 1000) return ms + 'ms';
            if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
            return (ms / 60000).toFixed(1) + 'm';
        }
        
        function loadStats() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('total-requests').textContent = data.totalRequests;
                    document.getElementById('total-errors').textContent = data.totalErrors;
                    document.getElementById('uptime').textContent = formatDuration(Date.now() - new Date(data.startedAt).getTime());
                    document.getElementById('endpoints').textContent = data.endpoints.length;
                })
                .catch(console.error);
        }
        
        function loadLogs() {
            fetch('/api/logs')
                .then(r => r.json())
                .then(data => {
                    const logsDiv = document.getElementById('logs');
                    if (data.length === 0) {
                        logsDiv.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 40px;">No requests logged yet...</p>';
                        return;
                    }
                    
                    logsDiv.innerHTML = data.map(log => \`
                        <div class="log-entry">
                            <div>
                                <span class="log-method">\${log.method}</span>
                                <span class="log-path">\${log.path}</span>
                                <span class="log-status \${log.isError ? 'status-error' : 'status-success'}">\${log.response?.status || 'N/A'}</span>
                                <span class="log-duration">(\${log.performance?.duration || 0}ms)</span>
                            </div>
                            <small class="log-time">\${new Date(log.timestamp).toLocaleString()}</small>
                        </div>
                    \`).join('');
                })
                .catch(console.error);
        }
        
        loadStats();
        loadLogs();
        setInterval(loadStats, 5000);
        setInterval(loadLogs, 10000);
    </script>
</body>
</html>`;
  }

  /**
   * Serve stats API
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
   * Serve logs API
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
      
      const recentLogs = logs.slice(-50).reverse();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(recentLogs, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load logs' }));
    }
  }

  /**
   * Serve project info API
   */
  serveProjectInfo(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.projectInfo, null, 2));
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanOldFiles();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Stop VLogger
   */
  stop() {
    if (this.dashboardServer) {
      this.dashboardServer.close();
    }
  }
}

module.exports = VLogger;