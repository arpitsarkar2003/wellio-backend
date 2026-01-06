const MealLog = require('../../models/MealLog');
const DietPlanService = require('../../services/dietPlanService');
const ResponseUtils = require('../../utils/responseUtils');

class MealLogController {

    /**
     * Create or update a meal log
     */
    static async logMeal(req, res) {
        try {
            const userId = req.user._id;
            const { mealSlotId, date, status, actualCalories, notes } = req.body;

            // 1. Validate Active Diet Plan
            const activePlan = await DietPlanService.getActiveDietPlan(userId);
            if (!activePlan) {
                return ResponseUtils.error(res, 'No active diet plan found', 400, { code: 'NO_ACTIVE_PLAN' });
            }

            // 2. Validate Date
            // Business Logic: Logs are editable only within the same day (no past, no future)
            const todayStr = new Date().toISOString().split('T')[0];
            
            if (date > todayStr) {
                 return ResponseUtils.error(res, 'Cannot log meals for future dates', 400, { code: 'FUTURE_DATE_NOT_ALLOWED' });
            }
            
            if (date < todayStr) {
                return ResponseUtils.error(res, 'Logs are editable only within the same day', 400, { code: 'PAST_DATE_EDIT_NOT_ALLOWED' });
            }

            // 3. Validate Meal Slot and get Snapshot
            let mealSlot = null;
            let scheduledTimeSnapshot = null;

            // Search for the meal slot in the active plan
            for (const day of activePlan.weekSchedule) {
                const found = day.meals.find(m => m._id.toString() === mealSlotId);
                if (found) {
                    mealSlot = found;
                    scheduledTimeSnapshot = found.time;
                    break;
                }
            }

            if (!mealSlot) {
                return ResponseUtils.error(res, 'Meal slot not found in active diet plan', 400, { code: 'MEAL_SLOT_NOT_FOUND' });
            }

            // 4. Validate Status and Calories
            if (status === 'completed' && (actualCalories === undefined || actualCalories === null)) {
                return ResponseUtils.error(res, 'Actual calories are required when status is completed', 400, { code: 'CALORIES_REQUIRED' });
            }

            // 5. Upsert Log
            const updateData = {
                user: userId,
                dietPlan: activePlan._id,
                mealSlotId,
                date,
                scheduledTimeSnapshot,
                status,
                notes
            };

            if (status === 'completed') {
                updateData.actualCalories = actualCalories;
            } else {
                // Reset calories if status changes to skipped/not_yet? 
                // "skipped" and "not_yet" do not require calories.
                // If the user previously logged as completed and now changes to skipped, we should probably unset actualCalories.
                updateData.actualCalories = undefined; 
                // Mongoose $unset would be better but simple assignment to undefined might not work with $set in update options if not handled carefully.
                // findOneAndUpdate with object usually replaces fields or uses $set.
                // Let's use strict mongoose update syntax for safety.
            }

            // We need to construct the update operation carefully to unset if needed
            const updateOp = {
                $set: {
                    user: userId,
                    dietPlan: activePlan._id,
                    scheduledTimeSnapshot,
                    status,
                    notes,
                    ...(status === 'completed' ? { actualCalories } : {})
                }
            };
            
            if (status !== 'completed') {
                updateOp.$unset = { actualCalories: "" };
            }

            const log = await MealLog.findOneAndUpdate(
                { user: userId, mealSlotId, date },
                updateOp,
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );

            return ResponseUtils.success(res, 'Meal log saved successfully', log);

        } catch (error) {
            console.error('Error logging meal:', error);
            return ResponseUtils.internalError(res, 'Failed to log meal');
        }
    }

    /**
     * Get meal logs for a specific date
     */
    static async getLogsByDate(req, res) {
        try {
            const userId = req.user._id;
            const { date } = req.params;

            if (!date) {
                return ResponseUtils.error(res, 'Date parameter is required', 400);
            }

            // Validate Active Diet Plan
            const activePlan = await DietPlanService.getActiveDietPlan(userId);
            if (!activePlan) {
                return ResponseUtils.error(res, 'No active diet plan found', 400, { code: 'NO_ACTIVE_PLAN' });
            }

            const logs = await MealLog.find({ user: userId, date });

            return ResponseUtils.success(res, 'Meal logs retrieved successfully', logs);

        } catch (error) {
            console.error('Error fetching meal logs:', error);
            return ResponseUtils.internalError(res, 'Failed to fetch meal logs');
        }
    }

    /**
     * Get meal logs for a date range
     */
    static async getLogsByRange(req, res) {
        try {
            const userId = req.user._id;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return ResponseUtils.error(res, 'Start date and end date are required', 400);
            }

            // Validate Active Diet Plan
            const activePlan = await DietPlanService.getActiveDietPlan(userId);
            if (!activePlan) {
                return ResponseUtils.error(res, 'No active diet plan found', 400, { code: 'NO_ACTIVE_PLAN' });
            }

            const logs = await MealLog.find({
                user: userId,
                date: { $gte: startDate, $lte: endDate }
            }).sort({ date: 1 });

            return ResponseUtils.success(res, 'Meal logs retrieved successfully', logs);

        } catch (error) {
            console.error('Error fetching meal logs range:', error);
            return ResponseUtils.internalError(res, 'Failed to fetch meal logs');
        }
    }
}

module.exports = MealLogController;
