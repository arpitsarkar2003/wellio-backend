const EmailUtils = require('../utils/emailUtils');
const EmailSubscription = require('../models/EmailSubscription');
const EmailTemplate = require('../models/EmailTemplate');
const EmailBroadcast = require('../models/EmailBroadcast');

/**
 * Email Broadcast Service
 * Handles batch email sending with configurable delays and fault tolerance
 */
class EmailBroadcastService {
  
  /**
   * Process email broadcast in batches
   * @param {string} broadcastId - Broadcast ID
   * @param {number} batchSize - Number of emails per batch
   * @param {number} delayBetweenBatches - Delay in milliseconds between batches
   */
  static async processBroadcast(broadcastId, batchSize, delayBetweenBatches) {
    try {
      const broadcast = await EmailBroadcast.findById(broadcastId).populate('templateId');
      if (!broadcast) {
        throw new Error('Broadcast not found');
      }

      if (broadcast.status !== 'pending' && broadcast.status !== 'in-progress') {
        throw new Error(`Broadcast is already ${broadcast.status}`);
      }

      // Update status to in-progress
      broadcast.status = 'in-progress';
      broadcast.startedAt = new Date();
      await broadcast.save();

      // Get active subscribers
      const subscribers = await EmailSubscription.find({ isActive: true }).select('email');
      const totalSubscribers = subscribers.length;
      
      broadcast.totalSubscribers = totalSubscribers;
      await broadcast.save();

      if (totalSubscribers === 0) {
        broadcast.status = 'completed';
        broadcast.completedAt = new Date();
        await broadcast.save();
        return;
      }

      const template = broadcast.templateId;
      if (!template) {
        throw new Error('Template not found');
      }

      // Process in batches
      const emailAddresses = subscribers.map(sub => sub.email);
      let processedCount = 0;
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < emailAddresses.length; i += batchSize) {
        const batch = emailAddresses.slice(i, i + batchSize);
        
        // Process batch
        const batchResults = await Promise.allSettled(
          batch.map(email => this.sendEmail(email, template.subject, template.htmlContent, template.plainTextContent))
        );

        // Count successes and failures
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            sentCount++;
          } else {
            failedCount++;
            console.error(`Failed to send email to ${batch[index]}:`, 
              result.status === 'rejected' ? result.reason : result.value.error);
          }
        });

        processedCount += batch.length;

        // Update broadcast progress
        broadcast.sentCount = sentCount;
        broadcast.failedCount = failedCount;
        await broadcast.save();

        // Delay before next batch (except for the last batch)
        if (i + batchSize < emailAddresses.length) {
          await this.delay(delayBetweenBatches);
        }
      }

      // Mark as completed
      broadcast.status = 'completed';
      broadcast.completedAt = new Date();
      await broadcast.save();

      console.log(`Broadcast ${broadcastId} completed: ${sentCount} sent, ${failedCount} failed`);

    } catch (error) {
      console.error(`Broadcast ${broadcastId} failed:`, error.message);
      
      try {
        const broadcast = await EmailBroadcast.findById(broadcastId);
        if (broadcast) {
          broadcast.status = 'failed';
          broadcast.error = error.message;
          broadcast.completedAt = new Date();
          await broadcast.save();
        }
      } catch (updateError) {
        console.error('Failed to update broadcast status:', updateError.message);
      }
    }
  }

  /**
   * Send email using existing EmailUtils
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} htmlContent - HTML content
   * @param {string} plainTextContent - Plain text content (optional)
   */
  static async sendEmail(email, subject, htmlContent, plainTextContent = null) {
    try {
      if (!EmailUtils.transporter) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: {
          name: 'Wellio Diet Tracker',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: subject,
        html: htmlContent,
        text: plainTextContent || this.extractPlainText(htmlContent)
      };

      const result = await EmailUtils.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract plain text from HTML (simple implementation)
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  static extractPlainText(html) {
    if (!html) return '';
    // Remove HTML tags and decode entities (basic implementation)
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Delay execution without blocking event loop
   * @param {number} ms - Milliseconds to delay
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EmailBroadcastService;

