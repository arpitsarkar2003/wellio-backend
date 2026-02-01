# AI Food Recognition - Quick Reference

## 📤 What Frontend Sends

### Text Message
```javascript
POST /v1/ai/chat
Content-Type: application/json

{
  "userId": "USER_ID",        // Required
  "prompt": "Your message",    // Required
  "sessionId": "SESSION_ID"    // Optional (for continuing conversation)
}
```

### Food Image
```javascript
POST /v1/ai/chat
Content-Type: multipart/form-data

FormData {
  userId: "USER_ID",          // Required
  image: File,                 // Required (JPEG/PNG/WebP/GIF, max 5MB)
  prompt: "Optional message",  // Optional
  sessionId: "SESSION_ID"      // Optional (for continuing conversation)
}
```

---

## 📥 What Backend Returns

### Text Response
```javascript
{
  status: "success",
  message: "Message sent successfully",
  data: {
    sessionId: "SESSION_ID",
    reply: "AI response in markdown",
    userMessage: {
      id: "msg_id",
      type: "text",
      content: "User's message",
      imageUrl: null,
      createdAt: "2024-01-20T10:30:00Z"
    },
    assistantMessage: {
      id: "msg_id",
      type: "text",
      content: "AI response",
      imageUrl: null,
      foodAnalysis: null,
      modelUsed: "google/gemma-3-27b-it:free",
      createdAt: "2024-01-20T10:30:05Z"
    },
    isNewSession: false
  }
}
```

### Food Analysis Response
```javascript
{
  status: "success",
  message: "Food image analyzed successfully",
  data: {
    sessionId: "SESSION_ID",
    reply: "Friendly formatted response",
    userMessage: {
      id: "msg_id",
      type: "image",
      content: "Uploaded a food image",
      imageUrl: "https://i.ibb.co/abc123/food.jpg",  // ✅ Display this
      createdAt: "2024-01-20T10:30:00Z"
    },
    assistantMessage: {
      id: "msg_id",
      type: "food_analysis",
      content: "Markdown formatted response",
      imageUrl: "https://i.ibb.co/abc123/food.jpg",  // ✅ Same image URL
      foodAnalysis: {                                 // ✅ Structured data
        foodName: "Chicken Biryani",
        visualDescription: "A plate of aromatic rice...",
        estimatedPortion: "1 medium plate (300g)",
        nutrition: {
          calories: 450,      // ✅ Number
          protein: 25,        // ✅ Number (grams)
          carbs: 55,          // ✅ Number (grams)
          fats: 15            // ✅ Number (grams)
        },
        clarificationMessage: "Please confirm portion..."
      },
      modelUsed: "google/gemma-3-27b-it:free",
      createdAt: "2024-01-20T10:30:08Z"
    },
    isNewSession: false
  }
}
```

---

## 📜 Chat History (with images)

### Request
```javascript
GET /v1/ai/sessions/{sessionId}/messages?userId={userId}
```

### Response
```javascript
{
  status: "success",
  data: {
    session: {
      id: "SESSION_ID",
      title: "Chicken Biryani Analysis",
      createdAt: "2024-01-20T10:30:00Z"
    },
    messages: [
      // Text message
      {
        id: "msg_1",
        role: "user",
        type: "text",
        content: "Hi!",
        imageUrl: null,
        foodAnalysis: null,
        createdAt: "..."
      },
      // Image message with analysis
      {
        id: "msg_2",
        role: "user",
        type: "image",
        content: "Uploaded a food image",
        imageUrl: "https://i.ibb.co/abc123/food.jpg",  // ✅ Show this in UI
        foodAnalysis: null,
        createdAt: "..."
      },
      {
        id: "msg_3",
        role: "assistant",
        type: "food_analysis",
        content: "I can see this is **Chicken Biryani**...",
        imageUrl: "https://i.ibb.co/abc123/food.jpg",  // ✅ Same image
        foodAnalysis: {                                 // ✅ Nutrition data
          foodName: "Chicken Biryani",
          nutrition: { calories: 450, protein: 25, ... }
        },
        createdAt: "..."
      }
    ]
  }
}
```

---

## ✅ Key Points

1. **Single endpoint** `/v1/ai/chat` for both text and images
2. **Use FormData** for image uploads
3. **Images are preserved** in chat history (ImgBB URLs)
4. **Message types:** `text`, `image`, `food_analysis`
5. **Nutrition values** are numbers (not strings)
6. **sessionId** links messages to conversations
7. **Images are hosted** on ImgBB (permanent public URLs)

---

## 🔄 Complete Flow

```
User Action          Frontend                Backend                Response
───────────────────────────────────────────────────────────────────────────
Upload image    →   FormData + userId   →   Upload to ImgBB    →   Image URL
                                        →   AI Vision Analysis  →   Food data
                                        →   Save to MongoDB     →   Chat history
                ←   Display results     ←   Return JSON         ←   All data
```

---

## 🤖 AI Models

- **Text Chat:** `google/gemini-2.0-flash-exp:free`
- **Vision (with auto-fallback):** 
  - Primary: `google/gemini-2.0-flash-lite-preview-02-05:free`
  - Fallback: `google/gemini-2.0-pro-exp-02-05:free`

Configure via `.env`:
```bash
OPENROUTER_TEXT_MODEL=google/gemini-2.0-flash-exp:free
OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-lite-preview-02-05:free
OPENROUTER_VISION_FALLBACK=google/gemini-2.0-pro-exp-02-05:free
```

**Note:** Vision API automatically retries with fallback model on server errors (502/503).

---

## 📞 Need Help?

See full documentation: 
- `AI_FOOD_RECOGNITION_API.md` - Complete API reference
- `AI_MODEL_CONFIGURATION.md` - Model configuration guide
