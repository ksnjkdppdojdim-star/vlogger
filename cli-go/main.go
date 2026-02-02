package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	VLOGGER_VERSION  = "1.5.12"
	GITHUB_BASE_URL  = "https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main"
)

type VLoggerCLI struct {
	cwd     string
	command string
	args    []string
}

type LanguageConfig struct {
	DetectionFiles   []string
	Extension        string
	StartCommands    []string
	InstallCommand   string
	Requirements     []string
	MinVersion       string
}

var LANGUAGE_CONFIGS = map[string]LanguageConfig{
	"javascript": {
		DetectionFiles: []string{"package.json", "yarn.lock", "pnpm-lock.yaml"},
		Extension:      "js",
		StartCommands: []string{"npm start", "yarn start", "node app.js", "node server.js", "node index.js"},
		InstallCommand: "npm install",
		Requirements:   []string{"node --version"},
		MinVersion:     "14.0.0",
	},
	"php": {
		DetectionFiles: []string{"composer.json", "composer.lock", "index.php", "app.php"},
		Extension:      "php",
		StartCommands: []string{"php -S localhost:8000", "php artisan serve", "symfony serve"},
		InstallCommand: "composer install",
		Requirements:   []string{"php --version"},
		MinVersion:     "7.4.0",
	},
	"python": {
		DetectionFiles: []string{"requirements.txt", "setup.py", "pyproject.toml", "Pipfile", "app.py", "main.py"},
		Extension:      "py",
		StartCommands: []string{"python app.py", "python main.py", "flask run", "python manage.py runserver", "uvicorn main:app"},
		InstallCommand: "pip install -r requirements.txt",
		Requirements:   []string{"python --version", "python3 --version"},
		MinVersion:     "3.8.0",
	},
	"java": {
		DetectionFiles: []string{"pom.xml", "build.gradle", "build.gradle.kts", "Main.java", "App.java"},
		Extension:      "java",
		StartCommands: []string{"mvn spring-boot:run", "gradle bootRun", "java -jar target/*.jar", "java Main"},
		InstallCommand: "mvn install",
		Requirements:   []string{"java --version", "javac --version"},
		MinVersion:     "11.0.0",
	},
	"go": {
		DetectionFiles: []string{"go.mod", "go.sum", "main.go"},
		Extension:      "go",
		StartCommands: []string{"go run main.go", "go run .", "./main"},
		InstallCommand: "go mod tidy",
		Requirements:   []string{"go version"},
		MinVersion:     "1.19.0",
	},
	"rust": {
		DetectionFiles: []string{"Cargo.toml", "Cargo.lock", "main.rs"},
		Extension:      "rs",
		StartCommands: []string{"cargo run"},
		InstallCommand: "cargo build",
		Requirements:   []string{"rustc --version", "cargo --version"},
		MinVersion:     "1.70.0",
	},
	"csharp": {
		DetectionFiles: []string{"Program.cs"},
		Extension:      "cs",
		StartCommands: []string{"dotnet run"},
		InstallCommand: "dotnet restore",
		Requirements:   []string{"dotnet --version"},
		MinVersion:     "6.0.0",
	},
}

type InstallConfig struct {
	Name     string `json:"name"`
	Language string `json:"language"`
	Version  string `json:"version"`
	VLogger  struct {
		Version string `json:"version"`
		Adapter string `json:"adapter"`
		Config  struct {
			Dashboard struct {
				Enabled     bool   `json:"enabled"`
				Port        int    `json:"port"`
				OpenBrowser bool   `json:"openBrowser"`
			} `json:"dashboard"`
			Storage struct {
				Path        string `json:"path"`
				MaxFiles    int    `json:"maxFiles"`
				MaxFileSize string `json:"maxFileSize"`
			} `json:"storage"`
			Capture struct {
				Requests    bool `json:"requests"`
				Responses   bool `json:"responses"`
				Headers     bool `json:"headers"`
				Body        bool `json:"body"`
				Performance bool `json:"performance"`
			} `json:"capture"`
			Sanitize struct {
				Enabled    bool     `json:"enabled"`
				Headers    []string `json:"headers"`
				BodyFields []string `json:"bodyFields"`
				QueryParams []string `json:"queryParams"`
			} `json:"sanitize"`
			Filters struct {
				ExcludePaths       []string `json:"excludePaths"`
				ExcludeStaticFiles bool     `json:"excludeStaticFiles"`
				MinDuration        int      `json:"minDuration"`
				CaptureOnlyErrors  bool     `json:"captureOnlyErrors"`
			} `json:"filters"`
		} `json:"config"`
	} `json:"vlogger"`
}

