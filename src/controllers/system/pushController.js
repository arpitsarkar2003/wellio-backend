const PushToken = require('../../models/PushToken');
const NotificationHistory = require('../../models/NotificationHistory');
const PushService = require('../../services/pushService');
const ResponseUtils = require('../../utils/responseUtils');
const ValidationUtils = require('../../utils/validationUtils');

/**
 * Push Notification Controllers
 */
class PushController {

  /**
   * Save Push Token - POST /v1/push/save-push-token
   * Stores or updates a push token for a user
   */
  static async savePushToken(req, res) {
    try {
      const userId = req.user.id;
      const { token, deviceType, deviceInfo } = req.body;

      // Validation
      if (!token) {
        return ResponseUtils.validationError(res, ['Push token is required']);
      }

      if (!deviceType || !['web', 'ios', 'android'].includes(deviceType)) {
        return ResponseUtils.validationError(res, ['Device type is required and must be: web, ios, or android']);
      }

      // Check if token already exists for this user
      let pushToken = await PushToken.findByUserAndToken(userId, token);

      if (pushToken) {
        // Update existing token
        pushToken.isActive = true;
        pushToken.deviceType = deviceType;
        pushToken.lastUsed = new Date();
        
        if (deviceInfo) {
          pushToken.deviceInfo = {
            ...pushToken.deviceInfo,
            ...deviceInfo
          };
        }

        await pushToken.save();

        return ResponseUtils.success(res, 'Push token updated successfully', {
          pushToken: {
            id: pushToken._id,
            token: pushToken.token.substring(0, 20) + '...', // Partial token for security
            deviceType: pushToken.deviceType,
            isActive: pushToken.isActive,
            lastUsed: pushToken.lastUsed
          }
        });
      } else {
        // Create new token
        pushToken = new PushToken({
          user: userId,
          token,
          deviceType,
          deviceInfo: deviceInfo || {},
          isActive: true
        });

        await pushToken.save();

        return ResponseUtils.created(res, 'Push token saved successfully', {
          pushToken: {
            id: pushToken._id,
            token: pushToken.token.substring(0, 20) + '...', // Partial token for security
            deviceType: pushToken.deviceType,
            isActive: pushToken.isActive,
            createdAt: pushToken.createdAt
          }
        });
      }

    } catch (error) {
      console.error('Save push token error:', error.message);

      // Handle duplicate key error
      if (error.code === 11000) {
        return ResponseUtils.conflict(res, 'Push token already exists for this user');
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }

      return ResponseUtils.internalError(res, 'Failed to save push token');
    }
  }

  /**
   * Send Notification - POST /v1/push/send-notification
   * Sends a push notification to one or more users
   */
  static async sendNotification(req, res) {
    try {
      const { token, userId, title, body, data, deviceType, category } = req.body;
      const senderUserId = req.user.id; // User sending the notification

      // Validation
      if (!title || !body) {
        return ResponseUtils.validationError(res, ['Title and body are required']);
      }

      // Validate category if provided
      const validCategories = ['reminder', 'diet', 'system', 'meal', 'weight'];
      const notificationCategory = category && validCategories.includes(category) 
        ? category 
        : 'system';

      // Validate that either token or userId is provided
      if (!token && !userId) {
        return ResponseUtils.validationError(res, ['Either token or userId is required']);
      }

      // Helper function to save notification history
      const saveHistory = async (targetUserId, tokenValue, deliveryStatus, oneSignalId, errorMsg) => {
        try {
          await NotificationHistory.create({
            user: targetUserId,
            token: tokenValue,
            title,
            body,
            category: notificationCategory,
            data: data || {},
            deviceType: deviceType || 'web',
            deliveryStatus,
            oneSignalId: oneSignalId || null,
            errorMessage: errorMsg || null
          });
        } catch (historyError) {
          console.error('Failed to save notification history:', historyError.message);
          // Don't fail the request if history save fails
        }
      };

      // Helper function to invalidate token
      const invalidateToken = async (tokenValue) => {
        try {
          const tokenDoc = await PushToken.findOne({ token: tokenValue });
          if (tokenDoc) {
            tokenDoc.isActive = false;
            await tokenDoc.save();
            console.log(`⚠️  Token invalidated: ${tokenValue.substring(0, 20)}...`);
          }
        } catch (invalidateError) {
          console.error('Failed to invalidate token:', invalidateError.message);
        }
      };

      // If token is provided, send to that specific token
      if (token) {
        // Find the token to get userId
        const pushTokenDoc = await PushToken.findOne({ token });
        const targetUserId = pushTokenDoc ? pushTokenDoc.user : senderUserId;

        const result = await PushService.sendPush(
          token,
          title,
          body,
          data || {},
          deviceType || 'web'
        );

        // Handle invalid token
        if (result.hasInvalidTokens || (result.error && result.error.includes('player_not_found'))) {
          await invalidateToken(token);
          await saveHistory(
            targetUserId,
            token,
            'invalid_token',
            null,
            result.error || 'Player not found'
          );

          return ResponseUtils.error(res, 'Invalid push token - token has been deactivated', 400, {
            error: result.error || 'Player not found',
            tokenInvalidated: true
          });
        }

        // Save history
        const deliveryStatus = result.success ? 'sent' : 'failed';
        await saveHistory(
          targetUserId,
          token,
          deliveryStatus,
          result.oneSignalId,
          result.success ? null : result.error
        );

        if (result.success) {
          // Update lastUsed if token exists
          if (pushTokenDoc) {
            await pushTokenDoc.updateLastUsed();
          }

          return ResponseUtils.success(res, 'Push notification sent successfully', {
            oneSignalId: result.oneSignalId,
            recipients: result.recipients,
            category: notificationCategory,
            errors: result.errors
          });
        } else {
          return ResponseUtils.error(res, 'Failed to send push notification', 500, {
            error: result.error,
            statusCode: result.statusCode
          });
        }
      }

      // If userId is provided, find all active tokens for that user
      if (userId) {
        const pushTokens = await PushToken.findActiveTokensByUser(userId);

        if (!pushTokens || pushTokens.length === 0) {
          return ResponseUtils.notFound(res, 'No active push tokens found for this user');
        }

        // Extract tokens and device types
        const tokens = pushTokens.map(pt => pt.token);
        const deviceTypes = [...new Set(pushTokens.map(pt => pt.deviceType))];

        // Send to all tokens (OneSignal handles multiple tokens)
        const result = await PushService.sendPushToMultiple(
          tokens,
          title,
          body,
          data || {},
          deviceTypes[0] || 'web' // Use first device type, or default to web
        );

        // Handle invalid tokens
        if (result.hasInvalidTokens || (result.error && result.error.includes('player_not_found'))) {
          // Invalidate all tokens that failed (OneSignal doesn't tell us which ones, so we invalidate all)
          // In a production system, you might want to track which specific tokens failed
          await Promise.all(tokens.map(t => invalidateToken(t)));
          
          await Promise.all(tokens.map(t => 
            saveHistory(userId, t, 'invalid_token', null, result.error || 'Player not found')
          ));

          return ResponseUtils.error(res, 'One or more push tokens are invalid - tokens have been deactivated', 400, {
            error: result.error || 'Player not found',
            tokensInvalidated: true
          });
        }

        // Save history for all tokens
        const deliveryStatus = result.success ? 'sent' : 'failed';
        await Promise.all(tokens.map(t => 
          saveHistory(userId, t, deliveryStatus, result.oneSignalId, result.success ? null : result.error)
        ));

        // Update lastUsed for all tokens
        await Promise.all(pushTokens.map(pt => pt.updateLastUsed()));

        if (result.success) {
          return ResponseUtils.success(res, 'Push notification sent successfully', {
            oneSignalId: result.oneSignalId,
            recipients: result.recipients,
            tokensSent: tokens.length,
            category: notificationCategory,
            errors: result.errors
          });
        } else {
          return ResponseUtils.error(res, 'Failed to send push notification', 500, {
            error: result.error,
            statusCode: result.statusCode
          });
        }
      }

    } catch (error) {
      console.error('Send notification error:', error.message);

      // Handle OneSignal configuration errors
      if (error.message.includes('OneSignal configuration')) {
        return ResponseUtils.error(res, 'Push notification service is not configured', 500);
      }

      return ResponseUtils.internalError(res, 'Failed to send push notification');
    }
  }

