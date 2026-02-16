const express = require('express');
const { AiController } = require('../controllers/ai');

const router = express.Router();

/**
 * @swagger
 * /v1/ai/chat:
 *   post:
 *     summary: Send a chat message (create new session or continue existing)
 *     tags: [AI Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - prompt
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "60d5ec49f1b2c72b8c8e4f1a"
 *               prompt:
 *                 type: string
 *                 example: "Create a 7-day vegetarian diet plan for weight loss"
 *               sessionId:
 *                 type: string
 *                 description: Optional - Include to continue an existing conversation
 *                 example: "60d5ec49f1b2c72b8c8e4f1b"
 *     responses:
 *       200:
 *         description: Message sent successfully
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
 *                   example: Message sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                     reply:
 *                       type: string
 *                       description: AI response in markdown format
 *                     isNewSession:
 *                       type: boolean
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 */
router.post('/chat', AiController.chat);

/**
 * @swagger
 * /v1/ai/sessions:
 *   get:
 *     summary: Get all chat sessions for a user
 *     tags: [AI Chat]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "60d5ec49f1b2c72b8c8e4f1a"
 *     responses:
 *       200:
 *         description: Chat sessions retrieved successfully
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
 *                   example: Chat sessions retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           preview:
 *                             type: string
 *                           lastMessageAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Validation error
 */
router.get('/sessions', AiController.getSessions);

/**
 * @swagger
 * /v1/ai/sessions/{sessionId}/messages:
 *   get:
 *     summary: Get all messages in a specific chat session
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *         example: "60d5ec49f1b2c72b8c8e4f1b"
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "60d5ec49f1b2c72b8c8e4f1a"
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
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
 *                   example: Messages retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     session:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           role:
 *                             type: string
 *                             enum: [user, assistant]
 *                           content:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 */
router.get('/sessions/:sessionId/messages', AiController.getSessionMessages);

/**
 * @swagger
 * /v1/ai/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a chat session and all its messages
 *     tags: [AI Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *         example: "60d5ec49f1b2c72b8c8e4f1b"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "60d5ec49f1b2c72b8c8e4f1a"
 *     responses:
 *       200:
 *         description: Chat session deleted successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 */
router.delete('/sessions/:sessionId', AiController.deleteSession);

module.exports = router;
