const WaterIntake = require('../models/WaterIntake');
const WaterGoal = require('../models/WaterGoal');

class WaterService {

  /**
   * Add water intake entry
   */
  static async addWaterIntake(userId, amount) {
    const waterIntake = new WaterIntake({
      user: userId,
      amount,
      timestamp: new Date()
    });

    return await waterIntake.save();
  }

  /**
   * Get daily water intake data
   */
  static async getDailyWaterIntake(userId, date) {
    // Parse date string (YYYY-MM-DD) or use today
    const targetDate = date ? new Date(date) : new Date();
    
    // Get or create water goal
    const goal = await WaterGoal.findOrCreate(userId);
    
    // Get entries for the date
    const entries = await WaterIntake.findByUserAndDate(userId, targetDate);
    
    // Calculate total
    const total = await WaterIntake.getTotalForDate(userId, targetDate);

    return {
      goal: goal.dailyGoal,
      total,
      entries: entries.map(entry => ({
        id: entry._id,
        amount: entry.amount,
        timestamp: entry.timestamp,
        createdAt: entry.createdAt
      }))
    };
  }

  /**
   * Update water goal
   */
  static async updateWaterGoal(userId, dailyGoal) {
    let goal = await WaterGoal.findOne({ user: userId });
    
    if (!goal) {
      goal = new WaterGoal({
        user: userId,
        dailyGoal
      });
    } else {
      goal.dailyGoal = dailyGoal;
    }

    return await goal.save();
  }

  /**
   * Get water goal
   */
  static async getWaterGoal(userId) {
    return await WaterGoal.findOrCreate(userId);
  }
}

module.exports = WaterService;








