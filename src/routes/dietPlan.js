const express = require('express');
const DietPlanController = require('../controllers/dietPlanController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const DietTemplateController = require('../controllers/dietTemplateController');

/**
 * @swagger
 * tags:
 *   name: Diet Templates
 *   description: Diet template management endpoints
 */

/**
 * @swagger
 * /v1/diet-plans/templates:
 *   get:
 *     summary: Get all diet templates
 *     tags: [Diet Templates]
 *     parameters:
 *       - in: query
 *         name: goal
 *         schema:
 *           type: string
 *           enum: [weight_loss, muscle_gain, balanced, keto, vegan]
 *         description: Filter by goal
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/templates', DietTemplateController.getAllTemplates);

/**
 * @swagger
 * /v1/diet-plans/templates/apply:
 *   post:
 *     summary: Apply a template to create a new diet plan
 *     tags: [Diet Templates]
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
 *             properties:
 *               templateId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template applied successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
router.post('/templates/apply', authMiddleware.requireAuth, DietTemplateController.applyTemplate);

/**
 * @swagger
 * /v1/diet-plans/templates:
 *   post:
 *     summary: Create a new diet template (Admin only)
 *     tags: [Diet Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DietTemplate'
 *     responses:
 *       201:
 *         description: Template created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/templates', authMiddleware.requireSuperAdmin, DietTemplateController.createTemplate);

/**
 * @swagger
 * /v1/diet-plans/templates/{templateId}:
 *   get:
 *     summary: Get template by ID
 *     tags: [Diet Templates]
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 */
router.get('/templates/:templateId', DietTemplateController.getTemplateById);

/**
 * @swagger
 * /v1/diet-plans/templates/{templateId}:
 *   put:
 *     summary: Update diet template (Admin only)
 *     tags: [Diet Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DietTemplate'
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 */
router.put('/templates/:templateId', authMiddleware.requireSuperAdmin, DietTemplateController.updateTemplate);

/**
 * @swagger
 * /v1/diet-plans/templates/{templateId}:
 *   delete:
 *     summary: Delete diet template (Admin only)
 *     tags: [Diet Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required or cannot delete default template
 *       404:
 *         description: Template not found
 */
router.delete('/templates/:templateId', authMiddleware.requireSuperAdmin, DietTemplateController.deleteTemplate);

/**
 * @swagger
 * tags:
 *   name: Diet Plans
 *   description: Diet plan management endpoints
 */

/**
 * @swagger
 * /v1/diet-plans:
 *   post:
 *     summary: Create a new diet plan
 *     tags: [Diet Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weekSchedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                     meals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           mealName:
 *                             type: string
 *                           time:
 *                             type: string
 *                             example: "08:00"
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 estimatedCalories:
 *                                   type: number
 *                                 notes:
 *                                   type: string
 *     responses:
 *       201:
 *         description: Diet plan created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware.requireAuth, DietPlanController.createPlan);

/**
 * @swagger
 * /v1/diet-plans:
 *   get:
 *     summary: Get user's active diet plan
 *     tags: [Diet Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active diet plan retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware.requireAuth, DietPlanController.getActivePlan);

/**
 * @swagger
 * /v1/diet-plans/day/{dayName}:
 *   get:
 *     summary: Get meals for a specific day
 *     tags: [Diet Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dayName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *     responses:
 *       200:
 *         description: Meals retrieved successfully
 *       400:
 *         description: Invalid day name
 *       401:
 *         description: Unauthorized
 */
router.get('/day/:dayName', authMiddleware.requireAuth, DietPlanController.getDailyMeals);

/**
 * @swagger
 * /v1/diet-plans/copy-week:
 *   post:
 *     summary: Copy active week to a new plan
 *     tags: [Diet Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Week copied successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active plan found to copy
 */
router.post('/copy-week', authMiddleware.requireAuth, DietPlanController.copyWeek);

/**
 * @swagger
 * /v1/diet-plans/{planId}:
 *   put:
 *     summary: Update diet plan
 *     tags: [Diet Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DietPlan'
 *     responses:
 *       200:
 *         description: Diet plan updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Diet plan not found
 */
router.put('/:planId', authMiddleware.requireAuth, DietPlanController.updatePlan);

/**
 * @swagger
 * /v1/diet-plans/{planId}/meal/{mealId}:
 *   patch:
 *     summary: Update specific meal
 *     tags: [Diet Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mealId
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
 *               mealName:
 *                 type: string
 *               time:
 *                 type: string
 *               items:
 *                 type: array
 *               preparationNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meal updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Meal not found
 */
router.patch('/:planId/meal/:mealId', authMiddleware.requireAuth, DietPlanController.updateMeal);

/**
 * @swagger
 * /v1/diet-plans/{planId}:
 *   delete:
 *     summary: Delete diet plan
 *     tags: [Diet Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Diet plan deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Diet plan not found
 */
router.delete('/:planId', authMiddleware.requireAuth, DietPlanController.deletePlan);

module.exports = router;
