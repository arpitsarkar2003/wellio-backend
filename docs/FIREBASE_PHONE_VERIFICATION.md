# Firebase Phone Number Verification Integration

This document describes the Firebase phone number verification integration for the Wellio backend.

## Overview

The backend now supports Firebase phone number verification, allowing users to verify their phone numbers using Firebase Authentication. Once verified, the phone number is stored in the user's profile and marked as verified.

## Setup

### 1. Install Dependencies

The Firebase Admin SDK has been added to `package.json`. Install it by running:

```bash
npm install
```

### 2. Firebase Service Account Configuration

You need to set up a Firebase service account to enable phone verification. There are two ways to configure it:

#### Option A: JSON File Path (Recommended for Development)

1. Download your Firebase service account JSON file from the Firebase Console:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

2. Add to your `.env` file:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/service-account-key.json
   ```

#### Option B: JSON String (Recommended for Production)

1. Convert your service account JSON to a single-line string and add to `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
   ```

**Important:** Never commit service account keys to version control. Use environment variables or secure secret management.

### 3. Required Environment Variables

Add to your `.env` file:

```env
# Choose one of the following:
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json
# OR
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

## API Endpoint

### Verify Phone Token

**POST** `/v1/auth/verify-phone-token`

Verifies a Firebase phone authentication ID token and updates the user's phone number.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNDI3..."
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Phone number verified successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "phoneNumber": "+1234567890",
      "isPhoneVerified": true,
      "isVerified": true,
      "isProfileCompleted": false,
      ...
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Responses:**

- **400 Bad Request**: Validation error or phone number not found in token
- **401 Unauthorized**: 
  - Invalid Firebase ID token
  - Expired Firebase ID token (with message: "Firebase ID token has expired. Please request a new verification code.")
  - Revoked Firebase ID token
- **404 Not Found**: User not found
- **500 Internal Server Error**: Firebase service not configured or internal error

## User Schema Updates

The User model now includes:

- `phoneNumber` (String): User's verified phone number
- `isPhoneVerified` (Boolean): Whether the phone number has been verified (default: false)

These fields are automatically included in:
- `user.fullProfile` - Full user profile
- `user.basicProfile` - Basic profile for auth responses
- Login responses (via `fullProfile`)

## Frontend Integration

### 1. Initialize Firebase on Frontend

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
```

### 2. Send Verification Code

```javascript
const phoneNumber = '+1234567890'; // User's phone number

// Create reCAPTCHA verifier
const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'invisible',
  'callback': (response) => {
    // reCAPTCHA solved
  }
});

// Send verification code
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);

// Store confirmationResult for later use
window.confirmationResult = confirmationResult;
```

### 3. Verify Code and Get ID Token

```javascript
// User enters the code they received
const code = '123456'; // 6-digit code from SMS

// Verify the code
const result = await window.confirmationResult.confirm(code);

// Get Firebase ID token
const idToken = await result.user.getIdToken();
```

### 4. Send ID Token to Backend

```javascript
// Send to your backend
const response = await fetch('/v1/auth/verify-phone-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`, // Your app's JWT token
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    idToken: idToken
  })
});

const data = await response.json();

if (data.status === 'success') {
  console.log('Phone verified!', data.data.user);
  // Update user state with verified phone number
}
```

## Error Handling

### Expired Token

If the Firebase ID token has expired, the backend returns:

```json
{
  "status": "error",
  "message": "Firebase ID token has expired. Please request a new verification code.",
  "errors": null,
  "data": null,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Solution:** Request a new verification code from Firebase and have the user verify again.

### Invalid Token

If the token is invalid or malformed:

```json
{
  "status": "error",
  "message": "Invalid Firebase ID token format",
  "errors": null,
  "data": null,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Solution:** Ensure the token is correctly obtained from Firebase and sent to the backend.

### Phone Number Not Found

If the Firebase token doesn't contain a phone number:

```json
{
  "status": "error",
  "message": "Phone number not found in Firebase token",
  "errors": null,
  "data": null,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Solution:** Ensure the user authenticated using phone number authentication, not email or other methods.

## Security Considerations

1. **Service Account Security**: Never commit service account keys to version control. Use environment variables or secure secret management services.

2. **Token Expiration**: Firebase ID tokens expire after 1 hour. Handle expired tokens gracefully by requesting new verification codes.

3. **Authentication Required**: The `/verify-phone-token` endpoint requires a valid JWT access token, ensuring only authenticated users can verify phone numbers.

4. **Phone Number Validation**: Phone numbers are validated using E.164 format (e.g., +1234567890).

## Testing

### Test with cURL

```bash
# Replace with your actual tokens
curl -X POST http://localhost:8080/v1/auth/verify-phone-token \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_FIREBASE_ID_TOKEN"
  }'
```

### Test Expired Token

To test expired token handling, use an old Firebase ID token (older than 1 hour) or modify the token to be invalid.

## Notes

- The phone number is extracted from the Firebase token's `firebase.identities.phone` array or `phone_number` field.
- Once verified, `isPhoneVerified` is set to `true` and cannot be automatically reverted (manual update required).
- The phone number is stored at the root level of the User model, separate from the `profile.phoneNumber` field (which is for profile information).
- The login flow automatically returns `isPhoneVerified` in the user profile since it uses `user.fullProfile`.


