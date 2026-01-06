# Missing Admin Features & Operations

**Generated:** 2024  
**Purpose:** Comprehensive list of missing admin features that need to be implemented in the backend  
**Status:** 📋 Planning Document - Ready for Implementation

---

## 📋 Table of Contents

1. [User Management](#1-user-management)
2. [Super Admin Management](#2-super-admin-management)
3. [User Data Management](#3-user-data-management)
4. [Analytics & Reporting](#4-analytics--reporting)
5. [System Configuration](#5-system-configuration)
6. [Audit & Security](#6-audit--security)
7. [Notification Management](#7-notification-management)
8. [Content Management Enhancements](#8-content-management-enhancements)

---

## 1. User Management

**Purpose:** Complete CRUD operations for user accounts, allowing admins to manage the user base effectively.

### 1.1 List Users

**Endpoint:** `GET /v1/admin/users`

**Description:** Retrieve a paginated list of all users with filtering and sorting capabilities.

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 20, max: 100) - Number of users per page
- `search` (string, optional) - Search by name, email, username, or phone number
- `isVerified` (boolean, optional) - Filter by verification status
- `isPhoneVerified` (boolean, optional) - Filter by phone verification status
- `isProfileCompleted` (boolean, optional) - Filter by profile completion status
- `isGoogleUser` (boolean, optional) - Filter by authentication method
- `sortBy` (string, default: "createdAt") - Sort field (createdAt, updatedAt, lastLogin, name, email)
- `sortOrder` (string, default: "desc") - Sort order (asc, desc)
- `dateFrom` (string, optional) - Filter users created from this date (YYYY-MM-DD)
- `dateTo` (string, optional) - Filter users created until this date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+1234567890",
        "isVerified": true,
        "isPhoneVerified": true,
        "isProfileCompleted": true,
        "isGoogleUser": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T00:00:00.000Z",
        "lastLogin": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalUsers": 200,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Implementation Notes:**
- Should exclude sensitive fields (password, OTP, tokens, blacklistedTokens)
- Should support text search across name, email, username, phoneNumber fields
- Should include user statistics (total meal logs, water intake entries, supplements, etc.) optionally
- Should be performant with proper database indexing

---

### 1.2 Get User Details

**Endpoint:** `GET /v1/admin/users/:userId`

**Description:** Get comprehensive details of a specific user including profile information and activity summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "isVerified": true,
      "isPhoneVerified": true,
      "isProfileCompleted": true,
      "isGoogleUser": false,
      "profile": {
        "phoneNumber": "+1234567890",
        "address": {
          "street1": "123 Main St",
          "street2": "Apt 4B",
          "lane": "",
          "city": "New York",
          "state": "NY",
          "pincode": "10001"
        },
        "physicalInfo": {
          "currentWeight": 75,
          "currentHeight": 175,
          "weightUnit": "kg",
          "heightUnit": "cm"
        }
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z",
      "lastLogin": "2024-01-20T10:30:00.000Z",
      "statistics": {
        "totalMealLogs": 150,
        "totalWaterIntakes": 300,
        "totalSupplements": 5,
        "activeDietPlans": 1,
        "totalAiChatSessions": 10,
        "lastActivityDate": "2024-01-20T10:30:00.000Z"
      }
    }
  }
}
```

**Implementation Notes:**
- Should aggregate statistics from related collections
- Should exclude sensitive authentication data
- Should include activity summary (last meal log, last water intake, etc.)

---

### 1.3 Update User Profile

**Endpoint:** `PUT /v1/admin/users/:userId`

**Description:** Update user profile information. Admins can modify user details that users might not be able to change themselves.

**Request Body:**
```json
{
  "name": "John Updated",
  "firstName": "John",
  "lastName": "Updated",
  "username": "johnupdated",
  "email": "john.updated@example.com",
  "phoneNumber": "+1234567890",
  "isVerified": true,
  "isPhoneVerified": true,
  "isProfileCompleted": true,
  "profile": {
    "phoneNumber": "+1234567890",
    "address": {
      "street1": "123 Main St",
      "street2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "pincode": "10001"
    },
    "physicalInfo": {
      "currentWeight": 75,
      "currentHeight": 175,
      "weightUnit": "kg",
      "heightUnit": "cm"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "user": { /* updated user object */ }
  }
}
```

**Implementation Notes:**
- Should validate email uniqueness if email is being changed
- Should validate username uniqueness if username is being changed
- Should validate phone number format
- Should track which admin made the change (audit trail)
- Should not allow changing password directly (use separate password reset endpoint)

---

### 1.4 Activate/Deactivate User

**Endpoint:** `PATCH /v1/admin/users/:userId/status`

**Description:** Activate or deactivate a user account. Deactivated users cannot log in.

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Account suspended due to policy violation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User account deactivated successfully",
  "data": {
    "user": {
      "id": "user_id",
      "isActive": false,
      "deactivatedAt": "2024-01-20T10:30:00.000Z",
      "deactivatedBy": "admin_id",
      "deactivationReason": "Account suspended due to policy violation"
    }
  }
}
```

**Implementation Notes:**
- Should add `isActive` field to User model if not present
- Should add `deactivatedAt`, `deactivatedBy`, `deactivationReason` fields
- Should invalidate all active sessions when deactivating
- Should prevent deactivated users from logging in
- Should log this action in audit trail

---

### 1.5 Delete User Account

**Endpoint:** `DELETE /v1/admin/users/:userId`

**Description:** Permanently delete a user account and optionally all associated data.

**Query Parameters:**
- `deleteData` (boolean, default: false) - If true, delete all associated data (meal logs, water intake, supplements, etc.)

**Request Body (optional):**
```json
{
  "reason": "User requested account deletion",
  "deleteData": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User account deleted successfully",
  "data": {
    "deletedUserId": "user_id",
    "deletedAt": "2024-01-20T10:30:00.000Z",
    "deletedBy": "admin_id",
    "dataDeleted": true
  }
}
```

**Implementation Notes:**
- Should be a soft delete by default (mark as deleted, don't remove from database)
- Should cascade delete related data if `deleteData` is true
- Should log this action in audit trail
- Should consider GDPR compliance (data retention policies)
- Should allow restoring deleted accounts within a grace period

---

### 1.6 Reset User Password

**Endpoint:** `POST /v1/admin/users/:userId/reset-password`

**Description:** Admin-initiated password reset for a user. Generates a reset token and optionally sends email.

**Request Body:**
```json
{
  "sendEmail": true,
  "newPassword": "optional_new_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset initiated successfully",
  "data": {
    "resetToken": "token_if_not_sending_email",
    "emailSent": true
  }
}
```

**Implementation Notes:**
- If `newPassword` is provided, directly set the password (for admin-initiated resets)
- If `newPassword` is not provided, generate reset token and send email
- Should invalidate all active sessions
- Should log this action in audit trail

---

### 1.7 Verify User Account

**Endpoint:** `POST /v1/admin/users/:userId/verify`

**Description:** Manually verify a user account (email or phone).

**Request Body:**
```json
{
  "verifyEmail": true,
  "verifyPhone": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User account verified successfully",
  "data": {
    "user": {
      "id": "user_id",
      "isVerified": true,
      "isPhoneVerified": true
    }
  }
}
```

**Implementation Notes:**
- Should update `isVerified` and/or `isPhoneVerified` flags
- Should log this action in audit trail

---

### 1.8 Get User Statistics

**Endpoint:** `GET /v1/admin/users/statistics`

**Description:** Get aggregate statistics about all users.

**Query Parameters:**
- `dateFrom` (string, optional) - Filter statistics from this date
- `dateTo` (string, optional) - Filter statistics until this date

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "verifiedUsers": 850,
    "phoneVerifiedUsers": 700,
    "profileCompletedUsers": 600,
    "googleUsers": 200,
    "activeUsers": 800,
    "newUsersToday": 10,
    "newUsersThisWeek": 70,
    "newUsersThisMonth": 300,
    "usersByMonth": [
      {
        "month": "2024-01",
        "count": 100
      }
    ],
    "verificationRate": 0.85,
    "profileCompletionRate": 0.60
  }
}
```

**Implementation Notes:**
- Should use aggregation pipelines for performance
- Should cache results for frequently accessed statistics
- Should support date range filtering

---

## 2. Super Admin Management

**Purpose:** Manage super admin accounts, allowing creation, updates, and management of admin users.

### 2.1 List Super Admins

**Endpoint:** `GET /v1/admin/admins`

**Description:** Get a list of all super admin accounts.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `isActive` (boolean, optional) - Filter by active status
- `sortBy` (string, default: "createdAt")
- `sortOrder` (string, default: "desc")

**Response:**
```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "id": "admin_id",
        "username": "admin_user",
        "email": "admin@wellio.com",
        "role": "super_admin",
        "isActive": true,
        "lastLogin": "2024-01-20T10:30:00.000Z",
        "activeSessionsCount": 2,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalAdmins": 10,
      "limit": 20
    }
  }
}
```

**Implementation Notes:**
- Should exclude sensitive data (password, tokens, OTP)
- Should include active session count
- Should not expose security question/answer

---

### 2.2 Create Super Admin

**Endpoint:** `POST /v1/admin/admins`

**Description:** Create a new super admin account (after initial setup).

**Request Body:**
```json
{
  "username": "new_admin",
  "email": "newadmin@wellio.com",
  "password": "secure_password",
  "securityQuestion": "What is your favorite color?",
  "securityAnswer": "blue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Super admin created successfully",
  "data": {
    "admin": {
      "id": "admin_id",
      "username": "new_admin",
      "email": "newadmin@wellio.com",
      "role": "super_admin",
      "isActive": true,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "createdBy": "current_admin_id"
    }
  }
}
```

**Implementation Notes:**
- Should validate username and email uniqueness
- Should hash password using same method as existing admins
- Should hash security answer
- Should track who created the admin (createdBy field)
- Should log this action in audit trail
- Should send welcome email to new admin

---

### 2.3 Update Super Admin

**Endpoint:** `PUT /v1/admin/admins/:adminId`

**Description:** Update super admin details (username, email, security question).

**Request Body:**
```json
{
  "username": "updated_admin",
  "email": "updated@wellio.com",
  "securityQuestion": "What is your pet's name?",
  "securityAnswer": "fluffy"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Super admin updated successfully",
  "data": {
    "admin": { /* updated admin object */ }
  }
}
```

**Implementation Notes:**
- Should not allow updating own account's critical fields (prevent lockout)
- Should validate uniqueness of username/email
- Should hash security answer if provided
- Should log this action in audit trail
- Should invalidate sessions if email/username changes

---

### 2.4 Activate/Deactivate Super Admin

**Endpoint:** `PATCH /v1/admin/admins/:adminId/status`

**Description:** Activate or deactivate a super admin account.

**Request Body:**
```json
{
  "isActive": false,
  "reason": "Temporary suspension"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Super admin status updated successfully",
  "data": {
    "admin": {
      "id": "admin_id",
      "isActive": false,
      "deactivatedAt": "2024-01-20T10:30:00.000Z",
      "deactivatedBy": "current_admin_id",
      "deactivationReason": "Temporary suspension"
    }
  }
}
```

**Implementation Notes:**
- Should prevent deactivating own account
- Should invalidate all active sessions when deactivating
- Should log this action in audit trail
- Should prevent deactivated admins from logging in

---

### 2.5 Delete Super Admin

**Endpoint:** `DELETE /v1/admin/admins/:adminId`

**Description:** Delete a super admin account (soft delete recommended).

**Request Body (optional):**
```json
{
  "reason": "No longer needed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Super admin deleted successfully",
  "data": {
    "deletedAdminId": "admin_id",
    "deletedAt": "2024-01-20T10:30:00.000Z",
    "deletedBy": "current_admin_id"
  }
}
```

**Implementation Notes:**
- Should prevent deleting own account
- Should ensure at least one active admin remains
- Should be soft delete (mark as deleted)
- Should invalidate all sessions
- Should log this action in audit trail

---

### 2.6 Reset Super Admin Password

**Endpoint:** `POST /v1/admin/admins/:adminId/reset-password`

**Description:** Reset a super admin's password.

**Request Body:**
```json
{
  "newPassword": "new_secure_password",
  "sendEmail": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "adminId": "admin_id",
    "passwordResetAt": "2024-01-20T10:30:00.000Z",
    "resetBy": "current_admin_id"
  }
}
```

**Implementation Notes:**
- Should hash the new password
- Should invalidate all active sessions
- Should send email notification if requested
- Should log this action in audit trail

---

### 2.7 Get Super Admin Statistics

**Endpoint:** `GET /v1/admin/admins/statistics`

**Description:** Get statistics about super admin accounts.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAdmins": 5,
    "activeAdmins": 4,
    "inactiveAdmins": 1,
    "adminsWithActiveSessions": 3,
    "totalActiveSessions": 8,
    "lastAdminCreated": "2024-01-15T00:00:00.000Z"
  }
}
```

---

## 3. User Data Management

**Purpose:** Allow admins to view and manage user-generated data (meal logs, water intake, supplements, diet plans, AI chats).

### 3.1 View User Meal Logs

**Endpoint:** `GET /v1/admin/users/:userId/meal-logs`

**Description:** Get meal logs for a specific user.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `dateFrom` (string, optional) - Filter from date (YYYY-MM-DD)
- `dateTo` (string, optional) - Filter to date (YYYY-MM-DD)
- `status` (string, optional) - Filter by status (completed, skipped, not_yet)
- `dietPlanId` (string, optional) - Filter by diet plan

**Response:**
```json
{
  "success": true,
  "data": {
    "mealLogs": [
      {
        "id": "log_id",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "dietPlan": {
          "id": "diet_plan_id",
          "isActive": true
        },
        "mealSlotId": "meal_slot_id",
        "date": "2024-01-20",
        "scheduledTimeSnapshot": "08:00",
        "status": "completed",
        "actualCalories": 450,
        "notes": "Had extra fruit",
        "createdAt": "2024-01-20T08:30:00.000Z",
        "updatedAt": "2024-01-20T08:30:00.000Z"
      }
    ],
    "pagination": { /* pagination object */ },
    "summary": {
      "totalLogs": 150,
      "completedCount": 120,
      "skippedCount": 20,
      "notYetCount": 10,
      "totalCalories": 45000
    }
  }
}
```

**Implementation Notes:**
- Should populate user and dietPlan references
- Should include summary statistics
- Should support date range filtering

---

### 3.2 View User Water Intake

**Endpoint:** `GET /v1/admin/users/:userId/water-intake`

**Description:** Get water intake records for a specific user.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "waterIntakes": [
      {
        "id": "intake_id",
        "user": {
          "id": "user_id",
          "name": "John Doe"
        },
        "amount": 250,
        "timestamp": "2024-01-20T10:30:00.000Z",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": { /* pagination object */ },
    "summary": {
      "totalEntries": 300,
      "totalAmount": 75000,
      "averagePerDay": 2500,
      "lastEntryDate": "2024-01-20T10:30:00.000Z"
    }
  }
}
```

---

### 3.3 View User Supplements

**Endpoint:** `GET /v1/admin/users/:userId/supplements`

**Description:** Get supplements configured by a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "supplements": [
      {
        "id": "supplement_id",
        "user": {
          "id": "user_id",
          "name": "John Doe"
        },
        "name": "Vitamin D",
        "time": "09:00",
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "notes": "Take with breakfast",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalCount": 5
  }
}
```

---

### 3.4 View User Supplement Logs

**Endpoint:** `GET /v1/admin/users/:userId/supplement-logs`

**Description:** Get supplement intake logs for a user.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `dateFrom` (string, optional)
- `dateTo` (string, optional)
- `supplementId` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "supplementLogs": [
      {
        "id": "log_id",
        "user": { /* user object */ },
        "supplement": { /* supplement object */ },
        "date": "2024-01-20",
        "time": "09:00",
        "status": "taken",
        "notes": "Taken on time",
        "createdAt": "2024-01-20T09:05:00.000Z"
      }
    ],
    "pagination": { /* pagination object */ },
    "summary": {
      "totalLogs": 100,
      "takenCount": 95,
      "missedCount": 5
    }
  }
}
```

---

### 3.5 View User Diet Plans

**Endpoint:** `GET /v1/admin/users/:userId/diet-plans`

**Description:** Get all diet plans for a user.

**Query Parameters:**
- `isActive` (boolean, optional) - Filter by active status
- `includeInactive` (boolean, default: true) - Include inactive plans

**Response:**
```json
{
  "success": true,
  "data": {
    "dietPlans": [
      {
        "id": "diet_plan_id",
        "user": { /* user object */ },
        "weekSchedule": [ /* week schedule array */ ],
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T00:00:00.000Z"
      }
    ],
    "totalCount": 3,
    "activeCount": 1
  }
}
```

---

### 3.6 View User AI Chat Sessions

**Endpoint:** `GET /v1/admin/users/:userId/ai-chats`

**Description:** Get AI chat sessions for a user.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_id",
        "user": { /* user object */ },
        "title": "Nutrition Advice",
        "messageCount": 10,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T11:00:00.000Z"
      }
    ],
    "pagination": { /* pagination object */ }
  }
}
```

