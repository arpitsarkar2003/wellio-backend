# AI Food Recognition & Chat API Documentation

## Overview

The AI Chat system now supports **unified text and image communication**. Users can:
- Send text messages for diet advice
- Upload food images for automatic nutritional analysis
- View chat history with images preserved

All conversations (text + images) are stored in the same chat sessions, allowing users to see their uploaded food images when reviewing chat history.

---

## API Endpoint

### POST `/v1/ai/chat`

**Single unified endpoint** for both text chat and food image recognition.

---

## 📝 Request Formats

### Option 1: Text Message (JSON)

```http
POST /v1/ai/chat
Content-Type: application/json

{
  "userId": "60d5ec49f1b2c72b8c8e4f1a",
  "prompt": "Create a 7-day vegetarian meal plan",
  "sessionId": "60d5ec49f1b2c72b8c8e4f1b" // optional
}
```

### Option 2: Food Image Upload (Multipart Form-Data)

```http
POST /v1/ai/chat
Content-Type: multipart/form-data

userId: 60d5ec49f1b2c72b8c8e4f1a
image: [binary file data]
prompt: "What's the nutrition in this?" // optional
sessionId: 60d5ec49f1b2c72b8c8e4f1b // optional
```

**Image Requirements:**
- **Formats:** JPEG, PNG, WebP, GIF
- **Max Size:** 5MB
- **Field Name:** `image`

---

## 📤 Response Formats

### Text Message Response

```json
{
  "status": "success",
  "message": "Message sent successfully",
  "data": {
    "sessionId": "60d5ec49f1b2c72b8c8e4f1b",
    "reply": "Here's your 7-day meal plan...",
    "userMessage": {
      "id": "msg_001",
      "type": "text",
      "content": "Create a 7-day vegetarian meal plan",
      "imageUrl": null,
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "assistantMessage": {
      "id": "msg_002",
      "type": "text",
      "content": "Here's your 7-day meal plan...",
      "imageUrl": null,
      "foodAnalysis": null,
      "modelUsed": "google/gemma-3-27b-it:free",
      "createdAt": "2024-01-20T10:30:05.000Z"
    },
    "isNewSession": false
  }
}
```

### Food Image Analysis Response

```json
{
  "status": "success",
  "message": "Food image analyzed successfully",
  "data": {
    "sessionId": "60d5ec49f1b2c72b8c8e4f1b",
    "reply": "I can see this is **Chicken Biryani**! 🍽️\n\nA plate of aromatic basmati rice with tender chicken pieces...",
    "userMessage": {
      "id": "msg_003",
      "type": "image",
      "content": "Uploaded a food image",
      "imageUrl": "https://i.ibb.co/abc123/food.jpg",
      "createdAt": "2024-01-20T10:35:00.000Z"
    },
    "assistantMessage": {
      "id": "msg_004",
      "type": "food_analysis",
      "content": "I can see this is **Chicken Biryani**! 🍽️\n\nA plate of aromatic rice...",
      "imageUrl": "https://i.ibb.co/abc123/food.jpg",
      "foodAnalysis": {
        "foodName": "Chicken Biryani",
        "visualDescription": "A plate of aromatic basmati rice with tender chicken pieces, garnished with herbs and spices",
        "estimatedPortion": "1 medium plate (300g)",
        "nutrition": {
          "calories": 450,
          "protein": 25,
          "carbs": 55,
          "fats": 15
        },
        "clarificationMessage": "Please confirm the portion weight for more accurate nutrition data"
      },
      "modelUsed": "google/gemma-3-27b-it:free",
      "createdAt": "2024-01-20T10:35:08.000Z"
    },
    "isNewSession": false
  }
}
```

---

## 🔍 Fetching Chat History

### GET `/v1/ai/sessions/:sessionId/messages?userId=xxx`

Returns all messages in a session, **including images**.

**Response:**

