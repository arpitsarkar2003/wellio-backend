const EmailBroadcast = require('../../models/EmailBroadcast');
const EmailTemplate = require('../../models/EmailTemplate');
const EmailSubscription = require('../../models/EmailSubscription');
const EmailBroadcastService = require('../../services/emailBroadcastService');
const ValidationUtils = require('../../utils/validationUtils');
const ResponseUtils = require('../../utils/responseUtils');

/**
 * Email Broadcast Controller
 * Admin-only API for managing email broadcasts
 */
class EmailBroadcastController {
  
  /**
   * Create and initiate broadcast - POST /v2/admin/email-broadcasts
   */
  static async createBroadcast(req, res) {
    try {
      const { error } = ValidationUtils.validateEmailBroadcast(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { templateId, batchSize, delayBetweenBatches } = req.body;

      // Validate template exists
      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        return ResponseUtils.notFound(res, 'Template not found');
      }

      // Server-side enforcement: max batch size 30
      const enforcedBatchSize = Math.min(batchSize, 30);
      // Server-side enforcement: min delay 3 seconds (3000ms)
      const enforcedDelay = Math.max(delayBetweenBatches, 3000);

      // Create broadcast
      const broadcast = new EmailBroadcast({
        templateId,
        status: 'pending',
        batchSize: enforcedBatchSize,
        delayBetweenBatches: enforcedDelay
      });

      await broadcast.save();

      // Start processing asynchronously (non-blocking)
      EmailBroadcastService.processBroadcast(broadcast._id, enforcedBatchSize, enforcedDelay)
        .catch(error => {
          console.error('Broadcast processing error:', error.message);
        });

      return ResponseUtils.accepted(res, 'Email broadcast initiated', {
        id: broadcast._id,
        status: broadcast.status,
        batchSize: broadcast.batchSize,
        delayBetweenBatches: broadcast.delayBetweenBatches,
        templateId: broadcast.templateId
      });

    } catch (error) {
      console.error('Create broadcast error:', error.message);
      if (error.name === 'CastError') {
        return ResponseUtils.validationError(res, ['Invalid template ID']);
      }
      return ResponseUtils.internalError(res, 'Failed to create broadcast');
    }
  }

  /**
   * Get broadcast status - GET /v2/admin/email-broadcasts/:id
   */
  static async getBroadcastStatus(req, res) {
    try {
      const { id } = req.params;

      const broadcast = await EmailBroadcast.findById(id).populate('templateId', 'name subject');
      if (!broadcast) {
        return ResponseUtils.notFound(res, 'Broadcast not found');
      }

      return ResponseUtils.success(res, 'Broadcast status retrieved', {
        id: broadcast._id,
        status: broadcast.status,
        template: {
          id: broadcast.templateId._id,
          name: broadcast.templateId.name,
          subject: broadcast.templateId.subject
        },
        batchSize: broadcast.batchSize,
        delayBetweenBatches: broadcast.delayBetweenBatches,
        totalSubscribers: broadcast.totalSubscribers,
        sentCount: broadcast.sentCount,
        failedCount: broadcast.failedCount,
        startedAt: broadcast.startedAt,
        completedAt: broadcast.completedAt,
        error: broadcast.error,
        createdAt: broadcast.createdAt
      });

    } catch (error) {
      console.error('Get broadcast status error:', error.message);
      if (error.name === 'CastError') {
        return ResponseUtils.validationError(res, ['Invalid broadcast ID']);
      }
      return ResponseUtils.internalError(res, 'Failed to retrieve broadcast status');
    }
  }

  /**
   * Get all broadcasts - GET /v2/admin/email-broadcasts
   */
  static async getAllBroadcasts(req, res) {
    try {
      const broadcasts = await EmailBroadcast.find()
        .populate('templateId', 'name subject')
        .select('status batchSize delayBetweenBatches totalSubscribers sentCount failedCount startedAt completedAt createdAt')
        .sort({ createdAt: -1 })
        .limit(50);

      return ResponseUtils.success(res, 'Broadcasts retrieved successfully', {
        broadcasts
      });

    } catch (error) {
      console.error('Get broadcasts error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve broadcasts');
    }
  }

  /**
   * Get subscriber count - GET /v2/admin/email-subscriptions/count
   */
  static async getSubscriberCount(req, res) {
    try {
      const totalCount = await EmailSubscription.countDocuments({ isActive: true });
      const totalAllCount = await EmailSubscription.countDocuments();

      return ResponseUtils.success(res, 'Subscriber count retrieved', {
        activeSubscribers: totalCount,
        totalSubscribers: totalAllCount
      });

    } catch (error) {
      console.error('Get subscriber count error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve subscriber count');
    }
  }

  /**
   * Get broadcast metrics - GET /v2/admin/email-broadcasts/:id/metrics
   */
  static async getBroadcastMetrics(req, res) {
    try {
      const { id } = req.params;

      const broadcast = await EmailBroadcast.findById(id);
      if (!broadcast) {
        return ResponseUtils.notFound(res, 'Broadcast not found');
      }

      const successRate = broadcast.totalSubscribers > 0
        ? ((broadcast.sentCount / broadcast.totalSubscribers) * 100).toFixed(2)
        : 0;

      return ResponseUtils.success(res, 'Broadcast metrics retrieved', {
        id: broadcast._id,
        status: broadcast.status,
        batchSize: broadcast.batchSize,
        delayBetweenBatches: broadcast.delayBetweenBatches,
        totalSubscribers: broadcast.totalSubscribers,
        sentCount: broadcast.sentCount,
        failedCount: broadcast.failedCount,
        successRate: `${successRate}%`,
        startedAt: broadcast.startedAt,
        completedAt: broadcast.completedAt,
        duration: broadcast.startedAt && broadcast.completedAt
          ? Math.round((broadcast.completedAt - broadcast.startedAt) / 1000)
          : null
      });

    } catch (error) {
      console.error('Get broadcast metrics error:', error.message);
      if (error.name === 'CastError') {
        return ResponseUtils.validationError(res, ['Invalid broadcast ID']);
      }
      return ResponseUtils.internalError(res, 'Failed to retrieve broadcast metrics');
    }
  }
}

module.exports = EmailBroadcastController;


