# VLogger CLI - Guide d'Installation Universel

## 🎯 Vue d'ensemble

La CLI VLogger est **universelle** et **sans dépendances**. Elle fonctionne avec:
- ✅ **PHP** (sans Node.js requis)
- ✅ **Python** (sans Node.js requis)
- ✅ **JavaScript/Node.js**
- ✅ **Java**
- ✅ **Go**
- ✅ **Rust**
- ✅ **C#**

## 📦 Installation

### Option 1: Installation globale (Recommandée)

#### Windows

1. **Créez un dossier pour VLogger:**
```powershell
mkdir C:\vlg
```

2. **Copiez les fichiers dans le dossier:**
   - Téléchargez ou copiez `vlg.js`, `vlg.cmd`, et `package.json` dans `C:\vlg\`

3. **Ajoutez au PATH Windows:**
   - Appuyez sur `Win + X` → Paramètres Système
   - Recherchez "Variables d'environnement"
   - Cliquez sur "Modifier les variables d'environnement du système"
   - Cliquez sur "Variables d'environnement"
   - Sous "Variables utilisateur", cliquez sur "Nouveau"
   - Nom: `PATH`, Valeur: `C:\vlg`
   - Cliquez OK

4. **Vérifiez l'installation:**
```powershell
vlg version
```

#### macOS/Linux

1. **Créez le répertoire (déjà existant):**
```bash
sudo mkdir -p /usr/local/bin
```

2. **Copiez les fichiers:**
```bash
sudo cp vlg.js /usr/local/bin/
sudo cp vlg /usr/local/bin/
sudo chmod +x /usr/local/bin/vlg
```

3. **Vérifiez l'installation:**
```bash
vlg version
```

### Option 2: Installation locale (Pour un projet)

Simplement exécutez dans le répertoire de votre projet:

```bash
node /chemin/vers/vlg.js init
```

### Option 3: npm global

```bash
npm install -g vlogger-cli
vlg init
```

## 🚀 Utilisation

### Pour tous les langages:

```bash
# Initialiser un projet
vlg init

# Installer VLogger
vlg install

# Démarrer l'application
vlg start

# Ouvrir le tableau de bord
vlg dashboard

# Nettoyer les journaux
vlg clean --all

# Afficher la configuration
vlg config

# Afficher la version
vlg version

# Afficher l'aide
vlg help
```

## 🔍 Détection automatique du langage

La CLI détecte automatiquement le langage de votre projet:

| Langage | Fichiers détectés |
|---------|-------------------|
| **PHP** | composer.json, index.php, app.php |
| **Python** | requirements.txt, setup.py, app.py, main.py |
| **JavaScript** | package.json, yarn.lock, pnpm-lock.yaml |
| **Java** | pom.xml, build.gradle, Main.java |
| **Go** | go.mod, go.sum, main.go |
| **Rust** | Cargo.toml, Cargo.lock |
| **C#** | Program.cs, *.csproj |

## 📝 Exemple: Projet PHP

```powershell
cd C:\Users\VotreNom\MonProjet\
vlg init
# 📋 Langage détecté: php
# ✅ Créé install.vlg
# ✅ Créé vlogger.config.json
# ✅ Créé vlogger.info

vlg install
# 🔧 Installation de l'adaptateur php...
# 📥 Téléchargement de vlogger.php...
# ✅ Téléchargé vlogger.php

vlg dashboard
# 🌐 Le tableau de bord devrait être accessible sur http://localhost:3333
```

## 📝 Exemple: Projet Python

```bash
cd ~/mon-projet-python
vlg init
# 📋 Langage détecté: python
# ✅ Créé install.vlg

vlg install
# ✅ Téléchargé vlogger.py

python app.py  # Ou utilisez: vlg start
# Le tableau de bord est maintenant disponible sur http://localhost:3333
```

## 🐛 Dépannage

### Erreur: "vlg n'est pas reconnu"

1. Vérifiez que le dossier est dans le PATH:
```powershell
# Windows
echo %PATH%

# Linux/macOS
echo $PATH
```

2. Redémarrez votre terminal ou PowerShell

3. Testez avec le chemin complet:
```powershell
C:\vlg\vlg.cmd version
```

### Erreur: "curl n'est pas reconnu"

Sur les systèmes anciens sans curl:
- **Windows**: Installer [Git for Windows](https://git-scm.com/download/win) (inclut curl)
- **macOS**: `brew install curl`
- **Linux**: `apt-get install curl` ou `yum install curl`

### Node.js n'est pas installé

Pour PHP, Python, Java uniquement (pas de Node.js requis):
- Installez Node.js depuis https://nodejs.org (LTS recommandé)
- Puis utilisez `vlg` normalement

## ✨ Avantages de cette approche

| Critère | CLI Node.js | CLI Go (future) | CLI PHP | CLI Python |
|---------|------------|-----------------|--------|------------|
| Dépendances | Node.js requis | Aucune | PHP requis | Python requis |
| Taille | ~50 MB | ~10 MB | ~1 MB | ~2 MB |
| Vitesse | Moyenne | Très rapide | Rapide | Moyenne |
| Compatibilité | Windows/Mac/Linux | Windows/Mac/Linux | Windows/Mac/Linux | Windows/Mac/Linux |
| État | Actif | À venir | À venir | À venir |

## 📚 Documentation supplémentaire

- [Configuration VLogger](../docs/configuration.md)
- [Intégration par langage](../docs/installation.md)
- [GitHub](https://github.com/ksnjkdppdojdim-star/vlogger)

## 🤝 Support

Des questions? Consultez:
- La documentation: https://github.com/ksnjkdppdojdim-star/vlogger/wiki
- Les issues: https://github.com/ksnjkdppdojdim-star/vlogger/issues
- Les discussions: https://github.com/ksnjkdppdojdim-star/vlogger/discussions
