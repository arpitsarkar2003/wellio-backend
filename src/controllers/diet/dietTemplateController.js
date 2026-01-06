const DietTemplateService = require('../../services/dietTemplateService');
const ResponseUtils = require('../../utils/responseUtils');
const ValidationUtils = require('../../utils/validationUtils');

class DietTemplateController {

    /**
     * Get All Templates - GET /v1/diet-plans/templates
     */
    static async getAllTemplates(req, res) {
        try {
            const filters = {};
            if (req.query.goal) {
                filters.goal = req.query.goal;
            }

            const templates = await DietTemplateService.getAllTemplates(filters);
            return ResponseUtils.success(res, 'Templates retrieved successfully', templates);

        } catch (error) {
            console.error('Get templates error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to retrieve templates');
        }
    }

    /**
     * Get Template by ID - GET /v1/diet-plans/templates/:templateId
     */
    static async getTemplateById(req, res) {
        try {
            const { templateId } = req.params;
            const template = await DietTemplateService.getTemplateById(templateId);

            if (!template) {
                return ResponseUtils.notFound(res, 'Template not found');
            }

            return ResponseUtils.success(res, 'Template retrieved successfully', template);

        } catch (error) {
            console.error('Get template by ID error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to retrieve template');
        }
    }

    /**
     * Create Template - POST /v1/diet-plans/templates
     * (Admin only)
     */
    static async createTemplate(req, res) {
        try {
            const adminId = req.user.id;
            const templateData = req.body;

            // Validate data
            const { error } = ValidationUtils.validateDietTemplate(templateData);
            if (error) {
                return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
            }

            const newTemplate = await DietTemplateService.createTemplate(adminId, templateData);
            return ResponseUtils.created(res, 'Template created successfully', newTemplate);

        } catch (error) {
            console.error('Create template error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to create template');
        }
    }

    /**
     * Update Template - PUT /v1/diet-plans/templates/:templateId
     * (Admin only)
     */
    static async updateTemplate(req, res) {
        try {
            const { templateId } = req.params;
            const updateData = req.body;

            // Validate data
            const { error } = ValidationUtils.validateDietTemplate(updateData);
            if (error) {
                return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
            }

            const updatedTemplate = await DietTemplateService.updateTemplate(templateId, updateData);

            if (!updatedTemplate) {
                return ResponseUtils.notFound(res, 'Template not found');
            }

            return ResponseUtils.success(res, 'Template updated successfully', updatedTemplate);

        } catch (error) {
            console.error('Update template error:', error.message);
            return ResponseUtils.internalError(res, 'Failed to update template');
        }
    }

    /**
     * Delete Template - DELETE /v1/diet-plans/templates/:templateId
     * (Admin only)
     */
    static async deleteTemplate(req, res) {
        try {
            const { templateId } = req.params;

            await DietTemplateService.deleteTemplate(templateId);
            return ResponseUtils.success(res, 'Template deleted successfully');

        } catch (error) {
            console.error('Delete template error:', error.message);
            if (error.message === 'Cannot delete default template') {
                return ResponseUtils.forbidden(res, error.message);
            }
            return ResponseUtils.internalError(res, 'Failed to delete template');
        }
    }

    /**
     * Apply Template - POST /v1/diet-plans/templates/apply
     * (User)
     */
    static async applyTemplate(req, res) {
        try {
            const userId = req.user.id;
            const { templateId } = req.body;

            if (!templateId) {
                return ResponseUtils.error(res, 'Template ID is required', 400);
            }

            const newPlan = await DietTemplateService.applyTemplate(userId, templateId);
            return ResponseUtils.created(res, 'Template applied successfully', newPlan);

        } catch (error) {
            console.error('Apply template error:', error.message);
            if (error.message === 'Template not found') {
                return ResponseUtils.notFound(res, error.message);
            }
            return ResponseUtils.internalError(res, 'Failed to apply template');
        }
    }
}

module.exports = DietTemplateController;
