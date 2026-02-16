const EmailTemplate = require('../../models/EmailTemplate');
const ValidationUtils = require('../../utils/validationUtils');
const ResponseUtils = require('../../utils/responseUtils');

/**
 * Email Template Controller
 * Admin-only API for managing email templates
 */
class EmailTemplateController {
  
  /**
   * Create template - POST /v2/admin/email-templates
   */
  static async createTemplate(req, res) {
    try {
      const { error } = ValidationUtils.validateEmailTemplate(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const { name, subject, htmlContent, plainTextContent } = req.body;

      // Validate HTML content is not empty
      if (!htmlContent || htmlContent.trim().length === 0) {
        return ResponseUtils.validationError(res, ['HTML content cannot be empty']);
      }

      const template = new EmailTemplate({
        name: name.trim(),
        subject: subject.trim(),
        htmlContent: htmlContent.trim(),
        plainTextContent: plainTextContent ? plainTextContent.trim() : null
      });

      await template.save();

      return ResponseUtils.created(res, 'Email template created successfully', {
        id: template._id,
        name: template.name,
        subject: template.subject,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      });

    } catch (error) {
      console.error('Create template error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to create email template');
    }
  }

  /**
   * Get all templates - GET /v2/admin/email-templates
   */
  static async getAllTemplates(req, res) {
    try {
      const templates = await EmailTemplate.find()
        .select('name subject createdAt updatedAt')
        .sort({ createdAt: -1 });

      return ResponseUtils.success(res, 'Templates retrieved successfully', {
        templates
      });

    } catch (error) {
      console.error('Get templates error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve templates');
    }
  }

  /**
   * Get template by ID - GET /v2/admin/email-templates/:id
   */
  static async getTemplateById(req, res) {
    try {
      const { id } = req.params;

      const template = await EmailTemplate.findById(id);
      if (!template) {
        return ResponseUtils.notFound(res, 'Template not found');
      }

      return ResponseUtils.success(res, 'Template retrieved successfully', {
        id: template._id,
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        plainTextContent: template.plainTextContent,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      });

    } catch (error) {
      console.error('Get template error:', error.message);
      if (error.name === 'CastError') {
        return ResponseUtils.validationError(res, ['Invalid template ID']);
      }
      return ResponseUtils.internalError(res, 'Failed to retrieve template');
    }
  }

  /**
   * Update template - PUT /v2/admin/email-templates/:id
   */
  static async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { error } = ValidationUtils.validateEmailTemplateUpdate(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }

      const template = await EmailTemplate.findById(id);
      if (!template) {
        return ResponseUtils.notFound(res, 'Template not found');
      }

      const { name, subject, htmlContent, plainTextContent } = req.body;

      // Update fields if provided
      if (name !== undefined) {
        template.name = name.trim();
      }
      if (subject !== undefined) {
        template.subject = subject.trim();
      }
      if (htmlContent !== undefined) {
        if (htmlContent.trim().length === 0) {
          return ResponseUtils.validationError(res, ['HTML content cannot be empty']);
        }
        template.htmlContent = htmlContent.trim();
      }
      if (plainTextContent !== undefined) {
        template.plainTextContent = plainTextContent ? plainTextContent.trim() : null;
      }

      await template.save();

      return ResponseUtils.success(res, 'Template updated successfully', {
        id: template._id,
        name: template.name,
        subject: template.subject,
        updatedAt: template.updatedAt
      });

    } catch (error) {
      console.error('Update template error:', error.message);
      if (error.name === 'CastError') {
        return ResponseUtils.validationError(res, ['Invalid template ID']);
      }
      return ResponseUtils.internalError(res, 'Failed to update template');
    }
  }

  /**
   * Delete template - DELETE /v2/admin/email-templates/:id
   */
  static async deleteTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await EmailTemplate.findByIdAndDelete(id);
      if (!template) {
        return ResponseUtils.notFound(res, 'Template not found');
      }

      return ResponseUtils.success(res, 'Template deleted successfully');

    } catch (error) {
      console.error('Delete template error:', error.message);
      if (error.name === 'CastError') {
        return ResponseUtils.validationError(res, ['Invalid template ID']);
      }
      return ResponseUtils.internalError(res, 'Failed to delete template');
    }
  }
}

module.exports = EmailTemplateController;


