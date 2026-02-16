# Supplement Management API - Frontend Integration Guide

**Base URL:** `/v1/supplements`

**Authentication:** All endpoints require `Authorization: Bearer <token>` header.

---

## Data Models

### Supplement
```json
{
  "_id": "string (MongoDB ObjectId)",
  "user": "string (MongoDB ObjectId, reference to User)",
  "name": "string (required)",
  "time": "string (required, HH:MM format, e.g., '09:00')",
  "days": ["string array (required, valid values: Mon, Tue, Wed, Thu, Fri, Sat, Sun)"],
  "notes": "string (optional)",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

### SupplementLog
```json
{
  "_id": "string (MongoDB ObjectId)",
  "user": "string (MongoDB ObjectId, reference to User)",
  "supplementId": "string (MongoDB ObjectId, reference to Supplement)",
  "status": "string (required, enum: 'taken' or 'skipped')",
  "timestamp": "string (ISO date)",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

---

## Supplement APIs

### 1. Create Supplement Schedule
**POST** `/v1/supplements`  
**Auth Required:** ✅

**Request Body:**
```json
{
  "name": "Vitamin D",
  "time": "09:00",
  "days": ["Mon", "Wed", "Fri"],
  "notes": "Take with breakfast"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Supplement schedule created successfully",
  "data": {
    "id": "67890abcdef1234567890123",
    "name": "Vitamin D",
    "time": "09:00",
    "days": ["Mon", "Wed", "Fri"],
    "notes": "Take with breakfast",
    "createdAt": "2024-01-20T12:00:00.000Z"
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (400) - Validation:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    "Name is required",
    "Time is required",
    "Days are required",
    "Time must be in HH:MM format",
    "Days must be valid day abbreviations (Mon, Tue, Wed, Thu, Fri, Sat, Sun)"
  ],
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 2. Get All Supplements
**GET** `/v1/supplements`  
**Auth Required:** ✅

**Response (200):**
```json
{
  "status": "success",
  "message": "Supplements retrieved successfully",
  "data": {
    "supplements": [
      {
        "id": "67890abcdef1234567890123",
        "name": "Vitamin D",
        "time": "09:00",
        "days": ["Mon", "Wed", "Fri"],
        "notes": "Take with breakfast",
        "createdAt": "2024-01-20T12:00:00.000Z",
        "updatedAt": "2024-01-20T12:00:00.000Z"
      },
      {
        "id": "67890abcdef1234567890124",
        "name": "Omega-3",
        "time": "18:00",
        "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "notes": "Take with dinner",
        "createdAt": "2024-01-20T12:00:00.000Z",
        "updatedAt": "2024-01-20T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Response (200) - No supplements:**
```json
{
  "status": "success",
  "message": "Supplements retrieved successfully",
  "data": {
    "supplements": []
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 3. Update Supplement Schedule
**PUT** `/v1/supplements/:id`  
**Auth Required:** ✅

**Path Params:**
- `id` - Supplement ID

**Request Body (all fields optional):**
```json
{
  "name": "Vitamin D3",
  "time": "10:00",
  "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "notes": "Take with breakfast, updated dosage"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Supplement updated successfully",
  "data": {
    "id": "67890abcdef1234567890123",
    "name": "Vitamin D3",
    "time": "10:00",
    "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "notes": "Take with breakfast, updated dosage",
    "updatedAt": "2024-01-20T12:05:00.000Z"
  },
  "timestamp": "2024-01-20T12:05:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Supplement not found or access denied",
  "data": null,
  "timestamp": "2024-01-20T12:05:00.000Z"
}
```

**Error (400) - Validation:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    "Time must be in HH:MM format",
    "Days must be valid day abbreviations"
  ],
  "data": null,
  "timestamp": "2024-01-20T12:05:00.000Z"
}
```

---

### 4. Delete Supplement Schedule
**DELETE** `/v1/supplements/:id`  
**Auth Required:** ✅

**Path Params:**
- `id` - Supplement ID

**Response (200):**
```json
{
  "status": "success",
  "message": "Supplement deleted successfully",
  "data": null,
  "timestamp": "2024-01-20T12:06:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Supplement not found",
  "data": null,
  "timestamp": "2024-01-20T12:06:00.000Z"
}
```

---

### 5. Log Supplement Intake
**POST** `/v1/supplements/log`  
**Auth Required:** ✅

**Request Body:**
```json
{
  "supplementId": "67890abcdef1234567890123",
  "status": "taken"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Supplement logged successfully",
  "data": {
    "id": "67890abcdef1234567890125",
    "supplementId": "67890abcdef1234567890123",
    "status": "taken",
    "timestamp": "2024-01-20T12:00:00.000Z",
    "createdAt": "2024-01-20T12:00:00.000Z"
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Request Body - Skipped:**
```json
{
  "supplementId": "67890abcdef1234567890123",
  "status": "skipped"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Supplement logged successfully",
  "data": {
    "id": "67890abcdef1234567890126",
    "supplementId": "67890abcdef1234567890123",
    "status": "skipped",
    "timestamp": "2024-01-20T12:00:00.000Z",
    "createdAt": "2024-01-20T12:00:00.000Z"
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (400) - Validation:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    "Supplement ID is required",
    "Status is required",
    "Status must be either 'taken' or 'skipped'"
  ],
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Supplement not found",
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 6. Get Supplement Logs
**GET** `/v1/supplements/logs?month=YYYY-MM`  
**Auth Required:** ✅

**Query Params (optional):**
- `month` - Month in YYYY-MM format (defaults to current month if not provided)

**Response (200):**
```json
{
  "status": "success",
  "message": "Supplement logs retrieved successfully",
  "data": {
    "logs": [
      {
        "date": "2024-01-20",
        "logs": [
          {
            "id": "67890abcdef1234567890125",
            "supplementId": "67890abcdef1234567890123",
            "supplementName": "Vitamin D",
            "status": "taken",
            "timestamp": "2024-01-20T09:00:00.000Z",
            "createdAt": "2024-01-20T09:00:00.000Z"
          },
          {
            "id": "67890abcdef1234567890127",
            "supplementId": "67890abcdef1234567890124",
            "supplementName": "Omega-3",
            "status": "taken",
            "timestamp": "2024-01-20T18:00:00.000Z",
            "createdAt": "2024-01-20T18:00:00.000Z"
          }
        ]
      },
      {
        "date": "2024-01-19",
        "logs": [
          {
            "id": "67890abcdef1234567890128",
            "supplementId": "67890abcdef1234567890123",
            "supplementName": "Vitamin D",
            "status": "skipped",
            "timestamp": "2024-01-19T09:00:00.000Z",
            "createdAt": "2024-01-19T09:00:00.000Z"
          }
        ]
      }
    ]
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Response (200) - No logs:**
```json
{
  "status": "success",
  "message": "Supplement logs retrieved successfully",
  "data": {
    "logs": []
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (400) - Invalid month format:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    "Month must be in YYYY-MM format"
  ],
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

## Common Error Responses

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "Unauthorized access",
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Failed to [operation]",
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