---

### 3.7 View User AI Chat Messages

**Endpoint:** `GET /v1/admin/users/:userId/ai-chats/:sessionId/messages`

**Description:** Get messages from a specific AI chat session.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message_id",
        "session": "session_id",
        "role": "user",
        "content": "What should I eat for breakfast?",
        "createdAt": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "message_id_2",
        "session": "session_id",
        "role": "assistant",
        "content": "For a healthy breakfast...",
        "createdAt": "2024-01-20T10:30:05.000Z"
      }
    ],
    "pagination": { /* pagination object */ }
  }
}
```

---

### 3.8 Delete User Data

**Endpoint:** `DELETE /v1/admin/users/:userId/data`

**Description:** Delete specific user data (meal logs, water intake, supplements, etc.).

**Request Body:**
```json
{
  "dataTypes": ["mealLogs", "waterIntake", "supplements", "dietPlans", "aiChats"],
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User data deleted successfully",
  "data": {
    "deletedCounts": {
      "mealLogs": 50,
      "waterIntake": 100,
      "supplements": 5,
      "dietPlans": 1,
      "aiChats": 3
    },
    "deletedAt": "2024-01-20T10:30:00.000Z",
    "deletedBy": "admin_id"
  }
}
```

**Implementation Notes:**
- Should require confirmation for bulk deletions
- Should log this action in audit trail
- Should support date range filtering
- Should be reversible (soft delete) or have a grace period

---

## 4. Analytics & Reporting

**Purpose:** Provide comprehensive analytics and reporting capabilities for admins to understand app usage and user behavior.

### 4.1 Dashboard Statistics

**Endpoint:** `GET /v1/admin/analytics/dashboard`

**Description:** Get high-level statistics for the admin dashboard.

**Query Parameters:**
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "active": 800,
      "newToday": 10,
      "newThisWeek": 70,
      "newThisMonth": 300,
      "growthRate": 0.15
    },
    "engagement": {
      "dailyActiveUsers": 500,
      "weeklyActiveUsers": 700,
      "monthlyActiveUsers": 800,
      "averageSessionDuration": 15.5,
      "retentionRate": 0.75
    },
    "content": {
      "totalMealLogs": 50000,
      "totalWaterIntakes": 100000,
      "totalSupplements": 5000,
      "activeDietPlans": 600,
      "totalAiChatSessions": 2000
    },
    "recentActivity": {
      "newUsersLast24h": 10,
      "newMealLogsLast24h": 500,
      "newWaterIntakesLast24h": 1000
    }
  }
}
```

