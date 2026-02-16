# Water Management API - Frontend Integration Guide

**Base URL:** `/v1/water`

**Authentication:** All endpoints require `Authorization: Bearer <token>` header.

---

## Data Models

### WaterIntake
```json
{
  "_id": "string (MongoDB ObjectId)",
  "user": "string (MongoDB ObjectId, reference to User)",
  "amount": "number (required, min: 0, in ml)",
  "timestamp": "string (ISO date)",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

### WaterGoal
```json
{
  "_id": "string (MongoDB ObjectId)",
  "user": "string (MongoDB ObjectId, reference to User, unique)",
  "dailyGoal": "number (required, min: 0, default: 2000, in ml)",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

---

## Water APIs

### 1. Add Water Intake
**POST** `/v1/water/add`  
**Auth Required:** ✅

**Request Body:**
```json
{
  "amount": 250
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Water intake added successfully",
  "data": {
    "id": "67890abcdef1234567890123",
    "amount": 250,
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
    "Amount is required",
    "Amount cannot be negative"
  ],
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 2. Get Daily Water Intake
**GET** `/v1/water/daily?date=YYYY-MM-DD`  
**Auth Required:** ✅

**Query Params (optional):**
- `date` - Date in YYYY-MM-DD format (defaults to today if not provided)

**Response (200):**
```json
{
  "status": "success",
  "message": "Daily water intake retrieved successfully",
  "data": {
    "goal": 2000,
    "total": 750,
    "entries": [
      {
        "id": "67890abcdef1234567890123",
        "amount": 250,
        "timestamp": "2024-01-20T08:00:00.000Z",
        "createdAt": "2024-01-20T08:00:00.000Z"
      },
      {
        "id": "67890abcdef1234567890124",
        "amount": 300,
        "timestamp": "2024-01-20T10:30:00.000Z",
        "createdAt": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "67890abcdef1234567890125",
        "amount": 200,
        "timestamp": "2024-01-20T14:15:00.000Z",
        "createdAt": "2024-01-20T14:15:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (400) - Invalid date format:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    "Date must be in YYYY-MM-DD format"
  ],
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 3. Update Water Goal
**PUT** `/v1/water/goal`  
**Auth Required:** ✅

**Request Body:**
```json
{
  "dailyGoal": 2500
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Water goal updated successfully",
  "data": {
    "userId": "67890abcdef1234567890126",
    "dailyGoal": 2500,
    "updatedAt": "2024-01-20T12:00:00.000Z"
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
    "Daily goal is required",
    "Daily goal cannot be negative"
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

