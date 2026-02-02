# Exemple PHP

Ce dossier contient un exemple PHP montrant l'intégration de VLogger.

Pré-requis
- PHP 7.4+

Démarrer le serveur de développement (recommandé) :

```bash
cd examples/php
php -S localhost:8000 router.php
```

Le `router.php` permet de servir les fichiers statiques (dashboard, style, script) et de router les endpoints vers `app.php`.

Ouvrez : `http://localhost:8000/` et `http://localhost:8000/users`.
Le dashboard (front) est accessible via `http://localhost:8000/dashboard`.