func NewVLoggerCLI() *VLoggerCLI {
	cwd, _ := os.Getwd()
	args := os.Args[1:]
	command := ""
	if len(args) > 0 {
		command = args[0]
	}
	return &VLoggerCLI{
		cwd:     cwd,
		command: command,
		args:    args[1:],
	}
}

func (cli *VLoggerCLI) Run() {
	switch cli.command {
	case "init":
		cli.InitProject()
	case "install":
		cli.InstallVLogger()
	case "start":
		cli.StartApplication()
	case "dashboard":
		cli.OpenDashboard()
	case "clean":
		cli.CleanLogs()
	case "config":
		cli.ShowConfig()
	case "version":
		cli.ShowVersion()
	case "help", "":
		cli.ShowHelp()
	default:
		cli.ShowHelp()
	}
}

func (cli *VLoggerCLI) InitProject() {
	fmt.Println("🚀 Initialisation du projet VLogger...\n")

	language := cli.DetectProjectLanguage()
	fmt.Printf("📋 Langage détecté: %s\n", language)

	if !cli.VerifyLanguageRequirements(language) {
		fmt.Fprintf(os.Stderr, "❌ Prérequis %s non satisfaits. Exécutez 'vlg doctor' pour plus de détails.\n", language)
		os.Exit(1)
	}

	installConfig := cli.CreateInstallConfig(language)
	data, _ := json.MarshalIndent(installConfig, "", "  ")
	cli.WriteFile("install.vlg", string(data))
	fmt.Println("✅ Créé install.vlg")

	cli.WriteFile("vlogger.config.json", cli.CreateVLoggerConfig())
	fmt.Println("✅ Créé vlogger.config.json")

	cli.WriteFile("vlogger.info", cli.CreateProjectInfo())
	fmt.Println("✅ Créé vlogger.info")

	fmt.Println("\n🎉 Projet VLogger initialisé!")
	fmt.Println("\nProchaines étapes:")
	fmt.Println("1. Éditez install.vlg pour configurer votre projet")
	fmt.Println("2. Exécutez: vlg install")
	fmt.Println("3. Intégrez VLogger dans le code de votre application")
	fmt.Println("4. Exécutez: vlg start ou vlg dashboard")
}

func (cli *VLoggerCLI) DetectProjectLanguage() string {
	scores := make(map[string]int)

	for lang := range LANGUAGE_CONFIGS {
		scores[lang] = 0
	}

	for lang, config := range LANGUAGE_CONFIGS {
		for _, file := range config.DetectionFiles {
			filePath := filepath.Join(cli.cwd, file)
			if fileExists(filePath) {
				scores[lang] += 10
			}
		}
	}

	// Trouver le langage avec le score le plus élevé
	maxScore := 0
	detected := "javascript"
	for lang, score := range scores {
		if score > maxScore {
			maxScore = score
			detected = lang
		}
	}

	if maxScore == 0 {
		return "javascript"
	}
	return detected
}

func (cli *VLoggerCLI) VerifyLanguageRequirements(language string) bool {
	config, exists := LANGUAGE_CONFIGS[language]
	if !exists {
		return true
	}

	for _, requirement := range config.Requirements {
		parts := strings.Fields(requirement)
		if len(parts) > 0 {
			cmd := exec.Command(parts[0], parts[1:]...)
			if err := cmd.Run(); err != nil {
				fmt.Fprintf(os.Stderr, "❌ Prérequis manquant: %s\n", requirement)
				return false
			}
		}
	}

	return true
}

