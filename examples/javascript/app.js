/**
 * Example Express.js Application with VLogger
 * 
 * This example demonstrates how to integrate VLogger with an Express.js application.
 */

const express = require('express');
const VLogger = require('../../adapters/javascript/vlogger');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Initialize VLogger
const logger = new VLogger();

// Apply VLogger middleware
app.use(logger.middleware());

// Example routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to VLogger Example API',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /',
      'GET /users',
      'POST /users',
      'GET /users/:id',
      'PUT /users/:id',
      'DELETE /users/:id',
      'GET /error',
      'POST /login'
    ]
  });
});

// Mock user data
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// Get all users
app.get('/users', (req, res) => {
  res.json({
    users: users,
    total: users.length
  });
});

// Get user by ID
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
      id: id
    });
  }
  
  res.json(user);
});

// Create new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      error: 'Name and email are required'
    });
  }
  
  const newUser = {
    id: Math.max(...users.map(u => u.id)) + 1,
    name,
    email
  };
  
  users.push(newUser);
  
  res.status(201).json(newUser);
});

// Update user
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      error: 'User not found'
    });
  }
  
  const { name, email } = req.body;
  
  if (name) users[userIndex].name = name;
  if (email) users[userIndex].email = email;
  
  res.json(users[userIndex]);
});

// Delete user
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({
      error: 'User not found'
    });
  }
  
  users.splice(userIndex, 1);
  
  res.status(204).send();
});

// Login endpoint (demonstrates password sanitization)
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }
  
  // Mock authentication
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }
  
  // Mock token generation
  const token = 'mock-jwt-token-' + Date.now();
  
  res.json({
    message: 'Login successful',
    user: { id: user.id, name: user.name, email: user.email },
    token: token
  });
});

// Error endpoint for testing error logging
app.get('/error', (req, res) => {
  throw new Error('This is a test error for VLogger');
});

// Slow endpoint for testing performance monitoring
app.get('/slow', async (req, res) => {
  const delay = parseInt(req.query.delay) || 2000;
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  res.json({
    message: 'Slow response completed',
    delay: delay
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error.message);
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Example server running on http://localhost:${PORT}`);
  console.log(`📊 VLogger dashboard: http://localhost:3333`);
  console.log('');
  console.log('Try these endpoints:');
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/users`);
  console.log(`  POST http://localhost:${PORT}/users`);
  console.log(`  GET  http://localhost:${PORT}/error`);
  console.log(`  GET  http://localhost:${PORT}/slow?delay=3000`);
});

module.exports = app;