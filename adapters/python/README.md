# VLogger Python Adapter

Adapter Python pour intégrer VLogger dans vos applications (Flask, Django, FastAPI, WSGI).

Installation (depuis PyPI après publication) :

```bash
pip install vlogger
# ou si package scopié/utilisez le nom publié
```

Installation locale (avant publication) :

```bash
python -m pip install --upgrade build
python -m build
pip install dist/vlogger-1.5.12-py3-none-any.whl
```

Usage (Flask) :

```python
from vlogger import VLogger

logger = VLogger()
app.wsgi_app = logger.middleware(app.wsgi_app)
```

Usage (Django) : ajoutez `adapters.python.vlogger.DjangoVLoggerMiddleware` dans `MIDDLEWARE` ou installez le package et utilisez `vlogger.DjangoVLoggerMiddleware`.

Configuration : placez `vlogger.config.json` et `vlogger.info` à la racine du projet pour personnaliser le comportement.

Voir aussi : documentation générale du dépôt et examples dans `examples/python/`.
