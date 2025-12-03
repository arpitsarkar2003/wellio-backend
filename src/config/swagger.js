const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wellio API',
      version: '1.0.0',
      description: 'Backend API for Wellio - Diet Tracking Application with comprehensive authentication system',
      contact: {
        name: 'Wellio Team',
        email: 'support@wellio.com'
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://wellio-backend.vercel.app/v1' 
          : `http://localhost:${process.env.PORT || 8080}/v1`,
        description: process.env.NODE_ENV === 'production' ? 'Production server (Vercel)' : 'Development server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'User Management',
        description: 'User profile and account management'
      },
      {
        name: 'Push Notifications',
        description: 'Push notification token management and sending notifications'
      },
      {
        name: 'Health',
        description: 'Health check and system status'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

module.exports = specs;
