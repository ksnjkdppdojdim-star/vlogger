#!/usr/bin/env node

/**
 * VLogger CLI Tool - Universal project management for VLogger
 * 
 * @author Jules Mahounou  
 * @version 1.0.0
 * 
 * Global CLI tool for managing VLogger across different projects and languages.
 * 
 * Usage:
 * vlg init         - Initialize new project with install.vlg
 * vlg install      - Install VLogger adapter for current project
 * vlg start        - Start application with VLogger
 * vlg dashboard    - Open VLogger dashboard
 * vlg clean        - Clean old log files
 * vlg config       - Show/edit configuration
 * vlg version      - Show version information
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

const VLOGGER_VERSION = '1.0.0';
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main';

/**
 * VLogger CLI class
 */
class VLoggerCLI {
  constructor() {
    this.command = process.argv[2];
    this.args = process.argv.slice(3);
    this.cwd = process.cwd();
  }

  /**
   * Main entry point
   */
  run() {
    switch (this.command) {
      case 'init':
        this.initProject();
        break;
      case 'install':
        this.installVLogger();
        break;
      case 'start':
        this.startApplication();
        break;
      case 'dashboard':
        this.openDashboard();
        break;
      case 'clean':
        this.cleanLogs();
        break;
      case 'config':
        this.showConfig();
        break;
      case 'export':
        this.exportLogs();
        break;
      case 'version':
        this.showVersion();
        break;
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }

  /**
   * Initialize new VLogger project
   */
  initProject() {
    console.log('🚀 Initializing VLogger project...\n');

    // Detect project language
    const language = this.detectProjectLanguage();
    console.log(`📋 Detected language: ${language}`);

    // Create install.vlg file
    const installConfig = this.createInstallConfig(language);
    this.writeFile('install.vlg', JSON.stringify(installConfig, null, 2));
    console.log('✅ Created install.vlg');

    // Create vlogger.config.json
    const vloggerConfig = this.createVLoggerConfig();
    this.writeFile('vlogger.config.json', JSON.stringify(vloggerConfig, null, 2));
    console.log('✅ Created vlogger.config.json');

    // Create vlogger.info
    const projectInfo = this.createProjectInfo();
    this.writeFile('vlogger.info', JSON.stringify(projectInfo, null, 2));
    console.log('✅ Created vlogger.info');

    console.log('\n🎉 VLogger project initialized!');
    console.log('\nNext steps:');
    console.log('1. Edit install.vlg to configure your project');
    console.log('2. Run: vlg install');
    console.log('3. Integrate VLogger in your application code');
    console.log('4. Run: vlg start or vlg dashboard');
  }

  /**
   * Detect project programming language
   */
  detectProjectLanguage() {
    // Check for package.json (Node.js)
    if (fs.existsSync(path.join(this.cwd, 'package.json'))) {
      return 'javascript';
    }

    // Check for composer.json (PHP)
    if (fs.existsSync(path.join(this.cwd, 'composer.json'))) {
      return 'php';
    }

    // Check for requirements.txt or setup.py (Python)
    if (fs.existsSync(path.join(this.cwd, 'requirements.txt')) || 
        fs.existsSync(path.join(this.cwd, 'setup.py')) ||
        fs.existsSync(path.join(this.cwd, 'pyproject.toml'))) {
      return 'python';
    }

    // Check for pom.xml or build.gradle (Java)
    if (fs.existsSync(path.join(this.cwd, 'pom.xml')) || 
        fs.existsSync(path.join(this.cwd, 'build.gradle'))) {
      return 'java';
    }

    // Check for go.mod (Go)
    if (fs.existsSync(path.join(this.cwd, 'go.mod'))) {
      return 'go';
    }

    // Check for Cargo.toml (Rust)
    if (fs.existsSync(path.join(this.cwd, 'Cargo.toml'))) {
      return 'rust';
    }

    // Default to JavaScript
    return 'javascript';
  }

  /**
   * Create install.vlg configuration
   */
  createInstallConfig(language) {
    const projectName = path.basename(this.cwd);
    
    return {
      name: projectName,
      language: language,
      version: "1.0.0",
      description: `${projectName} - VLogger enabled project`,
      vlogger: {
        version: `^${VLOGGER_VERSION}`,
        adapter: `adapters/${language}/vlogger.${this.getLanguageExtension(language)}`,
        config: {
          dashboard: {
            enabled: true,
            port: 3333,
            openBrowser: false
          },
          storage: {
            path: "./logs",
            maxFiles: 10,
            maxFileSize: "10MB"
          },
          capture: {
            requests: true,
            responses: true,
            headers: true,
            body: true,
            performance: true
          },
          sanitize: {
            enabled: true,
            headers: ["authorization", "cookie", "x-api-key"],
            bodyFields: ["password", "token", "secret"],
            queryParams: ["api_key", "token"]
          },
          filters: {
            excludePaths: ["/favicon.ico", "/health", "/ping"],
            excludeStaticFiles: true,
            minDuration: 0,
            captureOnlyErrors: false
          }
        }
      }
    };
  }

  /**
   * Get file extension for language
   */
  getLanguageExtension(language) {
    const extensions = {
      'javascript': 'js',
      'php': 'php',
      'python': 'py',
      'java': 'java',
      'go': 'go',
      'rust': 'rs'
    };
    return extensions[language] || 'js';
  }

  /**
   * Create VLogger configuration
   */
  createVLoggerConfig() {
    return {
      mode: "development",
      storage: {
        type: "file",
        path: "./logs",
        maxFileSize: 10485760,
        maxFiles: 10,
        format: "json"
      },
      capture: {
        requests: true,
        responses: true,
        headers: true,
        queryParams: true,
        body: true,
        performance: true,
        errors: true
      },
      sanitize: {
        headers: ["authorization", "cookie", "x-api-key", "x-auth-token"],
        bodyFields: ["password", "token", "secret", "key", "pass"],
        queryParams: ["api_key", "token", "password"]
      },
      filters: {
        excludePaths: ["/favicon.ico", "/health", "/ping"],
        excludeStaticFiles: true,
        minDuration: 0,
        captureOnlyErrors: false
      },
      dashboard: {
        enabled: true,
        port: 3333,
        openBrowser: false
      },
      debug: false
    };
  }

  /**
   * Create project info
   */
  createProjectInfo() {
    const projectName = path.basename(this.cwd);
    
    return {
      name: projectName,
      version: "1.0.0",
      description: `${projectName} API`,
      author: "",
      email: "",
      license: "MIT",
      links: {
        repository: "",
        documentation: "",
        homepage: ""
      },
      team: {},
      api: {
        version: "1.0",
        baseUrl: "http://localhost:3000",
        description: `${projectName} API endpoints`
      }
    };
  }

  /**
   * Install VLogger adapter based on install.vlg
   */
  installVLogger() {
    console.log('📦 Installing VLogger...\n');

    // Check if install.vlg exists
    if (!fs.existsSync('install.vlg')) {
      console.error('❌ No install.vlg found. Run "vlg init" first.');
      process.exit(1);
    }

    // Parse install.vlg
    const installConfig = JSON.parse(fs.readFileSync('install.vlg', 'utf8'));
    const language = installConfig.language;
    const adapter = installConfig.vlogger.adapter;

    console.log(`🔧 Installing ${language} adapter...`);

    // Download adapter file
    this.downloadAdapter(language, adapter);

    // Copy additional files if needed
    this.copyAdditionalFiles(language);

    console.log('\n✅ VLogger installed successfully!');
    console.log('\nIntegration instructions:');
    this.showIntegrationInstructions(language);
  }

  /**
   * Télécharge un fichier depuis GitHub (ou autre URL)
   * @param {string} url - URL du fichier raw
   * @param {string} dest - chemin local de destination
   */
  downloadFile(url, dest) {
    const fs = require('fs');
    const { execSync } = require('child_process');
    const https = require('https');

    if (this.hasCommand('curl')) {
      // Utilise curl si disponible
      try {
        execSync(`curl -s -L "${url}" -o "${dest}"`, { stdio: 'inherit' });
        console.log(`✅ Downloaded ${dest}`);
        return;
      } catch (error) {
        console.warn(`⚠️ curl failed: ${error.message}, fallback to Node HTTPS`);
      }
    }

    // Node HTTPS fallback
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error(`❌ Failed to download ${url} (status: ${res.statusCode})`);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded ${dest}`);
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      console.error(`❌ Download error: ${err.message}`);
    });
  }


  /**
   * Download adapter from GitHub
   */
  downloadAdapter(language, adapterPath) {
    const fileName = path.basename(adapterPath);
    const url = `${GITHUB_BASE_URL}/${adapterPath}`;
    
    console.log(`📥 Downloading ${fileName}...`);
    this.downloadFile(url, fileName);
  }


  /**
   * Copy additional required files
   */
  copyAdditionalFiles(language) {
    this.ensureDirectory('dashboard');
    
    const dashboardFiles = ['index.html', 'style.css', 'script.js'];
    dashboardFiles.forEach(file => {
      const url = `${GITHUB_BASE_URL}/dashboard/${file}`;
      const localPath = `dashboard/${file}`;
      
      console.log(`📥 Downloading dashboard/${file}...`);
      this.downloadFile(url, localPath);
    });
  }


  /**
   * Check if command exists
   */
  hasCommand(command) {
    try {
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Show integration instructions for language
   */
  showIntegrationInstructions(language) {
    const instructions = {
      javascript: `
📋 JavaScript/Node.js Integration:

1. In your main app file (app.js/server.js):

   const VLogger = require('./vlogger');
   const express = require('express');
   
   const app = express();
   
   // Initialize VLogger
   const logger = new VLogger();
   app.use(logger.middleware());
   
   // Your routes here...
   
   app.listen(3000, () => {
     console.log('Server running on port 3000');
   });

2. Start your application: node app.js
3. Dashboard: http://localhost:3333
`,

      php: `
📋 PHP Integration:

1. Include VLogger in your main file:

   <?php
   require_once 'vlogger.php';
   
   $logger = new VLogger();
   $logger->init();
   
   // For frameworks, integrate as middleware
   // For vanilla PHP, call logRequest manually
   ?>

2. For Laravel: Add to middleware
3. For Symfony: Add to event listeners
`,

      python: `
📋 Python Integration:

1. Import and use VLogger:

   from vlogger import VLogger
   
   logger = VLogger()
   
   # Flask
   from flask import Flask
   app = Flask(__name__)
   app.wsgi_app = logger.middleware(app.wsgi_app)
   
   # Django: Add to MIDDLEWARE in settings.py
   
2. Start your application normally
`,

      java: `
📋 Java Integration:

1. Add VLogger to your project:

   import vlogger.VLogger;
   
   @Component
   public class VLoggerConfig {
       @Bean
       public VLogger vlogger() {
           return new VLogger();
       }
   }

2. For Spring Boot: Auto-configuration included
`,

      go: `
📋 Go Integration:

1. Import and use VLogger:

   import "./vlogger"
   
   func main() {
       logger := vlogger.New()
       
       // For Gin
       r := gin.Default()
       r.Use(logger.Middleware())
       
       r.Run(":8080")
   }
`
    };

    console.log(instructions[language] || 'Please check documentation for integration instructions.');
  }

  /**
   * Start application with VLogger
   * Usage:
   *   npx vlg start           -> auto détecte le fichier principal
   *   npx vlg start app.js    -> utilise app.js comme point d'entrée
   */
  startApplication() {
    console.log('🚀 Starting application with VLogger...\n');

    // Check install.vlg exists
    if (!fs.existsSync('install.vlg')) {
      console.error('❌ No install.vlg found. Run "vlg init" first.');
      return;
    }

    const config = JSON.parse(fs.readFileSync('install.vlg', 'utf8'));
    const language = config.language;

    // Récupère le fichier principal passé en argument (ex: `npx vlg start app.js`)
    const entryFile = this.args[0]; 

    let command;

    switch (language) {
      case 'javascript':
        if (entryFile && fs.existsSync(entryFile)) {
          command = `node ${entryFile}`;
        } else {
          command = this.findNodeStartCommand();
        }
        break;

      case 'php':
        command = 'php -S localhost:8000';
        break;

      case 'python':
        if (entryFile && fs.existsSync(entryFile)) {
          command = `python ${entryFile}`;
        } else {
          command = this.findPythonStartCommand();
        }
        break;

      case 'java':
        command = 'mvn spring-boot:run';
        break;

      case 'go':
        command = 'go run .';
        break;

      default:
        console.error(`❌ No start command configured for language: ${language}`);
        return;
    }

    if (!command) {
      console.error('❌ Could not determine start command.');
      return;
    }

    console.log(`▶️  Starting ${language} application: ${command}`);
    spawn(command, { shell: true, stdio: 'inherit' });
  }


  /**
   * Find Node.js start command
   */
  findNodeStartCommand() {
    if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (pkg.scripts && pkg.scripts.start) {
        return 'npm start';
      }
      if (pkg.main) {
        return `node ${pkg.main}`;
      }
    }
    
    // Common entry points
    const entryPoints = ['app.js', 'server.js', 'index.js', 'main.js'];
    for (const entry of entryPoints) {
      if (fs.existsSync(entry)) {
        return `node ${entry}`;
      }
    }
    
    return 'node app.js';
  }

  /**
   * Find Python start command
   */
  findPythonStartCommand() {
    // Check for Django
    if (fs.existsSync('manage.py')) {
      return 'python manage.py runserver';
    }
    
    // Check for Flask
    const flaskFiles = ['app.py', 'main.py', 'run.py'];
    for (const file of flaskFiles) {
      if (fs.existsSync(file)) {
        return `python ${file}`;
      }
    }
    
    return 'python app.py';
  }

  /**
   * Open VLogger dashboard
   */
  openDashboard() {
    console.log('🌐 Opening VLogger dashboard...\n');

    // Check if dashboard is running
    const port = this.getDashboardPort();
    
    this.checkDashboardStatus(port)
      .then(isRunning => {
        if (isRunning) {
          console.log(`✅ Dashboard is running on http://localhost:${port}`);
          this.openBrowser(`http://localhost:${port}`);
        } else {
          console.log('⚠️  Dashboard is not running.');
          console.log('Start your application with VLogger enabled or run: vlg start');
        }
      });
  }

  /**
   * Get dashboard port from config
   */
  getDashboardPort() {
    try {
      if (fs.existsSync('vlogger.config.json')) {
        const config = JSON.parse(fs.readFileSync('vlogger.config.json', 'utf8'));
        return config.dashboard?.port || 3333;
      }
    } catch (error) {
      // Ignore
    }
    return 3333;
  }

  /**
   * Check if dashboard is running
   */
  checkDashboardStatus(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve(true);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(1000, () => {
        req.abort();
        resolve(false);
      });
    });
  }

  /**
   * Clean old log files
   */
  cleanLogs() {
    console.log('🧹 Cleaning old log files...\n');

    const logsDir = this.getLogsDirectory();
    
    if (!fs.existsSync(logsDir)) {
      console.log('📁 No logs directory found.');
      return;
    }

    try {
      const files = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('vlogger-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(logsDir, file),
          size: fs.statSync(path.join(logsDir, file)).size,
          mtime: fs.statSync(path.join(logsDir, file)).mtime
        }));

      if (files.length === 0) {
        console.log('📄 No log files found.');
        return;
      }

      console.log(`📊 Found ${files.length} log files:`);
      
      let totalSize = 0;
      files.forEach(file => {
        const sizeKB = Math.round(file.size / 1024);
        console.log(`   ${file.name} (${sizeKB} KB) - ${file.mtime.toISOString().split('T')[0]}`);
        totalSize += file.size;
      });

      console.log(`\n📈 Total size: ${Math.round(totalSize / 1024)} KB`);

      // Interactive cleanup
      if (this.args.includes('--all')) {
        files.forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`🗑️  Deleted ${file.name}`);
        });
        console.log('\n✅ All log files deleted.');
      } else {
        console.log('\nTo delete all logs: vlg clean --all');
        console.log('To delete specific files manually: rm logs/vlogger-*.json');
      }

    } catch (error) {
      console.error('❌ Error cleaning logs:', error.message);
    }
  }

  /**
   * Get logs directory path
   */
  getLogsDirectory() {
    try {
      if (fs.existsSync('vlogger.config.json')) {
        const config = JSON.parse(fs.readFileSync('vlogger.config.json', 'utf8'));
        return config.storage?.path || './logs';
      }
    } catch (error) {
      // Ignore
    }
    return './logs';
  }

  /**
   * Show current configuration
   */
  showConfig() {
    console.log('⚙️  VLogger Configuration\n');

    // Show install.vlg
    if (fs.existsSync('install.vlg')) {
      console.log('📄 install.vlg:');
      const config = JSON.parse(fs.readFileSync('install.vlg', 'utf8'));
      console.log(JSON.stringify(config, null, 2));
      console.log('');
    }

    // Show vlogger.config.json
    if (fs.existsSync('vlogger.config.json')) {
      console.log('📄 vlogger.config.json:');
      const config = JSON.parse(fs.readFileSync('vlogger.config.json', 'utf8'));
      console.log(JSON.stringify(config, null, 2));
      console.log('');
    }

    // Show vlogger.info
    if (fs.existsSync('vlogger.info')) {
      console.log('📄 vlogger.info:');
      const info = JSON.parse(fs.readFileSync('vlogger.info', 'utf8'));
      console.log(JSON.stringify(info, null, 2));
    }

    if (!fs.existsSync('install.vlg') && !fs.existsSync('vlogger.config.json')) {
      console.log('❌ No VLogger configuration found.');
      console.log('Run "vlg init" to initialize a VLogger project.');
    }
  }

  /**
   * Export logs to different formats
   */
  exportLogs() {
    const format = this.args[0] || 'json';
    const outputFile = this.args[1] || `vlogger-export-${Date.now()}.${format}`;

    console.log(`📤 Exporting logs to ${format.toUpperCase()} format...\n`);

    const logsDir = this.getLogsDirectory();
    
    if (!fs.existsSync(logsDir)) {
      console.error('❌ No logs directory found.');
      return;
    }

    try {
      // Collect all log files
      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('vlogger-') && file.endsWith('.json'))
        .sort();

      if (logFiles.length === 0) {
        console.error('❌ No log files found.');
        return;
      }

      let allLogs = [];
      logFiles.forEach(file => {
        const filePath = path.join(logsDir, file);
        const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        allLogs = allLogs.concat(logs);
      });

      console.log(`📊 Found ${allLogs.length} log entries from ${logFiles.length} files`);

      // Export in requested format
      switch (format.toLowerCase()) {
        case 'json':
          this.exportToJSON(allLogs, outputFile);
          break;
        case 'csv':
          this.exportToCSV(allLogs, outputFile);
          break;
        case 'markdown':
        case 'md':
          this.exportToMarkdown(allLogs, outputFile);
          break;
        default:
          console.error(`❌ Unsupported format: ${format}`);
          console.log('Supported formats: json, csv, markdown');
          return;
      }

      console.log(`\n✅ Exported to ${outputFile}`);

    } catch (error) {
      console.error('❌ Error exporting logs:', error.message);
    }
  }

  /**
   * Export to JSON format
   */
  exportToJSON(logs, outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(logs, null, 2));
  }

  /**
   * Export to CSV format
   */
  exportToCSV(logs, outputFile) {
    const headers = ['timestamp', 'method', 'path', 'status', 'duration', 'isError', 'ip'];
    let csv = headers.join(',') + '\n';

    logs.forEach(log => {
      const row = [
        log.timestamp,
        log.method,
        log.path,
        log.response?.status || '',
        log.performance?.duration || '',
        log.isError,
        log.ip
      ];
      csv += row.join(',') + '\n';
    });

    fs.writeFileSync(outputFile, csv);
  }

  /**
   * Export to Markdown format
   */
  exportToMarkdown(logs, outputFile) {
    let md = `# VLogger Export Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Total Requests:** ${logs.length}\n\n`;

    // Summary stats
    const errors = logs.filter(log => log.isError).length;
    const avgDuration = logs.reduce((sum, log) => sum + (log.performance?.duration || 0), 0) / logs.length;
    
    md += `## Summary\n\n`;
    md += `- **Total Requests:** ${logs.length}\n`;
    md += `- **Errors:** ${errors} (${((errors/logs.length)*100).toFixed(1)}%)\n`;
    md += `- **Average Response Time:** ${Math.round(avgDuration)}ms\n\n`;

    // Endpoint stats
    const endpointStats = {};
    logs.forEach(log => {
      const key = `${log.method} ${log.path}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { calls: 0, errors: 0, totalDuration: 0 };
      }
      endpointStats[key].calls++;
      if (log.isError) endpointStats[key].errors++;
      endpointStats[key].totalDuration += log.performance?.duration || 0;
    });

    md += `## Top Endpoints\n\n`;
    md += `| Endpoint | Calls | Errors | Avg Duration |\n`;
    md += `|----------|-------|--------|-------------|\n`;
    
    Object.entries(endpointStats)
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 10)
      .forEach(([endpoint, stats]) => {
        const avgDur = Math.round(stats.totalDuration / stats.calls);
        md += `| ${endpoint} | ${stats.calls} | ${stats.errors} | ${avgDur}ms |\n`;
      });

    md += `\n## Recent Logs\n\n`;
    logs.slice(-20).forEach(log => {
      md += `### ${log.method} ${log.path}\n`;
      md += `- **Time:** ${log.timestamp}\n`;
      md += `- **Status:** ${log.response?.status || 'N/A'}\n`;
      md += `- **Duration:** ${log.performance?.duration || 0}ms\n`;
      if (log.isError) {
        md += `- **Error:** Yes\n`;
      }
      md += `\n`;
    });

    fs.writeFileSync(outputFile, md);
  }

  /**
   * Show version information
   */
  showVersion() {
    console.log(`VLogger CLI v${VLOGGER_VERSION}`);
    console.log('Universal Multi-Language Logging System');
    console.log('');
    console.log('Node.js version:', process.version);
    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('🚀 VLogger CLI - Universal Multi-Language Logging System\n');
    console.log('Usage: vlg <command> [options]\n');
    
    console.log('Commands:');
    console.log('  init                    Initialize new VLogger project');
    console.log('  install                 Install VLogger adapter for current project');
    console.log('  start                   Start application with VLogger');
    console.log('  dashboard               Open VLogger dashboard');
    console.log('  clean [--all]           Clean old log files');
    console.log('  export <format> [file]  Export logs (json|csv|markdown)');
    console.log('  config                  Show current configuration');
    console.log('  version                 Show version information');
    console.log('  help                    Show this help message');
    
    console.log('\nExamples:');
    console.log('  vlg init                # Initialize new project');
    console.log('  vlg install             # Install VLogger');
    console.log('  vlg start               # Start application');
    console.log('  vlg dashboard           # Open dashboard');
    console.log('  vlg export csv          # Export logs to CSV');
    console.log('  vlg clean --all         # Delete all log files');
    
    console.log('\nFor more information, visit:');
    console.log('  https://github.com/ksnjkdppdojdim-star/vlogger');
  }

  /**
   * Write file with error handling
   */
  writeFile(filename, content) {
    try {
      fs.writeFileSync(filename, content, 'utf8');
    } catch (error) {
      console.error(`❌ Error writing ${filename}:`, error.message);
      process.exit(1);
    }
  }

  /**
   * Ensure directory exists
   */
  ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Open browser (platform-independent)
   */
  openBrowser(url) {
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
    try {
      execSync(`${start} ${url}`, { stdio: 'ignore' });
    } catch (error) {
      console.log(`Please open: ${url}`);
    }
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new VLoggerCLI();
  cli.run();
}

module.exports = VLoggerCLI;