func (cli *VLoggerCLI) CreateInstallConfig(language string) InstallConfig {
	projectName := filepath.Base(cli.cwd)
	config := LANGUAGE_CONFIGS[language]

	var cfg InstallConfig
	cfg.Name = projectName
	cfg.Language = language
	cfg.Version = VLOGGER_VERSION

	cfg.VLogger.Version = "^" + VLOGGER_VERSION
	cfg.VLogger.Adapter = fmt.Sprintf("adapters/%s/vlogger.%s", language, config.Extension)

	cfg.VLogger.Config.Dashboard.Enabled = true
	cfg.VLogger.Config.Dashboard.Port = 3333
	cfg.VLogger.Config.Dashboard.OpenBrowser = false

	cfg.VLogger.Config.Storage.Path = "./logs"
	cfg.VLogger.Config.Storage.MaxFiles = 10
	cfg.VLogger.Config.Storage.MaxFileSize = "10MB"

	cfg.VLogger.Config.Capture.Requests = true
	cfg.VLogger.Config.Capture.Responses = true
	cfg.VLogger.Config.Capture.Headers = true
	cfg.VLogger.Config.Capture.Body = true
	cfg.VLogger.Config.Capture.Performance = true

	cfg.VLogger.Config.Sanitize.Enabled = true
	cfg.VLogger.Config.Sanitize.Headers = []string{"authorization", "cookie", "x-api-key"}
	cfg.VLogger.Config.Sanitize.BodyFields = []string{"password", "token", "secret"}
	cfg.VLogger.Config.Sanitize.QueryParams = []string{"api_key", "token"}

	cfg.VLogger.Config.Filters.ExcludePaths = []string{"/favicon.ico", "/health", "/ping"}
	cfg.VLogger.Config.Filters.ExcludeStaticFiles = true
	cfg.VLogger.Config.Filters.MinDuration = 0
	cfg.VLogger.Config.Filters.CaptureOnlyErrors = false

	return cfg
}

func (cli *VLoggerCLI) CreateVLoggerConfig() string {
	config := `{
  "mode": "development",
  "storage": {
    "type": "file",
    "path": "./logs",
    "maxFileSize": 10485760,
    "maxFiles": 10,
    "format": "json"
  },
  "capture": {
    "requests": true,
    "responses": true,
    "headers": true,
    "queryParams": true,
    "body": true,
    "performance": true,
    "errors": true
  },
  "sanitize": {
    "headers": ["authorization", "cookie", "x-api-key", "x-auth-token"],
    "bodyFields": ["password", "token", "secret", "key", "pass"],
    "queryParams": ["api_key", "token", "password"]
  },
  "filters": {
    "excludePaths": ["/favicon.ico", "/health", "/ping"],
    "excludeStaticFiles": true,
    "minDuration": 0,
    "captureOnlyErrors": false
  },
  "dashboard": {
    "enabled": true,
    "port": 3333,
    "openBrowser": false
  },
  "debug": false
}`
	return config
}

func (cli *VLoggerCLI) CreateProjectInfo() string {
	projectName := filepath.Base(cli.cwd)
	info := fmt.Sprintf(`{
  "name": "%s",
  "version": "%s",
  "description": "%s API",
  "author": "",
  "email": "",
  "license": "MIT",
  "links": {
    "repository": "",
    "documentation": "",
    "homepage": ""
  },
  "team": {},
  "api": {
    "version": "1.0",
    "baseUrl": "http://localhost:3000",
    "description": "%s API endpoints"
  }
}`, projectName, VLOGGER_VERSION, projectName, projectName)
	return info
}

