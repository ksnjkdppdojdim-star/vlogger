# Exemple Java

Ce dossier contient un exemple Java montrant l'intégration de VLogger.

Pré-requis
- Java 11+
- Gestionnaire de dépendances recommandé (Maven ou Gradle) pour ajouter Jackson (JSON)

Exécution rapide (si vous avez les dépendances sur le classpath) :

```bash
javac App.java
java App
```

Recommandé : créer un petit projet Maven/Gradle et ajouter la dépendance `com.fasterxml.jackson.core:jackson-databind`.

Le serveur écoute par défaut sur `http://localhost:8080`.
Le dashboard VLogger est attendu sur `http://localhost:3333`.

Endpoints utiles : `GET /`, `GET /users`, `POST /users`, `GET /error`, `GET /slow`.
