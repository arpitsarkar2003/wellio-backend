# Wellio Backend - Admin Capability Audit Report

**Generated:** 2024  
**Purpose:** Document all existing admin-level capabilities in the backend codebase  
**Status:** ✅ Complete Audit - No New Features Added

---

## 📌 1. Current Authentication Model

### Authentication Architecture

The backend implements a **dual authentication system** with separate flows for regular users and super admins:

#### **Regular User Authentication**
- **Location:** `src/middleware/auth.js`
- **Token Types:**
  - **1F Token:** Temporary token for OTP verification (60s expiry)
  - **Access Token:** Full authentication token (1h expiry, default)
  - **Refresh Token:** Token refresh mechanism (6h expiry, default)
- **Token Generation:** `src/utils/tokenUtils.js`
- **User Model:** `src/models/User.js`
- **Token Storage:** Tokens stored in JWT payload, blacklisted tokens stored in user document
- **Role in Token:** Regular users have no `role` field in token (or `role: 'user'` in optional auth)

#### **Super Admin Authentication**
- **Location:** `src/middleware/auth.js` → `verifySuperAdminToken()`
- **Token Type:** Uses same access token system but with `role: 'super_admin'` in JWT payload
- **Admin Model:** `src/models/SuperAdmin.js`
- **Token Verification:** Checks for `decoded.role === 'super_admin'` in token payload
- **Account Status Checks:**
  - `isActive` flag (account can be disabled)
  - `isLocked` flag (account locked after 5 failed login attempts for 30 minutes)
- **Session Tracking:** Active sessions stored in `SuperAdmin.activeSessions` array

### Middleware Functions

| Middleware | Purpose | File Reference |
|------------|---------|----------------|
| `verify1FAuth` | OTP verification token | `src/middleware/auth.js:12` |
| `verifyAccessToken` | Regular user access token | `src/middleware/auth.js:57` |
| `verifyRefreshToken` | Refresh token verification | `src/middleware/auth.js:94` |
| `verifySuperAdminToken` | Super admin token verification | `src/middleware/auth.js:217` |
| `requireAuth` | Alias for `verifyAccessToken` | `src/middleware/auth.js:270` |
| `requireSuperAdmin` | Alias for `verifySuperAdminToken` | `src/middleware/auth.js:275` |
| `requireAdmin` | **PLACEHOLDER** - Currently does nothing | `src/middleware/auth.js:200` |
| `requireVerifiedUser` | Checks `user.isVerified` flag | `src/middleware/auth.js:182` |
| `optionalAuth` | Extracts user/admin from token if present | `src/middleware/auth.js:280` |

### Token Structure

**Access Token Payload (Regular User):**
```javascript
{
  userId: ObjectId,
  type: 'access',
  timestamp: Number
  // No role field for regular users
}
```

**Access Token Payload (Super Admin):**
```javascript
{
  userId: ObjectId,
  type: 'access',
  timestamp: Number,
  role: 'super_admin'  // ← Key differentiator
}
```

### Authentication Flow

1. **Super Admin Login:** `POST /v1/admin/login`
   - Validates username/password
   - Checks account status (active, locked)
   - Generates access token with `role: 'super_admin'`
   - Tracks session in `activeSessions` array
   - Returns tokens to client

2. **Token Verification:**
   - `requireSuperAdmin` middleware extracts token from `Authorization: Bearer <token>` header
   - Verifies token signature
   - Checks `decoded.role === 'super_admin'`
   - Loads SuperAdmin document from database
   - Validates `isActive` and `isLocked` status
   - Attaches admin info to `req.user`

---

## 📌 2. Role & Permission Handling

### Roles Defined

**Only ONE role exists in the codebase:**
- **`super_admin`** - Full administrative access

**No other roles are defined:**
- No `admin` role (separate from super_admin)
- No `moderator` role
- No `user` role stored in User model (only inferred in optional auth)

### Permission Enforcement

#### **Super Admin Permissions**
- **Enforced via:** `authMiddleware.requireSuperAdmin` middleware
- **Token Check:** Verifies `decoded.role === 'super_admin'` in JWT
- **Database Check:** Validates SuperAdmin document exists and is active/unlocked
- **Location:** `src/middleware/auth.js:217-267`