func (cli *VLoggerCLI) InstallVLogger() {
	fmt.Println("📦 Installation de VLogger...\n")

	if !fileExists("install.vlg") {
		fmt.Fprintf(os.Stderr, "❌ Aucun install.vlg trouvé. Exécutez 'vlg init' d'abord.\n")
		os.Exit(1)
	}

	data, _ := ioutil.ReadFile("install.vlg")
	var installConfig InstallConfig
	json.Unmarshal(data, &installConfig)

	language := installConfig.Language
	adapter := installConfig.VLogger.Adapter

	fmt.Printf("🔧 Installation de l'adaptateur %s...\n", language)

	if !cli.VerifyLanguageRequirements(language) {
		fmt.Fprintf(os.Stderr, "❌ Prérequis %s non satisfaits.\n", language)
		os.Exit(1)
	}

	cli.DownloadAdapter(language, adapter)
	cli.CopyAdditionalFiles(language)

	fmt.Println("\n✅ VLogger installé avec succès!")
	fmt.Println("\nInstructions d'intégration:")
	cli.ShowIntegrationInstructions(language)
}

func (cli *VLoggerCLI) DownloadAdapter(language, adapterPath string) {
	fileName := filepath.Base(adapterPath)
	url := fmt.Sprintf("%s/%s", GITHUB_BASE_URL, adapterPath)

	fmt.Printf("📥 Téléchargement de %s...\n", fileName)

	cmd := exec.Command("curl", "-s", "-L", url, "-o", fileName)
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Échec du téléchargement: %v\n", err)
		fmt.Println("\n🔗 Téléchargement manuel:")
		fmt.Printf("   %s\n", url)
		os.Exit(1)
	}

	fmt.Printf("✅ Téléchargé %s\n", fileName)
}

func (cli *VLoggerCLI) CopyAdditionalFiles(language string) {
	cli.EnsureDirectory("dashboard")

	dashboardFiles := []string{"index.html", "style.css", "script.js"}
	for _, file := range dashboardFiles {
		url := fmt.Sprintf("%s/dashboard/%s", GITHUB_BASE_URL, file)
		localPath := filepath.Join("dashboard", file)

		cmd := exec.Command("curl", "-s", "-L", url, "-o", localPath)
		if err := cmd.Run(); err != nil {
			fmt.Printf("⚠️  Impossible de télécharger %s: %v\n", file, err)
			continue
		}
		fmt.Printf("✅ Téléchargé dashboard/%s\n", file)
	}
}

func (cli *VLoggerCLI) ShowIntegrationInstructions(language string) {
	instructions := map[string]string{
		"javascript": `
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
		"php": `
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
		"python": `
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
`,
	}

	if instr, ok := instructions[language]; ok {
		fmt.Println(instr)
	} else {
		fmt.Println("Consultez la documentation pour les instructions d'intégration.")
	}
}

func (cli *VLoggerCLI) StartApplication() {
	fmt.Println("🚀 Démarrage de l'application avec VLogger...\n")

	if !fileExists("install.vlg") {
		fmt.Fprintf(os.Stderr, "❌ Aucun install.vlg trouvé.\n")
		return
	}

	data, _ := ioutil.ReadFile("install.vlg")
	var config InstallConfig
	json.Unmarshal(data, &config)

	language := config.Language
	langConfig := LANGUAGE_CONFIGS[language]

	for _, cmd := range langConfig.StartCommands {
		parts := strings.Fields(cmd)
		if len(parts) > 0 {
			fmt.Printf("▶️  Démarrage: %s\n", cmd)
			command := exec.Command(parts[0], parts[1:]...)
			command.Stdout = os.Stdout
			command.Stderr = os.Stderr
			command.Run()
			return
		}
	}
}

func (cli *VLoggerCLI) OpenDashboard() {
	fmt.Println("🌐 Ouverture du tableau de bord VLogger...\n")
	fmt.Println("✅ Le tableau de bord devrait être accessible sur http://localhost:3333")

	port := "3333"
	url := fmt.Sprintf("http://localhost:%s", port)

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}

	cmd.Run()
}

