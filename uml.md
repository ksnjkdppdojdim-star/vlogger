# Cahier UML - VLogger
## Projet de Logger API Open Source

**Version:** 1.0.0  
**Date:** 30 Janvier 2026  
**Auteur:** Votre Équipe  

---

## Table des Matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Diagramme de cas d'utilisation](#2-diagramme-de-cas-dutilisation)
3. [Diagramme de classes](#3-diagramme-de-classes)
4. [Diagramme de séquence](#4-diagramme-de-séquence)
5. [Diagramme d'activité](#5-diagramme-dactivité)
6. [Diagramme de composants](#6-diagramme-de-composants)
7. [Diagramme de déploiement](#7-diagramme-de-déploiement)
8. [Diagramme d'état](#8-diagramme-détat)
9. [Modèle de données](#9-modèle-de-données)
10. [Architecture technique](#10-architecture-technique)

---

## 1. Vue d'ensemble du projet

### 1.1 Description

VLogger est un outil open source de monitoring et de documentation automatique pour APIs. Il permet aux développeurs de :
- Capturer automatiquement toutes les requêtes/réponses HTTP
- Générer une documentation API vivante
- Analyser les performances
- Visualiser les logs via un dashboard intégré

### 1.2 Caractéristiques principales

- **Gratuit & Open Source** : Aucun compte requis, pas d'API key
- **Installation simple** : Un seul fichier à copier
- **Configuration flexible** : Fichiers JSON/INI
- **Stockage local** : Les données restent sur la machine du développeur
- **Dashboard intégré** : Interface web temps réel
- **Multi-langage** : Node.js, Python (extensible)

### 1.3 Acteurs du système

- **Développeur** : Utilise VLogger dans son projet
- **Application** : Le projet du développeur qui intègre VLogger
- **VLogger Core** : Le middleware qui intercepte les requêtes
- **Système de stockage** : Fichiers JSON locaux
- **Dashboard** : Interface web de visualisation

---

## 2. Diagramme de cas d'utilisation

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor Développeur as dev
actor "Application Web" as app

rectangle "VLogger System" {
  usecase "Installer VLogger" as UC1
  usecase "Configurer le logging" as UC2
  usecase "Intercepter requêtes HTTP" as UC3
  usecase "Stocker les logs" as UC4
  usecase "Consulter le dashboard" as UC5
  usecase "Exporter la documentation" as UC6
  usecase "Analyser les performances" as UC7
  usecase "Filtrer les logs" as UC8
  usecase "Sanitizer données sensibles" as UC9
  usecase "Gérer la rotation des logs" as UC10
}

dev --> UC1
dev --> UC2
dev --> UC5
dev --> UC6
dev --> UC7

app --> UC3

UC3 ..> UC9 : <<include>>
UC3 ..> UC4 : <<include>>
UC4 ..> UC10 : <<include>>

UC5 ..> UC8 : <<extend>>
UC7 ..> UC8 : <<extend>>

note right of UC9
  Masquer mots de passe,
  tokens, etc.
end note

note right of UC10
  Supprimer logs anciens
  si limite dépassée
end note

@enduml
```

### 2.1 Description des cas d'utilisation

| ID | Cas d'utilisation | Description | Acteur principal |
|----|-------------------|-------------|------------------|
| UC1 | Installer VLogger | Télécharger et copier vlogger.js dans le projet | Développeur |
| UC2 | Configurer le logging | Créer vlogger.config.json et vlogger.info | Développeur |
| UC3 | Intercepter requêtes HTTP | Capturer automatiquement req/res via middleware | Application |
| UC4 | Stocker les logs | Sauvegarder dans des fichiers JSON datés | Système |
| UC5 | Consulter le dashboard | Visualiser stats et logs en temps réel | Développeur |
| UC6 | Exporter la documentation | Générer doc Markdown/PDF | Développeur |
| UC7 | Analyser les performances | Voir temps de réponse, erreurs, etc. | Développeur |
| UC8 | Filtrer les logs | Exclure certains endpoints ou fichiers statiques | Développeur |
| UC9 | Sanitizer données sensibles | Masquer automatiquement passwords, tokens | Système |
| UC10 | Gérer la rotation des logs | Supprimer vieux fichiers selon config | Système |

---

## 3. Diagramme de classes

```plantuml
@startuml
skinparam classAttributeIconSize 0

class VLogger {
  - config: Config
  - projectInfo: ProjectInfo
  - stats: Stats
  - queue: LogEntry[]
  - startTime: number
  
  + constructor(config?: Config)
  + middleware(): Function
  + saveLog(entry: LogEntry): void
  + updateStats(entry: LogEntry): void
  + startDashboard(): void
  - loadProjectInfo(): ProjectInfo
  - sanitizeHeaders(headers: Object): Object
  - sanitizeBody(body: any): any
  - shouldSkipRequest(req: Request): boolean
  - rotateLogsIfNeeded(filepath: string): void
  - cleanOldLogs(): void
}

class Config {
  + mode: string
  + storage: StorageConfig
  + capture: CaptureConfig
  + sanitize: SanitizeConfig
  + filters: FilterConfig
  + documentation: DocumentationConfig
  + dashboard: DashboardConfig
  + debug: boolean
}

class StorageConfig {
  + type: string
  + path: string
  + maxFileSize: number
  + maxFiles: number
  + format: string
}

class CaptureConfig {
  + requests: boolean
  + responses: boolean
  + headers: boolean
  + queryParams: boolean
  + body: boolean
  + performance: boolean
  + errors: boolean
  + fileSystem: FileSystemConfig
}

class FileSystemConfig {
  + enabled: boolean
  + watchPaths: string[]
}

class SanitizeConfig {
  + headers: string[]
  + bodyFields: string[]
  + queryParams: string[]
}

class FilterConfig {
  + excludePaths: string[]
  + excludeStaticFiles: boolean
  + minDuration: number
  + captureOnlyErrors: boolean
}

class DocumentationConfig {
  + autoGenerate: boolean
  + outputPath: string
  + format: string
  + includeExamples: boolean
  + groupByTag: boolean
}

class DashboardConfig {
  + enabled: boolean
  + port: number
  + openBrowser: boolean
}

class ProjectInfo {
  + name: string
  + version: string
  + description: string
  + author: string
  + email: string
  + license: string
  + links: Object
  + team: Object
  + api: Object
}

class LogEntry {
  + id: string
  + timestamp: string
  + method: string
  + path: string
  + fullUrl: string
  + query: Object
  + headers: Object
  + body: any
  + ip: string
  + response: ResponseData
  + performance: PerformanceData
  + isError: boolean
  + error?: ErrorData
}

class ResponseData {
  + status: number
  + statusText: string
  + headers: Object
  + body: any
  + duration: number
  + size: number
}

class PerformanceData {
  + duration: number
  + memory: number
  + timestamp: number
}

class ErrorData {
  + message: string
  + stack: string
  + code: string
}

class Stats {
  + totalRequests: number
  + totalErrors: number
  + endpoints: Map<string, EndpointStats>
  + startedAt: string
}

class EndpointStats {
  + method: string
  + path: string
  + calls: number
  + errors: number
  + totalDuration: number
  + avgDuration: number
  + minDuration: number
  + maxDuration: number
  + statusCodes: Object
}

class DashboardServer {
  - server: HTTPServer
  - logger: VLogger
  
  + start(port: number): void
  + handleRequest(req: Request, res: Response): void
  + getStats(): Object
  + getLogs(): LogEntry[]
  + getDashboardHTML(): string
}

class FileStorage {
  - basePath: string
  - maxFiles: number
  - maxFileSize: number
  
  + save(entry: LogEntry): void
  + load(date: string): LogEntry[]
  + rotate(filepath: string): void
  + clean(): void
  + ensureDirectory(): void
}

' Relations
VLogger "1" *-- "1" Config
VLogger "1" *-- "1" ProjectInfo
VLogger "1" *-- "1" Stats
VLogger "1" --> "*" LogEntry : creates
VLogger "1" --> "1" DashboardServer : manages
VLogger "1" --> "1" FileStorage : uses

Config "1" *-- "1" StorageConfig
Config "1" *-- "1" CaptureConfig
Config "1" *-- "1" SanitizeConfig
Config "1" *-- "1" FilterConfig
Config "1" *-- "1" DocumentationConfig
Config "1" *-- "1" DashboardConfig

CaptureConfig "1" *-- "1" FileSystemConfig

LogEntry "1" *-- "1" ResponseData
LogEntry "1" *-- "1" PerformanceData
LogEntry "1" *-- "0..1" ErrorData

Stats "1" *-- "*" EndpointStats

DashboardServer --> Stats : reads
DashboardServer --> LogEntry : reads

FileStorage --> LogEntry : persists

@enduml
```

---

## 4. Diagramme de séquence

### 4.1 Séquence d'interception d'une requête

```plantuml
@startuml
actor Client
participant "Express App" as App
participant "VLogger\nMiddleware" as VLogger
participant "Route Handler" as Handler
participant "FileStorage" as Storage
participant "Stats" as Stats

Client -> App: HTTP Request\n(GET /api/users)
App -> VLogger: middleware(req, res, next)

activate VLogger

VLogger -> VLogger: shouldSkipRequest(req)
note right: Vérifier filtres\n(paths exclus, static files)

alt Request should be skipped
  VLogger -> App: next()
  App -> Handler: execute route
  Handler -> Client: Response
else Request should be logged
  VLogger -> VLogger: createLogEntry(req)
  note right: Capturer:\n- method, path\n- headers, body\n- query params
  
  VLogger -> VLogger: sanitizeHeaders(headers)
  VLogger -> VLogger: sanitizeBody(body)
  
  VLogger -> VLogger: startTimer()
  
  VLogger -> VLogger: interceptResponse(res)
  note right: Override res.send()\net res.json()
  
  VLogger -> App: next()
  deactivate VLogger
  
  App -> Handler: execute route
  activate Handler
  Handler -> Handler: process request
  Handler -> App: response data
  deactivate Handler
  
  App -> VLogger: res.send(data)\n[intercepted]
  activate VLogger
  
  VLogger -> VLogger: calculateDuration()
  VLogger -> VLogger: captureResponse(data)
  VLogger -> VLogger: sanitizeResponse(data)
  
  VLogger -> Storage: saveLog(logEntry)
  activate Storage
  Storage -> Storage: appendToFile()
  Storage -> Storage: checkFileSize()
  
  alt File too large
    Storage -> Storage: rotateFile()
  end
  
  Storage -> Storage: cleanOldLogs()
  deactivate Storage
  
  VLogger -> Stats: updateStats(logEntry)
  activate Stats
  Stats -> Stats: incrementCounters()
  Stats -> Stats: updateEndpointStats()
  deactivate Stats
  
  VLogger -> Client: send response
  deactivate VLogger
end

@enduml
```

### 4.2 Séquence de consultation du dashboard

```plantuml
@startuml
actor Développeur as Dev
participant "Browser" as Browser
participant "Dashboard\nServer" as Dashboard
participant "VLogger" as VLogger
participant "FileStorage" as Storage
participant "Stats" as Stats

Dev -> Browser: Ouvrir\nhttp://localhost:3333

Browser -> Dashboard: GET /

activate Dashboard
Dashboard -> Dashboard: getDashboardHTML()
Dashboard -> Browser: HTML page
deactivate Dashboard

Browser -> Dev: Afficher dashboard

loop Auto-refresh (toutes les 5s)
  Browser -> Dashboard: GET /api/stats
  
  activate Dashboard
  Dashboard -> Stats: getStats()
  activate Stats
  Stats -> Stats: aggregate data
  Stats -> Dashboard: stats object
  deactivate Stats
  
  Dashboard -> VLogger: getProjectInfo()
  activate VLogger
  VLogger -> Dashboard: projectInfo
  deactivate VLogger
  
  Dashboard -> Browser: JSON stats
  deactivate Dashboard
  
  Browser -> Browser: updateUI()
  
  Browser -> Dashboard: GET /api/logs
  
  activate Dashboard
  Dashboard -> Storage: load(today)
  activate Storage
  Storage -> Storage: readFile()
  Storage -> Dashboard: LogEntry[]
  deactivate Storage
  
  Dashboard -> Browser: JSON logs
  deactivate Dashboard
  
  Browser -> Browser: updateLogsList()
end

@enduml
```

### 4.3 Séquence d'installation

```plantuml
@startuml
actor Développeur as Dev
participant "Terminal" as Term
participant "GitHub" as Git
participant "File System" as FS
participant "Project" as Project

Dev -> Term: curl -o vlogger.js\nhttps://raw.githubusercontent.com/...

Term -> Git: HTTP GET vlogger.js
Git -> Term: vlogger.js content
Term -> FS: write vlogger.js
FS -> Dev: ✓ Downloaded

Dev -> Term: create vlogger.config.json

Term -> FS: write config file
FS -> Dev: ✓ Created

Dev -> Term: create vlogger.info

Term -> FS: write info file
FS -> Dev: ✓ Created

Dev -> Project: Ouvrir app.js

Dev -> Project: Ajouter:\nconst VLogger = require('./vlogger');\napp.use(VLogger());

Dev -> Term: node app.js

Term -> Project: Start application
Project -> Project: Load vlogger.js
Project -> Project: Read vlogger.config.json
Project -> Project: Read vlogger.info
Project -> Project: Initialize VLogger
Project -> Project: Start dashboard server
Project -> Dev: ✓ Server running\n📊 Dashboard: http://localhost:3333

@enduml
```

---

## 5. Diagramme d'activité

### 5.1 Activité de traitement d'une requête

```plantuml
@startuml
start

:Recevoir requête HTTP;

if (Request dans excludePaths?) then (oui)
  :Passer au handler suivant;
  stop
endif

if (Request est fichier statique\net excludeStaticFiles=true?) then (oui)
  :Passer au handler suivant;
  stop
endif

:Créer LogEntry;

fork
  :Capturer méthode;
fork again
  :Capturer path;
fork again
  :Capturer headers;
fork again
  :Capturer query params;
fork again
  :Capturer body;
end fork

:Sanitizer données sensibles;

partition "Sanitization" {
  :Masquer headers sensibles;
  :Masquer champs sensibles du body;
  :Masquer query params sensibles;
}

:Démarrer timer;

:Intercepter res.send() et res.json();

:Exécuter route handler;

:Recevoir réponse;

:Calculer durée;

:Capturer réponse;

partition "Capture Response" {
  fork
    :Status code;
  fork again
    :Headers;
  fork again
    :Body;
  fork again
    :Taille;
  end fork
}

:Sanitizer réponse;

if (Status >= 400?) then (oui)
  :Marquer comme erreur;
endif

if (captureOnlyErrors=true\net !isError?) then (oui)
  :Abandonner le log;
  stop
endif

if (duration < minDuration?) then (oui)
  :Abandonner le log;
  stop
endif

fork
  :Sauvegarder dans fichier;
  
  if (Fichier > maxFileSize?) then (oui)
    :Rotation du fichier;
  endif
  
  :Nettoyer vieux logs;
fork again
  :Mettre à jour statistiques;
  
  partition "Update Stats" {
    :Incrémenter totalRequests;
    
    if (isError?) then (oui)
      :Incrémenter totalErrors;
    endif
    
    :Mettre à jour EndpointStats;
  }
end fork

:Envoyer réponse au client;

stop
@enduml
```

### 5.2 Activité de rotation des logs

```plantuml
@startuml
start

:Vérifier taille du fichier;

if (Taille > maxFileSize?) then (non)
  stop
endif

:Renommer fichier avec timestamp;
note right
  vlogger-2026-01-30.json
  →
  vlogger-2026-01-30-1738252800000.json
end note

:Créer nouveau fichier vide;

:Lister tous les fichiers de logs;

:Trier par date (plus récent d'abord);

if (Nombre de fichiers > maxFiles?) then (oui)
  :Calculer nombre à supprimer;
  
  repeat
    :Supprimer le plus ancien;
  repeat while (Encore des fichiers à supprimer?)
endif

:Logger l'opération;

stop
@enduml
```

---

## 6. Diagramme de composants

```plantuml
@startuml
package "VLogger System" {
  
  component [vlogger.js] as Core {
    component [VLogger Class] as VLoggerClass
    component [Middleware] as Middleware
    component [Config Loader] as ConfigLoader
    component [Sanitizer] as Sanitizer
    component [Logger] as Logger
  }
  
  component [Dashboard Server] as Dashboard {
    component [HTTP Server] as HTTPServer
    component [API Routes] as APIRoutes
    component [HTML Generator] as HTMLGen
  }
  
  component [File Storage] as Storage {
    component [File Writer] as Writer
    component [File Reader] as Reader
    component [Rotator] as Rotator
  }
  
  component [Stats Manager] as StatsManager {
    component [Counter] as Counter
    component [Aggregator] as Aggregator
  }
  
}

component [vlogger.config.json] as Config
component [vlogger.info] as Info

package "User Application" {
  component [Express App] as App
  component [Route Handlers] as Handlers
}

database "File System" {
  folder "logs/" {
    [vlogger-YYYY-MM-DD.json]
  }
  folder "docs/" {
    [api.md]
  }
}

' Relations
App --> Middleware : use
Middleware --> VLoggerClass : delegates to
VLoggerClass --> ConfigLoader : loads config
VLoggerClass --> Sanitizer : sanitizes data
VLoggerClass --> Logger : logs entries

ConfigLoader ..> Config : reads
ConfigLoader ..> Info : reads

Logger --> Storage : saves logs
Storage --> Writer : writes
Storage --> Reader : reads
Storage --> Rotator : rotates

Logger --> StatsManager : updates stats
StatsManager --> Counter : increments
StatsManager --> Aggregator : aggregates

VLoggerClass --> Dashboard : starts
Dashboard --> HTTPServer : creates
HTTPServer --> APIRoutes : handles
APIRoutes --> StatsManager : queries
APIRoutes --> Storage : queries
APIRoutes --> HTMLGen : generates

Writer --> [vlogger-YYYY-MM-DD.json] : writes
Reader --> [vlogger-YYYY-MM-DD.json] : reads

note right of Dashboard
  Port 3333 par défaut
  API REST + WebUI
end note

note bottom of Storage
  Stockage local
  Format JSON
  Rotation automatique
end note

@enduml
```

---

## 7. Diagramme de déploiement

```plantuml
@startuml

node "Poste du Développeur" {
  
  node "Container Node.js" {
    artifact "app.js" {
      component [Application Express]
    }
    
    artifact "vlogger.js" {
      component [VLogger Middleware]
      component [Dashboard Server]
    }
    
    artifact "node_modules" {
      component [Express]
      component [Dependencies]
    }
  }
  
  node "File System" {
    folder "Configuration" {
      artifact "vlogger.config.json"
      artifact "vlogger.info"
    }
    
    folder "logs/" {
      artifact "vlogger-2026-01-30.json"
      artifact "vlogger-2026-01-29.json"
      artifact "..."
    }
    
    folder "docs/" {
      artifact "api.md"
    }
  }
  
  node "Browser" {
    component [Dashboard UI]
  }
  
}

cloud "Internet" {
  node "GitHub" {
    artifact "vlogger repository" {
      component [vlogger.js source]
      component [Documentation]
      component [Examples]
    }
  }
}

' Protocoles
[Application Express] ..> [VLogger Middleware] : uses
[VLogger Middleware] --> [vlogger.config.json] : reads <<file>>
[VLogger Middleware] --> [vlogger.info] : reads <<file>>
[VLogger Middleware] --> "vlogger-2026-01-30.json" : writes <<file>>
[VLogger Middleware] ..> [Dashboard Server] : starts

[Dashboard Server] -down-> [Dashboard UI] : HTTP :3333

[Dashboard UI] --> [Dashboard Server] : GET /api/stats\nGET /api/logs

[vlogger.js source] .down.> [vlogger.js] : download <<HTTPS>>

note right of "Poste du Développeur"
  Tout est local
  Pas de connexion externe requise
  (sauf pour l'installation initiale)
end note

note bottom of [Dashboard Server]
  Port configurable
  Default: 3333
end note

@enduml
```

---

## 8. Diagramme d'état

### 8.1 États de VLogger

```plantuml
@startuml
[*] --> Uninitialized

Uninitialized --> Initializing : constructor()

state Initializing {
  [*] --> LoadingConfig
  LoadingConfig --> LoadingProjectInfo
  LoadingProjectInfo --> CreatingLogDirectory
  CreatingLogDirectory --> LoadingStats
  LoadingStats --> StartingDashboard : dashboard.enabled=true
  LoadingStats --> Ready : dashboard.enabled=false
  StartingDashboard --> Ready
}

Ready --> Logging : middleware()

state Logging {
  [*] --> CapturingRequest
  
  CapturingRequest --> CheckingFilters
  
  state CheckingFilters <<choice>>
  CheckingFilters --> SkippingRequest : should skip
  CheckingFilters --> SanitizingData : should log
  
  SkippingRequest --> [*]
  
  SanitizingData --> InterceptingResponse
  InterceptingResponse --> ExecutingHandler
  ExecutingHandler --> CapturingResponse
  CapturingResponse --> SanitizingResponse
  SanitizingResponse --> CheckingConditions
  
  state CheckingConditions <<choice>>
  CheckingConditions --> Saving : pass filters
  CheckingConditions --> [*] : fail filters
  
  Saving --> UpdatingStats
  UpdatingStats --> [*]
}

Logging --> Ready : response sent

Ready --> Stopping : process.exit

Stopping --> FlushinLogs
FlushinLogs --> [*]

note right of Logging
  Peut gérer plusieurs
  requêtes simultanées
end note

@enduml
```

### 8.2 États d'un fichier de log

```plantuml
@startuml

[*] --> NonExistent

NonExistent --> Creating : first log entry

Creating --> Active

state Active {
  [*] --> Writing
  Writing --> Checking : after each write
  
  state Checking <<choice>>
  Checking --> Writing : size < maxFileSize
  Checking --> Rotating : size >= maxFileSize
  
  Rotating --> Rotated
}

Rotated --> Archived

state Archived {
  [*] --> Retained
  Retained --> PendingDeletion : age > retention
}

PendingDeletion --> Deleted

Deleted --> [*]

note right of Rotating
  Renommé avec timestamp
  Nouveau fichier créé
end note

note right of PendingDeletion
  Supprimé si nombre de fichiers
  dépasse maxFiles
end note

@enduml
```

---

## 9. Modèle de données

### 9.1 Structure des fichiers JSON

```plantuml
@startuml

class LogFile {
  + filename: string
  + date: Date
  + entries: LogEntry[]
}

class LogEntry {
  + id: string
  + timestamp: string (ISO 8601)
  + method: string
  + path: string
  + fullUrl: string
  + query: QueryParams
  + headers: Headers
  + body: any
  + ip: string
  + response: Response
  + performance: Performance
  + isError: boolean
  + error?: Error
}

class QueryParams {
  + [key: string]: string
}

class Headers {
  + [key: string]: string
  note "Certains headers sont\nmasqués: [REDACTED]"
}

class Response {
  + status: number
  + statusText: string
  + headers: Headers
  + body: any
  + duration: number (ms)
  + size: number (bytes)
}

class Performance {
  + duration: number (ms)
  + memory: number (MB)
  + timestamp: number
}

class Error {
  + message: string
  + stack: string
  + code: string
}

class StatsData {
  + totalRequests: number
  + totalErrors: number
  + endpoints: EndpointStat[]
  + startedAt: string
  + uptime: number
}

class EndpointStat {
  + endpoint: string
  + method: string
  + path: string
  + calls: number
  + errors: number
  + totalDuration: number
  + avgDuration: number
  + minDuration: number
  + maxDuration: number
  + statusCodes: StatusCodeCount
}

class StatusCodeCount {
  + [code: number]: number
}

' Relations
LogFile "1" *-- "*" LogEntry
LogEntry "1" *-- "1" QueryParams
LogEntry "1" *-- "1" Headers
LogEntry "1" *-- "1" Response
LogEntry "1" *-- "1" Performance
LogEntry "1" *-- "0..1" Error

Response "1" *-- "1" Headers

StatsData "1" *-- "*" EndpointStat
EndpointStat "1" *-- "1" StatusCodeCount

@enduml
```

### 9.2 Exemple de données JSON

**Fichier: logs/vlogger-2026-01-30.json**
```json
[
  {
    "id": "1738252800000-abc123xyz",
    "timestamp": "2026-01-30T10:30:15.234Z",
    "method": "POST",
    "path": "/api/users",
    "fullUrl": "http://localhost:3000/api/users",
    "query": {},
    "headers": {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0...",
      "authorization": "[REDACTED]"
    },
    "body": {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "[REDACTED]"
    },
    "ip": "::1",
    "response": {
      "status": 201,
      "statusText": "Created",
      "headers": {
        "content-type": "application/json"
      },
      "body": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "duration": 87,
      "size": 156
    },
    "performance": {
      "duration": 87,
      "memory": 23.5,
      "timestamp": 1738252800087
    },
    "isError": false
  }
]
```

---

## 10. Architecture technique

### 10.1 Stack technologique

| Composant | Technologie | Version | Justification |
|-----------|-------------|---------|---------------|
| Runtime | Node.js | 18+ | Écosystème mature, async natif |
| Langage | JavaScript | ES6+ | Pas de compilation, compatible navigateurs |
| Serveur HTTP | http (natif) | - | Léger, pas de dépendance externe |
| Stockage | File System | - | Simple, local, pas de DB externe |
| Format données | JSON | - | Standard, lisible, facilement parsable |
| Dashboard | HTML/CSS/JS | - | Aucune dépendance front-end |

### 10.2 Architecture en couches

```plantuml
@startuml

package "Presentation Layer" {
  [Dashboard HTML]
  [API REST]
}

package "Business Logic Layer" {
  [VLogger Core]
  [Middleware]
  [Sanitizer]
  [Stats Manager]
}

package "Data Access Layer" {
  [File Storage]
  [Config Loader]
}

package "External Layer" {
  [File System]
  [Express App]
}

[Dashboard HTML] --> [API REST]
[API REST] --> [VLogger Core]

[Express App] --> [Middleware]
[Middleware] --> [VLogger Core]

[VLogger Core] --> [Sanitizer]
[VLogger Core] --> [Stats Manager]
[VLogger Core] --> [File Storage]
[VLogger Core] --> [Config Loader]

[File Storage] --> [File System]
[Config Loader] --> [File System]

@enduml
```

### 10.3 Flux de données

```plantuml
@startuml
skinparam defaultTextAlignment center

rectangle "Client HTTP" as Client
rectangle "Express App" as App
rectangle "VLogger\nMiddleware" as VLogger
rectangle "Sanitizer" as Sanitizer
rectangle "File Storage" as Storage
rectangle "Stats" as Stats
rectangle "Dashboard" as Dashboard

Client -right-> App : 1. HTTP Request
App -right-> VLogger : 2. Intercept
VLogger -down-> Sanitizer : 3. Sanitize
Sanitizer -up-> VLogger : 4. Clean data
VLogger -right-> Storage : 5. Save log
VLogger -down-> Stats : 6. Update stats
VLogger -left-> App : 7. Continue
App -left-> Client : 8. Response

Dashboard -up-> Stats : 9. Read stats
Dashboard -up-> Storage : 10. Read logs

note bottom of Storage
  logs/vlogger-YYYY-MM-DD.json
end note

note right of Stats
  En mémoire
  Agrégé depuis les logs
end note

@enduml
```

### 10.4 Patterns de conception utilisés

| Pattern | Utilisation | Bénéfice |
|---------|-------------|----------|
| **Middleware** | Interception des requêtes HTTP | Séparation des responsabilités |
| **Singleton** | Instance unique de VLogger | Cohérence des stats |
| **Strategy** | Différentes stratégies de sanitization | Extensibilité |
| **Observer** | Mise à jour temps réel du dashboard | Réactivité |
| **Factory** | Création des LogEntry | Encapsulation |
| **Decorator** | Interception de res.send() | Extension sans modification |

### 10.5 Gestion de la concurrence

```plantuml
@startuml
|Client 1|
start
:Envoyer requête A;

|VLogger|
:Créer LogEntry A;
:Démarrer timer A;

|Client 2|
:Envoyer requête B;

|VLogger|
:Créer LogEntry B;
:Démarrer timer B;

|Handler A|
:Traiter requête A;

|Handler B|
:Traiter requête B;

|Handler B|
:Terminer B;

|VLogger|
:Capturer réponse B;
:Sauvegarder B;

|Handler A|
:Terminer A;

|VLogger|
:Capturer réponse A;
:Sauvegarder A;

|Client 1|
:Recevoir réponse A;
stop

|Client 2|
:Recevoir réponse B;
stop

@enduml
```

**Note:** Node.js gère naturellement la concurrence via son event loop. Les opérations I/O (écriture fichier) sont asynchrones.

### 10.6 Sécurité

| Aspect | Implémentation | Protection contre |
|--------|----------------|-------------------|
| **Sanitization** | Masquage automatique | Fuite de credentials |
| **Stockage local** | Pas de transmission réseau | Interception MITM |
| **Configuration** | Fichiers locaux | Injection de config |
| **Dashboard** | Localhost only | Accès externe non autorisé |
| **Validation** | Type checking | Injection de code |

### 10.7 Performance

**Optimisations implémentées:**

1. **Écriture par batch** : Évite trop d'I/O
2. **Rotation automatique** : Limite la taille des fichiers
3. **Filtres précoces** : Skip les requêtes non pertinentes
4. **Sanitization lazy** : Seulement si nécessaire
5. **Stats en mémoire** : Évite de lire les fichiers à chaque fois

**Métriques attendues:**

- Overhead par requête: < 5ms
- Mémoire utilisée: < 50MB pour 10,000 logs
- Impact CPU: < 2%

---

## Annexes

### A. Glossaire

| Terme | Définition |
|-------|------------|
| **Middleware** | Fonction qui intercepte les requêtes avant qu'elles n'atteignent le handler |
| **Sanitization** | Processus de masquage des données sensibles |
| **Rotation** | Archivage d'un fichier et création d'un nouveau |
| **Dashboard** | Interface web de visualisation |
| **Endpoint** | Point d'entrée API (combinaison méthode + path) |
| **LogEntry** | Structure de données représentant une requête/réponse |

### B. Conventions de nommage

- **Fichiers de logs**: `vlogger-YYYY-MM-DD.json`
- **Fichiers rotatés**: `vlogger-YYYY-MM-DD-timestamp.json`
- **Variables**: camelCase
- **Classes**: PascalCase
- **Constantes**: UPPER_SNAKE_CASE

### C. Références

- [Express.js Documentation](https://expressjs.com/)
- [Node.js File System](https://nodejs.org/api/fs.html)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [JSON Specification](https://www.json.org/)

---

**Fin du cahier UML**