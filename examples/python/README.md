# Exemple Python (Flask)

Ce dossier contient un exemple Flask montrant l'intégration de VLogger.

Pré-requis
- Python 3.8+

Installer les dépendances et démarrer :

```bash
pip install flask psutil
python flask_app.py
```

Le serveur écoute par défaut sur `http://localhost:5000`.
Le dashboard VLogger est attendu sur `http://localhost:3333`.

Endpoints utiles : `GET /`, `GET /users`, `POST /users`, `GET /error`, `GET /slow`.
