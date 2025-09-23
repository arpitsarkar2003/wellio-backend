const Company = require('../models/Company');
const ValidationUtils = require('../utils/validationUtils');
const ResponseUtils = require('../utils/responseUtils');
const ImgBBUtils = require('../utils/imgbbUtils');

/**
 * Company/Website Management Controllers (Super Admin Only)
 */
class CompanyController {
  
  /**
   * Get Company Information - GET /v1/admin/company
   */
  static async getCompanyInfo(req, res) {
    try {
      const company = await Company.getCompanyInfo();
      
      if (!company) {
        return ResponseUtils.success(res, 'No company information found', {
          company: {
            name: '',
            logo: {},
            address: {},
            contactInfo: {
              phoneNumbers: [],
              emails: [],
              socialMedia: {}
            },
            description: '',
            establishedYear: null,
            industry: ''
          }
        });
      }
      
      return ResponseUtils.success(res, 'Company information retrieved successfully', {
        company
      });
      
    } catch (error) {
      console.error('Get company info error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve company information');
    }
  }
  
  /**
   * Update Company Information - PUT /v1/admin/company
   */
  static async updateCompanyInfo(req, res) {
    try {
      const { error } = ValidationUtils.validateCompanyData(req.body);
      if (error) {
        return ResponseUtils.validationError(res, ValidationUtils.formatValidationErrors(error));
      }
      
      const adminId = req.user.id;
      const updateData = { ...req.body };
      
      // Handle logo upload if provided
      if (updateData.logo && updateData.logo.base64Image) {
        try {
          const uploadResult = await ImgBBUtils.uploadBase64Image(
            updateData.logo.base64Image,
            updateData.logo.imageName || 'company-logo'
          );
          
          if (uploadResult.success) {
            updateData.logo = {
              imageUrl: uploadResult.data.imageUrl,
              thumbnailUrl: uploadResult.data.thumbnailUrl,
              deleteUrl: uploadResult.data.deleteUrl,
              uploadedAt: uploadResult.data.uploadedAt
            };
          } else {
            return ResponseUtils.error(res, `Image upload failed: ${uploadResult.error}`, 400);
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError.message);
          return ResponseUtils.error(res, 'Failed to upload company logo', 400);
        }
      }
      
      // Create or update company information
      const company = await Company.createOrUpdate(updateData, adminId);
      
      return ResponseUtils.success(res, 'Company information updated successfully', {
        company
      });
      
    } catch (error) {
      console.error('Update company info error:', error.message);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }
      
      return ResponseUtils.internalError(res, 'Failed to update company information');
    }
  }
  
  /**
   * Upload Company Logo - POST /v1/admin/company/logo
   */
  static async uploadLogo(req, res) {
    try {
      const { base64Image, imageName } = req.body;
      
      if (!base64Image) {
        return ResponseUtils.error(res, 'Base64 image data is required', 400);
      }
      
      // Validate image
      const validation = ImgBBUtils.validateBase64Image(base64Image);
      if (!validation.isValid) {
        return ResponseUtils.error(res, validation.error, 400);
      }
      
      // Upload to ImgBB
      const uploadResult = await ImgBBUtils.uploadBase64Image(
        base64Image,
        imageName || 'company-logo'
      );
      
      if (!uploadResult.success) {
        return ResponseUtils.error(res, uploadResult.error, 400);
      }
      
      // Update company with new logo
      const adminId = req.user.id;
      const company = await Company.findOne({ isActive: true });
      
      if (company) {
        await company.updateLogo({
          imageUrl: uploadResult.data.imageUrl,
          thumbnailUrl: uploadResult.data.thumbnailUrl,
          deleteUrl: uploadResult.data.deleteUrl
        });
        company.lastUpdatedBy = adminId;
        await company.save();
      } else {
        // Create new company record with just the logo
        await Company.create({
          name: 'Your Company Name',
          logo: {
            imageUrl: uploadResult.data.imageUrl,
            thumbnailUrl: uploadResult.data.thumbnailUrl,
            deleteUrl: uploadResult.data.deleteUrl,
            uploadedAt: uploadResult.data.uploadedAt
          },
          lastUpdatedBy: adminId
        });
      }
      
      return ResponseUtils.success(res, 'Logo uploaded successfully', {
        logo: {
          imageUrl: uploadResult.data.imageUrl,
          thumbnailUrl: uploadResult.data.thumbnailUrl,
          size: uploadResult.data.size,
          width: uploadResult.data.width,
          height: uploadResult.data.height
        }
      });
      
    } catch (error) {
      console.error('Upload logo error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to upload logo');
    }
  }
  
  /**
   * Remove Company Logo - DELETE /v1/admin/company/logo
   */
  static async removeLogo(req, res) {
    try {
      const company = await Company.findOne({ isActive: true });
      
      if (!company) {
        return ResponseUtils.notFound(res, 'Company not found');
      }
      
      if (!company.logo || !company.logo.imageUrl) {
        return ResponseUtils.error(res, 'No logo to remove', 400);
      }
      
      // Remove logo from company
      await company.removeLogo();
      company.lastUpdatedBy = req.user.id;
      await company.save();
      
      return ResponseUtils.success(res, 'Logo removed successfully');
      
    } catch (error) {
      console.error('Remove logo error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to remove logo');
    }
  }
  
  /**
   * Add Phone Number - POST /v1/admin/company/phone
   */
  static async addPhoneNumber(req, res) {
    try {
      const { number, type, label } = req.body;
      
      if (!number) {
        return ResponseUtils.error(res, 'Phone number is required', 400);
      }
      
      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(number)) {
        return ResponseUtils.error(res, 'Invalid phone number format', 400);
      }
      
      const company = await Company.findOne({ isActive: true });
      
      if (!company) {
        return ResponseUtils.notFound(res, 'Company not found');
      }
      
      await company.addPhoneNumber({
        number,
        type: type || 'primary',
        label: label || ''
      });
      
      company.lastUpdatedBy = req.user.id;
      await company.save();
      
      return ResponseUtils.success(res, 'Phone number added successfully', {
        company
      });
      
    } catch (error) {
      console.error('Add phone number error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to add phone number');
    }
  }
  
  /**
   * Add Email - POST /v1/admin/company/email
   */
  static async addEmail(req, res) {
    try {
      const { email, type, label } = req.body;
      
      if (!email) {
        return ResponseUtils.error(res, 'Email is required', 400);
      }
      
      // Validate email format
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        return ResponseUtils.error(res, 'Invalid email format', 400);
      }
      
      const company = await Company.findOne({ isActive: true });
      
      if (!company) {
        return ResponseUtils.notFound(res, 'Company not found');
      }
      
      await company.addEmail({
        email: email.toLowerCase().trim(),
        type: type || 'primary',
        label: label || ''
      });
      
      company.lastUpdatedBy = req.user.id;
      await company.save();
      
      return ResponseUtils.success(res, 'Email added successfully', {
        company
      });
      
    } catch (error) {
      console.error('Add email error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to add email');
    }
  }
  
  /**
   * Get Image Info (for validation before upload) - POST /v1/admin/company/logo/info
   */
  static getImageInfo(req, res) {
    try {
      const { base64Image } = req.body;
      
      if (!base64Image) {
        return ResponseUtils.error(res, 'Base64 image data is required', 400);
      }
      
      const imageInfo = ImgBBUtils.getImageInfo(base64Image);
      
      if (imageInfo.error) {
        return ResponseUtils.error(res, imageInfo.error, 400);
      }
      
      return ResponseUtils.success(res, 'Image information retrieved', {
        imageInfo
      });
      
    } catch (error) {
      console.error('Get image info error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to get image information');
    }
  }
}

module.exports = CompanyController;
