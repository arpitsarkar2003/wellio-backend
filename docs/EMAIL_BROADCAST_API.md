# Email Subscription & Broadcast API

## Overview
Production-ready email subscription and broadcast system with public subscription API and admin-only template/broadcast management.

**Base URLs:**
- Public: `/v2/subscriptions`
- Admin: `/v2/admin`

**Authentication:**
- Public subscription: No auth required
- Admin endpoints: Super admin token required (`Authorization: Bearer <token>`)

---

## Public Subscription API

### Subscribe Email
**POST** `/v2/subscriptions`

Idempotent subscription endpoint. Returns success if email already exists.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Email subscription successful",
  "data": {
    "email": "user@example.com",
    "subscribedAt": "2025-01-15T10:30:00.000Z",
    "isActive": true
  }
}
```

**Response (200 OK - Already subscribed):**
Same structure as above (idempotent behavior).

**Errors:**
- `400`: Validation error (invalid email format)
- `500`: Internal server error

---

## Admin: Email Templates

### Create Template
**POST** `/v2/admin/email-templates`

**Auth:** Super admin required

**Request:**
```json
{
  "name": "Welcome Newsletter",
  "subject": "Welcome to Wellio!",
  "htmlContent": "<html><body><h1>Welcome!</h1><p>Thank you for subscribing.</p></body></html>",
  "plainTextContent": "Welcome! Thank you for subscribing."
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Email template created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Welcome Newsletter",
    "subject": "Welcome to Wellio!",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `400`: Validation error (empty name/subject/htmlContent)
- `401`: Unauthorized (missing/invalid admin token)
- `500`: Internal server error

### Get All Templates
**GET** `/v2/admin/email-templates`

**Auth:** Super admin required

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Templates retrieved successfully",
  "data": {
    "templates": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Welcome Newsletter",
        "subject": "Welcome to Wellio!",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### Get Template by ID
**GET** `/v2/admin/email-templates/:id`

**Auth:** Super admin required

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Template retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Welcome Newsletter",
    "subject": "Welcome to Wellio!",
    "htmlContent": "<html>...</html>",
    "plainTextContent": "Welcome!",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `404`: Template not found
- `400`: Invalid template ID format

### Update Template
**PUT** `/v2/admin/email-templates/:id`

**Auth:** Super admin required

**Request:**
```json
{
  "name": "Updated Newsletter",
  "subject": "Updated Subject",
  "htmlContent": "<html>...</html>",
  "plainTextContent": "Updated text"
}
```

All fields optional. Only provided fields are updated.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Template updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Updated Newsletter",
    "subject": "Updated Subject",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

### Delete Template
**DELETE** `/v2/admin/email-templates/:id`

**Auth:** Super admin required

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Template deleted successfully"
}
```

---

## Admin: Email Broadcasts

### Create Broadcast
**POST** `/v2/admin/email-broadcasts`

**Auth:** Super admin required

Initiates async email broadcast. Returns immediately with `202 Accepted`. Poll status endpoint for progress.

**Request:**
```json
{
  "templateId": "507f1f77bcf86cd799439011",
  "batchSize": 20,
  "delayBetweenBatches": 5000
}
```

**Constraints (server-enforced):**
- `batchSize`: Max 30 (values > 30 are capped to 30)
- `delayBetweenBatches`: Min 3000ms (values < 3000 are set to 3000)

**Response (202 Accepted):**
```json
{
  "status": "success",
  "message": "Email broadcast initiated",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "status": "pending",
    "batchSize": 20,
    "delayBetweenBatches": 5000,
    "templateId": "507f1f77bcf86cd799439011"
  }
}
```

**Errors:**
- `400`: Validation error (invalid batchSize/delay, missing templateId)
- `404`: Template not found
- `401`: Unauthorized

### Get Broadcast Status
**GET** `/v2/admin/email-broadcasts/:id`

**Auth:** Super admin required

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Broadcast status retrieved",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "status": "in-progress",
    "template": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Welcome Newsletter",
      "subject": "Welcome to Wellio!"
    },
    "batchSize": 20,
    "delayBetweenBatches": 5000,
    "totalSubscribers": 150,
    "sentCount": 80,
    "failedCount": 2,
    "startedAt": "2025-01-15T10:30:00.000Z",
    "completedAt": null,
    "error": null,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Status values:**
- `pending`: Created, not started
- `in-progress`: Currently processing
- `completed`: Finished successfully
- `failed`: Failed with error

**Polling:** Poll this endpoint every 2-5 seconds to track progress.

**Errors:**
- `404`: Broadcast not found
- `400`: Invalid broadcast ID format

### Get Broadcast Metrics
**GET** `/v2/admin/email-broadcasts/:id/metrics`

**Auth:** Super admin required

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Broadcast metrics retrieved",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "status": "completed",
    "batchSize": 20,
    "delayBetweenBatches": 5000,
    "totalSubscribers": 150,
    "sentCount": 148,
    "failedCount": 2,
    "successRate": "98.67%",
    "startedAt": "2025-01-15T10:30:00.000Z",
    "completedAt": "2025-01-15T10:35:00.000Z",
    "duration": 300
  }
}
```

