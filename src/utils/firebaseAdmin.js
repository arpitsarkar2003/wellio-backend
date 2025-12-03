let admin;
try {
  admin = require('firebase-admin');
} catch (error) {
  // Firebase Admin SDK not installed - will be initialized on first use
  admin = null;
}

/**
 * Firebase Admin SDK initialization
 * Handles Firebase Admin setup for phone number verification
 */
class FirebaseAdmin {
  static initialized = false;

  /**
   * Initialize Firebase Admin SDK
   * Expects FIREBASE_SERVICE_ACCOUNT to be a JSON string in .env
   * Or FIREBASE_SERVICE_ACCOUNT_PATH to point to a JSON file
   */
  static initialize() {
    if (this.initialized) {
      return admin;
    }

    try {
      // Check if firebase-admin is installed
      if (!admin) {
        try {
          admin = require('firebase-admin');
        } catch (requireError) {
          throw new Error('firebase-admin package is not installed. Run: npm install firebase-admin');
        }
      }

      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.initialized = true;
        return admin;
      }

      // Get service account from environment variables
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

      let serviceAccount;

      if (serviceAccountPath) {
        // Load from file path
        const serviceAccountFile = require(serviceAccountPath);
        serviceAccount = serviceAccountFile;
      } else if (serviceAccountJson) {
        // Parse from JSON string
        try {
          serviceAccount = JSON.parse(serviceAccountJson);
        } catch (parseError) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON');
        }
      } else {
        throw new Error('Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT in .env');
      }

      // Validate required fields
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Firebase service account is missing required fields (project_id, private_key, client_email)');
      }

      // Initialize Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');

      return admin;
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Verify Firebase ID token
   * @param {string} idToken - Firebase ID token from client
   * @returns {Promise<object>} Decoded token with user information
   */
  static async verifyIdToken(idToken) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      if (!admin) {
        throw new Error('Firebase Admin SDK is not initialized. Please install firebase-admin and configure service account.');
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Firebase ID token verification error:', error.message);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/id-token-expired') {
        throw new Error('Firebase ID token has expired');
      } else if (error.code === 'auth/argument-error') {
        throw new Error('Invalid Firebase ID token format');
      } else if (error.code === 'auth/id-token-revoked') {
        throw new Error('Firebase ID token has been revoked');
      } else {
        throw new Error(`Firebase token verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Extract phone number from decoded Firebase token
   * @param {object} decodedToken - Decoded Firebase ID token
   * @returns {string|null} Phone number or null if not available
   */
  static extractPhoneNumber(decodedToken) {
    // Firebase stores phone number in firebase.identities.phone array
    if (decodedToken.firebase && decodedToken.firebase.identities && decodedToken.firebase.identities.phone) {
      const phoneNumbers = decodedToken.firebase.identities.phone;
      if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
        return phoneNumbers[0];
      }
    }

    // Fallback: check phone_number field
    if (decodedToken.phone_number) {
      return decodedToken.phone_number;
    }

    return null;
  }

  /**
   * Get Firebase Admin instance
   * @returns {admin} Firebase Admin instance
   */
  static getAdmin() {
    if (!this.initialized) {
      this.initialize();
    }
    if (!admin) {
      throw new Error('Firebase Admin SDK is not initialized. Please install firebase-admin and configure service account.');
    }
    return admin;
  }
}

// Auto-initialize on module load if credentials are available and firebase-admin is installed
if (admin && (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
  try {
    FirebaseAdmin.initialize();
  } catch (error) {
    console.warn('Firebase Admin will be initialized on first use:', error.message);
  }
}

module.exports = FirebaseAdmin;


