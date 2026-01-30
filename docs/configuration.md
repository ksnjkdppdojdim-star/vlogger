# VLogger Configuration Reference

> Complete configuration reference for VLogger with examples and best practices.

## Configuration Files

VLogger uses multiple configuration files with a clear precedence order:

1. **Environment Variables** (highest priority)
2. **Command Line Arguments**
3. **vlogger.config.json** (VLogger-specific settings)
4. **install.vlg** (Project metadata + VLogger config)
5. **Default Values** (lowest priority)

## install.vlg

Project configuration file similar to `package.json` or `composer.json`.

```json
{
  "name": "my-api",
  "language": "javascript",
  "version": "1.0.0",
  "description": "My awesome API with VLogger",
  "author": "Your Name",
  "email": "you@example.com",
  "license": "MIT",
  "vlogger": {
    "version": "^1.0.0",
    "adapter": "adapters/javascript/vlogger.js",
    "config": {
      "dashboard": {
        "enabled": true,
        "port": 3333,
        "openBrowser": false
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
        "queryParams": true,
        "body": true,
        "performance": true,
        "errors": true
      },
      "sanitize": {
        "enabled": true,
        "headers": ["authorization", "cookie", "x-api-key"],
        "bodyFields": ["password", "token", "secret"],
        "queryParams": ["api_key", "token"]
      },
      "filters": {
        "excludePaths": ["/favicon.ico", "/health"],
        "excludeStaticFiles": true,
        "minDuration": 0,
        "captureOnlyErrors": false
      },
      "documentation": {
        "autoGenerate": true,
        "outputPath": "./docs",
        "format": "markdown"
      }
    }
  },
  "scripts": {
    "vlogger:start": "node app.js",
    "vlogger:dashboard": "vlg dashboard",
    "vlogger:export": "vlg export json"
  }
}
```

## vlogger.config.json

Detailed VLogger configuration:

```json
{
  "mode": "development",
  "storage": {
    "type": "file",
    "path": "./logs",
    "maxFileSize": 10485760,
    "maxFiles": 10,
    "format": "json",
    "compression": false,
    "encryption": false
  },
  "capture": {
    "requests": true,
    "responses": true,
    "headers": true,
    "queryParams": true,
    "body": true,
    "performance": true,
    "errors": true,
    "fileSystem": {
      "enabled": false,
      "watchPaths": ["./src", "./config"]
    }
  },
  "sanitize": {
    "headers": [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
      "x-access-token"
    ],
    "bodyFields": [
      "password",
      "token",
      "secret",
      "key",
      "pass",
      "auth",
      "credential"
    ],
    "queryParams": [
      "api_key",
      "token",
      "password",
      "secret"
    ],
    "customRules": [
      {
        "pattern": "\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b",
        "replacement": "[CARD_NUMBER]",
        "description": "Credit card numbers"
      }
    ]
  },
  "filters": {
    "excludePaths": [
      "/favicon.ico",
      "/health",
      "/ping",
      "/metrics",
      "/robots.txt"
    ],
    "excludeStaticFiles": true,
    "excludeExtensions": [".css", ".js", ".png", ".jpg", ".ico"],
    "includePaths": [],
    "minDuration": 0,
    "maxDuration": 300000,
    "captureOnlyErrors": false,
    "statusCodes": {
      "include": [],
      "exclude": []
    },
    "methods": {
      "include": ["GET", "POST", "PUT", "DELETE", "PATCH"],
      "exclude": ["OPTIONS", "HEAD"]
    }
  },
  "documentation": {
    "autoGenerate": true,
    "outputPath": "./docs",
    "format": "markdown",
    "includeExamples": true,
    "groupByTag": true,
    "template": "default"
  },
  "dashboard": {
    "enabled": true,
    "port": 3333,
    "host": "localhost",
    "openBrowser": false,
    "auth": {
      "enabled": false,
      "username": "",
      "password": ""
    },
    "ssl": {
      "enabled": false,
      "cert": "",
      "key": ""
    }
  },
  "notifications": {
    "enabled": false,
    "webhook": {
      "url": "",
      "events": ["error", "high_latency"]
    },
    "email": {
      "smtp": {
        "host": "",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "",
          "pass": ""
        }
      },
      "from": "",
      "to": []
    }
  },
  "performance": {
    "sampling": {
      "enabled": false,
      "rate": 0.1
    },
    "thresholds": {
      "slow": 1000,
      "verySlow": 5000
    }
  },
  "debug": false
}
```

## vlogger.info

Project information file:

