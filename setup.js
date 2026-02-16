require('dotenv').config();
const mongoose = require('mongoose');
const SuperAdmin = require('./src/models/SuperAdmin');
const ResponseUtils = require('./src/utils/responseUtils');

/**
 * Setup Script for Initial Super Admin Creation
 * Run this once to create the first super admin account
 */

async function setupSuperAdmin() {
  try {
    console.log('🚀 Starting Wellio Super Admin Setup...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI_DEV || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');
    
    // Check if super admin already exists
    const existingAdmin = await SuperAdmin.findOne({});
    if (existingAdmin) {
      console.log('❌ Super admin already exists!');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      console.log('\n💡 If you need to create a new admin, please delete the existing one first.');
      return;
    }
    
    // Create the initial super admin with default values
    const adminData = {
      username: 'wellio_admin',
      email: 'admin@wellio.com',
      password: 'WellioAdmin@2024',
      securityQuestion: {
        question: 'Hi, what is your bday?',
        answer: '10092003'  // The security answer you specified
      }
    };
    
    console.log('👤 Creating Super Admin with the following details:');
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log(`   Security Question: ${adminData.securityQuestion.question}`);
    console.log(`   Security Answer: ${adminData.securityQuestion.answer}`);
    console.log('');
    
    const admin = new SuperAdmin(adminData);
    await admin.save();
    
    console.log('🎉 Super Admin created successfully!');
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Password: ${adminData.password}`);
    console.log('');
    console.log('🔒 Password Recovery:');
    console.log(`   Question: "${admin.securityQuestion.question}"`);
    console.log(`   Answer: "${adminData.securityQuestion.answer}"`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Start your server: node index.js');
    console.log('   2. Visit: http://localhost:3000/api-docs');
    console.log('   3. Use POST /v1/admin/login to authenticate');
    console.log('   4. Change your password after first login!');
    console.log('');
    console.log('🛡️  IMPORTANT SECURITY NOTES:');
    console.log('   - Change the default password immediately');
    console.log('   - Store your credentials securely');
    console.log('   - The security answer is for password recovery');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.name === 'ValidationError') {
      console.log('\n📝 Validation Errors:');
      Object.values(error.errors).forEach(err => {
        console.log(`   - ${err.message}`);
      });
    }
    
    if (error.code === 11000) {
      console.log('\n💡 Duplicate key error - Admin may already exist');
    }
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
    process.exit(0);
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupSuperAdmin();
} else {
  module.exports = setupSuperAdmin;
}