**Implementation Notes:**
- Should use aggregation pipelines for performance
- Should cache results (5-15 minutes)
- Should support date range filtering

---

### 4.2 User Growth Analytics

**Endpoint:** `GET /v1/admin/analytics/user-growth`

**Description:** Get user growth statistics over time.

**Query Parameters:**
- `period` (string, default: "month") - day, week, month, year
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "data": [
      {
        "period": "2024-01",
        "newUsers": 100,
        "totalUsers": 1000,
        "activeUsers": 800
      },
      {
        "period": "2024-02",
        "newUsers": 150,
        "totalUsers": 1150,
        "activeUsers": 900
      }
    ],
    "summary": {
      "totalGrowth": 150,
      "growthRate": 0.15,
      "averageGrowthPerPeriod": 125
    }
  }
}
```

---

### 4.3 Engagement Analytics

**Endpoint:** `GET /v1/admin/analytics/engagement`

**Description:** Get user engagement metrics.

**Query Parameters:**
- `dateFrom` (string, optional)
- `dateTo` (string, optional)
- `metric` (string, optional) - mealLogs, waterIntake, supplements, aiChats

**Response:**
```json
{
  "success": true,
  "data": {
    "dailyActiveUsers": 500,
    "weeklyActiveUsers": 700,
    "monthlyActiveUsers": 800,
    "averageMealLogsPerUser": 50,
    "averageWaterIntakePerUser": 2000,
    "averageSupplementsPerUser": 5,
    "averageAiChatSessionsPerUser": 2,
    "retentionRate": {
      "day1": 0.80,
      "day7": 0.60,
      "day30": 0.40
    },
    "engagementByFeature": {
      "mealLogging": 0.70,
      "waterTracking": 0.85,
      "supplementTracking": 0.50,
      "aiChat": 0.30,
      "dietPlans": 0.60
    }
  }
}
```

---

### 4.4 Content Usage Analytics

**Endpoint:** `GET /v1/admin/analytics/content-usage`

**Description:** Get statistics about content usage (diet templates, policies, etc.).

**Response:**
```json
{
  "success": true,
  "data": {
    "dietTemplates": {
      "total": 10,
      "mostUsed": [
        {
          "templateId": "template_id",
          "name": "Weight Loss Plan",
          "usageCount": 200,
          "activeDietPlans": 150
        }
      ],
      "leastUsed": [ /* array */ ]
    },
    "policies": {
      "privacyPolicyViews": 500,
      "termsConditionsViews": 300,
      "lastUpdated": "2024-01-15T00:00:00.000Z"
    },
    "emailTemplates": {
      "total": 5,
      "mostUsed": [ /* array */ ]
    }
  }
}
```

---

### 4.5 Export Analytics Data

**Endpoint:** `GET /v1/admin/analytics/export`

**Description:** Export analytics data in CSV or JSON format.

**Query Parameters:**
- `format` (string, default: "json") - json, csv
- `type` (string, required) - users, mealLogs, waterIntake, supplements, engagement
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
- CSV file download or JSON response
- Should include appropriate headers for CSV

**Implementation Notes:**
- Should handle large datasets efficiently
- Should stream CSV for large exports
- Should limit export size or require pagination
- Should log export requests in audit trail

---

## 5. System Configuration

**Purpose:** Manage system-wide settings, feature flags, and configuration.

### 5.1 Get System Settings

**Endpoint:** `GET /v1/admin/settings`

**Description:** Get all system settings and configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "app": {
      "name": "Wellio",
      "version": "1.0.0",
      "maintenanceMode": false,
      "registrationEnabled": true,
      "maxFileUploadSize": 5242880
    },
    "features": {
      "mealLogging": true,
      "waterTracking": true,
      "supplementTracking": true,
      "aiChat": true,
      "dietPlans": true,
      "pushNotifications": true
    },
    "notifications": {
      "emailEnabled": true,
      "pushEnabled": true,
      "smsEnabled": false
    },
    "security": {
      "maxLoginAttempts": 5,
      "lockoutDuration": 1800,
      "sessionTimeout": 3600,
      "require2FA": false
    },
    "limits": {
      "maxMealLogsPerDay": 10,
      "maxWaterIntakePerDay": 5000,
      "maxSupplementsPerUser": 20,
      "maxAiChatMessagesPerSession": 100
    }
  }
}
```

