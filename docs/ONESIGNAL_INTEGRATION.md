# OneSignal Push Notifications Integration

This document describes the OneSignal push notification integration for the Wellio backend.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
```

## Getting OneSignal Credentials

1. Sign up for a OneSignal account at https://onesignal.com
2. Create a new app
3. Go to Settings > Keys & IDs
4. Copy your **App ID** and **REST API Key**

## API Endpoints

### 1. Save Push Token

**POST** `/v1/push/save-push-token`

Save or update a push notification token for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "12345678-1234-1234-1234-123456789abc",
  "deviceType": "web",
  "deviceInfo": {
    "browser": "Chrome",
    "os": "Windows",
    "deviceModel": "Desktop",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Device Types:**
- `web` - Web browser
- `ios` - iOS device
- `android` - Android device

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Push token saved successfully",
  "data": {
    "pushToken": {
      "id": "507f1f77bcf86cd799439011",
      "token": "12345678-1234-1234...",
      "deviceType": "web",
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 2. Send Notification

**POST** `/v1/push/send-notification`

Send a push notification to a specific token or user.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (Send to specific token):**
```json
{
  "token": "12345678-1234-1234-1234-123456789abc",
  "title": "New Message",
  "body": "You have a new message from John",
  "data": {
    "type": "message",
    "messageId": "12345",
    "senderId": "67890"
  },
  "deviceType": "web"
}
```

**Request Body (Send to user by userId):**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "title": "Diet Plan Updated",
  "body": "Your weekly diet plan has been updated",
  "data": {
    "type": "diet_plan",
    "planId": "507f1f77bcf86cd799439012"
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Push notification sent successfully",
  "data": {
    "oneSignalId": "notification-id-from-onesignal",
    "recipients": 1,
    "tokensSent": 1
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 3. Get User Push Tokens

**GET** `/v1/push/tokens`

Get all active push tokens for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Push tokens retrieved successfully",
  "data": {
    "tokens": [
      {
        "id": "507f1f77bcf86cd799439011",
        "token": "12345678-1234-1234...",
        "deviceType": "web",
        "deviceInfo": {
          "browser": "Chrome",
          "os": "Windows"
        },
        "isActive": true,
        "lastUsed": "2025-01-15T10:30:00.000Z",
        "createdAt": "2025-01-15T09:00:00.000Z"
      }
    ],
    "count": 1
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 4. Delete Push Token

**DELETE** `/v1/push/tokens/:tokenId`

Deactivate a push token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Push token deactivated successfully",
  "data": null,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Using the Push Service Directly

You can also use the `PushService` directly in your code:

```javascript
const PushService = require('./src/services/pushService');

// Send to a single token
const result = await PushService.sendPush(
  'player-id-or-token',
  'Notification Title',
  'Notification body message',
  { customData: 'value' }, // Optional data payload
  'web' // Device type: 'web', 'ios', or 'android'
);

if (result.success) {
  console.log('Notification sent:', result.oneSignalId);
} else {
  console.error('Failed to send:', result.error);
}

// Send to multiple tokens
const tokens = ['token1', 'token2', 'token3'];
const result = await PushService.sendPushToMultiple(
  tokens,
  'Title',
  'Body',
  { data: 'value' },
  'web'
);

// Send broadcast to all users
const result = await PushService.sendPushToAll(
  'Title',
  'Body',
  { data: 'value' },
  ['Active Users'] // Optional segments
);
```

## Example Payloads

### Basic Notification
```json
{
  "token": "player-id",
  "title": "Welcome!",
  "body": "Thanks for joining Wellio",
  "deviceType": "web"
}
```

### Notification with Data
```json
{
  "token": "player-id",
  "title": "New Diet Plan",
  "body": "Your weekly diet plan is ready",
  "data": {
    "type": "diet_plan",
    "planId": "507f1f77bcf86cd799439012",
    "action": "view_plan",
    "url": "/diet-plans/507f1f77bcf86cd799439012"
  },
  "deviceType": "web"
}
```

### Notification to User
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "title": "Reminder",
  "body": "Don't forget to log your meals today!",
  "data": {
    "type": "reminder",
    "category": "meal_logging"
  }
}
```

## Frontend Integration

### Web (JavaScript)

```javascript
// Initialize OneSignal
OneSignal.init({
  appId: "YOUR_ONESIGNAL_APP_ID"
});

// Get player ID
OneSignal.getUserId().then(userId => {
  // Save token to backend
  fetch('/v1/push/save-push-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: userId,
      deviceType: 'web',
      deviceInfo: {
        browser: navigator.userAgentData?.brands?.[0]?.brand || 'Unknown',
        os: navigator.platform,
        userAgent: navigator.userAgent
      }
    })
  });
});
```

### iOS (Swift)

```swift
// After getting OneSignal player ID
let playerId = OneSignal.getDeviceState().userId

// Save to backend
let url = URL(string: "https://your-api.com/v1/push/save-push-token")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let body: [String: Any] = [
    "token": playerId,
    "deviceType": "ios",
    "deviceInfo": [
        "deviceModel": UIDevice.current.model,
        "os": UIDevice.current.systemVersion
    ]
]

request.httpBody = try? JSONSerialization.data(withJSONObject: body)
```

### Android (Kotlin)

```kotlin
// After getting OneSignal player ID
val playerId = OneSignal.getDeviceState().userId

// Save to backend
val url = "https://your-api.com/v1/push/save-push-token"
val request = Request.Builder()
    .url(url)
    .post(jsonBody)
    .addHeader("Authorization", "Bearer $accessToken")
    .addHeader("Content-Type", "application/json")
    .build()

val body = json {
    "token" to playerId
    "deviceType" to "android"
    "deviceInfo" to json {
        "deviceModel" to Build.MODEL
        "os" to Build.VERSION.RELEASE
    }
}
```

## Logging

The push service logs all notification attempts:

- ✅ Success: Logs token (partial), title, body, device type, and OneSignal response ID
- ❌ Failure: Logs error details, status code, and OneSignal error response

Check your server logs for detailed information about notification delivery.

## Error Handling

The service handles various error scenarios:

- **Configuration Missing**: Returns error if OneSignal credentials are not set
- **Invalid Token**: OneSignal API returns error for invalid player IDs
- **Network Errors**: Handles network timeouts and connection issues
- **Validation Errors**: Validates required fields before sending

## Notes

- Tokens are stored with device type to support web, iOS, and Android
- Multiple tokens per user are supported (one per device)
- Tokens are automatically updated if the same token is saved again
- The `lastUsed` timestamp is updated when notifications are sent
- Partial tokens are returned in API responses for security