```json
{
  "name": "My API",
  "version": "1.0.0",
  "description": "RESTful API for my application",
  "author": "Your Name",
  "email": "you@example.com",
  "license": "MIT",
  "links": {
    "repository": "https://github.com/user/repo",
    "documentation": "https://docs.example.com",
    "homepage": "https://example.com"
  },
  "team": {
    "developers": ["Alice", "Bob"],
    "maintainers": ["Charlie"]
  },
  "api": {
    "version": "v1",
    "baseUrl": "https://api.example.com",
    "description": "Main API endpoints",
    "contact": {
      "name": "API Support",
      "email": "api-support@example.com"
    }
  }
}
```

## Configuration Options

### Storage Configuration

```json
{
  "storage": {
    "type": "file",              // Storage type: "file", "database", "memory"
    "path": "./logs",            // Directory for log files
    "maxFileSize": 10485760,     // Max file size in bytes (10MB)
    "maxFiles": 10,              // Max number of log files to keep
    "format": "json",            // Log format: "json", "csv", "txt"
    "compression": false,        // Enable gzip compression
    "encryption": false,         // Enable encryption (requires key)
    "rotation": {
      "enabled": true,           // Enable automatic rotation
      "interval": "daily",       // Rotation interval: "hourly", "daily", "weekly"
      "maxAge": "30d"           // Max age before deletion
    }
  }
}
```

### Capture Configuration

```json
{
  "capture": {
    "requests": true,            // Capture request data
    "responses": true,           // Capture response data
    "headers": true,             // Capture HTTP headers
    "queryParams": true,         // Capture query parameters
    "body": true,                // Capture request/response body
    "performance": true,         // Capture performance metrics
    "errors": true,              // Capture error details
    "stackTrace": true,          // Include stack traces for errors
    "userAgent": true,           // Parse and capture user agent
    "geoLocation": false,        // Capture geo location from IP
    "fileSystem": {
      "enabled": false,          // Monitor file system changes
      "watchPaths": ["./src"],   // Paths to monitor
      "events": ["create", "modify", "delete"]
    }
  }
}
```

### Sanitization Configuration

```json
{
  "sanitize": {
    "headers": [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
      "x-access-token",
      "x-refresh-token"
    ],
    "bodyFields": [
      "password",
      "token",
      "secret",
      "key",
      "pass",
      "auth",
      "credential",
      "ssn",
      "social_security_number"
    ],
    "queryParams": [
      "api_key",
      "token",
      "password",
      "secret",
      "auth"
    ],
    "customRules": [
      {
        "name": "credit_cards",
        "pattern": "\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b",
        "replacement": "[CARD_NUMBER]",
        "description": "Credit card numbers"
      },
      {
        "name": "emails",
        "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
        "replacement": "[EMAIL]",
        "description": "Email addresses"
      }
    ],
    "ipAddresses": false,        // Sanitize IP addresses
    "replacement": "[REDACTED]"  // Default replacement text
  }
}
```

### Filter Configuration

```json
{
  "filters": {
    "excludePaths": [
      "/favicon.ico",
      "/health",
      "/ping",
      "/metrics",
      "/robots.txt",
      "/sitemap.xml"
    ],
    "excludeStaticFiles": true,
    "excludeExtensions": [
      ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", 
      ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot"
    ],
    "includePaths": [],          // Only log these paths (if specified)
    "minDuration": 0,            // Minimum request duration (ms)
    "maxDuration": 300000,       // Maximum request duration (ms)
    "captureOnlyErrors": false,  // Only log error responses
    "statusCodes": {
      "include": [],             // Only log these status codes
      "exclude": [304]           // Exclude these status codes
    },
    "methods": {
      "include": ["GET", "POST", "PUT", "DELETE", "PATCH"],
      "exclude": ["OPTIONS", "HEAD", "TRACE"]
    },
    "contentTypes": {
      "include": [],             // Only log these content types
      "exclude": ["image/*", "video/*", "audio/*"]
    },
    "sampling": {
      "enabled": false,          // Enable request sampling
      "rate": 0.1,              // Sample 10% of requests
      "strategy": "random"       // Sampling strategy: "random", "systematic"
    }
  }
}
```

### Dashboard Configuration

```json
{
  "dashboard": {
    "enabled": true,
    "port": 3333,
    "host": "localhost",         // Bind to specific host
    "openBrowser": false,        // Auto-open browser on start
    "theme": "auto",            // Theme: "light", "dark", "auto"
    "auth": {
      "enabled": false,          // Enable basic authentication
      "username": "admin",
      "password": "password",
      "session": {
        "timeout": 3600,         // Session timeout in seconds
        "secret": "your-secret-key"
      }
    },
    "ssl": {
      "enabled": false,          // Enable HTTPS
      "cert": "./ssl/cert.pem",
      "key": "./ssl/key.pem"
    },
    "cors": {
      "enabled": true,           // Enable CORS
      "origin": "*",
      "methods": ["GET", "POST"],
      "headers": ["Content-Type", "Authorization"]
    },
    "rateLimit": {
      "enabled": false,          // Enable rate limiting
      "windowMs": 900000,        // 15 minutes
      "max": 100                 // Max requests per window
    }
  }
}
```