  /**
   * Get User Push Tokens - GET /v1/push/tokens
   * Get all push tokens for the authenticated user
   */
  static async getUserPushTokens(req, res) {
    try {
      const userId = req.user.id;

      const pushTokens = await PushToken.findActiveTokensByUser(userId);

      return ResponseUtils.success(res, 'Push tokens retrieved successfully', {
        tokens: pushTokens.map(pt => ({
          id: pt._id,
          token: pt.token.substring(0, 20) + '...', // Partial token for security
          deviceType: pt.deviceType,
          deviceInfo: pt.deviceInfo,
          isActive: pt.isActive,
          isMuted: pt.isMuted,
          lastUsed: pt.lastUsed,
          createdAt: pt.createdAt
        })),
        count: pushTokens.length
      });

    } catch (error) {
      console.error('Get user push tokens error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve push tokens');
    }
  }

  /**
   * Delete Push Token - DELETE /v1/push/tokens/:tokenId
   * Deactivate a push token
   */
  static async deletePushToken(req, res) {
    try {
      const userId = req.user.id;
      const { tokenId } = req.params;

      const pushToken = await PushToken.findOne({
        _id: tokenId,
        user: userId
      });

      if (!pushToken) {
        return ResponseUtils.notFound(res, 'Push token not found');
      }

      await pushToken.deactivate();

      return ResponseUtils.success(res, 'Push token deactivated successfully');

    } catch (error) {
      console.error('Delete push token error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to delete push token');
    }
  }

  /**
   * Toggle Mute Status - PUT /v1/push/tokens/:tokenId/mute
   * Toggle mute status for a push token
   */
  static async toggleMuteStatus(req, res) {
    try {
      const userId = req.user.id;
      const { tokenId } = req.params;

      const pushToken = await PushToken.findOne({
        _id: tokenId,
        user: userId
      });

      if (!pushToken) {
        return ResponseUtils.notFound(res, 'Push token not found');
      }

      pushToken.isMuted = !pushToken.isMuted;
      await pushToken.save();

      return ResponseUtils.success(res, `Push token ${pushToken.isMuted ? 'muted' : 'unmuted'} successfully`, {
        pushToken: {
          id: pushToken._id,
          isMuted: pushToken.isMuted
        }
      });

    } catch (error) {
      console.error('Toggle mute status error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to toggle mute status');
    }
  }

  /**
   * Get Notification History - GET /v1/push/history
   * Get notification history for the authenticated user
   */
  static async getNotificationHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;

      const history = await NotificationHistory.findByUser(userId, limit);

      return ResponseUtils.success(res, 'Notification history retrieved successfully', {
        history: history.map(h => ({
          id: h._id,
          title: h.title,
          body: h.body,
          category: h.category,
          deliveryStatus: h.deliveryStatus,
          deviceType: h.deviceType,
          sentAt: h.sentAt,
          errorMessage: h.errorMessage
        })),
        count: history.length
      });

    } catch (error) {
      console.error('Get notification history error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve notification history');
    }
  }
}

module.exports = PushController;

module.exports = PushController;

