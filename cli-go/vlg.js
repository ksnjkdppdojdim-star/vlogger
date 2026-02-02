#!/usr/bin/env node

/**
 * VLogger CLI Tool - Version Go (convertie en Node.js)
 * Exécutable universel sans dépendances externes
 * 
 * @author Jules Mahounou
 * @version 1.5.12
 * 
 * Cet outil peut être distribué comme:
 * 1. Exécutable compilé Go (vlg.exe, vlg)
 * 2. Script Node.js avec shebang (compatible si Node installé)
 * 3. Ou empaquetage avec pkg pour créer un binaire standalone
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const VLOGGER_VERSION = '1.5.12';
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main';

class VLoggerCLI {
  constructor() {
    this.cwd = process.cwd();
    this.command = process.argv[2];
    this.args = process.argv.slice(3);
  }

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
      case 'version':
        this.showVersion();
        break;
      case 'help':
      case '':
      default:
        this.showHelp();
        break;
    }
  }

  initProject() {
    console.log('🚀 Initialisation du projet VLogger...\n');

    const language = this.detectProjectLanguage();
    console.log(`📋 Langage détecté: ${language}`);

    if (!this.verifyLanguageRequirements(language)) {
      console.error(`❌ Prérequis ${language} non satisfaits. Exécutez 'vlg doctor' pour plus de détails.`);
      process.exit(1);
    }

    const installConfig = this.createInstallConfig(language);
    this.writeFile('install.vlg', JSON.stringify(installConfig, null, 2));
    console.log('✅ Créé install.vlg');

    this.writeFile('vlogger.config.json', this.createVLoggerConfig());
    console.log('✅ Créé vlogger.config.json');

    this.writeFile('vlogger.info', this.createProjectInfo());
    console.log('✅ Créé vlogger.info');

    console.log('\n🎉 Projet VLogger initialisé!');
    console.log('\nProchaines étapes:');
    console.log('1. Éditez install.vlg pour configurer votre projet');
    console.log('2. Exécutez: vlg install');
    console.log('3. Intégrez VLogger dans le code de votre application');
    console.log('4. Exécutez: vlg start ou vlg dashboard');
  }

  detectProjectLanguage() {
    const scores = {};
    const languages = ['javascript', 'php', 'python', 'java', 'go', 'rust', 'csharp'];
    
    languages.forEach(lang => scores[lang] = 0);

    const configs = {
      javascript: ['package.json', 'yarn.lock', 'pnpm-lock.yaml'],
      php: ['composer.json', 'composer.lock', 'index.php', 'app.php'],
      python: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', 'app.py', 'main.py'],
      java: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'Main.java', 'App.java'],
      go: ['go.mod', 'go.sum', 'main.go'],
      rust: ['Cargo.toml', 'Cargo.lock', 'main.rs'],
      csharp: ['Program.cs']
    };

    for (const [lang, files] of Object.entries(configs)) {
      files.forEach(file => {
        if (fs.existsSync(path.join(this.cwd, file))) {
          scores[lang] += 10;
        }
      });
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'javascript';

    return Object.entries(scores).find(([, score]) => score === maxScore)[0];
  }

  verifyLanguageRequirements(language) {
    const requirements = {
      javascript: ['node --version'],
      php: ['php --version'],
      python: ['python --version', 'python3 --version'],
      java: ['java --version', 'javac --version'],
      go: ['go version'],
      rust: ['rustc --version', 'cargo --version'],
      csharp: ['dotnet --version']
    };

    const reqs = requirements[language] || [];
    for (const req of reqs) {
      try {
        execSync(req, { stdio: 'ignore' });
        return true;
      } catch (e) {
        // continue
      }
    }
    return reqs.length === 0; // Si pas de requirement spécifique, c'est ok
  }

  createInstallConfig(language) {
    const projectName = path.basename(this.cwd);
    const extensions = {
      javascript: 'js',
      php: 'php',
      python: 'py',
      java: 'java',
      go: 'go',
      rust: 'rs',
      csharp: 'cs'
    };

    return {
      name: projectName,
      language: language,
      version: VLOGGER_VERSION,
      description: `${projectName} - Projet VLogger`,
      vlogger: {
        version: `^${VLOGGER_VERSION}`,
        adapter: `adapters/${language}/vlogger.${extensions[language] || 'js'}`,
        config: {
          dashboard: {
            enabled: true,
            port: 3333,
            openBrowser: false
          },
          storage: {
            path: './logs',
            maxFiles: 10,
            maxFileSize: '10MB'
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
            headers: ['authorization', 'cookie', 'x-api-key'],
            bodyFields: ['password', 'token', 'secret'],
            queryParams: ['api_key', 'token']
          },
          filters: {
            excludePaths: ['/favicon.ico', '/health', '/ping'],
            excludeStaticFiles: true,
            minDuration: 0,
            captureOnlyErrors: false
          }
        }
      }
    };
  }

  createVLoggerConfig() {
    return JSON.stringify({
      mode: 'development',
      storage: {
        type: 'file',
        path: './logs',
        maxFileSize: 10485760,
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
        errors: true
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
      dashboard: {
        enabled: true,
        port: 3333,
        openBrowser: false
      },
      debug: false
    }, null, 2);
  }

  createProjectInfo() {
    const projectName = path.basename(this.cwd);
    return JSON.stringify({
      name: projectName,
      version: VLOGGER_VERSION,
      description: `${projectName} API`,
      author: '',
      email: '',
      license: 'MIT',
      links: {
        repository: '',
        documentation: '',
        homepage: ''
      },
      team: {},
      api: {
        version: '1.0',
        baseUrl: 'http://localhost:3000',
        description: `${projectName} API endpoints`
      }
    }, null, 2);
  }

  installVLogger() {
    console.log('📦 Installation de VLogger...\n');

    if (!fs.existsSync('install.vlg')) {
      console.error('❌ Aucun install.vlg trouvé. Exécutez \'vlg init\' d\'abord.');
      process.exit(1);
    }

    const installConfig = JSON.parse(fs.readFileSync('install.vlg', 'utf8'));
    const language = installConfig.language;
    const adapter = installConfig.vlogger.adapter;

    console.log(`🔧 Installation de l'adaptateur ${language}...`);

    if (!this.verifyLanguageRequirements(language)) {
      console.error(`❌ Prérequis ${language} non satisfaits.`);
      process.exit(1);
    }

    this.downloadAdapter(language, adapter);
    this.copyAdditionalFiles(language);

    console.log('\n✅ VLogger installé avec succès!');
    console.log('\nInstructions d\'intégration:');
    this.showIntegrationInstructions(language);
  }

  downloadAdapter(language, adapterPath) {
    const fileName = path.basename(adapterPath);
    const url = `${GITHUB_BASE_URL}/${adapterPath}`;

    console.log(`📥 Téléchargement de ${fileName}...`);

    try {
      const command = `curl -s -L "${url}" -o "${fileName}"`;
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Téléchargé ${fileName}`);
    } catch (error) {
      console.error(`❌ Échec du téléchargement: ${error.message}`);
      console.log('\n🔗 Téléchargement manuel:');
      console.log(`   ${url}`);
      process.exit(1);
    }
  }

  copyAdditionalFiles(language) {
    this.ensureDirectory('dashboard');

    const dashboardFiles = ['index.html', 'style.css', 'script.js'];
    dashboardFiles.forEach(file => {
      const url = `${GITHUB_BASE_URL}/dashboard/${file}`;
      const localPath = path.join('dashboard', file);

      try {
        const command = `curl -s -L "${url}" -o "${localPath}"`;
        execSync(command, { stdio: 'ignore' });
        console.log(`✅ Téléchargé dashboard/${file}`);
      } catch (error) {
        console.warn(`⚠️  Impossible de télécharger ${file}: ${error.message}`);
      }
    });
  }

  showIntegrationInstructions(language) {
    const instructions = {
      javascript: `
📋 Intégration JavaScript/Node.js:

1. Dans votre fichier principal (app.js/server.js):

   const VLogger = require('./vlogger');
   const express = require('express');
   
   const app = express();
   const logger = new VLogger();
   app.use(logger.middleware());
   
   app.listen(3000, () => {
     console.log('Serveur exécuté sur le port 3000');
   });

2. Démarrez votre application: node app.js
3. Tableau de bord: http://localhost:3333
`,
      php: `
📋 Intégration PHP:

1. Incluez VLogger dans votre fichier principal:

   <?php
   require_once 'vlogger.php';
   
   $logger = new VLogger();
   $logger->init();
   ?>

2. Pour Laravel: Ajoutez au middleware
3. Pour Symfony: Ajoutez aux event listeners
`,
      python: `
📋 Intégration Python:

1. Importez et utilisez VLogger:

   from vlogger import VLogger
   
   logger = VLogger()
   
   # Flask
   from flask import Flask
   app = Flask(__name__)
   app.wsgi_app = logger.middleware(app.wsgi_app)
   
   # Django: Ajoutez à MIDDLEWARE dans settings.py

2. Démarrez votre application normalement
`
    };

    console.log(instructions[language] || 'Consultez la documentation pour les instructions d\'intégration.');
  }

  startApplication() {
    console.log('🚀 Démarrage de l\'application avec VLogger...\n');

    if (!fs.existsSync('install.vlg')) {
      console.error('❌ Aucun install.vlg trouvé.');
      return;
    }

    const config = JSON.parse(fs.readFileSync('install.vlg', 'utf8'));
    const language = config.language;

    const startCommands = {
      javascript: ['npm start', 'yarn start', 'node app.js', 'node server.js', 'node index.js'],
      php: ['php -S localhost:8000', 'php artisan serve', 'symfony serve'],
      python: ['python app.py', 'python main.py', 'flask run', 'python manage.py runserver', 'uvicorn main:app'],
      java: ['mvn spring-boot:run', 'gradle bootRun', 'java -jar target/*.jar', 'java Main'],
      go: ['go run main.go', 'go run .', './main'],
      rust: ['cargo run'],
      csharp: ['dotnet run']
    };

    const commands = startCommands[language] || startCommands['javascript'];

    for (const cmd of commands) {
      const parts = cmd.split(' ');
      try {
        console.log(`▶️  Démarrage: ${cmd}`);
        spawn(parts[0], parts.slice(1), { stdio: 'inherit', shell: true });
        return;
      } catch (e) {
        // try next
      }
    }
  }

  openDashboard() {
    console.log('🌐 Ouverture du tableau de bord VLogger...\n');
    console.log('✅ Le tableau de bord devrait être accessible sur http://localhost:3333');

    const url = 'http://localhost:3333';
    const cmd = process.platform === 'win32' ? 'start' :
                process.platform === 'darwin' ? 'open' : 'xdg-open';

    try {
      execSync(`${cmd} ${url}`, { stdio: 'ignore' });
    } catch (e) {
      console.log(`Veuillez ouvrir: ${url}`);
    }
  }

  cleanLogs() {
    console.log('🧹 Nettoyage des anciens fichiers journaux...\n');

    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
      console.log('📁 Aucun répertoire de journaux trouvé.');
      return;
    }

    const files = fs.readdirSync(logsDir)
      .filter(f => f.startsWith('vlogger-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(logsDir, f),
        size: fs.statSync(path.join(logsDir, f)).size
      }));

    if (files.length === 0) {
      console.log('📄 Aucun fichier journaux trouvé.');
      return;
    }

    console.log(`📊 Trouvé ${files.length} fichiers journaux`);
    let totalSize = 0;
    files.forEach(file => {
      const sizeKB = Math.round(file.size / 1024);
      console.log(`   ${file.name} (${sizeKB} KB)`);
      totalSize += file.size;
    });

    console.log(`\n📈 Taille totale: ${Math.round(totalSize / 1024)} KB`);
    console.log('\nPour supprimer tous les journaux: vlg clean --all');
  }

  showConfig() {
    console.log('⚙️  Configuration de VLogger\n');

    if (fs.existsSync('install.vlg')) {
      console.log('📄 install.vlg:');
      const config = JSON.parse(fs.readFileSync('install.vlg', 'utf8'));
      console.log(JSON.stringify(config, null, 2));
      console.log('');
    }

    if (fs.existsSync('vlogger.config.json')) {
      console.log('📄 vlogger.config.json:');
      console.log(fs.readFileSync('vlogger.config.json', 'utf8'));
    }

    if (!fs.existsSync('install.vlg')) {
      console.log('❌ Aucune configuration VLogger trouvée.');
      console.log('Exécutez \'vlg init\' pour initialiser un projet VLogger.');
    }
  }

  showVersion() {
    console.log(`VLogger CLI v${VLOGGER_VERSION}`);
    console.log('Système de journalisation multi-langage universel');
    console.log('');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Plateforme: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
  }

  showHelp() {
    console.log('🚀 VLogger CLI - Système de journalisation multi-langage universel\n');
    console.log('Utilisation: vlg <commande> [options]\n');

    console.log('Commandes:');
    console.log('  init                    Initialiser un nouveau projet VLogger');
    console.log('  install                 Installer l\'adaptateur VLogger pour le projet courant');
    console.log('  start                   Démarrer l\'application avec VLogger');
    console.log('  dashboard               Ouvrir le tableau de bord VLogger');
    console.log('  clean [--all]           Nettoyer les anciens fichiers journaux');
    console.log('  config                  Afficher la configuration courante');
    console.log('  version                 Afficher les informations de version');
    console.log('  help                    Afficher ce message d\'aide');

    console.log('\nExemples:');
    console.log('  vlg init                # Initialiser un nouveau projet');
    console.log('  vlg install             # Installer VLogger');
    console.log('  vlg start               # Démarrer l\'application');
    console.log('  vlg dashboard           # Ouvrir le tableau de bord');
    console.log('  vlg clean --all         # Supprimer tous les fichiers journaux');

    console.log('\nPour plus d\'informations, visitez:');
    console.log('  https://github.com/ksnjkdppdojdim-star/vlogger');
  }

  writeFile(filename, content) {
    try {
      fs.writeFileSync(filename, content, 'utf8');
    } catch (error) {
      console.error(`❌ Erreur d'écriture de ${filename}: ${error.message}`);
      process.exit(1);
    }
  }

  ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

if (require.main === module) {
  const cli = new VLoggerCLI();
  cli.run();
}

module.exports = VLoggerCLI;
