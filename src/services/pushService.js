const axios = require('axios');

/**
 * OneSignal Push Notification Service
 */
class PushService {
  
  /**
   * Get OneSignal API configuration
   */
  static getConfig() {
    const appId = process.env.ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      throw new Error('OneSignal configuration missing: ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY are required');
    }

    return {
      appId,
      restApiKey,
      apiUrl: 'https://onesignal.com/api/v1/notifications'
    };
  }

  /**
   * Send push notification to a single device token
   * @param {string} token - OneSignal player ID or push token
   * @param {string} title - Notification title
   * @param {string} body - Notification body/message
   * @param {object} data - Additional data payload (optional)
   * @param {string} deviceType - Device type: 'web', 'ios', or 'android'
   * @returns {Promise<object>} OneSignal API response
   */
  static async sendPush(token, title, body, data = {}, deviceType = 'web') {
    try {
      const config = this.getConfig();
      
      // Validate inputs
      if (!token || !title || !body) {
        throw new Error('Token, title, and body are required');
      }

      // Determine include_player_ids or include_external_user_ids based on device type
      // For web, we typically use include_player_ids
      // For mobile, we might use include_external_user_ids or include_player_ids
      const payload = {
        app_id: config.appId,
        headings: { en: title },
        contents: { en: body },
        data: data,
        include_player_ids: [token] // OneSignal player ID
      };

      // Add platform-specific settings
      if (deviceType === 'ios') {
        payload.ios_badgeType = 'Increase';
        payload.ios_badgeCount = 1;
      } else if (deviceType === 'android') {
        payload.android_channel_id = 'default'; // You can customize this
      }

      // Make API request
      const response = await axios.post(config.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${config.restApiKey}`
        }
      });

      // Log success
      console.log(`✅ Push notification sent successfully to token: ${token.substring(0, 20)}...`);
      console.log(`   Title: ${title}`);
      console.log(`   Body: ${body}`);
      console.log(`   Device Type: ${deviceType}`);
      console.log(`   OneSignal Response ID: ${response.data.id}`);

      // Check for invalid tokens in response
      const hasInvalidTokens = response.data.errors && 
        (response.data.errors.includes('player_not_found') || 
         response.data.errors.some(err => err.includes('player_not_found') || err.includes('Invalid player')));

      return {
        success: true,
        oneSignalId: response.data.id,
        recipients: response.data.recipients || 1,
        errors: response.data.errors || null,
        hasInvalidTokens: hasInvalidTokens || false
      };

    } catch (error) {
      // Log failure
      console.error(`❌ Failed to send push notification to token: ${token ? token.substring(0, 20) + '...' : 'N/A'}`);
      console.error(`   Title: ${title}`);
      console.error(`   Body: ${body}`);
      console.error(`   Device Type: ${deviceType}`);
      
      if (error.response) {
        // OneSignal API error response
        console.error(`   OneSignal Error: ${JSON.stringify(error.response.data)}`);
        console.error(`   Status: ${error.response.status}`);
        
        // Check for invalid token errors
        const errorData = error.response.data;
        const errorMessage = Array.isArray(errorData.errors) 
          ? errorData.errors.join(', ') 
          : (errorData.errors || errorData.message || 'OneSignal API error');
        
        const hasInvalidToken = errorMessage.includes('player_not_found') || 
                                errorMessage.includes('Invalid player') ||
                                errorMessage.includes('No players found');
        
        return {
          success: false,
          error: errorMessage,
          statusCode: error.response.status,
          oneSignalResponse: errorData,
          hasInvalidTokens: hasInvalidToken
        };
      } else if (error.request) {
        // Request made but no response
        console.error(`   Network Error: No response from OneSignal API`);
        
        return {
          success: false,
          error: 'Network error: No response from OneSignal API',
          statusCode: null
        };
      } else {
        // Error in request setup
        console.error(`   Error: ${error.message}`);
        
        return {
          success: false,
          error: error.message,
          statusCode: null
        };
      }
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {Array<string>} tokens - Array of OneSignal player IDs
   * @param {string} title - Notification title
   * @param {string} body - Notification body/message
   * @param {object} data - Additional data payload (optional)
   * @param {string} deviceType - Device type: 'web', 'ios', or 'android'
   * @returns {Promise<object>} OneSignal API response
   */
  static async sendPushToMultiple(tokens, title, body, data = {}, deviceType = 'web') {
    try {
      const config = this.getConfig();
      
      if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        throw new Error('Tokens array is required and must not be empty');
      }

      if (!title || !body) {
        throw new Error('Title and body are required');
      }

      const payload = {
        app_id: config.appId,
        headings: { en: title },
        contents: { en: body },
        data: data,
        include_player_ids: tokens
      };

      // Add platform-specific settings
      if (deviceType === 'ios') {
        payload.ios_badgeType = 'Increase';
        payload.ios_badgeCount = 1;
      } else if (deviceType === 'android') {
        payload.android_channel_id = 'default';
      }

      const response = await axios.post(config.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${config.restApiKey}`
        }
      });

      console.log(`✅ Push notification sent to ${tokens.length} devices`);
      console.log(`   Title: ${title}`);
      console.log(`   Body: ${body}`);
      console.log(`   Device Type: ${deviceType}`);
      console.log(`   OneSignal Response ID: ${response.data.id}`);
      console.log(`   Recipients: ${response.data.recipients || tokens.length}`);

      // Check for invalid tokens in response
      const hasInvalidTokens = response.data.errors && 
        (response.data.errors.includes('player_not_found') || 
         response.data.errors.some(err => err.includes('player_not_found') || err.includes('Invalid player')));

      return {
        success: true,
        oneSignalId: response.data.id,
        recipients: response.data.recipients || tokens.length,
        errors: response.data.errors || null,
        hasInvalidTokens: hasInvalidTokens || false
      };

    } catch (error) {
      console.error(`❌ Failed to send push notification to multiple devices`);
      console.error(`   Title: ${title}`);
      console.error(`   Body: ${body}`);
      console.error(`   Device Type: ${deviceType}`);
      console.error(`   Token Count: ${tokens ? tokens.length : 0}`);
      
      if (error.response) {
        console.error(`   OneSignal Error: ${JSON.stringify(error.response.data)}`);
        console.error(`   Status: ${error.response.status}`);
        
        // Check for invalid token errors
        const errorData = error.response.data;
        const errorMessage = Array.isArray(errorData.errors) 
          ? errorData.errors.join(', ') 
          : (errorData.errors || errorData.message || 'OneSignal API error');
        
        const hasInvalidToken = errorMessage.includes('player_not_found') || 
                                errorMessage.includes('Invalid player') ||
                                errorMessage.includes('No players found');
        
        return {
          success: false,
          error: errorMessage,
          statusCode: error.response.status,
          oneSignalResponse: errorData,
          hasInvalidTokens: hasInvalidToken
        };
      } else if (error.request) {
        console.error(`   Network Error: No response from OneSignal API`);
        
        return {
          success: false,
          error: 'Network error: No response from OneSignal API',
          statusCode: null
        };
      } else {
        console.error(`   Error: ${error.message}`);
        
        return {
          success: false,
          error: error.message,
          statusCode: null
        };
      }
    }
  }

  /**
   * Send push notification to all users (broadcast)
   * @param {string} title - Notification title
   * @param {string} body - Notification body/message
   * @param {object} data - Additional data payload (optional)
   * @param {Array<string>} segments - Optional segments to target (e.g., ['Active Users'])
   * @returns {Promise<object>} OneSignal API response
   */
  static async sendPushToAll(title, body, data = {}, segments = []) {
    try {
      const config = this.getConfig();
      
      if (!title || !body) {
        throw new Error('Title and body are required');
      }

      const payload = {
        app_id: config.appId,
        headings: { en: title },
        contents: { en: body },
        data: data,
        included_segments: segments.length > 0 ? segments : ['All']
      };

      const response = await axios.post(config.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${config.restApiKey}`
        }
      });

      console.log(`✅ Broadcast push notification sent`);
      console.log(`   Title: ${title}`);
      console.log(`   Body: ${body}`);
      console.log(`   Segments: ${segments.length > 0 ? segments.join(', ') : 'All'}`);
      console.log(`   OneSignal Response ID: ${response.data.id}`);

      return {
        success: true,
        oneSignalId: response.data.id,
        recipients: response.data.recipients || 'All',
        errors: response.data.errors || null
      };

    } catch (error) {
      console.error(`❌ Failed to send broadcast push notification`);
      console.error(`   Title: ${title}`);
      console.error(`   Body: ${body}`);
      
      if (error.response) {
        console.error(`   OneSignal Error: ${JSON.stringify(error.response.data)}`);
        console.error(`   Status: ${error.response.status}`);
        
        return {
          success: false,
          error: error.response.data.errors || error.response.data.message || 'OneSignal API error',
          statusCode: error.response.status,
          oneSignalResponse: error.response.data
        };
      } else {
        console.error(`   Error: ${error.message}`);
        
        return {
          success: false,
          error: error.message,
          statusCode: null
        };
      }
    }
  }
}

module.exports = PushService;

