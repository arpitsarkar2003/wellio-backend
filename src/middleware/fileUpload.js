const multer = require('multer');
const ResponseUtils = require('../utils/responseUtils');

/**
 * File Upload Middleware using Multer
 * Configured for image uploads with memory storage
 */

// Configure Multer storage (memory storage for ImgBB upload)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  // Accepted MIME types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF images are allowed.`
      ),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file upload
  }
});

/**
 * Error handling middleware for multer errors
 * @param {Error} error - Multer error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return ResponseUtils.error(
        res, 
        'File too large. Maximum size allowed is 5MB.', 
        400
      );
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return ResponseUtils.error(
        res, 
        'Too many files. Only 1 file is allowed per upload.', 
        400
      );
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return ResponseUtils.error(
        res, 
        'Unexpected file field. Please use the correct field name: "image".', 
        400
      );
    } else {
      return ResponseUtils.error(
        res, 
        `Upload error: ${error.message}`, 
        400
      );
    }
  } else if (error) {
    // Custom file filter errors
    return ResponseUtils.error(
      res, 
      error.message || 'File upload failed', 
      400
    );
  }
  
  next();
};

/**
 * Middleware to validate that a file was uploaded
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const validateFileUploaded = (req, res, next) => {
  if (!req.file) {
    return ResponseUtils.error(
      res, 
      'No image file uploaded. Please attach an image file.', 
      400
    );
  }
  
  next();
};

/**
 * Combined middleware for single image upload with validation
 */
const uploadSingleImage = [
  upload.single('image'),
  handleMulterError,
  validateFileUploaded
];

module.exports = {
  upload,
  uploadSingleImage,
  handleMulterError,
  validateFileUploaded
};