```json
{
  "status": "success",
  "message": "Messages retrieved successfully",
  "data": {
    "session": {
      "id": "60d5ec49f1b2c72b8c8e4f1b",
      "title": "Chicken Biryani Analysis",
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "type": "text",
        "content": "Hi, I need diet advice",
        "imageUrl": null,
        "foodAnalysis": null,
        "modelUsed": null,
        "createdAt": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "type": "text",
        "content": "Hello! I'm Wellio AI...",
        "imageUrl": null,
        "foodAnalysis": null,
        "modelUsed": "google/gemma-3-27b-it:free",
        "createdAt": "2024-01-20T10:30:05.000Z"
      },
      {
        "id": "msg_003",
        "role": "user",
        "type": "image",
        "content": "Uploaded a food image",
        "imageUrl": "https://i.ibb.co/abc123/food.jpg",
        "foodAnalysis": null,
        "modelUsed": null,
        "createdAt": "2024-01-20T10:35:00.000Z"
      },
      {
        "id": "msg_004",
        "role": "assistant",
        "type": "food_analysis",
        "content": "I can see this is **Chicken Biryani**! 🍽️...",
        "imageUrl": "https://i.ibb.co/abc123/food.jpg",
        "foodAnalysis": {
          "foodName": "Chicken Biryani",
          "visualDescription": "A plate of aromatic rice...",
          "estimatedPortion": "1 medium plate (300g)",
          "nutrition": {
            "calories": 450,
            "protein": 25,
            "carbs": 55,
            "fats": 15
          },
          "clarificationMessage": "Please confirm the portion weight..."
        },
        "modelUsed": "google/gemma-3-27b-it:free",
        "createdAt": "2024-01-20T10:35:08.000Z"
      }
    ]
  }
}
```

---

## 🎨 Frontend Implementation Guide

### Message Types

```typescript
type MessageType = 'text' | 'image' | 'food_analysis';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  type: MessageType;
  content: string;
  imageUrl?: string | null;
  foodAnalysis?: FoodAnalysis | null;
  modelUsed?: string | null;
  createdAt: string;
}

interface FoodAnalysis {
  foodName: string;
  visualDescription: string;
  estimatedPortion: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  clarificationMessage: string;
}
```

### Rendering Logic

```javascript
function renderMessage(message) {
  if (message.type === 'text') {
    // Regular text message
    return renderTextBubble(message.content);
  }
  
  if (message.type === 'image' && message.role === 'user') {
    // User uploaded an image
    return renderImageBubble(message.imageUrl, message.content);
  }
  
  if (message.type === 'food_analysis' && message.role === 'assistant') {
    // AI analyzed a food image
    return renderFoodAnalysisBubble({
      imageUrl: message.imageUrl,
      analysis: message.foodAnalysis,
      content: message.content
    });
  }
}
```

### Example: Sending Food Image

```javascript
async function sendFoodImage(userId, imageFile, sessionId = null) {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('image', imageFile);
  if (sessionId) {
    formData.append('sessionId', sessionId);
  }
  
  const response = await fetch('/v1/ai/chat', {
    method: 'POST',
    body: formData
    // Don't set Content-Type - browser sets it automatically with boundary
  });
  
  const data = await response.json();
  return data;
}
```

### Example: Sending Text Message

```javascript
async function sendTextMessage(userId, prompt, sessionId = null) {
  const response = await fetch('/v1/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      prompt,
      sessionId
    })
  });
  
  const data = await response.json();
  return data;
}
```

### Example: Fetching Chat History

```javascript
async function getChatHistory(sessionId, userId) {
  const response = await fetch(
    `/v1/ai/sessions/${sessionId}/messages?userId=${userId}`
  );
  
  const data = await response.json();
  return data.data.messages; // Array of messages with images
}
```

---

## 🎯 UI/UX Recommendations

### 1. Chat Bubble Rendering

**User Text Message:**
```
┌─────────────────────────┐
│ Create a meal plan      │  (Blue bubble, right-aligned)
└─────────────────────────┘
```

**User Image Message:**
```
┌─────────────────────────┐
│ [Food Image Thumbnail]  │  (Blue bubble, right-aligned)
│ "What's the nutrition?" │  (Optional text)
└─────────────────────────┘
```