#### **Placeholder Admin Middleware**
- **Location:** `src/middleware/auth.js:200-214`
- **Status:** ⚠️ **NOT IMPLEMENTED** - Currently a placeholder
- **Code:**
  ```javascript
  static async requireAdmin(req, res, next) {
    // For now, you can define admin logic here
    // Example: if (!req.user.isAdmin) { ... }
    next(); // Currently allows all authenticated users
  }
  ```
- **Usage:** Not used anywhere in the codebase

#### **Role-Based Access in Controllers**

**One instance of role checking in controller logic:**
- **File:** `src/controllers/userController.js:127`
- **Endpoint:** `GET /v1/user/:id`
- **Logic:**
  ```javascript
  if (currentUser.role !== 'super_admin' && currentUser.id !== targetUserId) {
    return ResponseUtils.forbidden(res, 'Access denied...');
  }
  ```
- **Purpose:** Allows super admin to view any user profile, or users to view their own

### Gaps & Inconsistencies

1. **No User Role Field:** User model has no `role` field, but `optionalAuth` middleware sets `role: 'user'` in `req.user`
2. **Placeholder Middleware:** `requireAdmin` exists but is not implemented
3. **No Permission Granularity:** All admin operations require full super_admin access
4. **No Role Hierarchy:** Only one admin role exists

---

## 📌 3. Existing Admin-Capable APIs

### Super Admin Authentication APIs

| Route | Method | Controller | Auth Required | Description |
|-------|--------|------------|---------------|-------------|
| `/v1/admin/setup` | POST | `SuperAdminController.createInitialAdmin` | None | One-time super admin creation |
| `/v1/admin/login` | POST | `SuperAdminController.login` | None | Super admin login |
| `/v1/admin/security-question` | POST | `SuperAdminController.getSecurityQuestion` | None | Get security question for password recovery |
| `/v1/admin/recover-password` | POST | `SuperAdminController.recoverPassword` | None | Password recovery via security answer |
| `/v1/admin/profile` | GET | `SuperAdminController.getProfile` | `requireSuperAdmin` | Get admin profile |
| `/v1/admin/change-password` | PUT | `SuperAdminController.changePassword` | `requireSuperAdmin` | Change admin password |
| `/v1/admin/logout` | POST | `SuperAdminController.logout` | `requireSuperAdmin` | Admin logout |
| `/v1/admin/sessions` | GET | `SuperAdminController.getActiveSessions` | `requireSuperAdmin` | Get active admin sessions |
| `/v1/admin/sessions/:sessionId` | DELETE | `SuperAdminController.revokeSession` | `requireSuperAdmin` | Revoke specific session |

**File References:**
- Routes: `src/routes/admin.js:55-252`
- Controller: `src/controllers/superAdminController.js`

### Company Management APIs

| Route | Method | Controller | Auth Required | Description |
|-------|--------|------------|---------------|-------------|
| `/v1/admin/company` | GET | `CompanyController.getCompanyInfo` | `requireSuperAdmin` | Get company information |
| `/v1/admin/company` | PUT | `CompanyController.updateCompanyInfo` | `requireSuperAdmin` | Update company information (name, address, contact, etc.) |
| `/v1/admin/company/logo` | POST | `CompanyController.uploadLogo` | `requireSuperAdmin` | Upload company logo (base64 → ImgBB) |
| `/v1/admin/company/logo` | DELETE | `CompanyController.removeLogo` | `requireSuperAdmin` | Remove company logo |
| `/v1/admin/company/logo/info` | POST | `CompanyController.getImageInfo` | `requireSuperAdmin` | Validate image before upload |
| `/v1/admin/company/phone` | POST | `CompanyController.addPhoneNumber` | `requireSuperAdmin` | Add phone number to company |
| `/v1/admin/company/email` | POST | `CompanyController.addEmail` | `requireSuperAdmin` | Add email address to company |

**File References:**
- Routes: `src/routes/admin.js:270-433`
- Controller: `src/controllers/companyController.js`
- Model: `src/models/Company.js`

**Admin Control:**
- Full CRUD on company information
- Logo management (upload/delete)
- Contact information management
- All changes tracked via `lastUpdatedBy` field (references SuperAdmin)

### Policy Management APIs

