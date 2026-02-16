const Supplement = require('../models/Supplement');
const SupplementLog = require('../models/SupplementLog');

class SupplementService {

  /**
   * Create supplement schedule
   */
  static async createSupplement(userId, supplementData) {
    const supplement = new Supplement({
      user: userId,
      ...supplementData
    });

    return await supplement.save();
  }

  /**
   * Get all supplements for user
   */
  static async getUserSupplements(userId) {
    return await Supplement.findByUser(userId);
  }

  /**
   * Get supplement by ID
   */
  static async getSupplementById(supplementId, userId) {
    return await Supplement.findOne({ _id: supplementId, user: userId });
  }

  /**
   * Update supplement
   */
  static async updateSupplement(supplementId, userId, updateData) {
    const supplement = await Supplement.findOne({ _id: supplementId, user: userId });
    if (!supplement) return null;

    Object.assign(supplement, updateData);
    return await supplement.save();
  }

  /**
   * Delete supplement
   */
  static async deleteSupplement(supplementId, userId) {
    return await Supplement.findOneAndDelete({ _id: supplementId, user: userId });
  }

  /**
   * Log supplement intake
   */
  static async logSupplement(userId, supplementId, status) {
    const supplement = await Supplement.findOne({ _id: supplementId, user: userId });
    if (!supplement) {
      throw new Error('Supplement not found');
    }

    const log = new SupplementLog({
      user: userId,
      supplementId,
      status,
      timestamp: new Date()
    });

    return await log.save();
  }

  /**
   * Get supplement logs for a month
   */
  static async getSupplementLogs(userId, month) {
    // month format: YYYY-MM
    const [year, monthNum] = month.split('-').map(Number);
    
    const groupedLogs = await SupplementLog.groupByDate(userId, year, monthNum);
    
    // Format the response
    const formattedLogs = Object.keys(groupedLogs).map(date => ({
      date,
      logs: groupedLogs[date]
        .filter(log => log.supplementId) // Filter out logs with deleted supplements
        .map(log => ({
          id: log._id,
          supplementId: log.supplementId._id,
          supplementName: log.supplementId.name,
          status: log.status,
          timestamp: log.timestamp,
          createdAt: log.createdAt
        }))
    }));

    return formattedLogs;
  }
}

module.exports = SupplementService;

