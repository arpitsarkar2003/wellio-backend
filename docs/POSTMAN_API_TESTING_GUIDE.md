# Wellio Diet Tracker Backend - Postman API Testing Guide

## Base Configuration

**Base URL:** `http://localhost:8080` (or your deployment URL)
**API Version:** `/v1`

## Environment Variables for Postman

Create these variables in your Postman environment:
- `base_url`: `http://localhost:8080`
- `access_token`: (will be set automatically after login)
- `refresh_token`: (will be set automatically after login)
- `temp_auth_token`: (will be set automatically after login)
- `admin_token`: (will be set automatically after admin login)

---

## 🚀 AUTHENTICATION APIs (`/v1/auth`)

### 1. User Signup
**Method:** `POST`
**URL:** `{{base_url}}/v1/auth/signup`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "mypassword123",
  "name": "John Doe",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
```
**Expected Response:** `201 Created`

---

### 2. User Login (Step 1 - Get OTP)
**Method:** `POST`
**URL:** `{{base_url}}/v1/auth/login`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```
**Expected Response:** `200 OK`
**Response will contain:** `tempAuthToken` (save this for OTP verification)

**Post-request Script (to save temp token):**
```javascript
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.data && responseJson.data.tempAuthToken) {
        pm.environment.set("temp_auth_token", responseJson.data.tempAuthToken);
    }
}
```

---

### 3. Verify OTP (Step 2 - Complete Login)
**Method:** `POST`
**URL:** `{{base_url}}/v1/auth/verify-otp`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "token": "{{temp_auth_token}}",
  "otp": "123456"
}
```
**Expected Response:** `200 OK`

**Post-request Script (to save tokens):**
```javascript
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.data && responseJson.data.tokens) {
        pm.environment.set("access_token", responseJson.data.tokens.accessToken);
        pm.environment.set("refresh_token", responseJson.data.tokens.refreshToken);
    }
}
```

---

### 4. Google Login
**Method:** `POST`
**URL:** `{{base_url}}/v1/auth/google-login`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "googleToken": "your_google_oauth_token_here"
}
```

---

### 5. Get User Profile
**Method:** `GET`
**URL:** `{{base_url}}/v1/auth/profile`
**Headers:**
```json
{
  "Authorization": "Bearer {{access_token}}",
  "Content-Type": "application/json"
}
```
**Expected Response:** `200 OK`
**Response Body Example:**
```json
{
  "status": "success",
  "message": "Profile retrieved successfully",
  "data": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "isGoogleUser": false,
    "isVerified": true,
    "createdAt": "2023-06-22T10:00:00.000Z",
    "lastLogin": "2023-06-22T10:05:00.000Z",
    "profile": {
      "phoneNumber": "+1234567890",
      "address": {
        "street1": "123 Main St",
        "city": "New York"
      }
    }
  }
}
```

---

### 6. Refresh Access Token
**Method:** `POST`
**URL:** `{{base_url}}/v1/auth/refresh-token`
**Headers:**
```json
{
  "Authorization": "Bearer {{refresh_token}}",
  "Content-Type": "application/json"
}
```

---

### 7. User Logout
**Method:** `POST`
**URL:** `{{base_url}}/v1/auth/logout`
**Headers:**
```json
{
  "Authorization": "Bearer {{access_token}}",
  "Content-Type": "application/json"
}
```

---

### 8. Delete Account
**Method:** `DELETE`
**URL:** `{{base_url}}/v1/auth/delete-account`
**Headers:**
```json
{
  "Authorization": "Bearer {{access_token}}",
  "Content-Type": "application/json"
}
```

---

## 👤 USER MANAGEMENT APIs (`/v1/user`)

### 1. Get User Profile
**Method:** `GET`
**URL:** `{{base_url}}/v1/user/profile`
**Headers:**
```json
{
  "Authorization": "Bearer {{access_token}}",
  "Content-Type": "application/json"
}
```

---

### 2. Update User Profile
**Method:** `PUT`
**URL:** `{{base_url}}/v1/user/profile`
**Headers:**
```json
{
  "Authorization": "Bearer {{access_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "phoneNumber": "+1234567890",
  "address": {
    "street1": "123 Main St",
    "street2": "Apt 4B",
    "lane": "Oak Lane",
    "city": "New York",
    "state": "NY",
    "pincode": "123456"
  },
  "physicalInfo": {
    "currentWeight": 70.5,
    "currentHeight": 175.5,
    "weightUnit": "kg",
    "heightUnit": "cm"
  }
}
```

---