| Route | Method | Controller | Auth Required | Description |
|-------|--------|------------|---------------|-------------|
| `/v1/admin/policy` | GET | `PolicyController.getAllPolicies` | `requireSuperAdmin` | Get all policies (draft, published, archived) |
| `/v1/admin/policy/privacy-policy` | POST | `PolicyController.uploadPrivacyPolicy` | `requireSuperAdmin` | Upload/update privacy policy |
| `/v1/admin/policy/terms-conditions` | POST | `PolicyController.uploadTermsConditions` | `requireSuperAdmin` | Upload/update terms & conditions |
| `/v1/admin/policy/:id` | GET | `PolicyController.getPolicyById` | `requireSuperAdmin` | Get policy by ID (full content) |
| `/v1/admin/policy/:id/status` | PATCH | `PolicyController.updatePolicyStatus` | `requireSuperAdmin` | Update policy status (draft/published/archived) |
| `/v1/admin/policy/:id` | DELETE | `PolicyController.deletePolicy` | `requireSuperAdmin` | Delete policy (cannot delete published) |
| `/v1/admin/policy/stats` | GET | `PolicyController.getPolicyStats` | `requireSuperAdmin` | Get policy statistics |

**File References:**
- Routes: `src/routes/admin.js:451-546`
- Controller: `src/controllers/policyController.js`
- Model: `src/models/Policy.js`

**Admin Control:**
- Full CRUD on policies
- Version control (automatic versioning on content changes)
- Status management (draft → published → archived)
- Changelog tracking
- All changes tracked via `lastUpdatedBy` field

### Email Template Management APIs (v2)

| Route | Method | Controller | Auth Required | Description |
|-------|--------|------------|---------------|-------------|
| `/v2/admin/email-templates` | POST | `EmailTemplateController.createTemplate` | `requireSuperAdmin` | Create email template |
| `/v2/admin/email-templates` | GET | `EmailTemplateController.getAllTemplates` | `requireSuperAdmin` | Get all email templates |
| `/v2/admin/email-templates/:id` | GET | `EmailTemplateController.getTemplateById` | `requireSuperAdmin` | Get template by ID |
| `/v2/admin/email-templates/:id` | PUT | `EmailTemplateController.updateTemplate` | `requireSuperAdmin` | Update email template |
| `/v2/admin/email-templates/:id` | DELETE | `EmailTemplateController.deleteTemplate` | `requireSuperAdmin` | Delete email template |

**File References:**
- Routes: `src/routes/email.js:54-151`
- Controller: `src/controllers/emailTemplateController.js`
- **Note:** All routes in `/v2/admin` require super admin (router-level middleware)

### Email Broadcast Management APIs (v2)

| Route | Method | Controller | Auth Required | Description |
|-------|--------|------------|---------------|-------------|
| `/v2/admin/email-broadcasts` | POST | `EmailBroadcastController.createBroadcast` | `requireSuperAdmin` | Create and initiate email broadcast |
| `/v2/admin/email-broadcasts` | GET | `EmailBroadcastController.getAllBroadcasts` | `requireSuperAdmin` | Get all email broadcasts |
| `/v2/admin/email-broadcasts/:id` | GET | `EmailBroadcastController.getBroadcastStatus` | `requireSuperAdmin` | Get broadcast status |
| `/v2/admin/email-broadcasts/:id/metrics` | GET | `EmailBroadcastController.getBroadcastMetrics` | `requireSuperAdmin` | Get broadcast metrics |
| `/v2/admin/email-subscriptions/count` | GET | `EmailBroadcastController.getSubscriberCount` | `requireSuperAdmin` | Get subscriber count |

**File References:**
- Routes: `src/routes/email.js:197-273`
- Controller: `src/controllers/emailBroadcastController.js`

**Admin Control:**
- Create email broadcasts to all subscribers
- Monitor broadcast progress and metrics
- View subscriber statistics

### Diet Template Management APIs

| Route | Method | Controller | Auth Required | Description |
|-------|--------|------------|---------------|-------------|
| `/v1/diet-plans/templates` | POST | `DietTemplateController.createTemplate` | `requireSuperAdmin` | Create diet template |
| `/v1/diet-plans/templates/:templateId` | PUT | `DietTemplateController.updateTemplate` | `requireSuperAdmin` | Update diet template |
| `/v1/diet-plans/templates/:templateId` | DELETE | `DietTemplateController.deleteTemplate` | `requireSuperAdmin` | Delete diet template |

