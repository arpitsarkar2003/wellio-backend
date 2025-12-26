const cron = require('node-cron');
const Supplement = require('../models/Supplement');
const PushToken = require('../models/PushToken');
const PushService = require('./pushService');
const NotificationHistory = require('../models/NotificationHistory');

/**
 * Supplement Reminder Service
 * Handles scheduled push notifications for supplement reminders
 */
class SupplementReminderService {
  
  static cronJobs = new Map(); // Store active cron jobs

  /**
   * Get day name abbreviation from Date
   */
  static getDayAbbreviation(date) {
    const dayMap = {
      0: 'Sun',
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat'
    };
    return dayMap[date.getDay()];
  }

  /**
   * Send supplement notification to a user
   */
  static async sendSupplementNotification(userId, supplementName) {
    try {
      // Get active push tokens for the user
      const pushTokens = await PushToken.findActiveTokensByUser(userId);

      if (!pushTokens || pushTokens.length === 0) {
        console.log(`⚠️  No active push tokens found for user ${userId}`);
        return;
      }

      const message = `Time for your supplement: ${supplementName}`;
      const title = 'Supplement Reminder';
      const data = {
        type: 'supplement_reminder',
        supplementName
      };

      // Send to all active tokens
      const tokens = pushTokens.map(pt => pt.token);
      const deviceTypes = [...new Set(pushTokens.map(pt => pt.deviceType))];
      const deviceType = deviceTypes[0] || 'web';

      const result = await PushService.sendPushToMultiple(
        tokens,
        title,
        message,
        data,
        deviceType
      );

      // Save notification history
      const deliveryStatus = result.success ? 'sent' : 'failed';
      await Promise.all(tokens.map(token =>
        NotificationHistory.create({
          user: userId,
          token,
          title,
          body: message,
          category: 'reminder',
          data,
          deviceType,
          deliveryStatus,
          oneSignalId: result.oneSignalId || null,
          errorMessage: result.success ? null : result.error
        })
      ));

      // Update lastUsed for all tokens
      await Promise.all(pushTokens.map(pt => pt.updateLastUsed()));

      if (result.success) {
        console.log(`✅ Supplement reminder sent to user ${userId} for ${supplementName}`);
      } else {
        console.error(`❌ Failed to send supplement reminder to user ${userId}: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Error sending supplement notification to user ${userId}:`, error.message);
    }
  }

  /**
   * Check and send reminders for supplements scheduled at the current time
   */
  static async checkAndSendReminders() {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDay = this.getDayAbbreviation(now);

      // Find all supplements scheduled for the current time and day
      const supplements = await Supplement.find({
        time: currentTime,
        days: currentDay
      });

      if (supplements.length === 0) {
        return;
      }

      console.log(`🔔 Found ${supplements.length} supplement(s) scheduled for ${currentTime} on ${currentDay}`);

      // Send reminders for each supplement
      await Promise.all(
        supplements.map(supplement =>
          this.sendSupplementNotification(supplement.user.toString(), supplement.name)
        )
      );

    } catch (error) {
      console.error('❌ Error checking supplement reminders:', error.message);
    }
  }

  /**
   * Initialize cron job to check for supplement reminders every minute
   */
  static initialize() {
    // Check every minute for supplements that need reminders
    const task = cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders();
    }, {
      scheduled: true,
      timezone: 'UTC' // Adjust timezone as needed
    });

    this.cronJobs.set('supplementReminders', task);
    console.log('✅ Supplement reminder service initialized');
  }

  /**
   * Stop all cron jobs
   */
  static stop() {
    this.cronJobs.forEach((job, name) => {
      job.stop();
      console.log(`🛑 Stopped cron job: ${name}`);
    });
    this.cronJobs.clear();
  }

  /**
   * Restart cron jobs
   */
  static restart() {
    this.stop();
    this.initialize();
  }
}

module.exports = SupplementReminderService;

















