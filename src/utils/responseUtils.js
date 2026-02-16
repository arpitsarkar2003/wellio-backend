/**
 * Consistent Response Utility Functions
 */
class ResponseUtils {
  
  // Success response
  static success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  // Error response
  static error(res, message, statusCode = 400, errors = null) {
    return res.status(statusCode).json({
      status: 'error',
      message,
      errors,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validation error response
  static validationError(res, errors, message = 'Validation failed') {
    return res.status(400).json({
      status: 'error',
      message,
      errors: Array.isArray(errors) ? errors : [errors],
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Unauthorized response
  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      status: 'error',
      message,
      errors: null,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Forbidden response
  static forbidden(res, message = 'Access forbidden') {
    return res.status(403).json({
      status: 'error',
      message,
      errors: null,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Not found response
  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      status: 'error',
      message,
      errors: null,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Conflict response
  static conflict(res, message = 'Resource conflict') {
    return res.status(409).json({
      status: 'error',
      message,
      errors: null,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Internal server error response
  static internalError(res, message = 'Internal server error') {
    return res.status(500).json({
      status: 'error',
      message,
      errors: null,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  
  // Created response
  static created(res, message, data = null) {
    return this.success(res, message, data, 201);
  }
  
  // Accepted response
  static accepted(res, message, data = null) {
    return this.success(res, message, data, 202);
  }
  
  // No content response
  static noContent(res) {
    return res.status(204).send();
  }
  
  // Custom response
  static custom(res, statusCode, status, message, data = null, errors = null) {
    return res.status(statusCode).json({
      status,
      message,
      data,
      errors,
      timestamp: new Date().toISOString()
    });
  }
  
  // Paginated response
  static paginated(res, message, data, pagination) {
    return res.status(200).json({
      status: 'success',
      message,
      data,
      pagination: {
        currentPage: pagination.page || 1,
        totalPages: pagination.totalPages || 1,
        totalItems: pagination.totalItems || 0,
        itemsPerPage: pagination.limit || 10,
        hasNextPage: pagination.hasNextPage || false,
        hasPrevPage: pagination.hasPrevPage || false
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // Authentication success response
  static authSuccess(res, message, tokens, user) {
    return res.status(200).json({
      status: 'success',
      message,
      data: {
        user,
        tokens
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // OTP sent response
  static otpSent(res, message, tempToken) {
    return res.status(200).json({
      status: 'success',
      message,
      data: {
        tempAuthToken: tempToken,
        expiresIn: '60 seconds'
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ResponseUtils;