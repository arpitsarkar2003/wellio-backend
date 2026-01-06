const express = require('express');
const router = express.Router();
const { MealLogController } = require('../controllers/diet');
const AuthMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(AuthMiddleware.requireAuth);

/**
 * @swagger
 * /v1/meal-logs:
 *   put:
 *     summary: Log a meal (completed, skipped, or not yet)
 *     tags: [MealLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mealSlotId, date, status]
 *             properties:
 *               mealSlotId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [completed, skipped, not_yet]
 *               actualCalories:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meal log saved successfully
 *       400:
 *         description: Validation error or no active plan
 */
router.put('/', MealLogController.logMeal);

/**
 * @swagger
 * /v1/meal-logs/{date}:
 *   get:
 *     summary: Get meal logs for a specific date
 *     tags: [MealLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: YYYY-MM-DD
 *     responses:
 *       200:
 *         description: Meal logs retrieved successfully
 *       400:
 *         description: Invalid date or no active plan
 */
router.get('/:date', MealLogController.getLogsByDate);

/**
 * @swagger
 * /v1/meal-logs:
 *   get:
 *     summary: Get meal logs for a date range
 *     tags: [MealLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *     responses:
 *       200:
 *         description: Meal logs retrieved successfully
 *       400:
 *         description: Invalid range or no active plan
 */
router.get('/', MealLogController.getLogsByRange);

module.exports = router;
