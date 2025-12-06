const WaterService = require('../services/waterService');
const ResponseUtils = require('../utils/responseUtils');
const ValidationUtils = require('../utils/validationUtils');

class WaterController {

  /**
   * Add Water Intake - POST /v1/water/add
   */
  static async addWaterIntake(req, res) {
    try {
      const userId = req.user.id;
      const { amount } = req.body;

      // Validate data
      const { error } = ValidationUtils.validateWaterIntake({ amount });
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const waterIntake = await WaterService.addWaterIntake(userId, amount);
      return ResponseUtils.created(res, 'Water intake added successfully', {
        id: waterIntake._id,
        amount: waterIntake.amount,
        timestamp: waterIntake.timestamp,
        createdAt: waterIntake.createdAt
      });

    } catch (error) {
      console.error('Add water intake error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to add water intake');
    }
  }

  /**
   * Get Daily Water Intake - GET /v1/water/daily?date=YYYY-MM-DD
   */
  static async getDailyWaterIntake(req, res) {
    try {
      const userId = req.user.id;
      const { date } = req.query;

      // Validate date format if provided
      if (date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          return ResponseUtils.validationError(res, ['Date must be in YYYY-MM-DD format']);
        }
      }

      const data = await WaterService.getDailyWaterIntake(userId, date);
      return ResponseUtils.success(res, 'Daily water intake retrieved successfully', data);

    } catch (error) {
      console.error('Get daily water intake error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve daily water intake');
    }
  }

  /**
   * Update Water Goal - PUT /v1/water/goal
   */
  static async updateWaterGoal(req, res) {
    try {
      const userId = req.user.id;
      const { dailyGoal } = req.body;

      // Validate data
      const { error } = ValidationUtils.validateWaterGoal({ dailyGoal });
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const goal = await WaterService.updateWaterGoal(userId, dailyGoal);
      return ResponseUtils.success(res, 'Water goal updated successfully', {
        userId: goal.user,
        dailyGoal: goal.dailyGoal,
        updatedAt: goal.updatedAt
      });

    } catch (error) {
      console.error('Update water goal error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to update water goal');
    }
  }
}

module.exports = WaterController;




