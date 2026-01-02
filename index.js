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
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? function (origin, callback) {
        // Allow requests with no origin (mobile apps, React Native)
        if (!origin) return callback(null, true);
        
        // Allow specific web origins
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'https://admin-wellio.vercel.app',
          'https://wellio-frontend.vercel.app',
          'http://localhost:8081'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : true, // Allow all origins in development
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '70mb' }));
app.use(express.urlencoded({ extended: true, limit: '70mb' }));

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const adminRoutes = require('./src/routes/admin');
const policyRoutes = require('./src/routes/policy');
const companyRoutes = require('./src/routes/company');
const dietPlanRoutes = require('./src/routes/dietPlan');
const pushRoutes = require('./src/routes/push');
const waterRoutes = require('./src/routes/water');
const supplementRoutes = require('./src/routes/supplements');
const mealLogRoutes = require('./src/routes/mealLog');
const aiRoutes = require('./src/routes/ai');
const subscriptionRoutes = require('./src/routes/subscription');
const emailAdminRoutes = require('./src/routes/email');

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
app.use('/v1/diet-plans', dietPlanRoutes);
app.use('/v1/push', pushRoutes);
app.use('/v1/water', waterRoutes);
app.use('/v1/supplements', supplementRoutes);
app.use('/v1/meal-logs', mealLogRoutes);
app.use('/v1/ai', aiRoutes);

// API v2 routes
app.use('/v2/subscriptions', subscriptionRoutes);
app.use('/v2/admin', emailAdminRoutes);

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
      dietPlans: '/v1/diet-plans',
      pushNotifications: '/v1/push',
      waterTracker: '/v1/water',
      supplementsTracker: '/v1/supplements',
      mealLogs: '/v1/meal-logs',
      aiChat: '/v1/ai',
      health: '/health'
    },
    v2: {
      subscriptions: '/v2/subscriptions',
      emailAdmin: '/v2/admin'
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

// Import supplement reminder service
const SupplementReminderService = require('./src/services/supplementReminderService');

// Start server
const startServer = async () => {
  await connectDB();

  // Initialize supplement reminder service
  SupplementReminderService.initialize();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Wellio Backend Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`🏠 Welcome endpoint: http://localhost:${PORT}/`);
    console.log(`⚡ API v1 endpoint: http://localhost:${PORT}/v1`);
    console.log(`\n📱 React Native Connection URLs:`);
    console.log(`   Android Emulator: http://10.0.2.2:${PORT}`);
    console.log(`   iOS Simulator: http://localhost:${PORT}`);
    console.log(`   Physical Device: http://<your-local-ip>:${PORT}`);
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  SupplementReminderService.stop();
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
