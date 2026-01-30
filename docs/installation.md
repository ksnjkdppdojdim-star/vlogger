# VLogger Installation Guide

> Complete installation guide for VLogger across different programming languages and frameworks.

## Table of Contents

- [Quick Start](#quick-start)
- [Language-Specific Installation](#language-specific-installation)
- [Framework Integration](#framework-integration)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Install VLogger CLI

**Global Installation (Recommended):**
```bash
# Download CLI tool
curl -o vlg.js https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main/cli/vlg.js
chmod +x vlg.js
sudo mv vlg.js /usr/local/bin/vlg

# Or with Node.js package manager
npm install -g vlogger
```

**Manual Installation:**
```bash
# Clone repository
git clone https://github.com/ksnjkdppdojdim-star/vlogger.git
cd vlogger

# Make CLI executable
chmod +x cli/vlg.js
sudo ln -s $(pwd)/cli/vlg.js /usr/local/bin/vlg
```

### 2. Initialize Your Project

```bash
cd your-project
vlg init
```

This creates:
- `install.vlg` - Project configuration
- `vlogger.config.json` - VLogger settings
- `vlogger.info` - Project information

### 3. Install Language Adapter

```bash
vlg install
```

### 4. Integrate in Your Code

See [Framework Integration](#framework-integration) section for specific instructions.

### 5. Start Logging

```bash
vlg start
# or run your app normally
vlg dashboard  # Open dashboard at http://localhost:3333
```

## Language-Specific Installation

### JavaScript/Node.js

**Requirements:**
- Node.js 14+ 
- npm or yarn

**Installation:**
```bash
vlg init  # Select JavaScript
vlg install
```

**Manual Installation:**
```bash
# Download adapter
curl -o vlogger.js https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main/adapters/javascript/vlogger.js

# Create config files (see templates)
```

**Dependencies:**
- No external dependencies required
- Works with any Node.js HTTP framework

### PHP

**Requirements:**
- PHP 7.4+
- Composer (optional)

**Installation:**
```bash
vlg init  # Select PHP
vlg install
```

**Manual Installation:**
```bash
# Download adapter
curl -o vlogger.php https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main/adapters/php/vlogger.php
```

**Dependencies:**
- No external dependencies
- Uses native PHP functions only

### Python

**Requirements:**
- Python 3.7+
- pip

**Installation:**
```bash
vlg init  # Select Python
vlg install
```

**Manual Installation:**
```bash
# Download adapter
curl -o vlogger.py https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main/adapters/python/vlogger.py

# Install optional dependencies
pip install psutil  # For memory monitoring
```

**Dependencies:**
- `psutil` (optional, for memory monitoring)

### Java

**Requirements:**
- Java 8+
- Maven or Gradle

**Installation:**
```bash
vlg init  # Select Java
vlg install
```

**Manual Installation:**
```bash
# Download adapter
curl -o VLogger.java https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main/adapters/java/VLogger.java
```

### Go

**Requirements:**
- Go 1.16+

**Installation:**
```bash
vlg init  # Select Go
vlg install
```

**Manual Installation:**
```bash
# Download adapter
curl -o vlogger.go https://raw.githubusercontent.com/ksnjkdppdojdim-star/vlogger/main/adapters/go/vlogger.go
```

## Framework Integration

### Express.js (Node.js)

```javascript
const express = require('express');
const VLogger = require('./vlogger');

const app = express();
const logger = new VLogger();

// Apply middleware
app.use(logger.middleware());

app.listen(3000, () => {
  console.log('Server running with VLogger');
});
```

### Nest.js (Node.js)

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as VLogger from './vlogger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const logger = new VLogger();
  app.use(logger.middleware());
  
  await app.listen(3000);
}
bootstrap();
```

### Laravel (PHP)

**1. Add to Middleware:**
```php
// app/Http/Middleware/VLoggerMiddleware.php
<?php
namespace App\Http\Middleware;

require_once base_path('vlogger.php');

class VLoggerMiddleware
{
    private $vlogger;
    
    public function __construct()
    {
        $this->vlogger = new VLogger();
    }
    
    public function handle($request, \Closure $next)
    {
        return $this->vlogger->laravelMiddleware($request, $next);
    }
}
```

**2. Register Middleware:**
```php
// app/Http/Kernel.php
protected $middleware = [
    // ...
    \App\Http\Middleware\VLoggerMiddleware::class,
];
```

### Django (Python)

**1. Add to settings.py:**
```python
MIDDLEWARE = [
    # ... other middleware
    'path.to.DjangoVLoggerMiddleware',
]
```

**2. Create middleware file:**
```python
# middleware.py
from vlogger import DjangoVLoggerMiddleware
```

### Flask (Python)

```python
from flask import Flask
from vlogger import VLogger

app = Flask(__name__)
logger = VLogger()

app.wsgi_app = logger.middleware(app.wsgi_app)

if __name__ == '__main__':
    app.run(debug=True)
```

### FastAPI (Python)

```python
from fastapi import FastAPI
from vlogger import VLogger

app = FastAPI()
logger = VLogger()

app = logger.fastapi_middleware(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Spring Boot (Java)

```java
@Component
public class VLoggerConfig {
    
    @Bean
    public FilterRegistrationBean<VLoggerFilter> vloggerFilter() {
        VLogger vlogger = new VLogger();
        FilterRegistrationBean<VLoggerFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new VLoggerFilter(vlogger));
        registration.addUrlPatterns("/*");
        return registration;
    }
}
```

### Gin (Go)

```go
package main

import (
    "github.com/gin-gonic/gin"
    "./vlogger"
)

func main() {
    r := gin.Default()
    
    logger := vlogger.New()
    r.Use(logger.Middleware())
    
    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "Hello World"})
    })
    
    r.Run(":8080")
}
```

## Configuration

### install.vlg

Project configuration file:

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
      },
      "capture": {
        "requests": true,
        "responses": true,
        "headers": true,
        "body": true,
        "performance": true
      },
      "sanitize": {
        "headers": ["authorization", "cookie"],
        "bodyFields": ["password", "token"],
        "queryParams": ["api_key"]
      },
      "filters": {
        "excludePaths": ["/health", "/favicon.ico"],
        "excludeStaticFiles": true,
        "minDuration": 0,
        "captureOnlyErrors": false
      }
    }
  }
}
```

### Environment Variables

```bash
# Dashboard configuration
VLOGGER_DASHBOARD_ENABLED=true
VLOGGER_DASHBOARD_PORT=3333