**Implementation Notes:**
- Should create a Settings model if not exists
- Should cache settings for performance
- Should validate settings on update

---

### 5.2 Update System Settings

**Endpoint:** `PUT /v1/admin/settings`

**Description:** Update system settings.

**Request Body:**
```json
{
  "app": {
    "maintenanceMode": true,
    "registrationEnabled": false
  },
  "features": {
    "aiChat": false
  },
  "security": {
    "maxLoginAttempts": 3,
    "lockoutDuration": 3600
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "settings": { /* updated settings object */ },
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "updatedBy": "admin_id"
  }
}
```

**Implementation Notes:**
- Should validate all settings
- Should log changes in audit trail
- Should notify users if maintenance mode is enabled
- Should update cached settings

---

### 5.3 Get Feature Flags

**Endpoint:** `GET /v1/admin/settings/feature-flags`

**Description:** Get all feature flags.

**Response:**
```json
{
  "success": true,
  "data": {
    "featureFlags": [
      {
        "key": "mealLogging",
        "name": "Meal Logging",
        "enabled": true,
        "description": "Allow users to log meals",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "updatedBy": "admin_id"
      }
    ]
  }
}
```

---

### 5.4 Update Feature Flag

**Endpoint:** `PATCH /v1/admin/settings/feature-flags/:key`