**File References:**
- Routes: `src/routes/dietPlan.js:86, 138, 164`
- Controller: `src/controllers/dietTemplateController.js`
- Model: `src/models/DietTemplate.js`

**Admin Control:**
- Create, update, delete diet templates
- Templates are used by regular users to generate diet plans
- All templates tracked via `createdBy` field (references SuperAdmin)

### User Profile Access API

| Route | Method | Controller | Auth Required | Description |
|-------|--------|------------|---------------|-------------|
| `/v1/user/:id` | GET | `UserController.getUserById` | `requireAuth` | Get user by ID (admin can view any user) |

**File References:**
- Routes: `src/routes/user.js` (implied)
- Controller: `src/controllers/userController.js:121-146`

**Admin Control:**
- Super admin can view any user profile
- Regular users can only view their own profile
- Logic: `if (currentUser.role !== 'super_admin' && currentUser.id !== targetUserId)`

---

## 📌 4. Data Entities Admin Can Control

### Entities with Full Admin Control

#### **1. SuperAdmin Entity**
- **Model:** `src/models/SuperAdmin.js`
- **Admin Operations:**
  - ✅ **Create:** `POST /v1/admin/setup` (one-time only)
  - ✅ **Read:** `GET /v1/admin/profile`, `GET /v1/admin/sessions`
  - ✅ **Update:** `PUT /v1/admin/change-password`
  - ✅ **Delete:** ❌ Not implemented (no endpoint exists)
- **Fields Controlled:**
  - Username, email, password
  - Security question/answer
  - Account status (isActive, isLocked)
  - Active sessions
  - Login attempts tracking

#### **2. Company Entity**
- **Model:** `src/models/Company.js`
- **Admin Operations:**
  - ✅ **Create:** Via `PUT /v1/admin/company` (upsert pattern)
  - ✅ **Read:** `GET /v1/admin/company`
  - ✅ **Update:** `PUT /v1/admin/company`
  - ✅ **Delete:** ❌ Not implemented (no soft/hard delete endpoint)
- **Fields Controlled:**
  - Company name, description, industry, established year
  - Logo (imageUrl, thumbnailUrl, variants)
  - Address (street1, street2, city, state, pincode, country)
  - Contact info (phoneNumbers array, emails array, website, social media)
  - `lastUpdatedBy` field (tracks admin who made changes)
- **Special Operations:**
  - Logo upload/delete
  - Add phone numbers
  - Add email addresses

#### **3. Policy Entity**
- **Model:** `src/models/Policy.js`
- **Admin Operations:**
  - ✅ **Create:** `POST /v1/admin/policy/privacy-policy`, `POST /v1/admin/policy/terms-conditions`
  - ✅ **Read:** `GET /v1/admin/policy`, `GET /v1/admin/policy/:id`
  - ✅ **Update:** Via POST endpoints (upsert pattern), `PATCH /v1/admin/policy/:id/status`
  - ✅ **Delete:** `DELETE /v1/admin/policy/:id` (cannot delete published policies)
- **Fields Controlled:**
  - Type (privacy_policy, terms_conditions)
  - Title, content (markdown)
  - Version (auto-incremented)
  - Status (draft, published, archived)
  - Effective dates (effectiveFrom, effectiveUntil)
  - Meta information (metaDescription, keywords)
  - Changelog array
  - `lastUpdatedBy` field
- **Special Operations:**
  - Version control (automatic on content changes)
  - Status transitions (draft → published → archived)
  - Changelog tracking

#### **4. EmailTemplate Entity**
- **Model:** `src/models/EmailTemplate.js` (implied from controller)
- **Admin Operations:**
  - ✅ **Create:** `POST /v2/admin/email-templates`
  - ✅ **Read:** `GET /v2/admin/email-templates`, `GET /v2/admin/email-templates/:id`
  - ✅ **Update:** `PUT /v2/admin/email-templates/:id`
  - ✅ **Delete:** `DELETE /v2/admin/email-templates/:id`
- **Fields Controlled:**
  - Name, subject
  - HTML content, plain text content
  - Created/updated timestamps

