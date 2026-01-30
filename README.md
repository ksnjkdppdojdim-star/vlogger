# VLogger - Universal Multi-Language Logging System

> A comprehensive logging solution for any programming language with built-in dashboard and CLI management.

## 🚀 Features

- **Multi-Language Support**: JavaScript, PHP, Python, Java, Go, and more
- **CLI Management**: Global `vlg` command for project management
- **Configuration-Based**: Use `install.vlg` files like composer.json
- **Simple Dashboard**: Pure HTML/CSS/JS interface, no frameworks
- **Local Storage**: No external dependencies, everything stays on your machine
- **Auto-Rotation**: Intelligent log file management
- **Request Sanitization**: Automatically mask sensitive data
- **Real-time Monitoring**: Live performance metrics

## 📦 Installation

### Quick Install
```bash
#Init project
npm init -y
npm install ksnjkdppdojdim-star/vlogger
# verifier que Vlogger est bien installé
npx lvg 

#init vlog configuration
npx vlg init
npx vlg install

#start app with vlogger
npx vlg start
```


### Curl Install
```bash
# Download the CLI tool
curl -o vlg.js https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main/cli/vlg.js
chmod +x vlg.js
sudo mv vlg.js /usr/local/bin/vlg

# Or with Node.js (if you have it)
npm install -g vlogger
```

### Manual Installation
1. Download the appropriate adapter for your language from the `adapters/` directory
2. Create an `install.vlg` configuration file
3. Run `vlg install` in your project directory

## 🛠 Usage

### 1. Initialize a new project
```bash
cd your-project
vlg init
# This creates install.vlg and basic configuration
```

### 2. Configure your project
Edit the generated `install.vlg` file:
```json
{
  "name": "my-api",
  "language": "javascript",
  "version": "1.0.0",
  "vlogger": {
    "version": "^1.0.0",
    "config": {
      "dashboard": {
        "enabled": true,
        "port": 3333
      },
      "storage": {
        "path": "./logs",
        "maxFiles": 10,
        "maxFileSize": "10MB"
      }
    }
  }
}
```

### 3. Install VLogger in your project
```bash
vlg install
# This downloads the appropriate adapter and sets up configuration
```

### 4. Integrate in your code

**JavaScript/Node.js:**
```javascript
const VLogger = require('./vlogger');
const app = express();

// Initialize VLogger
const logger = new VLogger();
app.use(logger.middleware());

// Start dashboard (optional)
logger.startDashboard();
```

**PHP:**
```php
<?php
require_once 'vlogger.php';

$logger = new VLogger();
$logger->init();

// For frameworks, integrate as middleware
// For vanilla PHP, call manually
$logger->logRequest($_REQUEST, $response);
?>
```

**Python (Django/Flask):**
```python
from vlogger import VLogger

logger = VLogger()

# Flask
app.wsgi_app = logger.middleware(app.wsgi_app)

# Django - add to MIDDLEWARE settings
```

### 5. View logs and dashboard
```bash
vlg dashboard
# Opens http://localhost:3333
```

## 📁 Project Structure

```
vlogger/
├── core/                   # Core VLogger engine
├── adapters/              # Language-specific implementations
│   ├── javascript/        # Node.js/Express/Nest.js
│   ├── php/              # Laravel/Symfony/Vanilla
│   ├── python/           # Django/Flask/FastAPI
│   ├── java/             # Spring Boot/Servlet
│   ├── go/               # Gin/Echo/Standard
│   └── ...
├── cli/                  # VLogger CLI tool
├── dashboard/            # HTML dashboard files
├── templates/            # Project templates
└── docs/                # Documentation
```

## 🎯 Supported Frameworks

- **JavaScript**: Express, Nest.js, Fastify, Koa
- **PHP**: Laravel, Symfony, Phalcon, Vanilla
- **Python**: Django, Flask, FastAPI, Tornado
- **Java**: Spring Boot, Spring MVC, Servlet
- **Go**: Gin, Echo, Gorilla Mux, Standard http
- **C#**: ASP.NET Core, ASP.NET Framework
- **Ruby**: Rails, Sinatra
- **Rust**: Actix-web, Warp, Rocket

## 📋 CLI Commands

```bash
vlg init                    # Initialize new project
vlg install                 # Install VLogger dependencies
vlg start                   # Start application with VLogger
vlg dashboard              # Open dashboard
vlg clean                  # Clean old logs
vlg export                 # Export logs to different formats
vlg config                 # Show/edit configuration
vlg version                # Show version
vlg help                   # Show help
```

## 🔧 Configuration Reference

See `docs/configuration.md` for complete configuration options.

## 📊 Dashboard Features

- **Real-time Logs**: See requests as they happen
- **Performance Metrics**: Response times, error rates
- **Endpoint Analytics**: Most used endpoints, slow queries
- **Error Tracking**: Stack traces, error patterns
- **Request/Response Inspector**: Full HTTP data
- **Export Options**: JSON, CSV, Markdown

## 🛡 Security Features

- **Automatic Sanitization**: Passwords, tokens, sensitive headers
- **Local Storage**: No data leaves your machine
- **Configurable Filtering**: Control what gets logged
- **Access Control**: Dashboard restricted to localhost

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by modern debugging tools and API documentation generators
- Built with simplicity and developer experience in mind
- Special thanks to the open source community

---

**Made with ❤️ by Jules Mahounou**