**Description:** Enable or disable a specific feature flag.

**Request Body:**
```json
{
  "enabled": false,
  "reason": "Temporarily disabling for maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feature flag updated successfully",
  "data": {
    "featureFlag": {
      "key": "mealLogging",
      "enabled": false,
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "updatedBy": "admin_id"
    }
  }
}
```

---

## 6. Audit & Security

**Purpose:** Track admin actions, manage security settings, and monitor system security.

### 6.1 Get Audit Logs

**Endpoint:** `GET /v1/admin/audit-logs`

**Description:** Get audit logs of admin actions.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `adminId` (string, optional) - Filter by admin
- `action` (string, optional) - Filter by action type
- `entityType` (string, optional) - Filter by entity (user, admin, policy, etc.)
- `entityId` (string, optional) - Filter by specific entity
- `dateFrom` (string, optional)
- `dateTo` (string, optional)
- `sortBy` (string, default: "timestamp")
- `sortOrder` (string, default: "desc")

**Response:**
```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": "log_id",
        "admin": {
          "id": "admin_id",
          "username": "admin_user",
          "email": "admin@wellio.com"
        },
        "action": "user.updated",
        "entityType": "user",
        "entityId": "user_id",
        "details": {
          "changes": {
            "name": {
              "old": "John Doe",
              "new": "John Updated"
            }
          }
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": { /* pagination object */ }
  }
}
```

