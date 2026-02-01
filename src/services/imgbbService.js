const axios = require('axios');
const FormData = require('form-data');

/**
 * ImgBB Service for uploading images from file buffers
 * Handles direct file uploads from Multer middleware
 */
class ImgBBService {
  
  constructor() {
    this.apiKey = process.env.IMGBB_API_KEY;
    this.baseUrl = 'https://api.imgbb.com/1/upload';
  }
  
  /**
   * Upload image buffer to ImgBB (from Multer file upload)
   * @param {Buffer} fileBuffer - File buffer from multer (req.file.buffer)
   * @param {string} fileName - Optional file name (default: timestamp)
   * @param {number} expiration - Optional expiration in seconds (60-15552000)
   * @returns {Promise<string>} - Display URL of uploaded image
   */
  async uploadToImgBB(fileBuffer, fileName = null, expiration = null) {
    try {
      if (!this.apiKey) {
        throw new Error('ImgBB API key not configured. Set IMGBB_API_KEY in environment variables.');
      }
      
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        throw new Error('Valid file buffer is required');
      }
      
      // Validate file size (ImgBB free tier: 32MB limit)
      const fileSizeInMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeInMB > 32) {
        throw new Error(`File too large: ${fileSizeInMB.toFixed(2)}MB. Max allowed: 32MB`);
      }
      
      // Convert buffer to base64
      const base64Image = fileBuffer.toString('base64');
      
      // Prepare form data
      const formData = new FormData();
      formData.append('key', this.apiKey);
      formData.append('image', base64Image);
      
      if (fileName) {
        formData.append('name', fileName);
      }
      
      if (expiration && expiration >= 60 && expiration <= 15552000) {
        formData.append('expiration', expiration.toString());
      }
      
      // Make API request
      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 seconds timeout
      });
      
      if (!response.data || !response.data.success) {
        const errorMsg = response.data?.error?.message || 'ImgBB upload failed';
        throw new Error(errorMsg);
      }
      
      const imageData = response.data.data;
      
      // Return the display URL directly (as required)
      return imageData.display_url;
      
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        const errorMsg = error.response.data?.error?.message || error.message;
        
        if (status === 400) {
          throw new Error(`ImgBB: Invalid image format or data - ${errorMsg}`);
        } else if (status === 403) {
          throw new Error('ImgBB: API key invalid or rate limit exceeded');
        } else if (status === 429) {
          throw new Error('ImgBB: Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`ImgBB upload failed: ${errorMsg}`);
        }
      }
      
      throw new Error(`Failed to upload to ImgBB: ${error.message}`);
    }
  }
  
  /**
   * Upload multiple images to ImgBB in parallel
   * @param {Array<Buffer>} fileBuffers - Array of file buffers
   * @returns {Promise<Array<string>>} - Array of display URLs
   */
  async uploadMultiple(fileBuffers) {
    try {
      const uploadPromises = fileBuffers.map((buffer, index) => 
        this.uploadToImgBB(buffer, `image_${Date.now()}_${index}`)
      );
      
      const results = await Promise.all(uploadPromises);
      return results;
      
    } catch (error) {
      throw new Error(`Multiple upload failed: ${error.message}`);
    }
  }
  
  /**
   * Validate image buffer format
   * @param {Buffer} fileBuffer - File buffer to validate
   * @returns {Object} - Validation result with format info
   */
  validateImageBuffer(fileBuffer) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return { 
        isValid: false, 
        error: 'Invalid buffer provided' 
      };
    }
    
    // Check file signatures (magic numbers)
    const signatures = {
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP)
      bmp: [0x42, 0x4D]
    };
    
    let detectedFormat = null;
    
    // Check for JPEG
    if (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8 && fileBuffer[2] === 0xFF) {
      detectedFormat = 'jpeg';
    }
    // Check for PNG
    else if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4E && fileBuffer[3] === 0x47) {
      detectedFormat = 'png';
    }
    // Check for GIF
    else if (fileBuffer[0] === 0x47 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46) {
      detectedFormat = 'gif';
    }
    // Check for WebP
    else if (fileBuffer[0] === 0x52 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46 && fileBuffer[3] === 0x46) {
      detectedFormat = 'webp';
    }
    // Check for BMP
    else if (fileBuffer[0] === 0x42 && fileBuffer[1] === 0x4D) {
      detectedFormat = 'bmp';
    }
    
    if (!detectedFormat) {
      return {
        isValid: false,
        error: 'Unsupported image format. Accepted: JPEG, PNG, GIF, WebP, BMP'
      };
    }
    
    return {
      isValid: true,
      format: detectedFormat,
      size: fileBuffer.length,
      sizeInMB: (fileBuffer.length / (1024 * 1024)).toFixed(2)
    };
  }
}

// Export singleton instance
module.exports = new ImgBBService();
