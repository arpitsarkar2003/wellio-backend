const DietTemplate = require('../models/DietTemplate');
const DietPlanService = require('./dietPlanService');

class DietTemplateService {

    /**
     * Create a new diet template
     */
    static async createTemplate(adminId, templateData) {
        const template = new DietTemplate({
            createdBy: adminId,
            ...templateData
        });
        return await template.save();
    }

    /**
     * Get all templates (with optional filtering)
     */
    static async getAllTemplates(filters = {}) {
        const query = {};
        if (filters.goal) {
            query.goal = filters.goal;
        }
        return await DietTemplate.find(query).sort({ createdAt: -1 });
    }

    /**
     * Get template by ID
     */
    static async getTemplateById(templateId) {
        return await DietTemplate.findById(templateId);
    }

    /**
     * Update template
     */
    static async updateTemplate(templateId, updateData) {
        // Prevent updating createdBy
        delete updateData.createdBy;

        return await DietTemplate.findByIdAndUpdate(
            templateId,
            updateData,
            { new: true, runValidators: true }
        );
    }

    /**
     * Delete template
     */
    static async deleteTemplate(templateId) {
        const template = await DietTemplate.findById(templateId);
        if (!template) return null;

        if (template.isDefault) {
            throw new Error('Cannot delete default template');
        }

        return await DietTemplate.findByIdAndDelete(templateId);
    }

    /**
     * Apply template to user (Create new DietPlan)
     */
    static async applyTemplate(userId, templateId) {
        const template = await DietTemplate.findById(templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        // Create new diet plan using template's schedule
        const planData = {
            weekSchedule: template.weekSchedule,
            isActive: true
        };

        return await DietPlanService.createDietPlan(userId, planData);
    }
}

module.exports = DietTemplateService;