**Implementation Notes:**
- Should create an AuditLog model
- Should log all admin actions automatically
- Should include IP address and user agent
- Should support filtering and search
- Should be immutable (logs cannot be deleted)

---

### 6.2 Get Security Events

**Endpoint:** `GET /v1/admin/security/events`

**Description:** Get security-related events (failed logins, suspicious activity, etc.).

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `eventType` (string, optional) - failed_login, account_locked, password_reset, etc.
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event_id",
        "type": "failed_login",
        "entityType": "admin",
        "entityId": "admin_id",
        "details": {
          "email": "admin@wellio.com",
          "attempts": 3,
          "ipAddress": "192.168.1.1"
        },
        "severity": "medium",
        "timestamp": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": { /* pagination object */ }
  }
}
```

---

### 6.3 Get Security Statistics

**Endpoint:** `GET /v1/admin/security/statistics`

**Description:** Get security statistics and metrics.

**Query Parameters:**
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "failedLogins": {
      "last24h": 5,
      "last7d": 20,
      "last30d": 80
    },
    "accountLockouts": {
      "last24h": 1,
      "last7d": 3,
      "last30d": 10
    },
    "passwordResets": {
      "last24h": 2,
      "last7d": 10,
      "last30d": 40
    },
    "suspiciousActivity": {
      "last24h": 0,
      "last7d": 1,
      "last30d": 3
    },
    "activeSessions": {
      "total": 15,
      "adminSessions": 5,
      "userSessions": 10
    }
  }
}
```

