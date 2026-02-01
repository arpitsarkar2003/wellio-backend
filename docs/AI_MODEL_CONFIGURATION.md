# AI Model Configuration

## Environment Variables

The AI system uses environment variables to configure which models to use for different tasks.

### Required Environment Variables

Add these to your `.env` file:

```bash
# OpenRouter API Key (Required)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Text Chat Model (for diet plans and general conversation)
# Default: meta-llama/llama-3.1-70b-instruct:free
OPENROUTER_TEXT_MODEL=meta-llama/llama-3.1-70b-instruct:free

# Vision Model (for food image recognition)
# Primary: google/gemini-2.0-flash-lite-preview-02-05:free
# Fallback: google/gemini-2.0-pro-exp-02-05:free
OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-lite-preview-02-05:free
OPENROUTER_VISION_FALLBACK=google/gemini-2.0-pro-exp-02-05:free

# ImgBB API Key (for food image storage)
IMGBB_API_KEY=your_imgbb_api_key_here

# Application Configuration
APP_URL=http://localhost:3000
APP_NAME=Wellio Diet Assistant
```

---

## Current Configuration

### Text Chat (Diet Plans & General Conversation)
- **Model:** `meta-llama/llama-3.1-70b-instruct:free`
- **Provider:** OpenRouter
- **Parameters:** 70 billion
- **Use Case:** 
  - Diet plan generation
  - Nutrition advice
  - General health questions
  - Meal suggestions

### Vision (Food Image Recognition)
- **Primary Model:** `google/gemini-2.0-flash-lite-preview-02-05:free`
- **Fallback Model:** `google/gemini-2.0-pro-exp-02-05:free`
- **Provider:** OpenRouter / Google AI Studio
- **Use Case:**
  - Food identification
  - Nutritional analysis from images
  - Portion estimation
- **Fallback Logic:** Automatically switches to fallback model on 500/502/503 errors

---

## How to Change Models

### Option 1: Using Environment Variables (Recommended)

Update your `.env` file:

```bash
# Change text chat model
OPENROUTER_TEXT_MODEL=different-model-name:free

# Change vision model
OPENROUTER_VISION_MODEL=different-vision-model:free
```

### Option 2: Editing Code (Not Recommended)

Edit `src/controllers/ai/aiController.js`:

```javascript
// Line 14-16
const OPENROUTER_MODEL = process.env.OPENROUTER_TEXT_MODEL || 'your-default-model';
const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || 'your-default-vision-model';
```

---

## Available Models on OpenRouter

### Text Models (Free Tier)
- `meta-llama/llama-3.1-70b-instruct:free` ⭐ **(Current)**
- `meta-llama/llama-3.1-8b-instruct:free`
- `google/gemini-2.0-flash-exp:free`
- `mistralai/mistral-7b-instruct:free`

### Vision Models (Free Tier)
- `google/gemini-2.0-flash-lite-preview-02-05:free` ⭐ **(Primary)**
- `google/gemini-2.0-pro-exp-02-05:free` ⭐ **(Fallback)**
- `google/gemini-2.0-flash-exp:free`
- `meta-llama/llama-3.2-90b-vision-instruct:free`

---

## No Fallback Models

**Important:** This configuration does **NOT** include fallback models. If the primary model fails or reaches rate limits, the request will fail immediately.

Benefits:
- ✅ Predictable behavior
- ✅ Consistent model output
- ✅ No unexpected model switches
- ✅ Easier debugging

Drawbacks:
- ❌ No automatic recovery from rate limits
- ❌ Service interruption if model is unavailable

---

## Model Selection Guidelines

### For Text Chat:
- **High Quality:** Use large models (405B parameters)
- **Speed:** Use smaller models (70B parameters)
- **Cost:** Free tier models are rate-limited

### For Vision:
- **Accuracy:** Larger vision models (Gemma 3 12B)
- **Speed:** Smaller vision models (Gemini Flash)
- **Format Support:** Ensure model supports system prompts

---

## Testing Your Configuration

### Test Text Chat
```bash
curl -X POST http://localhost:3000/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_id",
    "prompt": "Create a simple meal plan"
  }'
```

### Test Food Recognition
```bash
curl -X POST http://localhost:3000/v1/ai/chat \
  -F "userId=test_user_id" \
  -F "image=@/path/to/food/image.jpg"
```

---

## Troubleshooting

### Error: "OpenRouter authentication failed"
- ✅ Check `OPENROUTER_API_KEY` is set correctly
- ✅ Verify API key is valid on OpenRouter dashboard

### Error: "Vision AI rate limit reached"
- ⏳ Wait a few minutes (free tier limits)
- 🔄 Try a different vision model
- 💰 Upgrade to paid tier on OpenRouter

### Error: "Developer instruction is not enabled"
- 🔧 Some models don't support system prompts
- 🔄 Switch to a different model (e.g., Gemini)

---

## Resources

- **OpenRouter Dashboard:** https://openrouter.ai/keys
- **Available Models:** https://openrouter.ai/models
- **ImgBB API:** https://api.imgbb.com/

---

---

## ⚠️ Common Issues

### Model Not Found (404 Error)
If you see "No matching route found" error:
- ✅ Verify the model name is correct
- ✅ Check the model is available on OpenRouter free tier
- ✅ Try using a different model from the list above

### Recommended Stable Models
For maximum reliability, use these tested combinations:

**Option 1 (Google Models - Recommended):**
```bash
OPENROUTER_TEXT_MODEL=google/gemini-2.0-flash-exp:free
OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-lite-preview-02-05:free
OPENROUTER_VISION_FALLBACK=google/gemini-2.0-pro-exp-02-05:free
```

**Option 2 (Google Models):**
```bash
OPENROUTER_TEXT_MODEL=google/gemini-2.0-flash-exp:free
OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-exp:free
```

---

**Last Updated:** January 2026  
**Configuration Version:** v1.1
