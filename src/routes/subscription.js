const express = require('express');
const { SubscriptionController } = require('../controllers/system');

const router = express.Router();

/**
 * @swagger
 * /v2/subscriptions:
 *   post:
 *     summary: Subscribe email for newsletters
 *     tags: [Email Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       201:
 *         description: Subscription successful
 *       200:
 *         description: Already subscribed (idempotent)
 *       400:
 *         description: Validation error
 */
router.post('/', SubscriptionController.subscribe);

module.exports = router;


