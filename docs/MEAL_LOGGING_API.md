# Meal Logging API Documentation

## Overview
The Meal Logging API allows users to record their interactions with their active diet plan's meal slots. Users can mark meals as "completed", "skipped", or "not_yet" (default).

**Base URL:** `/v1/meal-logs`

## Authentication
All endpoints require a valid Bearer token (JWT) in the `Authorization` header.
`Authorization: Bearer <your_access_token>`

## Data Structures

### Meal Log Object
```json
{
  "_id": "60d21b4667d0d8992e610c85",
  "user": "60d21b4667d0d8992e610c85",
  "dietPlan": "60d21b4667d0d8992e610c99",
  "mealSlotId": "60d21b4667d0d8992e610c77",
  "date": "2023-10-27",
  "scheduledTimeSnapshot": "08:30",
  "status": "completed",
  "actualCalories": 450,
  "notes": "Had oatmeal instead of toast",
  "createdAt": "2023-10-27T08:35:00.000Z",
  "updatedAt": "2023-10-27T08:35:00.000Z"
}
```

### Status Enum
- `completed`: User ate the meal. `actualCalories` is required.
- `skipped`: User skipped the meal.
- `not_yet`: Default state, no action taken yet.

---

## Endpoints

### 1. Log a Meal (Upsert)
Create or update a log for a specific meal slot on a specific date.

- **Method:** `PUT`
- **URL:** `/v1/meal-logs`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `mealSlotId` | String | Yes | The ID of the meal slot from the active diet plan. |
| `date` | String | Yes | Date in `YYYY-MM-DD` format. Cannot be in the future. |
| `status` | String | Yes | One of: `completed`, `skipped`, `not_yet`. |
| `actualCalories` | Number | Conditional | **Required** if status is `completed`. |
| `notes` | String | No | Optional notes (max 500 chars). |

**Example Request:**
```json
{
  "mealSlotId": "60d21b4667d0d8992e610c77",
  "date": "2023-10-27",
  "status": "completed",
  "actualCalories": 500,
  "notes": "Delicious!"
}
```

#### Success Response (200 OK)
```json
{
  "status": "success",
  "message": "Meal log saved successfully",
  "data": {
    "_id": "...",
    "user": "...",
    "mealSlotId": "...",
    "date": "2023-10-27",
    "status": "completed",
    "actualCalories": 500,
    "notes": "Delicious!",
    "updatedAt": "..."
  },
  "timestamp": "..."
}
```

#### Error Responses
- **400 Bad Request**: 
  - `NO_ACTIVE_PLAN`: No active diet plan found.
  - `FUTURE_DATE_NOT_ALLOWED`: Cannot log meals for future dates.
  - `PAST_DATE_EDIT_NOT_ALLOWED`: Logs are editable only within the same day.
  - `MEAL_SLOT_NOT_FOUND`: Meal slot not found in active diet plan.
  - `CALORIES_REQUIRED`: Actual calories are required when status is completed.

**Error Response Structure:**
```json
{
  "status": "error",
  "message": "Error message here",
  "errors": { "code": "ERROR_CODE" },
  "data": null,
  "timestamp": "..."
}
```

---

### 2. Get Logs for a Date
Retrieve all meal logs for a specific calendar date.

- **Method:** `GET`
- **URL:** `/v1/meal-logs/:date`

#### Parameters
| Parameter | Type | In | Required | Description |
|---|---|---|---|---|
| `date` | String | Path | Yes | `YYYY-MM-DD` |

#### Success Response (200 OK)
```json
{
  "status": "success",
  "message": "Meal logs retrieved successfully",
  "data": [
    {
      "_id": "...",
      "mealSlotId": "...",
      "status": "completed",
      "actualCalories": 500,
      "date": "2023-10-27"
    },
    {
      "_id": "...",
      "mealSlotId": "...",
      "status": "skipped",
      "date": "2023-10-27"
    }
  ],
  "timestamp": "..."
}
```

---

### 3. Get Logs for a Range
Retrieve all meal logs within a date range (inclusive). useful for weekly views or analytics.

- **Method:** `GET`
- **URL:** `/v1/meal-logs`

#### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `startDate` | String | Yes | `YYYY-MM-DD` |
| `endDate` | String | Yes | `YYYY-MM-DD` |

**Example URL:** `/v1/meal-logs?startDate=2023-10-01&endDate=2023-10-07`

#### Success Response (200 OK)
```json
{
  "status": "success",
  "message": "Meal logs retrieved successfully",
  "data": [
    { "date": "2023-10-01", "status": "completed", ... },
    { "date": "2023-10-02", "status": "skipped", ... }
  ],
  "timestamp": "..."
}
```

---

## Integration Notes for Frontend

1.  **Empty State**: If a user has an active diet plan but no logs for a day, the API returns an empty array `[]`. The frontend should render the diet plan slots as "Not Yet" (default state) locally if no matching log exists in the fetched array.
2.  **Matching Logs to Slots**:
    - Fetch the Active Diet Plan structure (which has the schedule).
    - Fetch Meal Logs for the day.
    - Map over the Plan's meal slots.
    - Check if a log exists with `mealSlotId` matching the slot's ID.
    - If yes, show the log status. If no, show default state.
3.  **Future & Past Dates (Same Day Edit Lock)**:
    - The API strictly enforces that logs can only be created or updated for the current server date (UTC).
    - Attempts to log for past or future dates will return `PAST_DATE_EDIT_NOT_ALLOWED` or `FUTURE_DATE_NOT_ALLOWED`.
    - Frontend should disable logging interactions for any date that is not "today".
4.  **No Active Plan**: Handle the 400 error gracefully by prompting the user to create or activate a plan.
5.  **Time Format**: `scheduledTimeSnapshot` is returned in "HH:MM" (24-hour) format.
