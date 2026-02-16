// Test script to check if all modules load correctly
console.log('Starting module checks...');

try {
  console.log('✓ Loading dotenv...');
  require('dotenv').config();
  
  console.log('✓ Loading express...');
  const express = require('express');
  
  console.log('✓ Loading mongoose...');
  const mongoose = require('mongoose');
  
  console.log('✓ Loading JWT utils...');
  const TokenUtils = require('./src/utils/tokenUtils');
  
  console.log('✓ Loading User model...');
  const User = require('./src/models/User');
  
  console.log('✓ Loading auth routes...');
  const authRoutes = require('./src/routes/auth');
  
  console.log('✓ All modules loaded successfully!');
  
  // Test basic server startup
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  app.use(express.json());
  app.get('/test', (req, res) => {
    res.json({ message: 'Server test successful!' });
  });
  
  const server = app.listen(PORT, () => {
    console.log(`✓ Test server running on port ${PORT}`);
    server.close(() => {
      console.log('✓ Test completed successfully!');
      process.exit(0);
    });
  });
  
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}