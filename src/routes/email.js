const express = require('express');
const { EmailTemplateController, EmailBroadcastController } = require('../controllers/admin');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require super admin authentication
router.use(authMiddleware.requireSuperAdmin);

// =================
// EMAIL TEMPLATES
// =================

/**
 * @swagger
 * /v2/admin/email-templates:
 *   post:
 *     summary: Create email template (Admin Only)
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subject
 *               - htmlContent
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Welcome Newsletter"
 *               subject:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Welcome to Wellio!"
 *               htmlContent:
 *                 type: string
 *                 example: "<html><body><h1>Welcome!</h1></body></html>"
 *               plainTextContent:
 *                 type: string
 *                 example: "Welcome to Wellio!"
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Validation error
 */
router.post('/email-templates', EmailTemplateController.createTemplate);

/**
 * @swagger
 * /v2/admin/email-templates:
 *   get:
 *     summary: Get all email templates (Admin Only)
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/email-templates', EmailTemplateController.getAllTemplates);

/**
 * @swagger
 * /v2/admin/email-templates/{id}:
 *   get:
 *     summary: Get email template by ID (Admin Only)
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 */
router.get('/email-templates/:id', EmailTemplateController.getTemplateById);

/**
 * @swagger
 * /v2/admin/email-templates/{id}:
 *   put:
 *     summary: Update email template (Admin Only)
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               subject:
 *                 type: string
 *                 maxLength: 200
 *               htmlContent:
 *                 type: string
 *               plainTextContent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 */
router.put('/email-templates/:id', EmailTemplateController.updateTemplate);

/**
 * @swagger
 * /v2/admin/email-templates/{id}:
 *   delete:
 *     summary: Delete email template (Admin Only)
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 */
router.delete('/email-templates/:id', EmailTemplateController.deleteTemplate);

// =================
// EMAIL BROADCASTS
// =================

/**
 * @swagger
 * /v2/admin/email-broadcasts:
 *   post:
 *     summary: Create and initiate email broadcast (Admin Only)
 *     tags: [Email Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - batchSize
 *               - delayBetweenBatches
 *             properties:
 *               templateId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               batchSize:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 30
 *                 example: 20
 *               delayBetweenBatches:
 *                 type: number
 *                 minimum: 3000
 *                 example: 5000
 *                 description: "Delay in milliseconds (minimum 3000ms = 3 seconds)"
 *     responses:
 *       202:
 *         description: Broadcast initiated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Template not found
 */
router.post('/email-broadcasts', EmailBroadcastController.createBroadcast);

/**
 * @swagger
 * /v2/admin/email-broadcasts:
 *   get:
 *     summary: Get all email broadcasts (Admin Only)
 *     tags: [Email Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Broadcasts retrieved successfully
 */
router.get('/email-broadcasts', EmailBroadcastController.getAllBroadcasts);

/**
 * @swagger
 * /v2/admin/email-broadcasts/{id}:
 *   get:
 *     summary: Get email broadcast status (Admin Only)
 *     tags: [Email Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broadcast status retrieved
 *       404:
 *         description: Broadcast not found
 */
router.get('/email-broadcasts/:id', EmailBroadcastController.getBroadcastStatus);

/**
 * @swagger
 * /v2/admin/email-broadcasts/{id}/metrics:
 *   get:
 *     summary: Get email broadcast metrics (Admin Only)
 *     tags: [Email Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Broadcast metrics retrieved
 *       404:
 *         description: Broadcast not found
 */
router.get('/email-broadcasts/:id/metrics', EmailBroadcastController.getBroadcastMetrics);

// =================
// SUBSCRIPTION METRICS
// =================

/**
 * @swagger
 * /v2/admin/email-subscriptions/count:
 *   get:
 *     summary: Get subscriber count (Admin Only)
 *     tags: [Email Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscriber count retrieved
 */
router.get('/email-subscriptions/count', EmailBroadcastController.getSubscriberCount);

module.exports = router;