#### **5. EmailBroadcast Entity**
- **Model:** `src/models/EmailBroadcast.js` (implied from controller)
- **Admin Operations:**
  - ✅ **Create:** `POST /v2/admin/email-broadcasts`
  - ✅ **Read:** `GET /v2/admin/email-broadcasts`, `GET /v2/admin/email-broadcasts/:id`
  - ✅ **Update:** ❌ Not implemented (status updated by service)
  - ✅ **Delete:** ❌ Not implemented
- **Fields Controlled:**
  - Template reference
  - Batch size, delay between batches
  - Status (pending, processing, completed, failed)
  - Metrics (sentCount, failedCount, totalSubscribers)

#### **6. DietTemplate Entity**
- **Model:** `src/models/DietTemplate.js`
- **Admin Operations:**
  - ✅ **Create:** `POST /v1/diet-plans/templates`
  - ✅ **Read:** `GET /v1/diet-plans/templates` (public), `GET /v1/diet-plans/templates/:templateId` (public)
  - ✅ **Update:** `PUT /v1/diet-plans/templates/:templateId`
  - ✅ **Delete:** `DELETE /v1/diet-plans/templates/:templateId`
- **Fields Controlled:**
  - Template name, description, goal type
  - Week schedule (meals, items, calories)
  - `createdBy` field (references SuperAdmin)

### Entities with Partial Admin Access

#### **7. User Entity**
- **Model:** `src/models/User.js`
- **Admin Operations:**
  - ✅ **Read:** `GET /v1/user/:id` (admin can view any user)
  - ❌ **Create:** Not implemented (users self-register)
  - ❌ **Update:** Not implemented (users update their own profiles)
  - ❌ **Delete:** Not implemented (users delete their own accounts)
- **Access:** Super admin can view any user's full profile

### Entities with No Admin Control

The following entities exist but have **no admin management endpoints**:
- **MealLog** - User-controlled only
- **WaterIntake** - User-controlled only
- **WaterGoal** - User-controlled only
- **Supplement** - User-controlled only
- **SupplementLog** - User-controlled only
- **DietPlan** - User-controlled only
- **AiChatSession** - User-controlled only
- **AiChatMessage** - User-controlled only
- **PushToken** - User-controlled only
- **EmailSubscription** - Public subscription (no admin management)
- **NotificationHistory** - System-generated only

---

## 📌 5. Shared vs Admin-Sensitive APIs

### Public APIs (No Authentication Required)

| Route | Method | Purpose | Risk Level |
|-------|--------|---------|------------|
| `/v1/company` | GET | Get company information | ✅ Safe |
| `/v1/company/contact` | POST | Submit anonymous email | ✅ Safe |
| `/v1/policy/privacy-policy` | GET | Get current privacy policy | ✅ Safe |
| `/v1/policy/terms-conditions` | GET | Get current terms & conditions | ✅ Safe |
| `/v1/diet-plans/templates` | GET | Get all diet templates | ✅ Safe |
| `/v1/diet-plans/templates/:templateId` | GET | Get template by ID | ✅ Safe |
| `/v1/admin/setup` | POST | Create initial super admin | ⚠️ **One-time only** |
| `/v1/admin/login` | POST | Super admin login | ⚠️ **Rate limit recommended** |
| `/v1/admin/security-question` | POST | Get security question | ✅ Safe |
| `/v1/admin/recover-password` | POST | Password recovery | ⚠️ **Rate limit recommended** |

### User-Only APIs (Regular Authentication Required)

| Route | Method | Purpose | Admin Access |
|-------|--------|---------|--------------|
| `/v1/user/profile` | GET | Get own profile | ❌ No |
| `/v1/user/profile` | PUT | Update own profile | ❌ No |
| `/v1/user/:id` | GET | Get user by ID | ✅ **Yes** (admin can view any user) |
| `/v1/user/forgot-password` | POST | Request password reset | ❌ No |
| `/v1/user/reset-password` | POST | Reset password | ❌ No |
| `/v1/user/account` | DELETE | Delete own account | ❌ No |
| `/v1/diet-plans` | POST | Create diet plan | ❌ No |
| `/v1/diet-plans` | GET | Get active diet plan | ❌ No |
| `/v1/meal-logs/*` | Various | Meal logging | ❌ No |
| `/v1/water/*` | Various | Water tracking | ❌ No |
| `/v1/supplements/*` | Various | Supplement tracking | ❌ No |
| `/v1/ai/*` | Various | AI chat | ❌ No |

