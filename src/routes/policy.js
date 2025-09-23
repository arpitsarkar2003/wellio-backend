const express = require('express');
const PolicyController = require('../controllers/policyController');

const router = express.Router();

/**
 * @swagger
 * /v1/policy/privacy-policy:
 *   get:
 *     summary: Get current privacy policy (Public)
 *     tags: [Public Policies]
 *     responses:
 *       200:
 *         description: Privacy policy retrieved successfully
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
 *                   example: Privacy policy retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     policy:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: "Wellio Privacy Policy"
 *                         content:
 *                           type: string
 *                           example: "# Privacy Policy\n\nThis privacy policy describes how we collect..."
 *                         version:
 *                           type: number
 *                           example: 1
 *                         effectiveFrom:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00.000Z"
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T12:00:00.000Z"
 *                         wordCount:
 *                           type: number
 *                           example: 850
 *                         estimatedReadingTime:
 *                           type: number
 *                           example: 5
 *                           description: "Reading time in minutes"
 *       404:
 *         description: Privacy policy not found
 *       500:
 *         description: Internal server error
 */
router.get('/privacy-policy', PolicyController.getPrivacyPolicy);

/**
 * @swagger
 * /v1/policy/terms-conditions:
 *   get:
 *     summary: Get current terms & conditions (Public)
 *     tags: [Public Policies]
 *     responses:
 *       200:
 *         description: Terms & conditions retrieved successfully
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
 *                   example: Terms & conditions retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     policy:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: "Wellio Terms & Conditions"
 *                         content:
 *                           type: string
 *                           example: "# Terms & Conditions\n\nBy using our services, you agree to..."
 *                         version:
 *                           type: number
 *                           example: 1
 *                         effectiveFrom:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T00:00:00.000Z"
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-01T12:00:00.000Z"
 *                         wordCount:
 *                           type: number
 *                           example: 1200
 *                         estimatedReadingTime:
 *                           type: number
 *                           example: 6
 *                           description: "Reading time in minutes"
 *       404:
 *         description: Terms & conditions not found
 *       500:
 *         description: Internal server error
 */
router.get('/terms-conditions', PolicyController.getTermsConditions);

module.exports = router;
