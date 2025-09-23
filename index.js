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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "img-src": ["'self'", "data:", "*"]
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const adminRoutes = require('./src/routes/admin');
const policyRoutes = require('./src/routes/policy');
const companyRoutes = require('./src/routes/company');

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Wellio API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Wellio Backend! (Dev Branch)',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// API v1 routes
app.use('/v1/auth', authRoutes);
app.use('/v1/user', userRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/policy', policyRoutes);
app.use('/v1/company', companyRoutes);

// API v1 routes placeholder
app.get('/v1', (req, res) => {
  res.json({
    message: 'Wellio API v1',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      authentication: '/v1/auth',
      userProfile: '/v1/user',
      adminPanel: '/v1/admin',
      policies: '/v1/policy',
      company: '/v1/company',
      health: '/health'
    }
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
    const mongoURI = process.env.NODE_ENV === 'production' ? process.env.MONGODB_URI : process.env.MONGODB_URI_DEV;
    
    await mongoose.connect(mongoURI, {
      // Recommended options for MongoDB connection
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000 // Close connections after 45 seconds of inactivity
    });
    
    console.log(`✅ ${process.env.NODE_ENV || 'development'} Connected to MongoDB successfully`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n💡 MongoDB Connection Tips:');
    console.log('   1. Make sure MongoDB is running locally on port 27017');
    console.log('   2. Or update MONGODB_URI_DEV in .env to use MongoDB Atlas:');
    console.log('      MONGODB_URI_DEV=mongodb+srv://<username>:<password>@cluster.mongodb.net/wellio');
    console.log('   3. You can also use Docker: docker run -d -p 27017:27017 mongo:latest\n');
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
