const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [200, 'Template name cannot exceed 200 characters'],
    index: true
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  htmlContent: {
    type: String,
    required: [true, 'HTML content is required'],
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'HTML content cannot be empty'
    }
  },
  plainTextContent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);




