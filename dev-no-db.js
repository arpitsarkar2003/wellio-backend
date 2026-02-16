require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Wellio Backend! (Dev Branch - No Database Mode)',
    version: '1.0.0',
    documentation: '/api-docs',
    note: 'Running in development mode without MongoDB. Set up MongoDB to access full functionality.'
  });
});

// API v1 routes placeholder
app.get('/v1', (req, res) => {
  res.json({
    message: 'Wellio API v1 - Development Mode',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      note: 'Authentication endpoints require MongoDB setup'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Not connected (development mode)',
    email: 'Not configured (using default values)'
  });
});

// Mock auth endpoints for testing
app.post('/v1/auth/signup', (req, res) => {
  res.json({
    success: false,
    message: 'MongoDB required for authentication features',
    suggestion: 'Please set up MongoDB to use authentication endpoints'
  });
});

app.post('/v1/auth/login', (req, res) => {
  res.json({
    success: false,
    message: 'MongoDB required for authentication features',
    suggestion: 'Please set up MongoDB to use authentication endpoints'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Wellio Backend Server running on port ${PORT} (Development Mode)`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`🏠 Welcome endpoint: http://localhost:${PORT}/`);
  console.log(`⚡ API v1 endpoint: http://localhost:${PORT}/v1`);
  console.log(`💡 To enable full functionality, set up MongoDB and run: node index.js`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});
