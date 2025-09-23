const Policy = require('../models/Policy');
const ValidationUtils = require('../utils/validationUtils');
const ResponseUtils = require('../utils/responseUtils');

/**
 * Policy Management Controllers (Privacy Policy & Terms & Conditions)
 */
class PolicyController {
  
  /**
   * Get Privacy Policy - GET /v1/policy/privacy-policy
   */
  static async getPrivacyPolicy(req, res) {
    try {
      const policy = await Policy.getCurrentPrivacyPolicy();
      
      if (!policy) {
        return ResponseUtils.notFound(res, 'Privacy policy not found');
      }
      
      return ResponseUtils.success(res, 'Privacy policy retrieved successfully', {
        policy: {
          title: policy.title,
          content: policy.content,
          version: policy.version,
          effectiveFrom: policy.effectiveFrom,
          lastUpdated: policy.updatedAt,
          wordCount: policy.wordCount,
          estimatedReadingTime: policy.estimatedReadingTime
        }
      });
      
    } catch (error) {
      console.error('Get privacy policy error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve privacy policy');
    }
  }
  
  /**
   * Get Terms & Conditions - GET /v1/policy/terms-conditions
   */
  static async getTermsConditions(req, res) {
    try {
      const policy = await Policy.getCurrentTermsConditions();
      
      if (!policy) {
        return ResponseUtils.notFound(res, 'Terms & conditions not found');
      }
      
      return ResponseUtils.success(res, 'Terms & conditions retrieved successfully', {
        policy: {
          title: policy.title,
          content: policy.content,
          version: policy.version,
          effectiveFrom: policy.effectiveFrom,
          lastUpdated: policy.updatedAt,
          wordCount: policy.wordCount,
          estimatedReadingTime: policy.estimatedReadingTime
        }
      });
      
    } catch (error) {
      console.error('Get terms conditions error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve terms & conditions');
    }
  }
  