`duration` is in seconds. `successRate` is calculated as `(sentCount / totalSubscribers) * 100`.

### Get All Broadcasts
**GET** `/v2/admin/email-broadcasts`

**Auth:** Super admin required

Returns last 50 broadcasts, sorted by creation date (newest first).

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Broadcasts retrieved successfully",
  "data": {
    "broadcasts": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "status": "completed",
        "batchSize": 20,
        "delayBetweenBatches": 5000,
        "totalSubscribers": 150,
        "sentCount": 148,
        "failedCount": 2,
        "startedAt": "2025-01-15T10:30:00.000Z",
        "completedAt": "2025-01-15T10:35:00.000Z",
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Admin: Subscription Metrics

### Get Subscriber Count
**GET** `/v2/admin/email-subscriptions/count`

**Auth:** Super admin required

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Subscriber count retrieved",
  "data": {
    "activeSubscribers": 150,
    "totalSubscribers": 152
  }
}
```

---

## Error Responses

All errors follow this structure:

```json
{
  "status": "error",
  "message": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "data": null,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `202`: Accepted (broadcast initiated)
- `400`: Validation error / Bad request
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (not admin)
- `404`: Resource not found
- `500`: Internal server error

---

## Frontend Integration Notes

### Subscription Flow
1. User enters email → POST `/v2/subscriptions`
2. Show success message (idempotent, safe to retry)

### Admin Broadcast Flow
1. **Create Template:**
   - POST `/v2/admin/email-templates` with HTML content
   - Store template ID

2. **Initiate Broadcast:**
   - POST `/v2/admin/email-broadcasts` with templateId, batchSize (max 30), delayBetweenBatches (min 3000ms)
   - Store broadcast ID from response

3. **Poll Status:**
   - GET `/v2/admin/email-broadcasts/:id` every 2-5 seconds
   - Display: status, sentCount/totalSubscribers, progress bar
   - Stop polling when status is `completed` or `failed`

4. **View Metrics:**
   - GET `/v2/admin/email-broadcasts/:id/metrics` for success rate and duration

### Example Polling (JavaScript)
```javascript
async function pollBroadcastStatus(broadcastId) {
  const interval = setInterval(async () => {
    const response = await fetch(`/v2/admin/email-broadcasts/${broadcastId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    
    if (data.data.status === 'completed' || data.data.status === 'failed') {
      clearInterval(interval);
      // Update UI with final status
    } else {
      // Update progress bar: data.data.sentCount / data.data.totalSubscribers
    }
  }, 3000); // Poll every 3 seconds
}
```

---

## Constraints & Limits

- **Batch Size:** Maximum 30 emails per batch (server-enforced)
- **Delay:** Minimum 3 seconds (3000ms) between batches (server-enforced)
- **Email Validation:** Standard email format validation, normalized to lowercase
- **Template HTML:** Required, non-empty, validated before saving
- **Uniqueness:** Email subscriptions enforced at database level (unique index)





