const DietPlanService = require('../services/dietPlanService');
const ResponseUtils = require('../utils/responseUtils');
const ValidationUtils = require('../utils/validationUtils');

class DietPlanController {

    /**
     * Create Diet Plan - POST /v1/diet-plans
     */
    static async createPlan(req, res) {
        try {
            const userId = req.user.id;
            const planData = req.body;

            // Validate data
            const { error } = ValidationUtils.validateDietPlan(planData);
            if (error) {
                return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
            }

            const newPlan = await DietPlanService.createDietPlan(userId, planData);
            return ResponseUtils.created(res, 'Diet plan created successfully', newPlan);

        } catch (error) {
            console.error('Create diet plan error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to create diet plan');
        }
    }

    /**
     * Get Active Diet Plan - GET /v1/diet-plans
     */
    static async getActivePlan(req, res) {
        try {
            const userId = req.user.id;
            const plan = await DietPlanService.getActiveDietPlan(userId);

            if (!plan) {
                // Requirement: "If user has no diet plan, return a proper no-plan response."
                // I'll return success with null data or a specific message, 
                // but ResponseUtils.notFound is also an option. 
                // "This supports the frontend first-time user flow." -> usually implies 200 OK with empty state or 404.
                // Let's return 200 with null data to distinguish from "error".
                return ResponseUtils.success(res, 'No active diet plan found', null);
            }

            return ResponseUtils.success(res, 'Diet plan retrieved successfully', plan);

        } catch (error) {
            console.error('Get active diet plan error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to retrieve diet plan');
        }
    }

    /**
     * Get Daily Meals - GET /v1/diet-plans/day/:dayName
     */
    static async getDailyMeals(req, res) {
        try {
            const userId = req.user.id;
            const { dayName } = req.params;

            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayName)) {
                return ResponseUtils.error(res, 'Invalid day name', 400);
            }

            const meals = await DietPlanService.getDailyMeals(userId, dayName);

            if (meals === null) {
                return ResponseUtils.success(res, 'No active diet plan found', []);
            }

            return ResponseUtils.success(res, `Meals for ${dayName} retrieved successfully`, meals);

        } catch (error) {
            console.error('Get daily meals error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to retrieve daily meals');
        }
    }

    /**
     * Update Diet Plan - PUT /v1/diet-plans/:planId
     */
    static async updatePlan(req, res) {
        try {
            const userId = req.user.id;
            const { planId } = req.params;
            const updateData = req.body;

            // Validate data
            const { error } = ValidationUtils.validateDietPlan(updateData);
            if (error) {
                return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
            }

            const updatedPlan = await DietPlanService.updateDietPlan(userId, planId, updateData);

            if (!updatedPlan) {
                return ResponseUtils.notFound(res, 'Diet plan not found or access denied');
            }

            return ResponseUtils.success(res, 'Diet plan updated successfully', updatedPlan);

        } catch (error) {
            console.error('Update diet plan error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to update diet plan');
        }
    }

    /**
     * Update Specific Meal - PATCH /v1/diet-plans/:planId/meal/:mealId
     */
    static async updateMeal(req, res) {
        try {
            const userId = req.user.id;
            const { planId, mealId } = req.params;
            const updateData = req.body;

            // Validate data
            const { error } = ValidationUtils.validateDietPlanMeal(updateData);
            if (error) {
                return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
            }

            const updatedPlan = await DietPlanService.updateMeal(userId, planId, mealId, updateData);

            if (!updatedPlan) {
                return ResponseUtils.notFound(res, 'Diet plan or meal not found');
            }

            return ResponseUtils.success(res, 'Meal updated successfully', updatedPlan);

        } catch (error) {
            console.error('Update meal error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to update meal');
        }
    }

    /**
     * Delete Diet Plan - DELETE /v1/diet-plans/:planId
     */
    static async deletePlan(req, res) {
        try {
            const userId = req.user.id;
            const { planId } = req.params;

            const result = await DietPlanService.deleteDietPlan(userId, planId);

            if (!result) {
                return ResponseUtils.notFound(res, 'Diet plan not found');
            }

            return ResponseUtils.success(res, 'Diet plan deleted successfully');

        } catch (error) {
            console.error('Delete diet plan error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to delete diet plan');
        }
    }

    /**
     * Copy Week - POST /v1/diet-plans/copy-week
     */
    static async copyWeek(req, res) {
        try {
            const userId = req.user.id;

            const newPlan = await DietPlanService.copyWeek(userId);

            return ResponseUtils.created(res, 'Week copied successfully to new plan', newPlan);

        } catch (error) {
            console.error('Copy week error:', error.message);
            if (error.message === 'No active plan found to copy') {
                return ResponseUtils.notFound(res, error.message);
            }
            return ResponseUtils.internalError(res, 'Failed to copy week');
        }
    }
}

module.exports = DietPlanController;
