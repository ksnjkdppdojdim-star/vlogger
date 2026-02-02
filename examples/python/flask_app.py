"""
Example Flask Application with VLogger

This example demonstrates how to integrate VLogger with a Flask application.
Compatible with Python 3.8+
"""

import sys
import os
import time
from datetime import datetime

# Check Python version compatibility
if sys.version_info < (3, 8):
    print(f"VLogger requires Python 3.8 or higher. Current version: {sys.version}")
    sys.exit(1)

# Add the adapters directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'adapters', 'python'))

try:
    from flask import Flask, request, jsonify
    from vlogger import VLogger
except ImportError as e:
    print(f"Missing dependencies: {e}")
    print("Please install: pip install flask psutil")
    sys.exit(1)

# Create Flask app
app = Flask(__name__)

# Initialize VLogger
try:
    logger = VLogger()
    app = logger.flask_middleware(app)
except Exception as e:
    print(f"VLogger initialization failed: {e}")

# Mock data
users = [
    {'id': 1, 'name': 'John Doe', 'email': 'john@example.com'},
    {'id': 2, 'name': 'Jane Smith', 'email': 'jane@example.com'},
    {'id': 3, 'name': 'Bob Johnson', 'email': 'bob@example.com'}
]

# CORS headers for development
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Welcome to VLogger Python Flask Example API',
        'timestamp': datetime.now().isoformat(),
        'python_version': sys.version,
        'endpoints': [
            'GET /',
            'GET /users',
            'POST /users',
            'GET /users/<id>',
            'PUT /users/<id>',
            'DELETE /users/<id>',
            'POST /login',
            'GET /error',
            'GET /slow',
            'GET /health'
        ]
    })

@app.route('/users', methods=['GET', 'POST'])
def handle_users():
    """Handle users collection"""
    if request.method == 'GET':
        return jsonify({
            'users': users,
            'total': len(users)
        })
    
    elif request.method == 'POST':
        data = request.get_json()
        
        if not data or 'name' not in data or 'email' not in data:
            return jsonify({'error': 'Name and email are required'}), 400
        
        new_user = {
            'id': max([u['id'] for u in users]) + 1 if users else 1,
            'name': data['name'],
            'email': data['email']
        }
        
        users.append(new_user)
        return jsonify(new_user), 201

@app.route('/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_user(user_id):
    """Handle individual user"""
    user = next((u for u in users if u['id'] == user_id), None)
    
    if not user:
        return jsonify({'error': 'User not found', 'id': user_id}), 404
    
    if request.method == 'GET':
        return jsonify(user)
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        if data and 'name' in data:
            user['name'] = data['name']
        if data and 'email' in data:
            user['email'] = data['email']
        
        return jsonify(user)
    
    elif request.method == 'DELETE':
        users.remove(user)
        return '', 204

@app.route('/login', methods=['POST'])
def login():
    """Login endpoint (demonstrates password sanitization)"""
    data = request.get_json()
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Mock authentication
    if data['email'] == 'john@example.com' and data['password'] == 'password':
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': 1,
                'name': 'John Doe',
                'email': 'john@example.com'
            },
            'token': f'mock-jwt-token-{int(time.time())}'
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/error', methods=['GET'])
def handle_error():
    """Error endpoint for testing"""
    raise Exception('This is a test error for VLogger')

@app.route('/slow', methods=['GET'])
def handle_slow():
    """Slow endpoint for testing performance monitoring"""
    delay = request.args.get('delay', 2, type=int)
    delay = max(1, min(10, delay))  # Limit between 1-10 seconds
    
    time.sleep(delay)
    
    return jsonify({
        'message': 'Slow response completed',
        'delay': f'{delay} seconds'
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        import psutil
        memory_info = psutil.virtual_memory()
        memory_usage = memory_info.used
        memory_total = memory_info.total
    except ImportError:
        memory_usage = 0
        memory_total = 0
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'python_version': sys.version,
        'memory_usage': memory_usage,
        'memory_total': memory_total
    })

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Endpoint not found',
        'path': request.path
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'error': 'Internal server error',
        'message': str(error)
    }), 500

if __name__ == '__main__':
    print("🚀 Starting Flask server with VLogger...")
    print("📊 VLogger dashboard: http://localhost:3333")
    print("")
    print("Try these endpoints:")
    print("  GET  http://localhost:5000/")
    print("  GET  http://localhost:5000/users")
    print("  POST http://localhost:5000/users")
    print("  GET  http://localhost:5000/error")
    print("  GET  http://localhost:5000/slow?delay=3")
    
    app.run(host='0.0.0.0', port=5000, debug=True)