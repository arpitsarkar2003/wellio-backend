# Diet Management API - Frontend Integration Guide

**Base URL:** `/v1/diet-plans`

**Authentication:** Most endpoints require `Authorization: Bearer <token>` header (except template listing and getting template by ID).

---

## Data Models

### FoodItem
```json
{
  "_id": "string (MongoDB ObjectId)",
  "name": "string (required)",
  "estimatedCalories": "number (required, min: 0)",
  "notes": "string (optional)"
}
```

### Meal
```json
{
  "_id": "string (MongoDB ObjectId)",
  "mealName": "string (required, e.g., Breakfast, Lunch, Snack)",
  "time": "string (required, HH:MM format, e.g., '08:00')",
  "items": ["FoodItem array"],
  "preparationNotes": "string (optional)"
}
```

### DaySchedule
```json
{
  "day": "string (required, one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)",
  "meals": ["Meal array"]
}
```

### DietPlan
```json
{
  "_id": "string (MongoDB ObjectId)",
  "user": "string (MongoDB ObjectId, reference to User)",
  "weekSchedule": ["DaySchedule array"],
  "isActive": "boolean (default: true)",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

### DietTemplate
```json
{
  "_id": "string (MongoDB ObjectId)",
  "name": "string (required)",
  "description": "string (optional)",
  "goal": "string (required, one of: weight_loss, muscle_gain, balanced, keto, vegan)",
  "weekSchedule": ["DaySchedule array (must have exactly 7 unique days)"],
  "createdBy": "string (MongoDB ObjectId, reference to SuperAdmin)",
  "isDefault": "boolean (default: false)",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```

---

## Diet Templates APIs

### 1. Get All Templates
**GET** `/v1/diet-plans/templates`

**Query Params (optional):**
- `goal` - Filter by goal type (weight_loss, muscle_gain, balanced, keto, vegan)

**Response (200):**
```json
{
  "status": "success",
  "message": "Templates retrieved successfully",
  "data": [
    {
      "_id": "67890abcdef1234567890123",
      "name": "Weight Loss Plan",
      "description": "A balanced diet plan for weight loss",
      "goal": "weight_loss",
      "weekSchedule": [
        {
          "day": "Monday",
          "meals": [
            {
              "_id": "67890abcdef1234567890124",
              "mealName": "Breakfast",
              "time": "08:00",
              "items": [
                {
                  "_id": "67890abcdef1234567890125",
                  "name": "Oatmeal",
                  "estimatedCalories": 300,
                  "notes": "With fruits"
                }
              ],
              "preparationNotes": "Cook for 5 minutes"
            }
          ]
        }
      ],
      "createdBy": "67890abcdef1234567890126",
      "isDefault": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 2. Get Template by ID
**GET** `/v1/diet-plans/templates/:templateId`

**Response (200):**
```json
{
  "status": "success",
  "message": "Template retrieved successfully",
  "data": {
    "_id": "67890abcdef1234567890123",
    "name": "Weight Loss Plan",
    "description": "A balanced diet plan for weight loss",
    "goal": "weight_loss",
    "weekSchedule": [
      {
        "day": "Monday",
        "meals": [
          {
            "_id": "67890abcdef1234567890124",
            "mealName": "Breakfast",
            "time": "08:00",
            "items": [
              {
                "_id": "67890abcdef1234567890125",
                "name": "Oatmeal",
                "estimatedCalories": 300,
                "notes": "With fruits"
              }
            ],
            "preparationNotes": "Cook for 5 minutes"
          }
        ]
      }
    ],
    "createdBy": "67890abcdef1234567890126",
    "isDefault": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Template not found",
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 3. Apply Template (Create Diet Plan from Template)
**POST** `/v1/diet-plans/templates/apply`  
**Auth Required:** ✅

**Request Body:**
```json
{
  "templateId": "67890abcdef1234567890123"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Template applied successfully",
  "data": {
    "_id": "67890abcdef1234567890127",
    "user": "67890abcdef1234567890128",
    "weekSchedule": [
      {
        "day": "Monday",
        "meals": [
          {
            "_id": "67890abcdef1234567890129",
            "mealName": "Breakfast",
            "time": "08:00",
            "items": [
              {
                "_id": "67890abcdef1234567890130",
                "name": "Oatmeal",
                "estimatedCalories": 300,
                "notes": "With fruits"
              }
            ],
            "preparationNotes": "Cook for 5 minutes"
          }
        ]
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-01-20T12:00:00.000Z"
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Template not found",
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

## Diet Plans APIs

### 4. Create Diet Plan
**POST** `/v1/diet-plans`  
**Auth Required:** ✅

**Request Body:**
```json
{
  "weekSchedule": [
    {
      "day": "Monday",
      "meals": [
        {
          "mealName": "Breakfast",
          "time": "08:00",
          "items": [
            {
              "name": "Oatmeal",
              "estimatedCalories": 300,
              "notes": "With fruits"
            }
          ],
          "preparationNotes": "Cook for 5 minutes"
        },
        {
          "mealName": "Lunch",
          "time": "13:00",
          "items": [
            {
              "name": "Grilled Chicken",
              "estimatedCalories": 250,
              "notes": "With vegetables"
            }
          ]
        }
      ]
    },
    {
      "day": "Tuesday",
      "meals": []
    }
  ]
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Diet plan created successfully",
  "data": {
    "_id": "67890abcdef1234567890127",
    "user": "67890abcdef1234567890128",
    "weekSchedule": [
      {
        "day": "Monday",
        "meals": [
          {
            "_id": "67890abcdef1234567890129",
            "mealName": "Breakfast",
            "time": "08:00",
            "items": [
              {
                "_id": "67890abcdef1234567890130",
                "name": "Oatmeal",
                "estimatedCalories": 300,
                "notes": "With fruits"
              }
            ],
            "preparationNotes": "Cook for 5 minutes"
          },
          {
            "_id": "67890abcdef1234567890131",
            "mealName": "Lunch",
            "time": "13:00",
            "items": [
              {
                "_id": "67890abcdef1234567890132",
                "name": "Grilled Chicken",
                "estimatedCalories": 250,
                "notes": "With vegetables"
              }
            ],
            "preparationNotes": null
          }
        ]
      },
      {
        "day": "Tuesday",
        "meals": []
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-20T12:00:00.000Z",
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
    "Week schedule must contain unique days"
  ],
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 5. Get Active Diet Plan
**GET** `/v1/diet-plans`  
**Auth Required:** ✅

**Response (200) - Plan exists:**
```json
{
  "status": "success",
  "message": "Diet plan retrieved successfully",
  "data": {
    "_id": "67890abcdef1234567890127",
    "user": "67890abcdef1234567890128",
    "weekSchedule": [
      {
        "day": "Monday",
        "meals": [
          {
            "_id": "67890abcdef1234567890129",
            "mealName": "Breakfast",
            "time": "08:00",
            "items": [
              {
                "_id": "67890abcdef1234567890130",
                "name": "Oatmeal",
                "estimatedCalories": 300,
                "notes": "With fruits"
              }
            ],
            "preparationNotes": "Cook for 5 minutes"
          }
        ]
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-01-20T12:00:00.000Z"
  },
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Response (200) - No plan:**
```json
{
  "status": "success",
  "message": "No active diet plan found",
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 6. Get Daily Meals
**GET** `/v1/diet-plans/day/:dayName`  
**Auth Required:** ✅

**Path Params:**
- `dayName` - Day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)

**Response (200) - Meals found:**
```json
{
  "status": "success",
  "message": "Meals for Monday retrieved successfully",
  "data": [
    {
      "_id": "67890abcdef1234567890129",
      "mealName": "Breakfast",
      "time": "08:00",
      "items": [
        {
          "_id": "67890abcdef1234567890130",
          "name": "Oatmeal",
          "estimatedCalories": 300,
          "notes": "With fruits"
        }
      ],
      "preparationNotes": "Cook for 5 minutes"
    },
    {
      "_id": "67890abcdef1234567890131",
      "mealName": "Lunch",
      "time": "13:00",
      "items": [
        {
          "_id": "67890abcdef1234567890132",
          "name": "Grilled Chicken",
          "estimatedCalories": 250,
          "notes": "With vegetables"
        }
      ],
      "preparationNotes": null
    }
  ],
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Response (200) - No active plan:**
```json
{
  "status": "success",
  "message": "No active diet plan found",
  "data": [],
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

**Error (400):**
```json
{
  "status": "error",
  "message": "Invalid day name",
  "data": null,
  "timestamp": "2024-01-20T12:00:00.000Z"
}
```

---

### 7. Update Diet Plan
**PUT** `/v1/diet-plans/:planId`  
**Auth Required:** ✅

**Path Params:**
- `planId` - Diet plan ID

**Request Body:**
```json
{
  "weekSchedule": [
    {
      "day": "Monday",
      "meals": [
        {
          "mealName": "Breakfast",
          "time": "09:00",
          "items": [
            {
              "name": "Scrambled Eggs",
              "estimatedCalories": 200,
              "notes": "With toast"
            }
          ]
        }
      ]
    }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Diet plan updated successfully",
  "data": {
    "_id": "67890abcdef1234567890127",
    "user": "67890abcdef1234567890128",
    "weekSchedule": [
      {
        "day": "Monday",
        "meals": [
          {
            "_id": "67890abcdef1234567890133",
            "mealName": "Breakfast",
            "time": "09:00",
            "items": [
              {
                "_id": "67890abcdef1234567890134",
                "name": "Scrambled Eggs",
                "estimatedCalories": 200,
                "notes": "With toast"
              }
            ],
            "preparationNotes": null
          }
        ]
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-01-20T12:05:00.000Z"
  },
  "timestamp": "2024-01-20T12:05:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Diet plan not found or access denied",
  "data": null,
  "timestamp": "2024-01-20T12:05:00.000Z"
}
```

---

### 8. Update Specific Meal
**PATCH** `/v1/diet-plans/:planId/meal/:mealId`  
**Auth Required:** ✅

**Path Params:**
- `planId` - Diet plan ID
- `mealId` - Meal ID

**Request Body (all fields optional):**
```json
{
  "mealName": "Brunch",
  "time": "10:30",
  "items": [
    {
      "name": "Pancakes",
      "estimatedCalories": 350,
      "notes": "With syrup"
    }
  ],
  "preparationNotes": "Flip when bubbles form"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Meal updated successfully",
  "data": {
    "_id": "67890abcdef1234567890127",
    "user": "67890abcdef1234567890128",
    "weekSchedule": [
      {
        "day": "Monday",
        "meals": [
          {
            "_id": "67890abcdef1234567890129",
            "mealName": "Brunch",
            "time": "10:30",
            "items": [
              {
                "_id": "67890abcdef1234567890135",
                "name": "Pancakes",
                "estimatedCalories": 350,
                "notes": "With syrup"
              }
            ],
            "preparationNotes": "Flip when bubbles form"
          }
        ]
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-01-20T12:06:00.000Z"
  },
  "timestamp": "2024-01-20T12:06:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Diet plan or meal not found",
  "data": null,
  "timestamp": "2024-01-20T12:06:00.000Z"
}
```

---

### 9. Delete Diet Plan
**DELETE** `/v1/diet-plans/:planId`  
**Auth Required:** ✅

**Path Params:**
- `planId` - Diet plan ID

**Response (200):**
```json
{
  "status": "success",
  "message": "Diet plan deleted successfully",
  "data": null,
  "timestamp": "2024-01-20T12:07:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Diet plan not found",
  "data": null,
  "timestamp": "2024-01-20T12:07:00.000Z"
}
```

---

### 10. Copy Week (Create New Plan from Active Week)
**POST** `/v1/diet-plans/copy-week`  
**Auth Required:** ✅

**Response (201):**
```json
{
  "status": "success",
  "message": "Week copied successfully to new plan",
  "data": {
    "_id": "67890abcdef1234567890136",
    "user": "67890abcdef1234567890128",
    "weekSchedule": [
      {
        "day": "Monday",
        "meals": [
          {
            "_id": "67890abcdef1234567890137",
            "mealName": "Breakfast",
            "time": "08:00",
            "items": [
              {
                "_id": "67890abcdef1234567890138",
                "name": "Oatmeal",
                "estimatedCalories": 300,
                "notes": "With fruits"
              }
            ],
            "preparationNotes": "Cook for 5 minutes"
          }
        ]
      }
    ],
    "isActive": true,
    "createdAt": "2024-01-20T12:08:00.000Z",
    "updatedAt": "2024-01-20T12:08:00.000Z"
  },
  "timestamp": "2024-01-20T12:08:00.000Z"
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "No active plan found to copy",
  "data": null,
  "timestamp": "2024-01-20T12:08:00.000Z"
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
