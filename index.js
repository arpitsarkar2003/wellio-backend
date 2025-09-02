require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

const app = express();
const PORT = process.env.PORT || 8080;

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
    message: 'Welcome to Wellio Backend! (dev Branch)',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// API v1 routes placeholder
app.get('/v1', (req, res) => {
  res.json({
    message: 'Wellio API v1',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.NODE_ENV === 'production' ? process.env.MONGODB_URI : process.env.MONGODB_URI_DEV);
    console.log(`${process.env.NODE_ENV} Connected to MongoDB successfully `);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Wellio Backend Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`🏠 Welcome endpoint: http://localhost:${PORT}/`);
    console.log(`⚡ API v1 endpoint: http://localhost:${PORT}/v1`);
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
