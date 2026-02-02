
# VLogger

Solution open-source de logging et monitoring d'API multi-langage.

## Installation rapide

### Windows — installation avec l'exécutable `vlg.exe`

1. Téléchargez `vlg.exe` depuis la page des Releases (attaché à la release v1.5.12).
2. Placez l'exécutable dans `C:\vlg` :

```powershell
New-Item -ItemType Directory -Path 'C:\vlg' -Force
Copy-Item .\vlg.exe 'C:\vlg\' -Force
```

3. Ajoutez `C:\vlg` au `PATH` (pour l'utilisateur courant) :

```powershell
[Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\vlg', 'User')
```

4. Fermez et rouvrez votre terminal (ou exécutez `refreshenv` si disponible).

5. Vérifiez l'installation :

```powershell
vlg version
```


### macOS / Linux (binaire ou source)

Copiez l'exécutable dans `/usr/local/bin` et rendez‑le exécutable :

```bash
sudo cp vlg /usr/local/bin/
sudo chmod +x /usr/local/bin/vlg
vlg version
```

### Vérification d'intégrité (SHA256)

Après le téléchargement du binaire, vérifiez son checksum :

PowerShell :
```powershell
Get-FileHash .\vlg.exe -Algorithm SHA256
```

Linux / macOS :
```bash
sha256sum vlg
# ou
shasum -a 256 vlg
```

Le fichier `SHA256SUMS.txt` est attaché à la release — comparez les valeurs.

## Installation pour projet nodeJs ou Js (npm)

Le paquet JavaScript est publié sur npm sous le nom `@mahounou/vlogger`.

```bash
npm install @mahounou/vlogger
```

Exemple d'utilisation (Express) :

```js
const express = require('express');
const VLogger = require('@mahounou/vlogger');

const app = express();
const logger = new VLogger();
app.use(logger.middleware());

app.listen(3000);
```

## Commandes `vlg` utiles

- `vlg init` — initialise les fichiers de configuration pour un projet
- `vlg install` — installe l'adaptateur pour le langage détecté
- `vlg start` — lance l'application via les commandes listées dans l'exemple
- `vlg dashboard` — ouvre le dashboard local en fonction du langage
- `vlg version` — affiche la version du CLI

## Release & assets

Les binaires (Windows/macOS/Linux), ainsi que `SHA256SUMS.txt`, sont fournis dans la page Releases GitHub :
https://github.com/ksnjkdppdojdim-star/vlogger/releases

## Documentation & exemples

- Dossiers `examples/` contiennent des démos pour Node.js, PHP, Python, Go et Java.
- Configuration : `docs/configuration.md`
- Installation générale : `docs/installation.md`

## Contribution

Les contributions sont bienvenues — ouvrez une issue ou une pull request.

## Licence

Distribué sous la licence MIT. Voir le fichier `LICENSE`.