# Storage configuration
VLOGGER_STORAGE_PATH=./logs
VLOGGER_STORAGE_MAX_FILES=10
VLOGGER_STORAGE_MAX_SIZE=10485760

# Debug mode
VLOGGER_DEBUG=false
```

### Configuration Precedence

1. Environment variables (highest)
2. Command line arguments
3. `vlogger.config.json`
4. `install.vlg` configuration
5. Default values (lowest)

## Troubleshooting

### Common Issues

**1. Permission denied when installing CLI**
```bash
# Fix: Use sudo or install to user directory
sudo mv vlg.js /usr/local/bin/vlg
# OR
mv vlg.js ~/.local/bin/vlg
export PATH="$HOME/.local/bin:$PATH"
```

**2. Dashboard not accessible**
```bash
# Check if port is in use
netstat -tulpn | grep 3333
# Change port in config
vlg config  # Edit dashboard.port
```

**3. No logs appearing**
- Check if middleware is properly applied
- Verify exclude filters are not too broad
- Check file permissions in logs directory
- Enable debug mode: `VLOGGER_DEBUG=true`

**4. High memory usage**
- Reduce log retention: Lower `maxFiles` in config
- Enable filters to reduce logged requests
- Implement log rotation

**5. Performance impact**
- Enable `captureOnlyErrors` for production
- Increase `minDuration` to filter fast requests
- Disable `body` capture for large payloads

### Debug Mode

Enable debug logging:

```bash
# Environment variable
export VLOGGER_DEBUG=true

# Or in config
{
  "debug": true
}
```

### Log Levels

```bash
# View internal VLogger logs
tail -f logs/vlogger-debug.log
```

### Health Check

```bash
# Check VLogger status
vlg version
vlg config

# Test installation
curl http://localhost:3333/api/stats
```

### Reset Configuration

```bash
# Remove all VLogger files and start fresh
rm -f install.vlg vlogger.config.json vlogger.info
rm -rf logs/
vlg init
```

### Performance Tuning

**For High-Traffic Applications:**

```json
{
  "filters": {
    "excludeStaticFiles": true,
    "excludePaths": ["/health", "/metrics", "/favicon.ico"],
    "minDuration": 100,
    "captureOnlyErrors": false
  },
  "capture": {
    "body": false,
    "headers": false
  },
  "storage": {
    "maxFileSize": 5242880,
    "maxFiles": 5
  }
}
```

**For Development:**

```json
{
  "debug": true,
  "capture": {
    "requests": true,
    "responses": true,
    "headers": true,
    "body": true,
    "performance": true
  },
  "filters": {
    "minDuration": 0,
    "captureOnlyErrors": false
  }
}
```

### Getting Help

- **GitHub Issues:** https://github.com/ksnjkdppdojdim-star/vlogger/issues
- **Documentation:** https://github.com/ksnjkdppdojdim-star/vlogger/docs
- **Examples:** https://github.com/ksnjkdppdojdim-star/vlogger/examples

For more detailed configuration options, see the [Configuration Reference](configuration.md).