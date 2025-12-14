const express = require('express');
const WaterController = require('../controllers/waterController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Water Tracker
 *   description: Water intake tracking endpoints
 */

/**
 * @swagger
 * /v1/water/add:
 *   post:
 *     summary: Add water intake entry
 *     tags: [Water Tracker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of water in ml
 *                 example: 250
 *     responses:
 *       201:
 *         description: Water intake added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/add', authMiddleware.requireAuth, WaterController.addWaterIntake);

/**
 * @swagger
 * /v1/water/daily:
 *   get:
 *     summary: Get daily water intake data
 *     tags: [Water Tracker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-15"
 *         description: Date in YYYY-MM-DD format (optional, defaults to today)
 *     responses:
 *       200:
 *         description: Daily water intake retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/daily', authMiddleware.requireAuth, WaterController.getDailyWaterIntake);

/**
 * @swagger
 * /v1/water/goal:
 *   put:
 *     summary: Update water goal
 *     tags: [Water Tracker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dailyGoal
 *             properties:
 *               dailyGoal:
 *                 type: number
 *                 description: Daily water goal in ml
 *                 example: 2000
 *     responses:
 *       200:
 *         description: Water goal updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/goal', authMiddleware.requireAuth, WaterController.updateWaterGoal);

module.exports = router;