### 3. Get User by ID
**Method:** `GET`
**URL:** `{{base_url}}/v1/user/{user_id}`
**Headers:**
```json
{
  "Authorization": "Bearer {{access_token}}",
  "Content-Type": "application/json"
}
```
**Note:** Replace `{user_id}` with actual user ID

---

### 4. Forgot Password
**Method:** `POST`
**URL:** `{{base_url}}/v1/user/forgot-password`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "email": "user@example.com"
}
```

---

### 5. Reset Password
**Method:** `POST`
**URL:** `{{base_url}}/v1/user/reset-password`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "resetToken": "abc123def456",
  "newPassword": "newSecurePassword123"
}
```

---

### 6. Delete User Account
**Method:** `DELETE`
**URL:** `{{base_url}}/v1/user/account`
**Headers:**
```json
{
  "Authorization": "Bearer {{access_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "password": "userPassword123"
}
```

---

## 🔐 SUPER ADMIN APIs (`/v1/admin`)

### 1. Setup Initial Super Admin (One-time)
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/setup`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "username": "wellio_admin",
  "email": "admin@wellio.com",
  "password": "SecureAdminPassword123",
  "securityAnswer": "10092003"
}
```

---

### 2. Super Admin Login
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/login`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "username": "wellio_admin",
  "password": "SecureAdminPassword123"
}
```

**Post-request Script (to save admin token):**
```javascript
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.data && responseJson.data.token) {
        pm.environment.set("admin_token", responseJson.data.token);
    }
}
```

---

### 3. Get Security Question
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/security-question`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "username": "wellio_admin"
}
```

---

### 4. Recover Admin Password
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/recover-password`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "username": "wellio_admin",
  "securityAnswer": "10092003",
  "newPassword": "NewSecurePassword123"
}
```

---

### 5. Get Admin Profile
**Method:** `GET`
**URL:** `{{base_url}}/v1/admin/profile`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

### 6. Change Admin Password
**Method:** `PUT`
**URL:** `{{base_url}}/v1/admin/change-password`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "currentPassword": "CurrentPassword123",
  "newPassword": "NewSecurePassword123"
}
```

---

### 7. Admin Logout
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/logout`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

### 8. Get Active Sessions
**Method:** `GET`
**URL:** `{{base_url}}/v1/admin/sessions`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

### 9. Revoke a Session
**Method:** `DELETE`
**URL:** `{{base_url}}/v1/admin/sessions/{sessionId}`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Note:** Replace `{sessionId}` with actual session ID

---

## 🏢 COMPANY MANAGEMENT APIs

### 1. Get Company Information
**Method:** `GET`
**URL:** `{{base_url}}/v1/admin/company`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

### 2. Update Company Information
**Method:** `PUT`
**URL:** `{{base_url}}/v1/admin/company`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "name": "Wellio Diet Tracker",
  "logo": {
    "base64Image": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "imageName": "wellio-logo"
  },
  "address": {
    "street1": "123 Health Street",
    "street2": "Suite 100",
    "city": "Wellness City",
    "state": "CA",
    "pincode": "123456",
    "country": "India"
  },
  "contactInfo": {
    "phoneNumbers": [
      {
        "number": "+1234567890",
        "type": "primary",
        "label": "Main Office"
      }
    ],
    "emails": [
      {
        "email": "info@wellio.com",
        "type": "primary",
        "label": "General Inquiries"
      }
    ],
    "website": "https://www.wellio.com",
    "socialMedia": {
      "facebook": "https://facebook.com/wellio",
      "twitter": "https://twitter.com/wellio",
      "instagram": "https://instagram.com/wellio"
    }
  },
  "description": "Your trusted partner in health and nutrition tracking",
  "establishedYear": 2024,
  "industry": "Health & Wellness"
}
```

---

### 3. Upload Company Logo
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/company/logo`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "base64Image": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "imageName": "wellio-logo"
}
```

---

### 4. Remove Company Logo
**Method:** `DELETE`
**URL:** `{{base_url}}/v1/admin/company/logo`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

### 5. Add Phone Number
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/company/phone`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "number": "+1234567890",
  "type": "support",
  "label": "Customer Support"
}
```

---

### 6. Add Email
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/company/email`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "email": "support@wellio.com",
  "type": "support",
  "label": "Customer Support"
}
```

---

## 📋 POLICY MANAGEMENT APIs

### 1. Get All Policies (Admin Only)
**Method:** `GET`
**URL:** `{{base_url}}/v1/admin/policy`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

### 2. Upload Privacy Policy
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/policy/privacy-policy`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "title": "Wellio Privacy Policy",
  "content": "# Privacy Policy\n\nThis privacy policy describes how we collect, use, and protect your personal information...",
  "originalFileName": "privacy-policy.md",
  "changes": "Updated data retention policy",
  "metaDescription": "Learn how Wellio protects your privacy",
  "keywords": ["privacy", "data protection", "GDPR"]
}
```

---

### 3. Upload Terms & Conditions
**Method:** `POST`
**URL:** `{{base_url}}/v1/admin/policy/terms-conditions`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "title": "Wellio Terms & Conditions",
  "content": "# Terms & Conditions\n\nBy using Wellio services, you agree to the following terms...",
  "originalFileName": "terms-conditions.md",
  "changes": "Updated service terms",
  "metaDescription": "Terms and conditions for using Wellio",
  "keywords": ["terms", "conditions", "usage"]
}
```

