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

    # (rest of implementation copied from top-level vlogger.py omitted here for brevity)
