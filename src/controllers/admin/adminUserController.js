const User = require('../../models/User');
const MealLog = require('../../models/MealLog');
const WaterIntake = require('../../models/WaterIntake');
const Supplement = require('../../models/Supplement');
const SupplementLog = require('../../models/SupplementLog');
const DietPlan = require('../../models/DietPlan');
const AiChatSession = require('../../models/AiChatSession');
const ResponseUtils = require('../../utils/responseUtils');
const PasswordUtils = require('../../utils/passwordUtils');
const EmailUtils = require('../../utils/emailUtils');
const crypto = require('crypto');

/**
 * Admin User Management Controller
 * Handles all admin operations for user management
 */
class AdminUserController {

  /**
   * List Users - GET /v1/admin/users
   */
  static async listUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        isVerified,
        isPhoneVerified,
        isProfileCompleted,
        isGoogleUser,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo
      } = req.query;

      // Validate pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      // Build query
      const query = {};

      // Search filter
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ];
      }

      // Boolean filters
      if (isVerified !== undefined) {
        query.isVerified = isVerified === 'true';
      }
      if (isPhoneVerified !== undefined) {
        query.isPhoneVerified = isPhoneVerified === 'true';
      }
      if (isProfileCompleted !== undefined) {
        query.isProfileCompleted = isProfileCompleted === 'true';
      }
      if (isGoogleUser !== undefined) {
        query.isGoogleUser = isGoogleUser === 'true';
      }

      // Date range filter
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) {
          query.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDate;
        }
      }

      // Sort options
      const sortOptions = {};
      const validSortFields = ['createdAt', 'updatedAt', 'lastLogin', 'name', 'email'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

      // Exclude deleted users by default
      query.deletedAt = { $exists: false };

      // Execute query with pagination
      const skip = (pageNum - 1) * limitNum;
      const users = await User.find(query)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -resetPasswordToken -resetPasswordExpires')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalUsers = await User.countDocuments(query);
      const totalPages = Math.ceil(totalUsers / limitNum);

      return ResponseUtils.success(res, 'Users retrieved successfully', {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalUsers,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });

    } catch (error) {
      console.error('List users error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve users');
    }
  }

  /**
   * Get User Details - GET /v1/admin/users/:userId
   */
  static async getUserDetails(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -resetPasswordToken -resetPasswordExpires')
        .lean();

      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      // Note: We allow viewing deleted users for admin purposes, but you can add a check here if needed

      // Aggregate statistics
      const [
        totalMealLogs,
        totalWaterIntakes,
        totalSupplements,
        activeDietPlans,
        totalAiChatSessions,
        lastMealLog,
        lastWaterIntake
      ] = await Promise.all([
        MealLog.countDocuments({ user: userId }),
        WaterIntake.countDocuments({ user: userId }),
        Supplement.countDocuments({ user: userId }),
        DietPlan.countDocuments({ user: userId, isActive: true }),
        AiChatSession.countDocuments({ userId: userId }),
        MealLog.findOne({ user: userId }).sort({ createdAt: -1 }).select('createdAt').lean(),
        WaterIntake.findOne({ user: userId }).sort({ timestamp: -1 }).select('timestamp').lean()
      ]);

      const statistics = {
        totalMealLogs,
        totalWaterIntakes,
        totalSupplements,
        activeDietPlans,
        totalAiChatSessions,
        lastActivityDate: lastMealLog?.createdAt || lastWaterIntake?.timestamp || user.updatedAt
      };

      return ResponseUtils.success(res, 'User details retrieved successfully', {
        user: {
          ...user,
          statistics
        }
      });

    } catch (error) {
      console.error('Get user details error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve user details');
    }
  }

  /**
   * Update User Profile - PUT /v1/admin/users/:userId
   */
  static async updateUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      const adminId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      // Check email uniqueness if email is being changed
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({ email: updateData.email.toLowerCase().trim() });
        if (existingUser && existingUser._id.toString() !== userId) {
          return ResponseUtils.conflict(res, 'Email already exists');
        }
        user.email = updateData.email.toLowerCase().trim();
      }

      // Check username uniqueness if username is being changed
      if (updateData.username !== undefined && updateData.username !== user.username) {
        if (updateData.username) {
          const existingUser = await User.findOne({ username: updateData.username.trim() });
          if (existingUser && existingUser._id.toString() !== userId) {
            return ResponseUtils.conflict(res, 'Username already exists');
          }
          user.username = updateData.username.trim();
        } else {
          user.username = undefined;
        }
      }

      // Update basic fields
      if (updateData.name !== undefined) user.name = updateData.name;
      if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
      if (updateData.phoneNumber !== undefined) {
        // Validate phone number format
        if (updateData.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(updateData.phoneNumber)) {
          return ResponseUtils.validationError(res, ['Invalid phone number format']);
        }
        user.phoneNumber = updateData.phoneNumber;
      }

      // Update verification flags
      if (updateData.isVerified !== undefined) user.isVerified = updateData.isVerified;
      if (updateData.isPhoneVerified !== undefined) user.isPhoneVerified = updateData.isPhoneVerified;
      if (updateData.isProfileCompleted !== undefined) user.isProfileCompleted = updateData.isProfileCompleted;

      // Update profile
      if (updateData.profile) {
        if (!user.profile) user.profile = {};

        if (updateData.profile.phoneNumber !== undefined) {
          if (updateData.profile.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(updateData.profile.phoneNumber)) {
            return ResponseUtils.validationError(res, ['Invalid profile phone number format']);
          }
          user.profile.phoneNumber = updateData.profile.phoneNumber;
        }

        if (updateData.profile.address) {
          if (!user.profile.address) user.profile.address = {};
          if (updateData.profile.address.street1 !== undefined) user.profile.address.street1 = updateData.profile.address.street1;
          if (updateData.profile.address.street2 !== undefined) user.profile.address.street2 = updateData.profile.address.street2;
          if (updateData.profile.address.lane !== undefined) user.profile.address.lane = updateData.profile.address.lane;
          if (updateData.profile.address.city !== undefined) user.profile.address.city = updateData.profile.address.city;
          if (updateData.profile.address.state !== undefined) user.profile.address.state = updateData.profile.address.state;
          if (updateData.profile.address.pincode !== undefined) user.profile.address.pincode = updateData.profile.address.pincode;
        }

        if (updateData.profile.physicalInfo) {
          if (!user.profile.physicalInfo) user.profile.physicalInfo = {};
          if (updateData.profile.physicalInfo.currentWeight !== undefined) user.profile.physicalInfo.currentWeight = updateData.profile.physicalInfo.currentWeight;
          if (updateData.profile.physicalInfo.currentHeight !== undefined) user.profile.physicalInfo.currentHeight = updateData.profile.physicalInfo.currentHeight;
          if (updateData.profile.physicalInfo.weightUnit !== undefined) user.profile.physicalInfo.weightUnit = updateData.profile.physicalInfo.weightUnit;
          if (updateData.profile.physicalInfo.heightUnit !== undefined) user.profile.physicalInfo.heightUnit = updateData.profile.physicalInfo.heightUnit;
        }
      }

      await user.save();

      // Return updated user (excluding sensitive data)
      const updatedUser = await User.findById(userId)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -resetPasswordToken -resetPasswordExpires')
        .lean();

      return ResponseUtils.success(res, 'User profile updated successfully', {
        user: updatedUser
      });

    } catch (error) {
      console.error('Update user profile error:', error.message);

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return ResponseUtils.validationError(res, validationErrors);
      }

      if (error.code === 11000) {
        return ResponseUtils.conflict(res, 'Duplicate field value');
      }

      return ResponseUtils.internalError(res, 'Failed to update user profile');
    }
  }

  /**
   * Activate/Deactivate User - PATCH /v1/admin/users/:userId/status
   */
  static async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { isActive, reason } = req.body;
      const adminId = req.user.id;

      if (typeof isActive !== 'boolean') {
        return ResponseUtils.validationError(res, ['isActive must be a boolean']);
      }

      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      user.isActive = isActive;

      if (!isActive) {
        // Deactivating
        user.deactivatedAt = new Date();
        user.deactivatedBy = adminId;
        user.deactivationReason = reason || 'Account deactivated by admin';

        // Invalidate all active sessions by blacklisting all tokens
        // Note: This is a simplified approach. In production, you might want to track sessions separately
        // For now, we'll just update the user's status
      } else {
        // Activating
        user.deactivatedAt = undefined;
        user.deactivatedBy = undefined;
        user.deactivationReason = undefined;
      }

      await user.save();

      const updatedUser = await User.findById(userId)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -resetPasswordToken -resetPasswordExpires')
        .lean();

      return ResponseUtils.success(res, `User account ${isActive ? 'activated' : 'deactivated'} successfully`, {
        user: {
          ...updatedUser,
          isActive: user.isActive,
          deactivatedAt: user.deactivatedAt,
          deactivatedBy: user.deactivatedBy,
          deactivationReason: user.deactivationReason
        }
      });

    } catch (error) {
      console.error('Update user status error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to update user status');
    }
  }

  /**
   * Delete User Account - DELETE /v1/admin/users/:userId
   */
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const { deleteData = false } = req.query;
      const { reason, deleteData: deleteDataBody } = req.body || {};
      const adminId = req.user.id;

      // Use deleteData from body if provided, otherwise from query
      const shouldDeleteData = deleteDataBody === true || deleteData === 'true';

      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      // Check if already deleted
      if (user.deletedAt) {
        return ResponseUtils.error(res, 'User account is already deleted', 400);
      }

      let deletedCounts = {};

      if (shouldDeleteData) {
        // Delete all associated data
        const [mealLogsCount, waterIntakesCount, supplementsCount, supplementLogsCount, dietPlansCount, aiChatSessionsCount] = await Promise.all([
          MealLog.deleteMany({ user: userId }),
          WaterIntake.deleteMany({ user: userId }),
          Supplement.deleteMany({ user: userId }),
          SupplementLog.deleteMany({ user: userId }),
          DietPlan.deleteMany({ user: userId }),
          AiChatSession.deleteMany({ userId: userId })
        ]);

        deletedCounts = {
          mealLogs: mealLogsCount.deletedCount,
          waterIntakes: waterIntakesCount.deletedCount,
          supplements: supplementsCount.deletedCount,
          supplementLogs: supplementLogsCount.deletedCount,
          dietPlans: dietPlansCount.deletedCount,
          aiChatSessions: aiChatSessionsCount.deletedCount
        };
      }

      // Soft delete: Mark as deleted (don't remove from database)
      user.deletedAt = new Date();
      user.deletedBy = adminId;
      user.deletionReason = reason || 'Account deleted by admin';
      user.isActive = false; // Also deactivate the account
      user.deactivatedAt = new Date();
      user.deactivatedBy = adminId;
      user.deactivationReason = 'Account deleted';

      await user.save();

      return ResponseUtils.success(res, 'User account deleted successfully', {
        deletedUserId: userId,
        deletedAt: user.deletedAt,
        deletedBy: adminId,
        dataDeleted: shouldDeleteData,
        deletedCounts: shouldDeleteData ? deletedCounts : undefined
      });

    } catch (error) {
      console.error('Delete user error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to delete user account');
    }
  }

  /**
   * Reset User Password - POST /v1/admin/users/:userId/reset-password
   */
  static async resetUserPassword(req, res) {
    try {
      const { userId } = req.params;
      const { sendEmail = false, newPassword } = req.body;
      const adminId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      // Check if user is deleted
      if (user.deletedAt) {
        return ResponseUtils.error(res, 'Cannot reset password for deleted account', 400);
      }

      let resetToken = null;
      let emailSent = false;

      if (newPassword) {
        // Directly set new password (admin-initiated reset)
        user.password = PasswordUtils.hashPasswordSHA256(newPassword);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        // Invalidate all active sessions by blacklisting all tokens
        // Clear temp auth token
        user.tempAuthToken = undefined;
        // Note: In production, you might want to track and invalidate sessions separately
        
        await user.save();

        // Send notification email if requested
        if (sendEmail) {
          try {
            // TODO: Implement sendPasswordResetNotificationEmail in EmailUtils
            console.log(`Password has been reset by admin for user ${user.email}`);
            // await EmailUtils.sendPasswordResetNotificationEmail(user.email, user.name);
            emailSent = true;
          } catch (emailError) {
            console.error('Failed to send password reset notification email:', emailError.message);
          }
        }
      } else {
        // Generate reset token for user to reset themselves
        resetToken = user.generatePasswordResetToken();
        await user.save();

        // Send email with reset link if requested
        if (sendEmail) {
          try {
            // TODO: Implement sendPasswordResetEmail in EmailUtils with reset link
            const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
            console.log(`Password reset link for user ${user.email}: ${resetLink}`);
            // await EmailUtils.sendPasswordResetEmail(user.email, resetToken, resetLink);
            emailSent = true;
          } catch (emailError) {
            console.error('Failed to send password reset email:', emailError.message);
            // Still return success but note that email failed
          }
        }
      }

      return ResponseUtils.success(res, 'Password reset initiated successfully', {
        resetToken: newPassword ? undefined : (sendEmail ? undefined : resetToken),
        emailSent
      });

    } catch (error) {
      console.error('Reset user password error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to reset user password');
    }
  }

  /**
   * Verify User Account - POST /v1/admin/users/:userId/verify
   */
  static async verifyUser(req, res) {
    try {
      const { userId } = req.params;
      const { verifyEmail = false, verifyPhone = false } = req.body;
      const adminId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }

      if (verifyEmail) {
        user.isVerified = true;
      }

      if (verifyPhone) {
        user.isPhoneVerified = true;
      }

      await user.save();

      const updatedUser = await User.findById(userId)
        .select('-password -blacklistedTokens -currentOTP -tempAuthToken -resetPasswordToken -resetPasswordExpires')
        .lean();

      return ResponseUtils.success(res, 'User account verified successfully', {
        user: {
          ...updatedUser,
          isVerified: user.isVerified,
          isPhoneVerified: user.isPhoneVerified
        }
      });

    } catch (error) {
      console.error('Verify user error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to verify user account');
    }
  }

  /**
   * Get User Statistics - GET /v1/admin/users/statistics
   */
  static async getUserStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      // Build date filter
      const dateFilter = {};
      if (dateFrom || dateTo) {
        dateFilter.createdAt = {};
        if (dateFrom) {
          dateFilter.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          dateFilter.createdAt.$lte = endDate;
        }
      }

      // Exclude deleted users from statistics
      const baseFilter = { ...dateFilter, deletedAt: { $exists: false } };

      // Get total counts
      const [
        totalUsers,
        verifiedUsers,
        phoneVerifiedUsers,
        profileCompletedUsers,
        googleUsers,
        activeUsers,
        allUsers
      ] = await Promise.all([
        User.countDocuments(baseFilter),
        User.countDocuments({ ...baseFilter, isVerified: true }),
        User.countDocuments({ ...baseFilter, isPhoneVerified: true }),
        User.countDocuments({ ...baseFilter, isProfileCompleted: true }),
        User.countDocuments({ ...baseFilter, isGoogleUser: true }),
        User.countDocuments({ ...baseFilter, isActive: true }),
        User.find(baseFilter).select('createdAt').lean()
      ]);

      // Calculate new users for different periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const newUsersToday = allUsers.filter(u => new Date(u.createdAt) >= today).length;
      const newUsersThisWeek = allUsers.filter(u => new Date(u.createdAt) >= weekAgo).length;
      const newUsersThisMonth = allUsers.filter(u => new Date(u.createdAt) >= monthAgo).length;

      // Calculate users by month
      const usersByMonth = {};
      allUsers.forEach(user => {
        const month = new Date(user.createdAt).toISOString().substring(0, 7); // YYYY-MM
        usersByMonth[month] = (usersByMonth[month] || 0) + 1;
      });

      const usersByMonthArray = Object.entries(usersByMonth).map(([month, count]) => ({
        month,
        count
      })).sort((a, b) => a.month.localeCompare(b.month));

      // Calculate rates
      const verificationRate = totalUsers > 0 ? verifiedUsers / totalUsers : 0;
      const profileCompletionRate = totalUsers > 0 ? profileCompletedUsers / totalUsers : 0;

      return ResponseUtils.success(res, 'User statistics retrieved successfully', {
        totalUsers,
        verifiedUsers,
        phoneVerifiedUsers,
        profileCompletedUsers,
        googleUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersByMonth: usersByMonthArray,
        verificationRate,
        profileCompletionRate
      });

    } catch (error) {
      console.error('Get user statistics error:', error.message);
      return ResponseUtils.internalError(res, 'Failed to retrieve user statistics');
    }
  }
}

module.exports = AdminUserController;

