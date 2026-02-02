"""
VLogger Python Adapter

@author: Jules Mahounou
@version: 1.5.12
@license: MIT

This adapter provides VLogger integration for Python applications
including Django, Flask, FastAPI, and vanilla Python web servers.

Supported Frameworks:
- Django
- Flask  
- FastAPI
- Tornado
- Bottle
- Pyramid
- Vanilla WSGI/ASGI

Usage:
from vlogger import VLogger

logger = VLogger()

# Flask
app.wsgi_app = logger.middleware(app.wsgi_app)

# Django: Add to MIDDLEWARE in settings.py
# FastAPI: Add as middleware
# Tornado: Add as handler
"""

import json
import os
import time
import hashlib
import logging
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable
from urllib.parse import urlparse, parse_qs
import http.server
import socketserver
from pathlib import Path

class VLogger:
    """VLogger Python Adapter for web application logging"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize VLogger with configuration"""
        self.start_time = time.time()
        self.config = self._load_config(config)
        self.project_info = self._load_project_info()
        
        self.stats = {
            'total_requests': 0,
            'total_errors': 0,
            'endpoints': {},
            'started_at': datetime.now().isoformat()
        }
        
        self._ensure_log_directory()
        self._setup_logging()
        
        if self.config['dashboard']['enabled']:
            self._start_dashboard()
        
        self._start_cleanup_thread()
        
        logging.info(f"[VLogger] Python adapter initialized - Dashboard: "
                    f"{'http://localhost:' + str(self.config['dashboard']['port']) if self.config['dashboard']['enabled'] else 'disabled'}")
    
    def _load_config(self, provided_config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Load configuration from files or use defaults"""
        default_config = {
            'storage': {
                'path': './logs',
                'max_file_size': 10 * 1024 * 1024,  # 10MB
                'max_files': 10
            },
            'capture': {
                'requests': True,
                'responses': True,
                'headers': True,
                'body': True,
                'performance': True
            },
            'sanitize': {
                'headers': ['authorization', 'cookie', 'x-api-key'],
                'body_fields': ['password', 'token', 'secret'],
                'query_params': ['api_key', 'token']
            },
            'filters': {
                'exclude_paths': ['/favicon.ico', '/health'],
                'exclude_static_files': True,
                'min_duration': 0
            },
            'dashboard': {
                'enabled': True,
                'port': 3333
            }
        }
        
        file_config = {}
        if os.path.exists('./vlogger.config.json'):
            try:
                with open('./vlogger.config.json', 'r') as f:
                    file_config = json.load(f)
            except Exception as e:
                logging.warning(f'[VLogger] Warning: Could not load vlogger.config.json: {e}')
        
        # Merge configurations
        config = {**default_config}
        if file_config:
            config.update(file_config)
        if provided_config:
            config.update(provided_config)
        
        return config
    
    def _load_project_info(self) -> Dict[str, Any]:
        """Load project information"""
        default_info = {
            'name': 'Python Project',
            'version': '1.5.12',
            'description': 'Python application with VLogger',
            'api': {
                'version': '1.0',
                'base_url': 'http://localhost:8000'
            }
        }
        
        if os.path.exists('./vlogger.info'):
            try:
                with open('./vlogger.info', 'r') as f:
                    file_info = json.load(f)
                return {**default_info, **file_info}
            except Exception as e:
                logging.warning(f'[VLogger] Warning: Could not load vlogger.info: {e}')
        
        # Try to load from setup.py or pyproject.toml
        if os.path.exists('./setup.py'):
            try:
                with open('./setup.py', 'r') as f:
                    content = f.read()
                    # Simple extraction (would need more sophisticated parsing in real implementation)
                    if 'name=' in content:
                        name_start = content.find('name=') + 6
                        name_end = content.find('\n', name_start) or content.find(',', name_start)
                        name = content[name_start:name_end].strip('\'"')
                        default_info['name'] = name
            except Exception:
                pass
        
        return default_info
    
    def _setup_logging(self):
        """Setup internal logging"""
        logging.basicConfig(level=logging.INFO)
    
    def _ensure_log_directory(self):
        """Ensure log directory exists"""
        log_dir = Path(self.config['storage']['path'])
        log_dir.mkdir(parents=True, exist_ok=True)
    
    # WSGI Middleware
    def middleware(self, app: Callable) -> Callable:
        """WSGI middleware for Flask, Django, etc."""
        def wsgi_app(environ, start_response):
            if self._should_skip_request_wsgi(environ):
                return app(environ, start_response)
            
            start_time = time.time()
            log_entry = self._create_log_entry_wsgi(environ, start_time)
            
            # Capture response
            response_data = []
            status_code = [None]
            headers_data = [None]
            
            def custom_start_response(status, headers, exc_info=None):
                status_code[0] = status
                headers_data[0] = headers
                return start_response(status, headers, exc_info)
            
            def capture_response(data):
                response_data.append(data)
                return data
            
            try:
                response = app(environ, custom_start_response)
                
                # Capture response data
                if hasattr(response, '__iter__'):
                    response = [capture_response(chunk) for chunk in response]
                else:
                    response = [capture_response(response)]
                
                self._capture_response(log_entry, status_code[0], headers_data[0], 
                                     b''.join(response_data), start_time)
                
                return response
                
            except Exception as e:
                log_entry['error'] = {
                    'message': str(e),
                    'type': type(e).__name__
                }
                log_entry['is_error'] = True
                self._save_log(log_entry)
                raise
        
        return wsgi_app
    
    # Flask specific
    def flask_middleware(self, app):
        """Flask-specific middleware"""
        @app.before_request
        def before_request():
            if self._should_skip_flask_request():
                return
            
            from flask import request, g
            start_time = time.time()
            g.vlogger_start = start_time
            g.vlogger_entry = self._create_log_entry_flask(request, start_time)
        
        @app.after_request  
        def after_request(response):
            from flask import g
            if hasattr(g, 'vlogger_entry'):
                self._capture_flask_response(g.vlogger_entry, response, g.vlogger_start)
            return response
        
        return app
    
    # Django specific
    def django_middleware(self, get_response):
        """Django middleware class"""
        def middleware(request):
            if self._should_skip_django_request(request):
                return get_response(request)
            
            start_time = time.time()
            log_entry = self._create_log_entry_django(request, start_time)
            
            response = get_response(request)
            
            self._capture_django_response(log_entry, response, start_time)
            
            return response
        
        return middleware
    
    # FastAPI specific  
    def fastapi_middleware(self, app):
        """FastAPI middleware"""
        @app.middleware("http")
        async def vlogger_middleware(request, call_next):
            if self._should_skip_fastapi_request(request):
                response = await call_next(request)
                return response
            
            start_time = time.time()
            log_entry = await self._create_log_entry_fastapi(request, start_time)
            
            response = await call_next(request)
            
            await self._capture_fastapi_response(log_entry, response, start_time)
            
            return response
        
        return app
    
    def _should_skip_request_wsgi(self, environ: Dict[str, Any]) -> bool:
        """Check if WSGI request should be skipped"""
        path = environ.get('PATH_INFO', '')
        return self._should_skip_path(path)
    
    def _should_skip_flask_request(self) -> bool:
        """Check if Flask request should be skipped"""
        from flask import request
        return self._should_skip_path(request.path)
    
    def _should_skip_django_request(self, request) -> bool:
        """Check if Django request should be skipped"""
        return self._should_skip_path(request.path)
    
    def _should_skip_fastapi_request(self, request) -> bool:
        """Check if FastAPI request should be skipped"""
        return self._should_skip_path(request.url.path)
    
    def _should_skip_path(self, path: str) -> bool:
        """Check if path should be skipped based on filters"""
        if path in self.config['filters']['exclude_paths']:
            return True
        
        if self.config['filters']['exclude_static_files']:
            static_extensions = ['.css', '.js', '.png', '.jpg', '.ico', '.svg', '.woff']
            if any(path.endswith(ext) for ext in static_extensions):
                return True
        
        return False
    
    def _create_log_entry_wsgi(self, environ: Dict[str, Any], start_time: float) -> Dict[str, Any]:
        """Create log entry from WSGI environ"""
        method = environ.get('REQUEST_METHOD', 'GET')
        path = environ.get('PATH_INFO', '')
        query_string = environ.get('QUERY_STRING', '')
        
        return {
            'id': self._generate_id(start_time),
            'timestamp': datetime.fromtimestamp(start_time).isoformat(),
            'method': method,
            'path': path,
            'full_url': self._get_full_url_wsgi(environ),
            'query': self._sanitize_object(parse_qs(query_string), self.config['sanitize']['query_params']),
            'headers': self._sanitize_object(self._get_headers_wsgi(environ), self.config['sanitize']['headers']),
            'body': None,  # Would need to read from environ['wsgi.input']
            'ip': self._get_client_ip_wsgi(environ),
            'response': None,
            'performance': {
                'start_time': start_time,
                'duration': 0,
                'memory': self._get_memory_usage()
            },
            'is_error': False,
            'error': None
        }
    
    def _create_log_entry_flask(self, request, start_time: float) -> Dict[str, Any]:
        """Create log entry from Flask request"""
        return {
            'id': self._generate_id(start_time),
            'timestamp': datetime.fromtimestamp(start_time).isoformat(),
            'method': request.method,
            'path': request.path,
            'full_url': request.url,
            'query': self._sanitize_object(dict(request.args), self.config['sanitize']['query_params']),
            'headers': self._sanitize_object(dict(request.headers), self.config['sanitize']['headers']),
            'body': self._sanitize_object(self._get_request_body_flask(request), self.config['sanitize']['body_fields']),
            'ip': self._get_client_ip_flask(request),
            'response': None,
            'performance': {
                'start_time': start_time,
                'duration': 0,
                'memory': self._get_memory_usage()
            },
            'is_error': False,
            'error': None
        }
    
    def _create_log_entry_django(self, request, start_time: float) -> Dict[str, Any]:
        """Create log entry from Django request"""
        return {
            'id': self._generate_id(start_time),
            'timestamp': datetime.fromtimestamp(start_time).isoformat(),
            'method': request.method,
            'path': request.path,
            'full_url': request.build_absolute_uri(),
            'query': self._sanitize_object(dict(request.GET), self.config['sanitize']['query_params']),
            'headers': self._sanitize_object(dict(request.headers), self.config['sanitize']['headers']),
            'body': self._sanitize_object(self._get_request_body_django(request), self.config['sanitize']['body_fields']),
            'ip': self._get_client_ip_django(request),
            'response': None,
            'performance': {
                'start_time': start_time,
                'duration': 0,
                'memory': self._get_memory_usage()
            },
            'is_error': False,
            'error': None
        }
    
    async def _create_log_entry_fastapi(self, request, start_time: float) -> Dict[str, Any]:
        """Create log entry from FastAPI request"""
        body = None
        try:
            body_bytes = await request.body()
            if body_bytes:
                body = json.loads(body_bytes.decode('utf-8'))
        except Exception:
            pass
        
        return {
            'id': self._generate_id(start_time),
            'timestamp': datetime.fromtimestamp(start_time).isoformat(),
            'method': request.method,
            'path': request.url.path,
            'full_url': str(request.url),
            'query': self._sanitize_object(dict(request.query_params), self.config['sanitize']['query_params']),
            'headers': self._sanitize_object(dict(request.headers), self.config['sanitize']['headers']),
            'body': self._sanitize_object(body, self.config['sanitize']['body_fields']),
            'ip': self._get_client_ip_fastapi(request),
            'response': None,
            'performance': {
                'start_time': start_time,
                'duration': 0,
                'memory': self._get_memory_usage()
            },
            'is_error': False,
            'error': None
        }
    
    def _generate_id(self, start_time: float) -> str:
        """Generate unique ID for log entry"""
        timestamp = int(start_time * 1000)
        hash_input = f"{timestamp}{time.time()}"
        hash_hex = hashlib.md5(hash_input.encode()).hexdigest()[:8]
        return f"{timestamp}-{hash_hex}"
    
    def _get_full_url_wsgi(self, environ: Dict[str, Any]) -> str:
        """Get full URL from WSGI environ"""
        scheme = environ.get('wsgi.url_scheme', 'http')
        host = environ.get('HTTP_HOST', environ.get('SERVER_NAME', 'localhost'))
        path = environ.get('PATH_INFO', '')
        query = environ.get('QUERY_STRING', '')
        
        url = f"{scheme}://{host}{path}"
        if query:
            url += f"?{query}"
        
        return url
    
    def _get_headers_wsgi(self, environ: Dict[str, Any]) -> Dict[str, str]:
        """Extract headers from WSGI environ"""
        headers = {}
        for key, value in environ.items():
            if key.startswith('HTTP_'):
                header_name = key[5:].replace('_', '-').lower()
                headers[header_name] = value
            elif key in ['CONTENT_TYPE', 'CONTENT_LENGTH']:
                headers[key.replace('_', '-').lower()] = value
        
        return headers
    
    def _get_client_ip_wsgi(self, environ: Dict[str, Any]) -> str:
        """Get client IP from WSGI environ"""
        forwarded_for = environ.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = environ.get('HTTP_X_REAL_IP')
        if real_ip:
            return real_ip
        
        return environ.get('REMOTE_ADDR', 'unknown')
    
    def _get_client_ip_flask(self, request) -> str:
        """Get client IP from Flask request"""
        return request.remote_addr or 'unknown'
    
    def _get_client_ip_django(self, request) -> str:
        """Get client IP from Django request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', 'unknown')
    
    def _get_client_ip_fastapi(self, request) -> str:
        """Get client IP from FastAPI request"""
        return request.client.host if request.client else 'unknown'
    
    def _get_request_body_flask(self, request) -> Any:
        """Get request body from Flask request"""
        if request.content_type and 'application/json' in request.content_type:
            return request.get_json(silent=True)
        return request.form.to_dict() if request.form else None
    
    def _get_request_body_django(self, request) -> Any:
        """Get request body from Django request"""
        if request.content_type and 'application/json' in request.content_type:
            try:
                return json.loads(request.body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        return dict(request.POST) if request.POST else None
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB"""
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024
        except ImportError:
            return 0.0
    
    def _capture_response(self, log_entry: Dict[str, Any], status: str, headers: List, 
                         body: bytes, start_time: float):
        """Capture response data"""
        end_time = time.time()
        duration = (end_time - start_time) * 1000  # Convert to milliseconds
        
        status_code = int(status.split()[0])
        
        log_entry['response'] = {
            'status': status_code,
            'status_text': status.split(' ', 1)[1] if ' ' in status else '',
            'headers': self._sanitize_object(dict(headers), self.config['sanitize']['headers']),
            'body': self._sanitize_response_body(body),
            'duration': duration,
            'size': len(body) if body else 0
        }
        
        log_entry['performance']['duration'] = duration
        log_entry['performance']['memory'] = self._get_memory_usage()
        log_entry['is_error'] = status_code >= 400
        
        if self._should_log_entry(log_entry):
            self._save_log(log_entry)
            self._update_stats(log_entry)
    
    def _capture_flask_response(self, log_entry: Dict[str, Any], response, start_time: float):
        """Capture Flask response"""
        end_time = time.time()
        duration = (end_time - start_time) * 1000
        
        log_entry['response'] = {
            'status': response.status_code,
            'status_text': '',
            'headers': self._sanitize_object(dict(response.headers), self.config['sanitize']['headers']),
            'body': self._sanitize_response_body(response.get_data()),
            'duration': duration,
            'size': response.content_length or 0
        }
        
        log_entry['performance']['duration'] = duration
        log_entry['performance']['memory'] = self._get_memory_usage()
        log_entry['is_error'] = response.status_code >= 400
        
        if self._should_log_entry(log_entry):
            self._save_log(log_entry)
            self._update_stats(log_entry)
    
    def _capture_django_response(self, log_entry: Dict[str, Any], response, start_time: float):
        """Capture Django response"""
        end_time = time.time()
        duration = (end_time - start_time) * 1000
        
        log_entry['response'] = {
            'status': response.status_code,
            'status_text': '',
            'headers': self._sanitize_object(dict(response.headers) if hasattr(response, 'headers') else {}, 
                                           self.config['sanitize']['headers']),
            'body': self._sanitize_response_body(response.content),
            'duration': duration,
            'size': len(response.content) if hasattr(response, 'content') else 0
        }
        
        log_entry['performance']['duration'] = duration
        log_entry['performance']['memory'] = self._get_memory_usage()
        log_entry['is_error'] = response.status_code >= 400
        
        if self._should_log_entry(log_entry):
            self._save_log(log_entry)
            self._update_stats(log_entry)
    
    async def _capture_fastapi_response(self, log_entry: Dict[str, Any], response, start_time: float):
        """Capture FastAPI response"""
        end_time = time.time()
        duration = (end_time - start_time) * 1000
        
        # Read response body
        body = b""
        if hasattr(response, 'body_iterator'):
            chunks = []
            async for chunk in response.body_iterator:
                chunks.append(chunk)
            body = b"".join(chunks)
            # Recreate response with the body
            response.body_iterator = iter([body])
        
        log_entry['response'] = {
            'status': response.status_code,
            'status_text': '',
            'headers': self._sanitize_object(dict(response.headers), self.config['sanitize']['headers']),
            'body': self._sanitize_response_body(body),
            'duration': duration,
            'size': len(body)
        }
        
        log_entry['performance']['duration'] = duration
        log_entry['performance']['memory'] = self._get_memory_usage()
        log_entry['is_error'] = response.status_code >= 400
        
        if self._should_log_entry(log_entry):
            self._save_log(log_entry)
            self._update_stats(log_entry)
    
    def _should_log_entry(self, log_entry: Dict[str, Any]) -> bool:
        """Check if log entry should be saved"""
        if (self.config['filters'].get('capture_only_errors') and 
            not log_entry['is_error']):
            return False
        
        if log_entry['performance']['duration'] < self.config['filters']['min_duration']:
            return False
        
        return True
    
    def _sanitize_object(self, obj: Any, sensitive_fields: List[str]) -> Any:
        """Sanitize object by replacing sensitive fields"""
        if not isinstance(obj, dict):
            return obj
        
        sanitized = obj.copy()
        
        for field in sensitive_fields:
            field_lower = field.lower()
            for key in list(sanitized.keys()):
                if field_lower in key.lower():
                    sanitized[key] = '[REDACTED]'
        
        return sanitized
    
    def _sanitize_response_body(self, body: Any) -> Any:
        """Sanitize response body"""
        if isinstance(body, bytes):
            try:
                decoded = json.loads(body.decode('utf-8'))
                return self._sanitize_object(decoded, self.config['sanitize']['body_fields'])
            except (json.JSONDecodeError, UnicodeDecodeError):
                return '[BINARY_DATA]'
        elif isinstance(body, dict):
            return self._sanitize_object(body, self.config['sanitize']['body_fields'])
        
        return body
    
    def _save_log(self, log_entry: Dict[str, Any]):
        """Save log entry to file"""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            filename = f"vlogger-{today}.json"
            filepath = Path(self.config['storage']['path']) / filename
            
            logs = []
            if filepath.exists():
                try:
                    with open(filepath, 'r') as f:
                        logs = json.load(f)
                except (json.JSONDecodeError, FileNotFoundError):
                    logs = []
            
            logs.append(log_entry)
            
            with open(filepath, 'w') as f:
                json.dump(logs, f, indent=2)
            
            self._check_file_rotation(filepath)
            
        except Exception as e:
            logging.error(f'[VLogger] Error saving log: {e}')
    
    def _update_stats(self, log_entry: Dict[str, Any]):
        """Update statistics"""
        self.stats['total_requests'] += 1
        
        if log_entry['is_error']:
            self.stats['total_errors'] += 1
        
        endpoint_key = f"{log_entry['method']}:{log_entry['path']}"
        if endpoint_key not in self.stats['endpoints']:
            self.stats['endpoints'][endpoint_key] = {
                'method': log_entry['method'],
                'path': log_entry['path'],
                'calls': 0,
                'errors': 0,
                'total_duration': 0,
                'avg_duration': 0,
                'min_duration': float('inf'),
                'max_duration': 0,
                'status_codes': {}
            }
        
        endpoint = self.stats['endpoints'][endpoint_key]
        endpoint['calls'] += 1
        endpoint['total_duration'] += log_entry['performance']['duration']
        endpoint['avg_duration'] = endpoint['total_duration'] / endpoint['calls']
        endpoint['min_duration'] = min(endpoint['min_duration'], log_entry['performance']['duration'])
        endpoint['max_duration'] = max(endpoint['max_duration'], log_entry['performance']['duration'])
        
        if log_entry['is_error']:
            endpoint['errors'] += 1
        
        status = log_entry['response']['status']
        endpoint['status_codes'][status] = endpoint['status_codes'].get(status, 0) + 1
    
    def _check_file_rotation(self, filepath: Path):
        """Check if file needs rotation"""
        if filepath.stat().st_size > self.config['storage']['max_file_size']:
            timestamp = int(time.time())
            new_path = filepath.with_name(f"{filepath.stem}-{timestamp}.json")
            filepath.rename(new_path)
            self._clean_old_files()
    
    def _clean_old_files(self):
        """Clean old log files"""
        try:
            log_dir = Path(self.config['storage']['path'])
            log_files = sorted(log_dir.glob('vlogger-*.json'), 
                             key=lambda x: x.stat().st_mtime, reverse=True)
            
            if len(log_files) > self.config['storage']['max_files']:
                for file in log_files[self.config['storage']['max_files']:]:
                    file.unlink()
                    logging.info(f'[VLogger] Deleted old log file: {file.name}')
        except Exception as e:
            logging.error(f'[VLogger] Error cleaning old files: {e}')
    
    def _start_dashboard(self):
        """Start dashboard server in separate thread"""
        def run_server():
            try:
                handler = self._create_dashboard_handler()
                port = self.config['dashboard']['port']
                with socketserver.TCPServer(("", port), handler) as httpd:
                    logging.info(f"[VLogger] Dashboard available at http://localhost:{port}")
                    httpd.serve_forever()
            except Exception as e:
                logging.error(f'[VLogger] Error starting dashboard: {e}')
        
        dashboard_thread = threading.Thread(target=run_server, daemon=True)
        dashboard_thread.start()
    
    def _create_dashboard_handler(self):
        """Create dashboard HTTP handler"""
        vlogger = self
        
        class DashboardHandler(http.server.SimpleHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/':
                    self._serve_dashboard_html()
                elif self.path == '/api/stats':
                    self._serve_stats()
                elif self.path == '/api/logs':
                    self._serve_logs()
                elif self.path == '/api/project':
                    self._serve_project_info()
                else:
                    self.send_error(404)
            
            def _serve_dashboard_html(self):
                html = vlogger._generate_dashboard_html()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.send_header('Content-Length', str(len(html)))
                self.end_headers()
                self.wfile.write(html.encode('utf-8'))
            
            def _serve_stats(self):
                stats_copy = vlogger.stats.copy()
                stats_copy['endpoints'] = [
                    {'endpoint': k, **v} for k, v in vlogger.stats['endpoints'].items()
                ]
                
                response = json.dumps(stats_copy, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response)))
                self.end_headers()
                self.wfile.write(response.encode('utf-8'))
            
            def _serve_logs(self):
                try:
                    today = datetime.now().strftime('%Y-%m-%d')
                    filepath = Path(vlogger.config['storage']['path']) / f"vlogger-{today}.json"
                    
                    logs = []
                    if filepath.exists():
                        with open(filepath, 'r') as f:
                            logs = json.load(f)
                    
                    recent_logs = list(reversed(logs[-50:]))  # Last 50 logs, most recent first
                    
                    response = json.dumps(recent_logs, indent=2)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Content-Length', str(len(response)))
                    self.end_headers()
                    self.wfile.write(response.encode('utf-8'))
                except Exception as e:
                    error_response = json.dumps({'error': str(e)})
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Content-Length', str(len(error_response)))
                    self.end_headers()
                    self.wfile.write(error_response.encode('utf-8'))
            
            def _serve_project_info(self):
                response = json.dumps(vlogger.project_info, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response)))
                self.end_headers()
                self.wfile.write(response.encode('utf-8'))
        
        return DashboardHandler
    
    def _generate_dashboard_html(self) -> str:
        """Generate dashboard HTML"""
        return '''
<!DOCTYPE html>
<html>
<head>
    <title>VLogger Dashboard - Python</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 24px; }
        .stat-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2.5em; font-weight: 700; margin: 8px 0; }
        .stat-label { color: #6c757d; font-weight: 500; }
        .logs { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .log-entry { padding: 16px; border-bottom: 1px solid #e9ecef; }
        .log-entry:last-child { border-bottom: none; }
        .log-method { font-weight: 600; color: #495057; }
        .log-path { margin-left: 8px; }
        .log-status { padding: 4px 8px; border-radius: 4px; font-size: 0.9em; font-weight: 500; }
        .status-success { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .log-duration { color: #6c757d; margin-left: 8px; }
        .log-time { color: #adb5bd; font-size: 0.9em; display: block; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐍 VLogger Dashboard - Python</h1>
            <p>Real-time monitoring for your Python application</p>
        </div>
        
        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-label">Total Requests</div>
                <div class="stat-number" id="total-requests">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Errors</div>
                <div class="stat-number" style="color: #dc3545;" id="total-errors">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Uptime</div>
                <div class="stat-number" style="color: #28a745;" id="uptime">0s</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Endpoints</div>
                <div class="stat-number" style="color: #17a2b8;" id="endpoints">0</div>
            </div>
        </div>
        
        <div class="logs">
            <h2>Recent Requests</h2>
            <div id="logs">
                <p style="color: #6c757d; text-align: center; padding: 40px;">No requests logged yet...</p>
            </div>
        </div>
    </div>
    
    <script>
        function formatDuration(ms) {
            if (ms < 1000) return ms + 'ms';
            if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
            return (ms / 60000).toFixed(1) + 'm';
        }
        
        function loadStats() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('total-requests').textContent = data.total_requests;
                    document.getElementById('total-errors').textContent = data.total_errors;
                    document.getElementById('uptime').textContent = formatDuration(Date.now() - new Date(data.started_at).getTime());
                    document.getElementById('endpoints').textContent = data.endpoints.length;
                })
                .catch(console.error);
        }
        
        function loadLogs() {
            fetch('/api/logs')
                .then(r => r.json())
                .then(data => {
                    const logsDiv = document.getElementById('logs');
                    if (data.length === 0) {
                        logsDiv.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 40px;">No requests logged yet...</p>';
                        return;
                    }
                    
                    logsDiv.innerHTML = data.map(log => `
                        <div class="log-entry">
                            <div>
                                <span class="log-method">${log.method}</span>
                                <span class="log-path">${log.path}</span>
                                <span class="log-status ${log.is_error ? 'status-error' : 'status-success'}">${log.response?.status || 'N/A'}</span>
                                <span class="log-duration">(${Math.round(log.performance?.duration || 0)}ms)</span>
                            </div>
                            <small class="log-time">${new Date(log.timestamp).toLocaleString()}</small>
                        </div>
                    `).join('');
                })
                .catch(console.error);
        }
        
        loadStats();
        loadLogs();
        setInterval(loadStats, 5000);
        setInterval(loadLogs, 10000);
    </script>
</body>
</html>
        '''
    
    def _start_cleanup_thread(self):
        """Start cleanup thread"""
        def cleanup_worker():
            while True:
                time.sleep(3600)  # Run every hour
                self._clean_old_files()
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
    
    def stop(self):
        """Stop VLogger"""
        logging.info('[VLogger] Stopped')

# Django middleware class (can be imported separately)
class DjangoVLoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.vlogger = VLogger()
    
    def __call__(self, request):
        return self.vlogger.django_middleware(self.get_response)(request)