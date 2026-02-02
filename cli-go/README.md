# VLogger CLI - Version Go

CLI universelle en Go pour VLogger. Pas de dépendances, un seul binaire exécutable!

## Avantages

✅ **Pas de dépendances** - Aucune installation requise (pas de Node.js, Python, etc.)
✅ **Un seul binaire** - `vlg.exe` pour Windows, `vlg` pour Linux/macOS
✅ **Ultra rapide** - Compilé et optimisé
✅ **Multi-plateforme** - Windows, macOS, Linux
✅ **Entièrement en français** - Messages et aide

## Compilation

### Windows

```powershell
cd cli-go
.\build.bat
```

Cela crée `vlg.exe`

### Linux/macOS

```bash
cd cli-go
chmod +x build.sh
./build.sh
```

Cela crée des binaires pour Windows, macOS et Linux.

## Installation

### Windows

1. Compilez ou téléchargez `vlg.exe`
2. Placez-le dans un dossier (ex: `C:\Program Files\vlg\`)
3. Ajoutez le dossier au PATH Windows
4. Utilisez `vlg` n'importe où dans le terminal

### Linux/macOS

1. Compilez ou téléchargez le binaire
2. Placez-le dans `/usr/local/bin/`
3. Rendez-le exécutable: `chmod +x /usr/local/bin/vlg`
4. Utilisez `vlg` n'importe où dans le terminal

## Utilisation

```bash
vlg init          # Initialiser un projet
vlg install       # Installer l'adaptateur VLogger
vlg start         # Démarrer l'application
vlg dashboard     # Ouvrir le tableau de bord
vlg clean         # Nettoyer les journaux
vlg config        # Afficher la configuration
vlg version       # Afficher la version
vlg help          # Afficher l'aide
```

## Commandes disponibles

### vlg init
Détecte automatiquement le langage du projet (PHP, Python, JavaScript, Java, Go, Rust, C#) et crée:
- `install.vlg` - Configuration du projet
- `vlogger.config.json` - Configuration de VLogger
- `vlogger.info` - Informations du projet

### vlg install
Télécharge et installe l'adaptateur VLogger pour le langage détecté. Crée aussi le dossier `dashboard/`.

### vlg start
Détecte et exécute la commande de démarrage appropriée pour le langage.

### vlg dashboard
Ouvre le tableau de bord VLogger dans le navigateur (http://localhost:3333).

### vlg clean
Affiche les fichiers journaux et permet de les supprimer avec l'option `--all`.

### vlg config
Affiche les configurations actuelles (install.vlg, vlogger.config.json, vlogger.info).

### vlg version
Affiche les informations de version.

## Avantages par rapport à Node.js

| Aspect | Node.js CLI | Go CLI |
|--------|-------------|--------|
| Installation | npm install -g vlogger | Télécharger vlg.exe |
| Dépendances | Node.js requis | Aucune |
| Taille | ~50 MB (node_modules) | ~10 MB (exe) |
| Vitesse | ~1-2 secondes | ~100ms |
| Découverte | npm, npx | Direct, comme Git/Docker |

## Structure du projet

```
cli-go/
├── main.go          # Code principal
├── go.mod           # Dépendances Go
├── go.sum           # Versions des dépendances
├── build.bat        # Script de compilation Windows
├── build.sh         # Script de compilation Linux/macOS
└── README.md        # Ce fichier
```

## Notes de développement

Le CLI Go utilise uniquement les libs Go standard:
- `encoding/json` - Sérialisation JSON
- `os/exec` - Exécution de commandes (curl, etc.)
- `os` - Gestion des fichiers
- `fmt` - Affichage

Zéro dépendances externes! 🎉