  /**
   * Upload Privacy Policy (Super Admin Only) - POST /v1/admin/policy/privacy-policy
   */
  static async uploadPrivacyPolicy(req, res) {
    try {
      const { error } = ValidationUtils.validatePolicyData({
        ...req.body,
        type: 'privacy_policy'
      });
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { title, content, originalFileName, changes, metaDescription, keywords } = req.body;
      const adminId = req.user.id;
      
      // Calculate file size if content is provided
      const fileSize = content ? Buffer.byteLength(content, 'utf8') : 0;
      
      const policyData = {
        title,
        content,
        originalFileName,
        fileSize,
        metaDescription,
        keywords: keywords || []
      };
      
      // Create or update privacy policy
      const policy = await Policy.createOrUpdate('privacy_policy', policyData, adminId, changes);
      
      return ResponseUtils.success(res, 'Privacy policy uploaded successfully', {
        policy: {
          id: policy._id,
          type: policy.type,
          title: policy.title,
          version: policy.version,
          status: policy.status,
          effectiveFrom: policy.effectiveFrom,
          wordCount: policy.wordCount,
          estimatedReadingTime: policy.estimatedReadingTime,
          fileSize: policy.fileSize,
          lastUpdated: policy.updatedAt
        }
      });
      
    } catch (error) {
      console.error('Upload privacy policy error:', error.message);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }
      
      return ResponseUtils.internalError(res, 'Failed to upload privacy policy');
    }
  }
  
  /**
   * Upload Terms & Conditions (Super Admin Only) - POST /v1/admin/policy/terms-conditions
   */
  static async uploadTermsConditions(req, res) {
    try {
      const { error } = ValidationUtils.validatePolicyData({
        ...req.body,
        type: 'terms_conditions'
      });
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const { title, content, originalFileName, changes, metaDescription, keywords } = req.body;
      const adminId = req.user.id;
      
      // Calculate file size if content is provided
      const fileSize = content ? Buffer.byteLength(content, 'utf8') : 0;
      
      const policyData = {
        title,
        content,
        originalFileName,
        fileSize,
        metaDescription,
        keywords: keywords || []
      };
      
      // Create or update terms & conditions
      const policy = await Policy.createOrUpdate('terms_conditions', policyData, adminId, changes);
      
      return ResponseUtils.success(res, 'Terms & conditions uploaded successfully', {
        policy: {
          id: policy._id,
          type: policy.type,
          title: policy.title,
          version: policy.version,
          status: policy.status,
          effectiveFrom: policy.effectiveFrom,
          wordCount: policy.wordCount,
          estimatedReadingTime: policy.estimatedReadingTime,
          fileSize: policy.fileSize,
          lastUpdated: policy.updatedAt
        }
      });
      
    } catch (error) {
      console.error('Upload terms conditions error:', error.message);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }
      
      return ResponseUtils.internalError(res, 'Failed to upload terms & conditions');
    }
  }
  
  /**
   * Get All Policies (Super Admin Only) - GET /v1/admin/policy
   */
  static async getAllPolicies(req, res) {
    try {
      const policies = await Policy.find({}).sort({ updatedAt: -1 });
      
      return ResponseUtils.success(res, 'Policies retrieved successfully', {
        policies: policies.map(policy => ({
          id: policy._id,
          type: policy.type,
          title: policy.title,
          version: policy.version,
          status: policy.status,
          statusInfo: policy.statusInfo,
          effectiveFrom: policy.effectiveFrom,
          effectiveUntil: policy.effectiveUntil,
          wordCount: policy.wordCount,
          estimatedReadingTime: policy.estimatedReadingTime,
          fileSize: policy.fileSize,
          originalFileName: policy.originalFileName,
          lastUpdated: policy.updatedAt,
          createdAt: policy.createdAt
        }))
      });
      
    } catch (error) {
      console.error('Get all policies error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve policies');
    }
  }
  
  /**
   * Get Policy by ID (Super Admin Only) - GET /v1/admin/policy/:id
   */
  static async getPolicyById(req, res) {
    try {
      const { id } = req.params;
      
      const policy = await Policy.findById(id);
      
      if (!policy) {
        return ResponseUtils.notFound(res, 'Policy not found');
      }
      
      return ResponseUtils.success(res, 'Policy retrieved successfully', {
        policy: {
          id: policy._id,
          type: policy.type,
          title: policy.title,
          content: policy.content,
          version: policy.version,
          status: policy.status,
          statusInfo: policy.statusInfo,
          effectiveFrom: policy.effectiveFrom,
          effectiveUntil: policy.effectiveUntil,
          wordCount: policy.wordCount,
          estimatedReadingTime: policy.estimatedReadingTime,
          fileSize: policy.fileSize,
          originalFileName: policy.originalFileName,
          metaDescription: policy.metaDescription,
          keywords: policy.keywords,
          changelog: policy.changelog,
          lastUpdated: policy.updatedAt,
          createdAt: policy.createdAt
        }
      });
      
    } catch (error) {
      console.error('Get policy by ID error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve policy');
    }
  }
  
  /**
   * Update Policy Status (Super Admin Only) - PATCH /v1/admin/policy/:id/status
   */
  static async updatePolicyStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, effectiveFrom, effectiveUntil } = req.body;
      
      if (!status || !['draft', 'published', 'archived'].includes(status)) {
        return ResponseUtils.error(res, 'Valid status is required (draft, published, archived)', 400);
      }
      
      const policy = await Policy.findById(id);
      
      if (!policy) {
        return ResponseUtils.notFound(res, 'Policy not found');
      }
      
      // Update status based on the requested status
      switch (status) {
        case 'published':
          await policy.publish(effectiveFrom ? new Date(effectiveFrom) : new Date());
          break;
        case 'archived':
          await policy.archive(effectiveUntil ? new Date(effectiveUntil) : new Date());
          break;
        case 'draft':
          await policy.makeDraft();
          break;
      }
      
      policy.lastUpdatedBy = req.user.id;
      await policy.save();
      
      return ResponseUtils.success(res, `Policy ${status} successfully`, {
        policy: {
          id: policy._id,
          type: policy.type,
          title: policy.title,
          status: policy.status,
          statusInfo: policy.statusInfo,
          effectiveFrom: policy.effectiveFrom,
          effectiveUntil: policy.effectiveUntil,
          lastUpdated: policy.updatedAt
        }
      });
      
    } catch (error) {
      console.error('Update policy status error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to update policy status');
    }
  }
  
  /**
   * Delete Policy (Super Admin Only) - DELETE /v1/admin/policy/:id
   */
  static async deletePolicy(req, res) {
    try {
      const { id } = req.params;
      
      const policy = await Policy.findById(id);
      
      if (!policy) {
        return ResponseUtils.notFound(res, 'Policy not found');
      }
      
      // Don't allow deletion of published policies
      if (policy.status === 'published') {
        return ResponseUtils.error(res, 'Cannot delete published policy. Archive it first.', 400);
      }
      
      await Policy.findByIdAndDelete(id);
      
      return ResponseUtils.success(res, 'Policy deleted successfully');
      
    } catch (error) {
      console.error('Delete policy error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to delete policy');
    }
  }
  
  /**
   * Get Policy Statistics (Super Admin Only) - GET /v1/admin/policy/stats
   */
  static async getPolicyStats(req, res) {
    try {
      const stats = await Policy.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            draft: {
              $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
            },
            archived: {
              $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
            },
            latestVersion: { $max: '$version' },
            totalWordCount: { $sum: '$wordCount' }
          }
        }
      ]);
      
      return ResponseUtils.success(res, 'Policy statistics retrieved successfully', {
        stats
      });
      
    } catch (error) {
      console.error('Get policy stats error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve policy statistics');
    }
  }
}

module.exports = PolicyController;
