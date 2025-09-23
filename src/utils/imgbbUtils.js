const axios = require('axios');

/**
 * ImgBB API Integration Utility
 * For uploading base64 images to ImgBB hosting service
 */
class ImgBBUtils {
  
  constructor() {
    this.apiKey = process.env.IMGBB_API_KEY;
    this.baseUrl = 'https://api.imgbb.com/1/upload';
  }
  
  /**
   * Upload base64 image to ImgBB
   * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
   * @param {string} imageName - Optional name for the image
   * @param {number} expiration - Optional expiration time in seconds (60-15552000)
   * @returns {Promise<object>} Upload result with URLs
   */
  async uploadBase64Image(base64Image, imageName = null, expiration = null) {
    try {
      if (!this.apiKey) {
        throw new Error('ImgBB API key not configured. Please set IMGBB_API_KEY in environment variables.');
      }
      
      // Validate base64 image
      const validationResult = this.validateBase64Image(base64Image);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }
      
      // Clean base64 string (remove data URI prefix if present)
      const cleanBase64 = this.cleanBase64String(base64Image);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('key', this.apiKey);
      formData.append('image', cleanBase64);
      
      if (imageName) {
        formData.append('name', imageName);
      }
      
      if (expiration && expiration >= 60 && expiration <= 15552000) {
        formData.append('expiration', expiration.toString());
      }
      
      // Make API request
      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 seconds timeout
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'ImgBB upload failed');
      }
      
      const imageData = response.data.data;
      
      return {
        success: true,
        data: {
          id: imageData.id,
          title: imageData.title,
          imageUrl: imageData.url,
          displayUrl: imageData.display_url,
          thumbnailUrl: imageData.thumb?.url,
          mediumUrl: imageData.medium?.url,
          deleteUrl: imageData.delete_url,
          size: imageData.size,
          width: imageData.width,
          height: imageData.height,
          uploadedAt: new Date(),
          expirationTime: imageData.expiration ? new Date(imageData.expiration * 1000) : null
        }
      };
      
    } catch (error) {
      console.error('ImgBB upload error:', error.message);
      
      return {
        success: false,
        error: error.message || 'Failed to upload image to ImgBB'
      };
    }
  }
  
  /**
   * Upload image from URL to ImgBB
   * @param {string} imageUrl - URL of the image to upload
   * @param {string} imageName - Optional name for the image
   * @param {number} expiration - Optional expiration time in seconds
   * @returns {Promise<object>} Upload result
   */
  async uploadFromUrl(imageUrl, imageName = null, expiration = null) {
    try {
      if (!this.apiKey) {
        throw new Error('ImgBB API key not configured');
      }
      
      // Validate URL format
      if (!this.isValidUrl(imageUrl)) {
        throw new Error('Invalid image URL provided');
      }
      
      const formData = new FormData();
      formData.append('key', this.apiKey);
      formData.append('image', imageUrl);
      
      if (imageName) {
        formData.append('name', imageName);
      }
      
      if (expiration) {
        formData.append('expiration', expiration.toString());
      }
      
      const response = await axios.post(this.baseUrl, formData, {
        timeout: 30000
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'ImgBB upload failed');
      }
      
      const imageData = response.data.data;
      
      return {
        success: true,
        data: {
          id: imageData.id,
          title: imageData.title,
          imageUrl: imageData.url,
          displayUrl: imageData.display_url,
          thumbnailUrl: imageData.thumb?.url,
          mediumUrl: imageData.medium?.url,
          deleteUrl: imageData.delete_url,
          size: imageData.size,
          width: imageData.width,
          height: imageData.height,
          uploadedAt: new Date(),
          expirationTime: imageData.expiration ? new Date(imageData.expiration * 1000) : null
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to upload image from URL to ImgBB'
      };
    }
  }
  
  /**
   * Validate base64 image string
   * @param {string} base64String - Base64 string to validate
   * @returns {object} Validation result
   */
  validateBase64Image(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      return { isValid: false, error: 'Base64 image string is required' };
    }
    
    // Check for data URI prefix
    const dataUriPattern = /^data:image\/(jpeg|jpg|png|gif|webp|bmp);base64,/i;
    const hasDataUri = dataUriPattern.test(base64String);
    
    // Extract base64 part
    const base64Part = hasDataUri ? base64String.split(',')[1] : base64String;
    
    // Validate base64 format
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(base64Part)) {
      return { isValid: false, error: 'Invalid base64 format' };
    }
    
    // Check minimum length (very small images)
    if (base64Part.length < 100) {
      return { isValid: false, error: 'Base64 string too short, possibly invalid image' };
    }
    
    // Estimate file size (base64 is ~1.37x larger than original)
    const estimatedSize = (base64Part.length * 0.75) / 1024 / 1024; // Size in MB
    const maxSizeInMB = 32; // ImgBB free tier limit
    
    if (estimatedSize > maxSizeInMB) {
      return { 
        isValid: false, 
        error: `Image too large. Estimated size: ${estimatedSize.toFixed(2)}MB, Max allowed: ${maxSizeInMB}MB` 
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Clean base64 string by removing data URI prefix
   * @param {string} base64String - Base64 string to clean
   * @returns {string} Clean base64 string
   */
  cleanBase64String(base64String) {
    // Remove data URI prefix if present
    if (base64String.startsWith('data:')) {
      return base64String.split(',')[1];
    }
    return base64String;
  }
  
  /**
   * Check if URL is valid
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get image information from base64 string
   * @param {string} base64String - Base64 image string
   * @returns {object} Image information
   */
  getImageInfo(base64String) {
    try {
      const validation = this.validateBase64Image(base64String);
      if (!validation.isValid) {
        return { error: validation.error };
      }
      
      // Extract MIME type if data URI is present
      let mimeType = 'image/unknown';
      let extension = 'unknown';
      
      if (base64String.startsWith('data:image/')) {
        const mimeMatch = base64String.match(/^data:image\/([^;]+);base64,/);
        if (mimeMatch) {
          extension = mimeMatch[1];
          mimeType = `image/${extension}`;
        }
      }
      
      // Calculate estimated file size
      const base64Part = this.cleanBase64String(base64String);
      const estimatedBytes = (base64Part.length * 0.75);
      const estimatedKB = (estimatedBytes / 1024).toFixed(2);
      const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);
      
      return {
        mimeType,
        extension,
        base64Length: base64Part.length,
        estimatedSize: {
          bytes: Math.round(estimatedBytes),
          kb: estimatedKB,
          mb: estimatedMB
        }
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new ImgBBUtils();