**AI Food Analysis:**
```
┌──────────────────────────────────────┐
│ I can see this is **Chicken Biryani**│  (Gray bubble, left-aligned)
│                                      │
│ [Food Image Thumbnail]               │
│                                      │
│ 🍽️ Portion: 1 medium plate (300g)  │
│                                      │
│ Nutrition (approximate):             │
│ 🔥 Calories: 450 kcal               │
│ 💪 Protein: 25g                     │
│ 🍚 Carbs: 55g                       │
│ 🥑 Fats: 15g                        │
│                                      │
│ ℹ️ Please confirm portion weight... │
└──────────────────────────────────────┘
```

### 2. Image Display

- Show **thumbnails** in chat bubbles
- Click to **expand** to full size
- Images are **hosted on ImgBB** (permanent URLs)
- Load images **lazily** for performance

### 3. Loading States

```
User uploads image → Show uploading spinner
Backend processing → "Analyzing your food..."
Response received → Smooth animation to show results
```

### 4. Error Handling

```javascript
try {
  const result = await sendFoodImage(userId, file, sessionId);
  if (result.status === 'success') {
    // Display the food analysis
  }
} catch (error) {
  // Show error message
  showError('Failed to analyze image. Please try again.');
}
```

---

## 🔧 Error Codes

| Status | Description | Action |
|--------|-------------|--------|
| 400 | No image or prompt provided | Show validation error |
| 400 | Invalid file format | Accept only JPEG, PNG, WebP, GIF |
| 400 | File too large (>5MB) | Compress image before upload |
| 429 | Rate limit exceeded | Show "Please wait" message |
| 500 | Image upload failed | Retry or contact support |
| 500 | AI analysis failed | Retry or contact support |

---

## 🚀 Best Practices

1. **Always include `userId`** in every request
2. **Persist `sessionId`** to continue conversations
3. **Show loading indicators** during image upload/analysis
4. **Cache images locally** to avoid re-downloading
5. **Handle offline mode** gracefully
6. **Display markdown** formatting in AI responses
7. **Show image thumbnails** in chat history
8. **Allow image zoom** on click

---

## 🎨 Sample UI Flow

```
1. User opens chat
   ↓
2. User taps camera/gallery icon
   ↓
3. User selects food image
   ↓
4. [Optional] User adds text: "Is this healthy?"
   ↓
5. Image uploads (show progress)
   ↓
6. AI analyzes (show "Analyzing..." message)
   ↓
7. Results appear with:
   - Food name
   - Image thumbnail
   - Nutrition breakdown
   - Clarification message
   ↓
8. User can continue conversation in same session
```

---

## 📊 Data Storage

- **Images:** Hosted on ImgBB (permanent URLs)
- **Analysis:** Stored in MongoDB chat messages
- **History:** Accessible via session messages API
- **User uploads:** Preserved with original context

---

## 🔐 Security Notes

- Images are uploaded to **ImgBB** (third-party CDN)
- URLs are **public** but hard to guess
- No sensitive data should be in images
- Rate limiting prevents abuse

---

## 📞 Support

For questions or issues, contact the backend team or refer to:
- [AI Chat API Documentation](./AI_CHAT_API.md)
- [Main API Documentation](./README.md)

---

## ⚙️ Model Configuration

The backend uses different AI models for different tasks:

- **Text Chat (Diet Plans):** `google/gemini-2.0-flash-exp:free`
- **Food Recognition (Vision):** 
  - Primary: `google/gemini-2.0-flash-lite-preview-02-05:free`
  - Fallback: `google/gemini-2.0-pro-exp-02-05:free` (automatic on errors)

These can be configured via environment variables:
- `OPENROUTER_TEXT_MODEL` - Text chat model
- `OPENROUTER_VISION_MODEL` - Vision primary model
- `OPENROUTER_VISION_FALLBACK` - Vision fallback model

**Fallback Logic:** The system automatically retries with the fallback model if the primary model returns 500/502/503 errors.

See [AI Model Configuration](./AI_MODEL_CONFIGURATION.md) for details.

---

**Last Updated:** January 2026  
**API Version:** v1  
**Default Models:** Gemini 2.0 Flash (text), Gemini 2.0 Flash Lite → Pro (vision with fallback)
