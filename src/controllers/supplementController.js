const SupplementService = require('../services/supplementService');
const ResponseUtils = require('../utils/responseUtils');
const ValidationUtils = require('../utils/validationUtils');

class SupplementController {

  /**
   * Create Supplement - POST /v1/supplements
   */
  static async createSupplement(req, res) {
    try {
      const userId = req.user.id;
      const supplementData = req.body;

      // Validate data
      const { error } = ValidationUtils.validateSupplement(supplementData);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const supplement = await SupplementService.createSupplement(userId, supplementData);
      return ResponseUtils.created(res, 'Supplement schedule created successfully', {
        id: supplement._id,
        name: supplement.name,
        time: supplement.time,
        days: supplement.days,
        notes: supplement.notes,
        createdAt: supplement.createdAt
      });

    } catch (error) {
      console.error('Create supplement error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to create supplement schedule');
    }
  }

  /**
   * Get All Supplements - GET /v1/supplements
   */
  static async getSupplements(req, res) {
    try {
      const userId = req.user.id;

      const supplements = await SupplementService.getUserSupplements(userId);
      return ResponseUtils.success(res, 'Supplements retrieved successfully', {
        supplements: supplements.map(s => ({
          id: s._id,
          name: s.name,
          time: s.time,
          days: s.days,
          notes: s.notes,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }))
      });

    } catch (error) {
      console.error('Get supplements error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve supplements');
    }
  }

  /**
   * Update Supplement - PUT /v1/supplements/:id
   */
  static async updateSupplement(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updateData = req.body;

      // Validate data
      const { error } = ValidationUtils.validateSupplement(updateData, true);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const supplement = await SupplementService.updateSupplement(id, userId, updateData);

      if (!supplement) {
        return ResponseUtils.notFound(res, 'Supplement not found or access denied');
      }

      return ResponseUtils.success(res, 'Supplement updated successfully', {
        id: supplement._id,
        name: supplement.name,
        time: supplement.time,
        days: supplement.days,
        notes: supplement.notes,
        updatedAt: supplement.updatedAt
      });

    } catch (error) {
      console.error('Update supplement error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to update supplement');
    }
  }

  /**
   * Delete Supplement - DELETE /v1/supplements/:id
   */
  static async deleteSupplement(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const result = await SupplementService.deleteSupplement(id, userId);

      if (!result) {
        return ResponseUtils.notFound(res, 'Supplement not found');
      }

      return ResponseUtils.success(res, 'Supplement deleted successfully');

    } catch (error) {
      console.error('Delete supplement error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to delete supplement');
    }
  }

  /**
   * Log Supplement - POST /v1/supplements/log
   */
  static async logSupplement(req, res) {
    try {
      const userId = req.user.id;
      const { supplementId, status } = req.body;

      // Validate data
      const { error } = ValidationUtils.validateSupplementLog({ supplementId, status });
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const log = await SupplementService.logSupplement(userId, supplementId, status);
      return ResponseUtils.created(res, 'Supplement logged successfully', {
        id: log._id,
        supplementId: log.supplementId,
        status: log.status,
        timestamp: log.timestamp,
        createdAt: log.createdAt
      });

    } catch (error) {
      console.error('Log supplement error:', error.message);
      if (error.message === 'Supplement not found') {
        return ResponseUtils.notFound(res, error.message);
      }
      return ResponseUtils.internalError(res, 'Failed to log supplement');
    }
  }

  /**
   * Get Supplement Logs - GET /v1/supplements/logs?month=YYYY-MM
   */
  static async getSupplementLogs(req, res) {
    try {
      const userId = req.user.id;
      const { month } = req.query;

      // Validate month format
      if (!month) {
        // Default to current month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const logs = await SupplementService.getSupplementLogs(userId, currentMonth);
        return ResponseUtils.success(res, 'Supplement logs retrieved successfully', { logs });
      }

      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(month)) {
        return ResponseUtils.validationError(res, ['Month must be in YYYY-MM format']);
      }

      const logs = await SupplementService.getSupplementLogs(userId, month);
      return ResponseUtils.success(res, 'Supplement logs retrieved successfully', { logs });

    } catch (error) {
      console.error('Get supplement logs error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve supplement logs');
    }
  }
}

module.exports = SupplementController;







