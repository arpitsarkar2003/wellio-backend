const express = require('express');
const PushController = require('../controllers/pushController');
const authMiddleware = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @swagger
 * /v1/push/save-push-token:
 *   post:
 *     summary: Save or update push notification token
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - deviceType
 *             properties:
 *               token:
 *                 type: string
 *                 description: OneSignal player ID or push token
 *                 example: "12345678-1234-1234-1234-123456789abc"
 *               deviceType:
 *                 type: string
 *                 enum: [web, ios, android]
 *                 description: Type of device
 *                 example: "web"
 *               deviceInfo:
 *                 type: object
 *                 description: Optional device information
 *                 properties:
 *                   browser:
 *                     type: string
 *                     example: "Chrome"
 *                   os:
 *                     type: string
 *                     example: "Windows"
 *                   deviceModel:
 *                     type: string
 *                     example: "iPhone 13"
 *                   userAgent:
 *                     type: string
 *                     example: "Mozilla/5.0..."
 *     responses:
 *       201:
 *         description: Push token saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Push token saved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     pushToken:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         token:
 *                           type: string
 *                         deviceType:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       200:
 *         description: Push token updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/save-push-token', authMiddleware.requireAuth, PushController.savePushToken);

/**
 * @swagger
 * /v1/push/send-notification:
 *   post:
 *     summary: Send push notification to a user or device
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               token:
 *                 type: string
 *                 description: OneSignal player ID to send notification to (optional if userId is provided)
 *                 example: "12345678-1234-1234-1234-123456789abc"
 *               userId:
 *                 type: string
 *                 description: User ID to send notification to (optional if token is provided)
 *                 example: "507f1f77bcf86cd799439011"
 *               title:
 *                 type: string
 *                 description: Notification title
 *                 example: "New Message"
 *               body:
 *                 type: string
 *                 description: Notification body/message
 *                 example: "You have a new message from John"
 *               data:
 *                 type: object
 *                 description: Additional data payload (optional)
 *                 example:
 *                   type: "message"
 *                   messageId: "12345"
 *                   senderId: "67890"
 *               deviceType:
 *                 type: string
 *                 enum: [web, ios, android]
 *                 description: Device type (optional, defaults to web)
 *                 example: "web"
 *               category:
 *                 type: string
 *                 enum: [reminder, diet, system, meal, weight]
 *                 description: Notification category for analytics (optional, defaults to system)
 *                 example: "reminder"
 *     responses:
 *       200:
 *         description: Push notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Push notification sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     oneSignalId:
 *                       type: string
 *                       description: OneSignal notification ID
 *                     recipients:
 *                       type: number
 *                       description: Number of recipients
 *                     tokensSent:
 *                       type: number
 *                       description: Number of tokens the notification was sent to
 *                     category:
 *                       type: string
 *                       description: Notification category
 *       400:
 *         description: Validation error or invalid push token - token has been deactivated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active push tokens found for user
 *       429:
 *         description: Too many requests - rate limit exceeded (10 requests per minute)
 *       500:
 *         description: Failed to send push notification
 */
router.post('/send-notification', 
  authMiddleware.requireAuth, 
  rateLimiter.pushNotificationRateLimit(10, 60 * 1000), // 10 requests per minute
  PushController.sendNotification
);

/**
 * @swagger
 * /v1/push/tokens:
 *   get:
 *     summary: Get all push tokens for authenticated user
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push tokens retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Push tokens retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           token:
 *                             type: string
 *                           deviceType:
 *                             type: string
 *                           deviceInfo:
 *                             type: object
 *                           isActive:
 *                             type: boolean
 *                           isMuted:
 *                             type: boolean
 *                           lastUsed:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                     count:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/tokens', authMiddleware.requireAuth, PushController.getUserPushTokens);

/**
 * @swagger
 * /v1/push/tokens/{tokenId}:
 *   delete:
 *     summary: Deactivate a push token
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *         description: Push token ID
 *     responses:
 *       200:
 *         description: Push token deactivated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Push token not found
 */
router.delete('/tokens/:tokenId', authMiddleware.requireAuth, PushController.deletePushToken);

/**
 * @swagger
 * /v1/push/tokens/{tokenId}/mute:
 *   put:
 *     summary: Toggle mute status for a push token
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *         description: Push token ID
 *     responses:
 *       200:
 *         description: Push token mute status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Push token muted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     pushToken:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         isMuted:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Push token not found
 */
router.put('/tokens/:tokenId/mute', authMiddleware.requireAuth, PushController.toggleMuteStatus);

/**
 * @swagger
 * /v1/push/history:
 *   get:
 *     summary: Get notification history for authenticated user
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of history records to return
 *     responses:
 *       200:
 *         description: Notification history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Notification history retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           body:
 *                             type: string
 *                           category:
 *                             type: string
 *                           deliveryStatus:
 *                             type: string
 *                             enum: [sent, failed, invalid_token]
 *                           deviceType:
 *                             type: string
 *                           sentAt:
 *                             type: string
 *                             format: date-time
 *                           errorMessage:
 *                             type: string
 *                     count:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authMiddleware.requireAuth, PushController.getNotificationHistory);

module.exports = router;

