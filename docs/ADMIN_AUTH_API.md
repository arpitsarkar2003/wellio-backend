# Admin Authentication API Documentation

This document provides a simple guide for frontend developers to integrate admin authentication APIs.

---

## 🔐 Authentication Flow Overview

The admin authentication system uses **Access Tokens** and **Refresh Tokens**:

- **Access Token**: Used for authenticated API requests. Expires in 1 hour (default).
- **Refresh Token**: Used to get new access tokens when they expire. Expires in 6 hours (default).

**Important**: Store both tokens securely. The access token should be sent in the `Authorization` header for protected endpoints.

---

## 📋 API Endpoints

### 1. Admin Login

**Endpoint**: `POST /v1/admin/login`

**Description**: Authenticate admin and receive access & refresh tokens.

**Request Body**:
```json
{
  "username": "your_admin_username",
  "password": "your_password"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "admin": {
      "id": "admin_id",
      "username": "admin_username",
      "email": "admin@example.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": "1h"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- **400**: Invalid credentials
- **403**: Account is disabled
- **423**: Account is locked (too many failed attempts)

---

### 2. Get Admin Profile

**Endpoint**: `GET /v1/admin/profile`

**Description**: Get the authenticated admin's profile information.

**Headers Required**:
```
Authorization: Bearer <access_token>
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Profile retrieved successfully",
  "data": {
    "admin": {
      "id": "admin_id",
      "username": "admin_username",
      "email": "admin@example.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- **401**: Invalid or expired access token

---

### 3. Change Password

**Endpoint**: `PUT /v1/admin/change-password`

**Description**: Change the admin's password (requires current password).

**Headers Required**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_secure_password"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Password changed successfully",
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- **400**: Current password is incorrect
- **401**: Invalid or expired access token

---

### 4. Get Security Question (Password Recovery)

**Endpoint**: `POST /v1/admin/security-question`

**Description**: Get the security question for password recovery. This is the first step in password reset flow.

**Request Body**:
```json
{
  "username": "your_admin_username"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Security question retrieved",
  "data": {
    "question": "Hi, what is your bday?"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Note**: The security question is always returned (even if username doesn't exist) for security reasons.

---

### 5. Recover Password (Password Reset)

**Endpoint**: `POST /v1/admin/recover-password`

**Description**: Reset admin password using security question answer. This is the second step in password reset flow.

**Request Body**:
```json
{
  "username": "your_admin_username",
  "securityAnswer": "your_security_answer",
  "newPassword": "new_secure_password"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Password has been reset successfully",
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- **400**: Invalid security answer
- **404**: Admin not found

**Note**: After successful password reset, any account lockouts are cleared and login attempts are reset.

---

### 6. Admin Logout

**Endpoint**: `POST /v1/admin/logout`

**Description**: Logout and invalidate the current session.

**Headers Required**:
```
Authorization: Bearer <access_token>
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Logged out successfully",
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- **401**: Invalid or expired access token

---

### 7. Get Active Sessions

**Endpoint**: `GET /v1/admin/sessions`

**Description**: Get list of all active admin sessions.

**Headers Required**:
```
Authorization: Bearer <access_token>
```

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Active sessions retrieved",
  "data": {
    "sessions": [
      {
        "id": "session_id",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "expiresAt": "2024-01-01T01:00:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 8. Revoke Session

**Endpoint**: `DELETE /v1/admin/sessions/:sessionId`

**Description**: Revoke a specific active session.

**Headers Required**:
```
Authorization: Bearer <access_token>
```

**URL Parameters**:
- `sessionId`: The ID of the session to revoke

**Success Response** (200):
```json
{
  "status": "success",
  "message": "Session revoked successfully",
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🚀 Frontend Integration Steps

### Step 1: Login Flow

1. **User enters credentials** (username and password)
2. **Send POST request** to `/v1/admin/login` with credentials
3. **On success**, store both tokens securely:
   - Store `accessToken` (used for API requests)
   - Store `refreshToken` (used to refresh access token)
4. **Set default Authorization header** for all subsequent requests:
   ```
   Authorization: Bearer <access_token>
   ```

### Step 2: Making Authenticated Requests

For all protected endpoints, include the access token in the request header:

```
Authorization: Bearer <access_token>
```

### Step 3: Handling Token Expiration

When you receive a **401 Unauthorized** response:

1. **Check if you have a refresh token** stored
2. **If yes**, use the refresh token endpoint (if available) or redirect to login
3. **If no refresh token**, redirect user to login page

**Note**: Currently, the refresh token endpoint may need to be implemented. For now, when access token expires, redirect to login.

### Step 4: Password Recovery Flow

If admin forgets their password:

1. **Get Security Question**: Send POST request to `/v1/admin/security-question` with username
2. **Display the security question** to the user
3. **User enters security answer** and new password
4. **Reset Password**: Send POST request to `/v1/admin/recover-password` with:
   - `username`
   - `securityAnswer`
   - `newPassword`
5. **On success**, redirect user to login page

### Step 5: Logout Flow

1. **Send POST request** to `/v1/admin/logout` with access token in header
2. **Clear stored tokens** from local storage/session
3. **Redirect user** to login page

---

## 🔑 Token Management Best Practices

1. **Storage**: Store tokens securely (use secure storage, avoid localStorage for sensitive apps)
2. **Expiration**: Access tokens expire in 1 hour. Plan to refresh or re-authenticate before expiry
3. **Security**: Never expose tokens in URLs or logs
4. **Headers**: Always use `Bearer` prefix in Authorization header: `Bearer <token>`

---

## ⚠️ Error Handling

### Common Error Codes:

- **400**: Bad Request (invalid input, wrong credentials)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (account disabled)
- **423**: Locked (account locked due to failed attempts)
- **500**: Internal Server Error

### Error Response Format:
```json
{
  "status": "error",
  "message": "Error message here",
  "errors": ["Additional error details"],
  "data": null,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 📝 Notes

- **Account Lockout**: After 5 failed login attempts, the account is locked for 30 minutes
- **Session Management**: Each login creates a new session. You can view and revoke sessions via the sessions endpoints
- **Password Requirements**: Minimum 8 characters (check validation for exact requirements)
- **Password Recovery**: Uses security question (birthday) for password reset. No authentication required for recovery endpoints
- **Base URL**: Replace with your actual API base URL (e.g., `https://api.example.com`)

---

## 🔄 Complete Authentication Flow Example

1. **Login** → Receive `accessToken` and `refreshToken`
2. **Store tokens** securely
3. **Use accessToken** for all API requests (add to Authorization header)
4. **When accessToken expires** → Use refreshToken to get new tokens (or redirect to login)
5. **Logout** → Call logout endpoint and clear tokens

---

**Last Updated**: 2024