func (cli *VLoggerCLI) CleanLogs() {
	fmt.Println("🧹 Nettoyage des anciens fichiers journaux...\n")

	logsDir := "./logs"
	if !fileExists(logsDir) {
		fmt.Println("📁 Aucun répertoire de journaux trouvé.")
		return
	}

	entries, _ := ioutil.ReadDir(logsDir)
	var logFiles []os.FileInfo
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "vlogger-") && strings.HasSuffix(entry.Name(), ".json") {
			logFiles = append(logFiles, entry)
		}
	}

	if len(logFiles) == 0 {
		fmt.Println("📄 Aucun fichier journaux trouvé.")
		return
	}

	fmt.Printf("📊 Trouvé %d fichiers journaux\n", len(logFiles))

	for _, file := range logFiles {
		sizeKB := file.Size() / 1024
		fmt.Printf("   %s (%d KB)\n", file.Name(), sizeKB)
	}

	fmt.Println("\nPour supprimer tous les journaux: vlg clean --all")
}

func (cli *VLoggerCLI) ShowConfig() {
	fmt.Println("⚙️  Configuration de VLogger\n")

	if fileExists("install.vlg") {
		fmt.Println("📄 install.vlg:")
		data, _ := ioutil.ReadFile("install.vlg")
		var config map[string]interface{}
		json.Unmarshal(data, &config)
		prettyPrint(config)
		fmt.Println()
	}

	if fileExists("vlogger.config.json") {
		fmt.Println("📄 vlogger.config.json:")
		data, _ := ioutil.ReadFile("vlogger.config.json")
		fmt.Println(string(data))
	}

	if !fileExists("install.vlg") {
		fmt.Println("❌ Aucune configuration VLogger trouvée.")
		fmt.Println("Exécutez 'vlg init' pour initialiser un projet VLogger.")
	}
}

func (cli *VLoggerCLI) ShowVersion() {
	fmt.Printf("VLogger CLI v%s\n", VLOGGER_VERSION)
	fmt.Println("Système de journalisation multi-langage universel")
	fmt.Println()
	fmt.Printf("Go version: %s\n", runtime.Version())
	fmt.Printf("Plateforme: %s\n", runtime.GOOS)
	fmt.Printf("Architecture: %s\n", runtime.GOARCH)
}

func (cli *VLoggerCLI) ShowHelp() {
	fmt.Println("🚀 VLogger CLI - Système de journalisation multi-langage universel\n")
	fmt.Println("Utilisation: vlg <commande> [options]\n")

	fmt.Println("Commandes:")
	fmt.Println("  init                    Initialiser un nouveau projet VLogger")
	fmt.Println("  install                 Installer l'adaptateur VLogger pour le projet courant")
	fmt.Println("  start                   Démarrer l'application avec VLogger")
	fmt.Println("  dashboard               Ouvrir le tableau de bord VLogger")
	fmt.Println("  clean [--all]           Nettoyer les anciens fichiers journaux")
	fmt.Println("  config                  Afficher la configuration courante")
	fmt.Println("  version                 Afficher les informations de version")
	fmt.Println("  help                    Afficher ce message d'aide")

	fmt.Println("\nExemples:")
	fmt.Println("  vlg init                # Initialiser un nouveau projet")
	fmt.Println("  vlg install             # Installer VLogger")
	fmt.Println("  vlg start               # Démarrer l'application")
	fmt.Println("  vlg dashboard           # Ouvrir le tableau de bord")
	fmt.Println("  vlg clean --all         # Supprimer tous les fichiers journaux")

	fmt.Println("\nPour plus d'informations, visitez:")
	fmt.Println("  https://github.com/ksnjkdppdojdim-star/vlogger")
}

func (cli *VLoggerCLI) WriteFile(filename, content string) {
	if err := ioutil.WriteFile(filename, []byte(content), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Erreur d'écriture de %s: %v\n", filename, err)
		os.Exit(1)
	}
}

func (cli *VLoggerCLI) EnsureDirectory(dir string) {
	os.MkdirAll(dir, os.ModePerm)
}

func fileExists(filename string) bool {
	_, err := os.Stat(filename)
	return err == nil
}

func prettyPrint(data interface{}) {
	bytes, _ := json.MarshalIndent(data, "", "  ")
	fmt.Println(string(bytes))
}

func main() {
	cli := NewVLoggerCLI()
	cli.Run()
}