---

### 6.4 Configure Security Settings

**Endpoint:** `PUT /v1/admin/security/settings`

**Description:** Update security configuration.

**Request Body:**
```json
{
  "maxLoginAttempts": 5,
  "lockoutDuration": 1800,
  "sessionTimeout": 3600,
  "require2FA": false,
  "passwordPolicy": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": false
  },
  "ipWhitelist": ["192.168.1.0/24"],
  "allowedOrigins": ["https://admin.wellio.com"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Security settings updated successfully",
  "data": {
    "settings": { /* updated settings */ },
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "updatedBy": "admin_id"
  }
}
```

**Implementation Notes:**
- Should validate all security settings
- Should apply changes immediately
- Should log this action in audit trail
- Should notify admins of security setting changes

---

## 7. Notification Management

**Purpose:** Manage push notifications, email notifications, and notification history.

### 7.1 Get Notification History

**Endpoint:** `GET /v1/admin/notifications/history`

**Description:** Get notification history for all users or specific user.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `userId` (string, optional) - Filter by user
- `type` (string, optional) - push, email, sms
- `status` (string, optional) - sent, failed, pending
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "user": {
          "id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "type": "push",
        "title": "Water Reminder",
        "body": "Don't forget to drink water!",
        "status": "sent",
        "sentAt": "2024-01-20T10:30:00.000Z",
        "deliveredAt": "2024-01-20T10:30:05.000Z",
        "readAt": "2024-01-20T10:35:00.000Z"
      }
    ],
    "pagination": { /* pagination object */ },
    "statistics": {
      "total": 1000,
      "sent": 950,
      "failed": 50,
      "deliveryRate": 0.95
    }
  }
}
```

---

### 7.2 Send Broadcast Notification

**Endpoint:** `POST /v1/admin/notifications/broadcast`

**Description:** Send a push notification to all users or a segment of users.

**Request Body:**
```json
{
  "title": "New Feature Available",
  "body": "Check out our new meal planning feature!",
  "type": "push",
  "targetAudience": "all",
  "filters": {
    "isVerified": true,
    "isProfileCompleted": true
  },
  "scheduleAt": "2024-01-21T10:00:00.000Z",
  "data": {
    "screen": "features",
    "featureId": "meal_planning"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Broadcast notification scheduled successfully",
  "data": {
    "broadcastId": "broadcast_id",
    "estimatedRecipients": 800,
    "scheduledAt": "2024-01-21T10:00:00.000Z",
    "status": "scheduled"
  }
}
```

**Implementation Notes:**
- Should support scheduling
- Should support user segmentation
- Should track delivery status
- Should log this action in audit trail
- Should require confirmation for large broadcasts

---

### 7.3 Get Notification Statistics

**Endpoint:** `GET /v1/admin/notifications/statistics`

**Description:** Get statistics about notifications.

**Query Parameters:**
- `dateFrom` (string, optional)
- `dateTo` (string, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalNotifications": 10000,
    "byType": {
      "push": 8000,
      "email": 2000,
      "sms": 0
    },
    "byStatus": {
      "sent": 9500,
      "failed": 500,
      "pending": 0
    },
    "deliveryRate": 0.95,
    "readRate": 0.70,
    "averageDeliveryTime": 2.5,
    "notificationsByDay": [
      {
        "date": "2024-01-20",
        "count": 500
      }
    ]
  }
}
```

---

## 8. Content Management Enhancements

**Purpose:** Enhancements to existing content management features.

### 8.1 Bulk Operations for Policies

**Endpoint:** `POST /v1/admin/policy/bulk`

**Description:** Perform bulk operations on policies (archive, delete, publish).

**Request Body:**
```json
{
  "action": "archive",
  "policyIds": ["policy_id_1", "policy_id_2"],
  "reason": "Outdated policies"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk operation completed successfully",
  "data": {
    "action": "archive",
    "processed": 2,
    "failed": 0,
    "policyIds": ["policy_id_1", "policy_id_2"]
  }
}
```

---

### 8.2 Export/Import Diet Templates

**Endpoint:** `POST /v1/admin/diet-templates/import`

**Description:** Import diet templates from JSON file.

**Request Body:**
```json
{
  "templates": [
    {
      "name": "Weight Loss Plan",
      "description": "7-day weight loss plan",
      "goalType": "weight_loss",
      "weekSchedule": [ /* week schedule */ ]
    }
  ],
  "overwrite": false
}
```

**Endpoint:** `GET /v1/admin/diet-templates/export`

**Description:** Export diet templates to JSON.

**Query Parameters:**
- `templateIds` (string[], optional) - Export specific templates, or all if not provided
- `format` (string, default: "json") - json, csv

---

### 8.3 Diet Template Analytics

**Endpoint:** `GET /v1/admin/diet-templates/:templateId/analytics`

**Description:** Get usage analytics for a specific diet template.

**Response:**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": "template_id",
      "name": "Weight Loss Plan"
    },
    "usage": {
      "totalUsers": 200,
      "activeDietPlans": 150,
      "completedDietPlans": 50,
      "averageCompletionRate": 0.75
    },
    "userFeedback": {
      "averageRating": 4.5,
      "totalRatings": 100
    },
    "trends": {
      "usageByMonth": [ /* array */ ]
    }
  }
}
```

---

## Implementation Priority

### High Priority (Phase 1)
1. User Management (List, View, Update, Activate/Deactivate)
2. Super Admin Management (List, Create, Update, Activate/Deactivate)
3. Audit Logging System
4. Dashboard Statistics
5. User Data Viewing (Meal Logs, Water Intake, Supplements)

### Medium Priority (Phase 2)
6. User Growth & Engagement Analytics
7. System Settings & Feature Flags
8. Security Settings & Events
9. Notification Management
10. Content Usage Analytics

### Low Priority (Phase 3)
11. Export/Import Features
12. Bulk Operations
13. Advanced Analytics
14. Content Template Analytics

---

## Database Schema Requirements

### New Models Needed

1. **AuditLog Model**
   - admin (ObjectId, ref: SuperAdmin)
   - action (String)
   - entityType (String)
   - entityId (ObjectId)
   - details (Object)
   - ipAddress (String)
   - userAgent (String)
   - timestamp (Date)

2. **Settings Model**
   - key (String, unique)
   - value (Mixed)
   - category (String)
   - updatedBy (ObjectId, ref: SuperAdmin)
   - updatedAt (Date)

3. **SecurityEvent Model**
   - type (String)
   - entityType (String)
   - entityId (ObjectId)
   - details (Object)
   - severity (String)
   - ipAddress (String)
   - timestamp (Date)

4. **User Model Updates**
   - isActive (Boolean, default: true)
   - deactivatedAt (Date)
   - deactivatedBy (ObjectId, ref: SuperAdmin)
   - deactivationReason (String)

5. **SuperAdmin Model Updates**
   - createdBy (ObjectId, ref: SuperAdmin)
   - deactivatedAt (Date)
   - deactivatedBy (ObjectId, ref: SuperAdmin)
   - deactivationReason (String)

---

## API Versioning

All new admin endpoints should follow the existing versioning pattern:
- `/v1/admin/*` for core admin features
- `/v2/admin/*` for enhanced features (already used for email management)

---

## Authentication & Authorization

All endpoints listed above require:
- **Authentication:** `requireSuperAdmin` middleware
- **Authorization:** Super admin role verification
- **Audit Trail:** All actions should be logged

---

## Error Handling

All endpoints should:
- Return consistent error responses using `ResponseUtils`
- Include appropriate HTTP status codes
- Provide clear error messages
- Log errors for debugging

---

## Response Format

All endpoints should follow the existing response format:
```json
{
  "success": true|false,
  "message": "Optional message",
  "data": { /* response data */ },
  "error": { /* error details if success is false */ }
}
```

---

## Notes for Frontend Team

1. **Pagination:** All list endpoints support pagination with consistent structure
2. **Filtering:** Most endpoints support date range filtering
3. **Search:** User list endpoint supports text search
4. **Sorting:** List endpoints support sorting by various fields
5. **Audit Trail:** All admin actions are logged and can be viewed
6. **Real-time Updates:** Consider WebSocket or polling for dashboard statistics
7. **Export:** Analytics data can be exported in CSV/JSON format
8. **Bulk Operations:** Some endpoints support bulk operations for efficiency

---

**End of Document**