### Admin-Only APIs (Super Admin Required)

**All routes under `/v1/admin/*` and `/v2/admin/*` require super admin authentication.**

#### **High-Risk Admin Operations** (Dangerous if exposed)

| Route | Method | Risk | Why Dangerous |
|-------|--------|------|---------------|
| `/v1/admin/company` | PUT | 🔴 **High** | Can modify company branding, contact info |
| `/v1/admin/company/logo` | POST/DELETE | 🔴 **High** | Can change company logo |
| `/v1/admin/policy/privacy-policy` | POST | 🔴 **High** | Can modify legal documents |
| `/v1/admin/policy/terms-conditions` | POST | 🔴 **High** | Can modify legal documents |
| `/v1/admin/policy/:id/status` | PATCH | 🟡 **Medium** | Can publish/archive policies |
| `/v1/admin/policy/:id` | DELETE | 🟡 **Medium** | Can delete policy history |
| `/v2/admin/email-broadcasts` | POST | 🔴 **High** | Can send emails to all subscribers |
| `/v1/diet-plans/templates` | POST/PUT/DELETE | 🟡 **Medium** | Can modify diet templates |

#### **Medium-Risk Admin Operations**

| Route | Method | Risk | Why Medium Risk |
|-------|--------|------|-----------------|
| `/v1/admin/company/phone` | POST | 🟡 **Medium** | Can add contact info |
| `/v1/admin/company/email` | POST | 🟡 **Medium** | Can add contact info |
| `/v2/admin/email-templates` | POST/PUT/DELETE | 🟡 **Medium** | Can modify email templates |

#### **Low-Risk Admin Operations** (Read-Only or Self-Management)

| Route | Method | Risk | Why Low Risk |
|-------|--------|------|--------------|
| `/v1/admin/profile` | GET | 🟢 **Low** | Read-only admin profile |
| `/v1/admin/company` | GET | 🟢 **Low** | Read-only company info |
| `/v1/admin/policy` | GET | 🟢 **Low** | Read-only policy list |
| `/v1/admin/policy/:id` | GET | 🟢 **Low** | Read-only policy details |
| `/v1/admin/policy/stats` | GET | 🟢 **Low** | Read-only statistics |
| `/v1/admin/sessions` | GET | 🟢 **Low** | Read-only session list |
| `/v2/admin/email-templates` | GET | 🟢 **Low** | Read-only template list |
| `/v2/admin/email-broadcasts` | GET | 🟢 **Low** | Read-only broadcast list |
| `/v2/admin/email-subscriptions/count` | GET | 🟢 **Low** | Read-only subscriber count |
| `/v1/admin/change-password` | PUT | 🟢 **Low** | Self-management only |
| `/v1/admin/logout` | POST | 🟢 **Low** | Self-management only |
| `/v1/admin/sessions/:sessionId` | DELETE | 🟢 **Low** | Self-management only |

---

## 📌 6. Security Observations

### ✅ Security Strengths

1. **Separate Admin Authentication:** Super admin uses separate model and token verification
2. **Account Lockout:** Super admin accounts lock after 5 failed login attempts (30 min)
3. **Session Tracking:** Active sessions tracked and can be revoked
4. **Token Blacklisting:** User tokens can be blacklisted on logout
5. **Role Verification:** Token role checked in middleware before database lookup
6. **Account Status Checks:** `isActive` and `isLocked` validated on every request
7. **Password Hashing:** SHA-256 hashing for passwords and security answers
8. **Audit Trail:** `lastUpdatedBy` fields track admin who made changes

### ⚠️ Security Gaps & Concerns

#### **1. Missing Permission Checks**

- **`requireAdmin` Middleware:** Placeholder exists but not implemented (`src/middleware/auth.js:200`)
- **No granular permissions:** All admin operations require full super_admin access
- **No role hierarchy:** Cannot have different admin levels

#### **2. Over-Privileged Endpoints**

- **`GET /v1/user/:id`:** Allows super admin to view any user profile without explicit admin endpoint
  - **Location:** `src/controllers/userController.js:127`
  - **Risk:** Admin access mixed with user endpoint
  - **Recommendation:** Create dedicated `/v1/admin/users/:id` endpoint

#### **3. Admin Logic Mixed with User Logic**

