const EmailSubscription = require('../../models/EmailSubscription');
const ValidationUtils = require('../../utils/validationUtils');
const ResponseUtils = require('../../utils/responseUtils');

/**
 * Email Subscription Controller
 * Public API for email subscriptions
 */
class SubscriptionController {
  
  /**
   * Subscribe email - POST /v2/subscriptions
   * Idempotent: returns success if email already exists
   */
  static async subscribe(req, res) {
    try {
      const { error } = ValidationUtils.validateEmailSubscription(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { email } = req.body;
      const normalizedEmail = ValidationUtils.sanitizeEmail(email);

      // Idempotent: find or create
      let subscription = await EmailSubscription.findOne({ email: normalizedEmail });

      if (subscription) {
        // If exists but inactive, reactivate
        if (!subscription.isActive) {
          subscription.isActive = true;
          await subscription.save();
        }
        return ResponseUtils.success(res, 'Email subscription successful', {
          email: subscription.email,
          subscribedAt: subscription.createdAt,
          isActive: subscription.isActive
        });
      }

      // Create new subscription
      subscription = new EmailSubscription({
        email: normalizedEmail,
        isActive: true
      });

      await subscription.save();

      return ResponseUtils.created(res, 'Email subscription successful', {
        email: subscription.email,
        subscribedAt: subscription.createdAt,
        isActive: subscription.isActive
      });

    } catch (error) {
      console.error('Subscribe error:', error.message);

      // Handle duplicate key error (shouldn't happen due to findOne, but defensive)
      if (error.code === 11000) {
        const subscription = await EmailSubscription.findOne({ email: ValidationUtils.sanitizeEmail(req.body.email) });
        if (subscription) {
          return ResponseUtils.success(res, 'Email subscription successful', {
            email: subscription.email,
            subscribedAt: subscription.createdAt,
            isActive: subscription.isActive
          });
        }
      }

      return ResponseUtils.internalError(res, 'Failed to subscribe email');
    }
  }
}

module.exports = SubscriptionController;


