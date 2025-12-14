const express = require('express');
const CompanyController = require('../controllers/companyController');

const router = express.Router();

/**
 * @swagger
 * /v1/company:
 *   get:
 *     summary: Get company information (Public)
 *     tags: [Public Company Info]
 *     responses:
 *       200:
 *         description: Company information retrieved successfully
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
 *                   example: Company information retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     company:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Wellio Diet Tracker"
 *                         logo:
 *                           type: object
 *                           properties:
 *                             imageUrl:
 *                               type: string
 *                               example: "https://i.ibb.co/abc123/logo.png"
 *                             thumbnailUrl:
 *                               type: string
 *                               example: "https://i.ibb.co/abc123/thumb.png"
 *                         address:
 *                           type: object
 *                           properties:
 *                             street1:
 *                               type: string
 *                               example: "123 Health Street"
 *                             street2:
 *                               type: string
 *                               example: "Suite 100"
 *                             city:
 *                               type: string
 *                               example: "Wellness City"
 *                             state:
 *                               type: string
 *                               example: "CA"
 *                             pincode:
 *                               type: string
 *                               example: "123456"
 *                             country:
 *                               type: string
 *                               example: "India"
 *                         contactInfo:
 *                           type: object
 *                           properties:
 *                             phoneNumbers:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   number:
 *                                     type: string
 *                                     example: "+1234567890"
 *                                   type:
 *                                     type: string
 *                                     example: "primary"
 *                                   label:
 *                                     type: string
 *                                     example: "Main Office"
 *                             emails:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   email:
 *                                     type: string
 *                                     example: "info@wellio.com"
 *                                   type:
 *                                     type: string
 *                                     example: "primary"
 *                                   label:
 *                                     type: string
 *                                     example: "General Inquiries"
 *                             website:
 *                               type: string
 *                               example: "https://www.wellio.com"
 *                             socialMedia:
 *                               type: object
 *                               properties:
 *                                 facebook:
 *                                   type: string
 *                                   example: "https://facebook.com/wellio"
 *                                 twitter:
 *                                   type: string
 *                                   example: "https://twitter.com/wellio"
 *                                 instagram:
 *                                   type: string
 *                                   example: "https://instagram.com/wellio"
 *                         description:
 *                           type: string
 *                           example: "Your trusted partner in health and nutrition tracking"
 *                         establishedYear:
 *                           type: number
 *                           example: 2024
 *                         industry:
 *                           type: string
 *                           example: "Health & Wellness"
 *       404:
 *         description: Company information not found
 *       500:
 *         description: Internal server error
 */
router.get('/', CompanyController.getCompanyInfo);

/**
 * @swagger
 * /v1/company/contact:
 *   post:
 *     summary: Submit anonymous email for contact (Public)
 *     tags: [Public Company Info]
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
 *         description: Email sent successfully
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
 *                   example: Email sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     messageId:
 *                       type: string
 *                       example: "<message-id>"
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/contact', CompanyController.submitAnonymousEmail);

module.exports = router;