const express = require('express');
const SuperAdminController = require('../controllers/superAdminController');
const CompanyController = require('../controllers/companyController');
const PolicyController = require('../controllers/policyController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// =================
// ADMIN AUTHENTICATION
// =================

/**
 * @swagger
 * /v1/admin/setup:
 *   post:
 *     summary: Create initial super admin (One-time setup)
 *     tags: [Super Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - securityAnswer
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: "wellio_admin"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@wellio.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "SecureAdminPassword123"
 *               securityAnswer:
 *                 type: string
 *                 example: "10092003"
 *                 description: "Answer to 'Hi, what is your bday?'"
 *     responses:
 *       201:
 *         description: Super admin created successfully
 *       400:
 *         description: Super admin already exists or validation error
 */
router.post('/setup', SuperAdminController.createInitialAdmin);

/**
 * @swagger
 * /v1/admin/login:
 *   post:
 *     summary: Super admin login
 *     tags: [Super Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "wellio_admin"
 *               password:
 *                 type: string
 *                 example: "SecureAdminPassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       403:
 *         description: Account disabled
 *       423:
 *         description: Account locked
 */
router.post('/login', SuperAdminController.login);

/**
 * @swagger
 * /v1/admin/security-question:
 *   post:
 *     summary: Get security question for password recovery
 *     tags: [Super Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 example: "wellio_admin"
 *     responses:
 *       200:
 *         description: Security question retrieved
 */
router.post('/security-question', SuperAdminController.getSecurityQuestion);

/**
 * @swagger
 * /v1/admin/recover-password:
 *   post:
 *     summary: Recover password using security question
 *     tags: [Super Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - securityAnswer
 *               - newPassword
 *             properties:
 *               username:
 *                 type: string
 *                 example: "wellio_admin"
 *               securityAnswer:
 *                 type: string
 *                 example: "10092003"
 *                 description: "Answer to 'Hi, what is your bday?'"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid security answer
 *       404:
 *         description: Admin not found
 */
router.post('/recover-password', SuperAdminController.recoverPassword);

// =================
// AUTHENTICATED ADMIN ROUTES
// =================

/**
 * @swagger
 * /v1/admin/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Super Admin Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authMiddleware.requireSuperAdmin, SuperAdminController.getProfile);

/**
 * @swagger
 * /v1/admin/change-password:
 *   put:
 *     summary: Change admin password
 *     tags: [Super Admin Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "CurrentPassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect
 */
router.put('/change-password', authMiddleware.requireSuperAdmin, SuperAdminController.changePassword);

/**
 * @swagger
 * /v1/admin/logout:
 *   post:
 *     summary: Admin logout
 *     tags: [Super Admin Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authMiddleware.requireSuperAdmin, SuperAdminController.logout);

/**
 * @swagger
 * /v1/admin/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Super Admin Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions retrieved
 */
router.get('/sessions', authMiddleware.requireSuperAdmin, SuperAdminController.getActiveSessions);

/**
 * @swagger
 * /v1/admin/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a session
 *     tags: [Super Admin Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked successfully
 */
router.delete('/sessions/:sessionId', authMiddleware.requireSuperAdmin, SuperAdminController.revokeSession);

// =================
// COMPANY MANAGEMENT
// =================

/**
 * @swagger
 * /v1/admin/company:
 *   get:
 *     summary: Get company information
 *     tags: [Company Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company information retrieved successfully
 */
router.get('/company', authMiddleware.requireSuperAdmin, CompanyController.getCompanyInfo);

/**
 * @swagger
 * /v1/admin/company:
 *   put:
 *     summary: Update company information
 *     tags: [Company Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Wellio Diet Tracker"
 *               logo:
 *                 type: object
 *                 properties:
 *                   base64Image:
 *                     type: string
 *                     example: "data:image/png;base64,iVBORw0KGgoAAAANS..."
 *                   imageName:
 *                     type: string
 *                     example: "wellio-logo"
 *               address:
 *                 type: object
 *                 properties:
 *                   street1:
 *                     type: string
 *                     example: "123 Health Street"
 *                   street2:
 *                     type: string
 *                     example: "Suite 100"
 *                   city:
 *                     type: string
 *                     example: "Wellness City"
 *                   state:
 *                     type: string
 *                     example: "CA"
 *                   pincode:
 *                     type: string
 *                     example: "123456"
 *                   country:
 *                     type: string
 *                     example: "India"
 *               contactInfo:
 *                 type: object
 *                 properties:
 *                   phoneNumbers:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         number:
 *                           type: string
 *                           example: "+1234567890"
 *                         type:
 *                           type: string
 *                           enum: [primary, secondary, support, sales]
 *                         label:
 *                           type: string
 *                           example: "Main Office"
 *                   emails:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *                           example: "info@wellio.com"
 *                         type:
 *                           type: string
 *                           enum: [primary, support, sales, info, noreply]
 *                         label:
 *                           type: string
 *                           example: "General Inquiries"
 *                   website:
 *                     type: string
 *                     example: "https://www.wellio.com"
 *                   socialMedia:
 *                     type: object
 *                     properties:
 *                       facebook:
 *                         type: string
 *                         example: "https://facebook.com/wellio"
 *                       twitter:
 *                         type: string
 *                         example: "https://twitter.com/wellio"
 *                       instagram:
 *                         type: string
 *                         example: "https://instagram.com/wellio"
 *               description:
 *                 type: string
 *                 example: "Your trusted partner in health and nutrition tracking"
 *               establishedYear:
 *                 type: number
 *                 example: 2024
 *               industry:
 *                 type: string
 *                 example: "Health & Wellness"
 *     responses:
 *       200:
 *         description: Company information updated successfully
 *       400:
 *         description: Validation error or image upload failed
 */
router.put('/company', authMiddleware.requireSuperAdmin, CompanyController.updateCompanyInfo);

/**
 * @swagger
 * /v1/admin/company/logo:
 *   post:
 *     summary: Upload company logo
 *     tags: [Company Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64Image
 *             properties:
 *               base64Image:
 *                 type: string
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANS..."
 *               imageName:
 *                 type: string
 *                 example: "wellio-logo"
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *       400:
 *         description: Invalid image data
 */
router.post('/company/logo', authMiddleware.requireSuperAdmin, CompanyController.uploadLogo);

/**
 * @swagger
 * /v1/admin/company/logo:
 *   delete:
 *     summary: Remove company logo
 *     tags: [Company Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logo removed successfully
 *       400:
 *         description: No logo to remove
 */
router.delete('/company/logo', authMiddleware.requireSuperAdmin, CompanyController.removeLogo);

router.post('/company/logo/info', authMiddleware.requireSuperAdmin, CompanyController.getImageInfo);
router.post('/company/phone', authMiddleware.requireSuperAdmin, CompanyController.addPhoneNumber);
router.post('/company/email', authMiddleware.requireSuperAdmin, CompanyController.addEmail);

// =================
// POLICY MANAGEMENT
// =================

/**
 * @swagger
 * /v1/admin/policy:
 *   get:
 *     summary: Get all policies (Super Admin Only)
 *     tags: [Policy Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Policies retrieved successfully
 */
router.get('/policy', authMiddleware.requireSuperAdmin, PolicyController.getAllPolicies);

/**
 * @swagger
 * /v1/admin/policy/privacy-policy:
 *   post:
 *     summary: Upload Privacy Policy
 *     tags: [Policy Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Wellio Privacy Policy"
 *               content:
 *                 type: string
 *                 example: "# Privacy Policy\n\nThis privacy policy describes..."
 *               originalFileName:
 *                 type: string
 *                 example: "privacy-policy.md"
 *               changes:
 *                 type: string
 *                 example: "Updated data retention policy"
 *               metaDescription:
 *                 type: string
 *                 example: "Learn how Wellio protects your privacy"
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["privacy", "data protection", "GDPR"]
 *     responses:
 *       200:
 *         description: Privacy policy uploaded successfully
 */
router.post('/policy/privacy-policy', authMiddleware.requireSuperAdmin, PolicyController.uploadPrivacyPolicy);

/**
 * @swagger
 * /v1/admin/policy/terms-conditions:
 *   post:
 *     summary: Upload Terms & Conditions
 *     tags: [Policy Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Wellio Terms & Conditions"
 *               content:
 *                 type: string
 *                 example: "# Terms & Conditions\n\nBy using Wellio..."
 *               originalFileName:
 *                 type: string
 *                 example: "terms-conditions.md"
 *               changes:
 *                 type: string
 *                 example: "Updated service terms"
 *               metaDescription:
 *                 type: string
 *                 example: "Terms and conditions for using Wellio"
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["terms", "conditions", "usage"]
 *     responses:
 *       200:
 *         description: Terms & conditions uploaded successfully
 */
router.post('/policy/terms-conditions', authMiddleware.requireSuperAdmin, PolicyController.uploadTermsConditions);

router.get('/policy/stats', authMiddleware.requireSuperAdmin, PolicyController.getPolicyStats);
router.get('/policy/:id', authMiddleware.requireSuperAdmin, PolicyController.getPolicyById);
router.patch('/policy/:id/status', authMiddleware.requireSuperAdmin, PolicyController.updatePolicyStatus);
router.delete('/policy/:id', authMiddleware.requireSuperAdmin, PolicyController.deletePolicy);

module.exports = router;
