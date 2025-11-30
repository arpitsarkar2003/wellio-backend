const DietPlan = require('../models/DietPlan');

class DietPlanService {

    /**
     * Create a new diet plan
     */
    static async createDietPlan(userId, planData) {
        // If there's an active plan, deactivate it? Or just create a new one and set it active?
        // Requirement: "A diet plan belongs to a user." "Supports a weekly schedule".
        // "Copy Week" implies we might want to keep history.
        // Let's deactivate previous active plans if the new one is active.

        if (planData.isActive !== false) {
            await DietPlan.updateMany({ user: userId, isActive: true }, { isActive: false });
        }

        const dietPlan = new DietPlan({
            user: userId,
            ...planData
        });

        return await dietPlan.save();
    }

    /**
     * Get user's active diet plan
     */
    static async getActiveDietPlan(userId) {
        return await DietPlan.findOne({ user: userId, isActive: true });
    }

    /**
     * Get diet plan by ID
     */
    static async getDietPlanById(planId, userId) {
        return await DietPlan.findOne({ _id: planId, user: userId });
    }

    /**
     * Get meals for a specific day
     */
    static async getDailyMeals(userId, dayName) {
        const plan = await this.getActiveDietPlan(userId);
        if (!plan) return null;

        const daySchedule = plan.weekSchedule.find(d => d.day === dayName);
        return daySchedule ? daySchedule.meals : [];
    }

    /**
     * Update diet plan (full update)
     */
    static async updateDietPlan(userId, planId, updateData) {
        const plan = await DietPlan.findOne({ _id: planId, user: userId });
        if (!plan) return null;

        // If setting to active, deactivate others
        if (updateData.isActive === true) {
            await DietPlan.updateMany({ user: userId, _id: { $ne: planId }, isActive: true }, { isActive: false });
        }

        Object.assign(plan, updateData);
        return await plan.save();
    }

    /**
     * Update specific meal
     */
    static async updateMeal(userId, planId, mealId, updateData) {
        const plan = await DietPlan.findOne({ _id: planId, user: userId });
        if (!plan) return null;

        let mealFound = false;
        for (const day of plan.weekSchedule) {
            const meal = day.meals.id(mealId);
            if (meal) {
                if (updateData.mealName) meal.mealName = updateData.mealName;
                if (updateData.time) meal.time = updateData.time;
                if (updateData.items) meal.items = updateData.items;
                if (updateData.preparationNotes !== undefined) meal.preparationNotes = updateData.preparationNotes;
                mealFound = true;
                break;
            }
        }

        if (!mealFound) return null; // Or throw error?

        return await plan.save();
    }

    /**
     * Delete diet plan
     */
    static async deleteDietPlan(userId, planId) {
        return await DietPlan.findOneAndDelete({ _id: planId, user: userId });
    }

    /**
     * Copy week (duplicate active plan)
     */
    static async copyWeek(userId) {
        const activePlan = await this.getActiveDietPlan(userId);
        if (!activePlan) {
            throw new Error('No active plan found to copy');
        }

        // Deactivate current plan
        activePlan.isActive = false;
        await activePlan.save();

        // Create new plan with same schedule
        const newPlan = new DietPlan({
            user: userId,
            weekSchedule: activePlan.weekSchedule,
            isActive: true
        });

        return await newPlan.save();
    }
}

module.exports = DietPlanService;
