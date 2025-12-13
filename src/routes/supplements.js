const express = require('express');
const SupplementController = require('../controllers/supplementController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Supplements Tracker
 *   description: Supplement schedule and logging endpoints
 */

/**
 * @swagger
 * /v1/supplements:
 *   post:
 *     summary: Create supplement schedule
 *     tags: [Supplements Tracker]
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
 *               - time
 *               - days
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Vitamin D"
 *               time:
 *                 type: string
 *                 format: time
 *                 example: "09:00"
 *               days:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
 *                 example: ["Mon", "Wed", "Fri"]
 *               notes:
 *                 type: string
 *                 example: "Take with breakfast"
 *     responses:
 *       201:
 *         description: Supplement schedule created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware.requireAuth, SupplementController.createSupplement);

/**
 * @swagger
 * /v1/supplements:
 *   get:
 *     summary: Get all supplements for logged-in user
 *     tags: [Supplements Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supplements retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware.requireAuth, SupplementController.getSupplements);

/**
 * @swagger
 * /v1/supplements/{id}:
 *   put:
 *     summary: Update supplement schedule
 *     tags: [Supplements Tracker]
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
 *               time:
 *                 type: string
 *                 format: time
 *               days:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplement updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplement not found
 */
router.put('/:id', authMiddleware.requireAuth, SupplementController.updateSupplement);

/**
 * @swagger
 * /v1/supplements/{id}:
 *   delete:
 *     summary: Delete supplement schedule
 *     tags: [Supplements Tracker]
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
 *         description: Supplement deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplement not found
 */
router.delete('/:id', authMiddleware.requireAuth, SupplementController.deleteSupplement);

/**
 * @swagger
 * /v1/supplements/log:
 *   post:
 *     summary: Log supplement intake
 *     tags: [Supplements Tracker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplementId
 *               - status
 *             properties:
 *               supplementId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [taken, skipped]
 *     responses:
 *       201:
 *         description: Supplement logged successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Supplement not found
 */
router.post('/log', authMiddleware.requireAuth, SupplementController.logSupplement);

/**
 * @swagger
 * /v1/supplements/logs:
 *   get:
 *     summary: Get supplement logs for a month
 *     tags: [Supplements Tracker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01"
 *         description: Month in YYYY-MM format (optional, defaults to current month)
 *     responses:
 *       200:
 *         description: Supplement logs retrieved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/logs', authMiddleware.requireAuth, SupplementController.getSupplementLogs);

module.exports = router;