---

### 4. Get Policy Stats
**Method:** `GET`
**URL:** `{{base_url}}/v1/admin/policy/stats`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

### 5. Get Policy by ID
**Method:** `GET`
**URL:** `{{base_url}}/v1/admin/policy/{policy_id}`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Note:** Replace `{policy_id}` with actual policy ID

---

### 6. Update Policy Status
**Method:** `PATCH`
**URL:** `{{base_url}}/v1/admin/policy/{policy_id}/status`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```
**Body (JSON):**
```json
{
  "status": "active"
}
```

---

### 7. Delete Policy
**Method:** `DELETE`
**URL:** `{{base_url}}/v1/admin/policy/{policy_id}`
**Headers:**
```json
{
  "Authorization": "Bearer {{admin_token}}",
  "Content-Type": "application/json"
}
```

---

## 📖 PUBLIC POLICY APIs (`/v1/policy`)

### 1. Get Privacy Policy (Public)
**Method:** `GET`
**URL:** `{{base_url}}/v1/policy/privacy-policy`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

### 2. Get Terms & Conditions (Public)
**Method:** `GET`
**URL:** `{{base_url}}/v1/policy/terms-conditions`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

## 🏢 PUBLIC COMPANY APIs (`/v1/company`)

### 1. Get Company Information (Public)
**Method:** `GET`
**URL:** `{{base_url}}/v1/company`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```
**Note:** This endpoint is publicly accessible and returns company information including logo, contact details, address, and social media links.

---

## 🔧 UTILITY ENDPOINTS

### 1. Welcome/Root Endpoint
**Method:** `GET`
**URL:** `{{base_url}}/`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

### 2. API v1 Info
**Method:** `GET`
**URL:** `{{base_url}}/v1`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

### 3. Health Check
**Method:** `GET`
**URL:** `{{base_url}}/health`
**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

---

### 4. API Documentation (Swagger)
**Method:** `GET`
**URL:** `{{base_url}}/api-docs`
**Note:** Open this in your browser to access Swagger UI

---

## 📝 Testing Workflow

### Step 1: Basic Setup
1. Test health check endpoint
2. Test welcome endpoint
3. Access Swagger documentation
4. **Test public endpoints (no auth required):**
   - Get company information
   - Get privacy policy
   - Get terms & conditions

### Step 2: User Authentication Flow
1. Signup new user
2. Login (get OTP)
3. Verify OTP (get tokens)
4. Get user profile
5. Update user profile
6. Test logout

### Step 3: Admin Setup & Management
1. Setup initial super admin (if not done)
2. Admin login
3. Get admin profile
4. Test company management
5. Test policy management

### Step 4: Password Recovery
1. Test forgot password
2. Test reset password
3. Test admin password recovery

### Step 5: Account Management
1. Test delete user account
2. Test admin session management

---

## 🚨 Important Notes

1. **Rate Limiting:** Some endpoints have rate limiting. If you get 429 errors, wait a moment before retrying.

2. **OTP Email:** Make sure your email configuration is set up in `.env` file for OTP functionality.

3. **Google OAuth:** For Google login, you need a valid Google OAuth token from the frontend.

4. **Image Upload:** For logo uploads, use base64 encoded images with proper data URL format.

5. **Environment Variables:** Ensure all required environment variables are set in your `.env` file:
   - `MONGODB_URI_DEV`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_1F_SECRET`
   - `SMTP_*` variables for email
   - `IMGBB_API_KEY` for image uploads

6. **Server:** Make sure your server is running with `npm run dev` before testing.

---

## 💡 Pro Tips for Postman

1. **Environment Setup:** Create a Postman environment with all the variables mentioned above.

2. **Pre-request Scripts:** Use pre-request scripts to automatically set authentication headers.

3. **Test Scripts:** Use the provided post-request scripts to automatically save tokens.

4. **Collection Structure:** Organize your requests into folders by functionality (Auth, User, Admin, etc.).

5. **Documentation:** Use Postman's documentation feature to save example requests and responses.

---

**Happy Testing! 🚀**