require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('./src/models/Company');
const SuperAdmin = require('./src/models/SuperAdmin');

/**
 * Script to inject logo URLs into Company model
 * Run this to set the landscape, portrait, and icon logos
 */

async function injectLogos() {
  try {
    console.log('🚀 Starting Logo Injection...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI_DEV || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');
    
    // Logo URLs to inject
    const logos = {
      landscapeLogo: 'https://i.ibb.co/HD80cJrF/landscape.png',
      portraitLogo: 'https://i.ibb.co/gbPNgXp1/portrait.png',
      iconLogo: 'https://i.ibb.co/hRm9JCwH/icon-Type-Logo.png'
    };
    
    console.log('📸 Injecting logos:');
    console.log(`   Landscape: ${logos.landscapeLogo}`);
    console.log(`   Portrait: ${logos.portraitLogo}`);
    console.log(`   Icon: ${logos.iconLogo}`);
    console.log('');
    
    // Get super admin for lastUpdatedBy (required field)
    const admin = await SuperAdmin.findOne({});
    if (!admin) {
      console.error('❌ No super admin found!');
      console.log('💡 Please run setup.js first to create a super admin.');
      console.log('   Command: node setup.js');
      return;
    }
    
    console.log(`👤 Using admin: ${admin.username} (${admin.email})\n`);
    
    // Find existing company
    let company = await Company.findOne({ isActive: true });
    
    if (company) {
      console.log('📝 Updating existing company record...');
      // Update logo variants while preserving existing logo data
      company.logo.landscapeLogo = logos.landscapeLogo;
      company.logo.portraitLogo = logos.portraitLogo;
      company.logo.iconLogo = logos.iconLogo;
      company.lastUpdatedBy = admin._id;
      
      await company.save();
      console.log('✅ Company logos updated successfully!\n');
    } else {
      console.log('📝 Creating new company record...');
      // Use createOrUpdate method which handles upsert
      const companyData = {
        name: 'Wellio',
        logo: {
          ...logos
        }
      };
      
      company = await Company.createOrUpdate(companyData, admin._id);
      console.log('✅ Company created with logos successfully!\n');
    }
    
    console.log('🎉 Logo injection completed!');
    console.log('\n📋 Company Logo Status:');
    console.log(`   Landscape Logo: ${company.logo.landscapeLogo || 'Not set'}`);
    console.log(`   Portrait Logo: ${company.logo.portraitLogo || 'Not set'}`);
    console.log(`   Icon Logo: ${company.logo.iconLogo || 'Not set'}`);
    console.log(`   Main Image URL: ${company.logo.imageUrl || 'Not set'}`);
    
  } catch (error) {
    console.error('❌ Logo injection failed:', error.message);
    
    if (error.name === 'ValidationError') {
      console.log('\n📝 Validation Errors:');
      Object.values(error.errors).forEach(err => {
        console.log(`   - ${err.message}`);
      });
    }
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
    process.exit(0);
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  injectLogos();
} else {
  module.exports = injectLogos;
}