### Performance Configuration

```json
{
  "performance": {
    "sampling": {
      "enabled": false,          // Enable performance sampling
      "rate": 0.1,              // Sample 10% of requests
      "strategy": "random"       // Sampling strategy
    },
    "thresholds": {
      "slow": 1000,             // Slow request threshold (ms)
      "verySlow": 5000,         // Very slow request threshold (ms)
      "error": 10000            // Error threshold (ms)
    },
    "metrics": {
      "memory": true,           // Track memory usage
      "cpu": false,             // Track CPU usage (if available)
      "disk": false             // Track disk I/O (if available)
    }
  }
}
```

### Notification Configuration

```json
{
  "notifications": {
    "enabled": false,
    "webhook": {
      "url": "https://hooks.slack.com/services/...",
      "events": ["error", "high_latency", "high_error_rate"],
      "headers": {
        "Authorization": "Bearer token"
      },
      "timeout": 5000
    },
    "email": {
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": false,
        "auth": {
          "user": "your-email@gmail.com",
          "pass": "your-password"
        }
      },
      "from": "noreply@yourapp.com",
      "to": ["admin@yourapp.com"],
      "subject": "VLogger Alert: {{event}}"
    },
    "conditions": {
      "errorRate": {
        "threshold": 0.05,       // 5% error rate
        "window": 300            // 5 minute window
      },
      "latency": {
        "threshold": 5000,       // 5 second threshold
        "percentile": 95         // 95th percentile
      }
    }
  }
}
```

## Environment Variables

All configuration options can be overridden with environment variables:

```bash
# General
VLOGGER_MODE=production
VLOGGER_DEBUG=false

# Storage
VLOGGER_STORAGE_PATH=./logs
VLOGGER_STORAGE_MAX_FILES=10
VLOGGER_STORAGE_MAX_SIZE=10485760

# Dashboard
VLOGGER_DASHBOARD_ENABLED=true
VLOGGER_DASHBOARD_PORT=3333
VLOGGER_DASHBOARD_HOST=localhost

# Capture
VLOGGER_CAPTURE_REQUESTS=true
VLOGGER_CAPTURE_RESPONSES=true
VLOGGER_CAPTURE_HEADERS=true
VLOGGER_CAPTURE_BODY=true

# Filters
VLOGGER_FILTERS_MIN_DURATION=0
VLOGGER_FILTERS_CAPTURE_ONLY_ERRORS=false

# Sanitization
VLOGGER_SANITIZE_HEADERS=authorization,cookie,x-api-key
VLOGGER_SANITIZE_BODY_FIELDS=password,token,secret
```

## Configuration Profiles

### Development Profile

```json
{
  "mode": "development",
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
  },
  "dashboard": {
    "enabled": true,
    "openBrowser": true
  }
}
```

### Production Profile

```json
{
  "mode": "production",
  "debug": false,
  "capture": {
    "requests": true,
    "responses": false,
    "headers": false,
    "body": false,
    "performance": true
  },
  "filters": {
    "minDuration": 100,
    "captureOnlyErrors": true,
    "excludeStaticFiles": true
  },
  "performance": {
    "sampling": {
      "enabled": true,
      "rate": 0.01
    }
  },
  "notifications": {
    "enabled": true
  }
}
```

### Testing Profile

```json
{
  "mode": "testing",
  "debug": false,
  "storage": {
    "type": "memory"
  },
  "dashboard": {
    "enabled": false
  },
  "filters": {
    "excludePaths": ["/test", "/mock"]
  }
}
```

## Best Practices

### Security

1. **Never log sensitive data in production**
2. **Use comprehensive sanitization rules**
3. **Enable dashboard authentication in production**
4. **Restrict dashboard access to localhost or VPN**
5. **Use HTTPS for dashboard in production**

### Performance

1. **Enable sampling for high-traffic applications**
2. **Use appropriate filters to reduce log volume**
3. **Disable body capture for large payloads**
4. **Set reasonable file size and retention limits**
5. **Monitor VLogger's own performance impact**

### Maintenance

1. **Regularly review and update sanitization rules**
2. **Monitor log file sizes and disk usage**
3. **Set up log rotation and cleanup**
4. **Review filter effectiveness periodically**
5. **Keep VLogger updated to latest version**

## Validation

VLogger validates configuration on startup and provides helpful error messages:

```bash
# Validate configuration
vlg config --validate

# Show effective configuration
vlg config --show

# Test configuration
vlg config --test
```

For more examples and use cases, see the [Examples](../examples/) directory.