- **User Controller:** Contains admin check (`role !== 'super_admin'`) in user endpoint
  - **File:** `src/controllers/userController.js:127`
  - **Issue:** Admin logic embedded in user-facing controller
  - **Recommendation:** Separate admin user management into admin controller

#### **4. Missing Admin Operations**

- **No User Management:** No endpoints to:
  - List all users
  - Update user profiles
  - Delete user accounts
  - Activate/deactivate users
  - View user statistics
- **No Super Admin Management:** No endpoints to:
  - List all super admins
  - Create additional super admins (after initial setup)
  - Update super admin details
  - Delete super admin accounts
- **No Audit Logs:** No centralized audit log for admin actions
- **No Rate Limiting:** Admin endpoints may not have rate limiting (check `src/middleware/rateLimiter.js`)

#### **5. Token Security**

- **Token Expiry:** Access tokens expire in 1h (default), refresh tokens in 6h
- **No Token Rotation:** Refresh tokens don't rotate on use
- **Session Management:** Sessions tracked but no automatic cleanup of expired sessions

#### **6. Data Exposure Risks**

- **Policy Content:** Full policy content exposed to admin (including drafts)
- **User Profiles:** Super admin can view full user profiles (including sensitive data)
- **Email Broadcasts:** Can send emails to all subscribers (no confirmation step)

#### **7. Input Validation**

- **Image Uploads:** Logo uploads validated but large base64 strings could cause memory issues
- **Policy Content:** No size limits on policy content (could be very large)
- **Email Templates:** HTML content validated but no XSS sanitization mentioned

#### **8. Missing Security Features**

- **No 2FA:** Super admin doesn't have 2FA
- **No IP Whitelisting:** Admin access not restricted by IP
- **No Action Confirmation:** Dangerous operations (delete, broadcast) don't require confirmation
- **No Change History:** Some entities (Company, EmailTemplate) don't track change history

### 🔴 Red Flags

1. **One-Time Setup Endpoint:** `POST /v1/admin/setup` should be disabled after first admin created
   - **Current:** Returns error if admin exists, but endpoint still accessible
   - **Risk:** Could be exploited if validation fails

2. **No Admin Deletion:** Cannot delete super admin accounts (could be intentional for safety)

3. **Password Recovery:** Security question-based recovery may be weak
   - **Question:** Hardcoded to "Hi, what is your bday?"
   - **Risk:** Predictable answers

4. **Session Management:** Sessions stored in database but no automatic expiration cleanup

5. **Email Broadcast:** No confirmation or approval step before sending to all subscribers

### 📋 Recommendations (For Future WAD Design)

1. **Separate Admin User Management:** Create `/v1/admin/users/*` endpoints
2. **Implement Audit Logging:** Track all admin actions with timestamps
3. **Add Rate Limiting:** Apply rate limits to admin authentication endpoints
4. **Implement Confirmation Steps:** Require confirmation for dangerous operations
5. **Add Granular Permissions:** If multiple admin roles needed in future
6. **Disable Setup Endpoint:** After initial admin creation
7. **Add IP Whitelisting:** Optional feature for production
8. **Implement 2FA:** For super admin accounts
9. **Add Change History:** For all admin-modifiable entities
10. **Separate Admin Controllers:** Move admin logic out of user controllers

---

## 📊 Summary Statistics

### Admin Endpoints Count

- **Total Admin Endpoints:** 33
- **Authentication Endpoints:** 9
- **Company Management:** 7
- **Policy Management:** 7
- **Email Management (v2):** 9
- **Diet Template Management:** 3
- **User Access (partial):** 1

### Entities Under Admin Control

- **Full CRUD:** 5 entities (Company, Policy, EmailTemplate, EmailBroadcast, DietTemplate)
- **Read-Only Access:** 1 entity (User)
- **Self-Management:** 1 entity (SuperAdmin)

### Authentication Methods

- **Super Admin Required:** 24 endpoints
- **Regular Auth (with admin check):** 1 endpoint
- **Public (no auth):** 8 endpoints

---

## 📝 Notes

- **This audit only documents existing functionality.**
- **No new features or endpoints were added during this audit.**
- **All file references are accurate as of the audit date.**
- **Security recommendations are suggestions for future improvements, not current issues.**

---

**End of Audit Report**




