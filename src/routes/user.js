const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /v1/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                   example: Profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         isGoogleUser:
 *                           type: boolean
 *                         isVerified:
 *                           type: boolean
 *                         profile:
 *                           type: object
 *                           properties:
 *                             phoneNumber:
 *                               type: string
 *                             address:
 *                               type: object
 *                               properties:
 *                                 street1:
 *                                   type: string
 *                                 street2:
 *                                   type: string
 *                                 lane:
 *                                   type: string
 *                                 city:
 *                                   type: string
 *                                 state:
 *                                   type: string
 *                                 pincode:
 *                                   type: string
 *                             physicalInfo:
 *                               type: object
 *                               properties:
 *                                 currentWeight:
 *                                   type: number
 *                                 currentHeight:
 *                                   type: number
 *                                 weightUnit:
 *                                   type: string
 *                                   enum: [kg, lbs]
 *                                 heightUnit:
 *                                   type: string
 *                                   enum: [cm, ft]
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/profile', authMiddleware.requireAuth, UserController.getProfile);

/**
 * @swagger
 * /v1/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^\\+?[1-9]\\d{1,14}$'
 *                 example: "+1234567890"
 *               address:
 *                 type: object
 *                 properties:
 *                   street1:
 *                     type: string
 *                     maxLength: 100
 *                     example: "123 Main St"
 *                   street2:
 *                     type: string
 *                     maxLength: 100
 *                     example: "Apt 4B"
 *                   lane:
 *                     type: string
 *                     maxLength: 50
 *                     example: "Oak Lane"
 *                   city:
 *                     type: string
 *                     maxLength: 50
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     maxLength: 50
 *                     example: "NY"
 *                   pincode:
 *                     type: string
 *                     pattern: '^[0-9]{6}$'
 *                     example: "123456"
 *               physicalInfo:
 *                 type: object
 *                 properties:
 *                   currentWeight:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 1000
 *                     example: 70.5
 *                   currentHeight:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 300
 *                     example: 175.5
 *                   weightUnit:
 *                     type: string
 *                     enum: [kg, lbs]
 *                     example: "kg"
 *                   heightUnit:
 *                     type: string
 *                     enum: [cm, ft]
 *                     example: "cm"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/profile', authMiddleware.requireAuth, UserController.updateProfile);

/**
 * @swagger
 * /v1/user/{id}:
 *   get:
 *     summary: Get user by ID (Admin or own profile only)
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.get('/:id', authMiddleware.requireAuth, UserController.getUserById);

/**
 * @swagger
 * /v1/user/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [User Authentication]
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
 *       200:
 *         description: Password reset email sent (if account exists)
 *       400:
 *         description: Validation error
 */
router.post('/forgot-password', UserController.requestPasswordReset);

/**
 * @swagger
 * /v1/user/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *                 example: "abc123def456"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newSecurePassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', UserController.resetPassword);

/**
 * @swagger
 * /v1/user/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: "userPassword123"
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Invalid password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/account', authMiddleware.requireAuth, UserController.deleteAccount);

module.exports = router;
