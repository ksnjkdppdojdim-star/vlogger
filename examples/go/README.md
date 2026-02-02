# Exemple Go (Gin)

Ce dossier contient un exemple Go utilisant Gin montrant l'intégration de VLogger.

Pré-requis
- Go 1.19+

Démarrer :

```bash
cd examples/go
# (optionnel) go mod tidy
go run main.go
```

Le serveur écoute par défaut sur `http://localhost:8080`.
Le dashboard VLogger est attendu sur `http://localhost:3333`.

Endpoints utiles : `GET /`, `GET /users`, `POST /users`, `GET /error`, `GET /slow`.
