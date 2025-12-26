# AI Chat Implementation - Improvements & Hardening

## Overview

The AI Chat feature has been hardened with production-ready improvements focusing on safety, reliability, and optimal performance with OpenRouter.

---

## ✅ Implemented Improvements

### 1. **Professional System Prompt with Safety Guardrails**

**Location:** `DIET_ASSISTANT_SYSTEM_PROMPT` constant in `aiController.js`

**Features:**
- ✅ Restricts AI to Diet & Nutrition domain
- ✅ Explicitly forbids medical diagnosis, extreme diets, and supplement prescriptions
- ✅ Encourages balanced, evidence-based nutritional advice
- ✅ Defaults to vegetarian meals (unless user specifies otherwise)
- ✅ Requires clarifying questions when critical data is missing
- ✅ Clear markdown formatting instructions

**Key Safety Rules:**
```
1. NO Medical Diagnosis - Redirects medical questions to healthcare professionals
2. NO Extreme Diets - Avoids <1200 cal/day or unsustainable restrictions
3. NO Supplement Prescriptions - Only mentions if explicitly requested
4. Ask Clarifying Questions - Requests age, weight, activity level, etc.
5. Safety First - Reminds users with health conditions to consult doctors
```

**Important:** This system prompt is:
- ✅ Always inserted as the FIRST message in every LLM request
- ✅ NEVER stored in the database
- ✅ Not visible to end users in conversation history

---

### 2. **Smart Conversation Context Handling**

**Function:** `buildConversationContext(previousMessages, currentPrompt)`

**Strategy to Prevent Token Overflow:**

- **For sessions with ≤10 messages:** Include all messages
- **For sessions with >10 messages:** Use smart truncation
  - Include the **first user message** (preserves original intent)
  - Include the **last 10 messages** (maintains recent context)
  - Insert a system marker: `[Previous conversation context truncated for brevity]`

**Why This Works:**
- LLM remembers the user's original goal (first message)
- LLM has recent context for coherent replies
- Avoids token limits with long conversations
- Maintains conversational quality

**Example:**
```
Session with 25 messages:
✅ Message 1: "Create a weight loss diet plan for me"
❌ Messages 2-14: [truncated]
✅ Messages 15-25: Recent conversation
✅ Message 26: Current user prompt
```

---

### 3. **Robust OpenRouter Integration**

**Defaults & Params:**
- Primary model: `google/gemini-2.0-flash-exp:free`
- Fallback on 429: `z-ai/glm-4.5-air:free`
- Headers: `HTTP-Referer` and `X-Title` set automatically
- Params: `temperature=0.4`, `top_p=0.9`, `reasoning=false`

**Timeout Configuration:**
- Chat requests: 120,000 ms
- Title generation: 15,000 ms

**Error Handling & Retries:**
- Automatic fallback model on 429 with logging
- Exponential backoff retries for transient 5xx / timeouts
- User-friendly messages for rate-limit vs timeout vs auth vs empty response

---

### 4. **Safety Features to Prevent Hallucinations**

**System Prompt Constraints:**
- Avoids extreme calorie numbers
- Never recommends supplements unless explicitly requested
- Rejects medical/diagnostic questions with safe redirection
- Encourages sustainable, evidence-based advice

**Example Safe Responses:**

❌ **Unsafe (prevented):**
> "You have a vitamin D deficiency. Take 5000 IU daily."

✅ **Safe (enforced):**
> "I'm a nutrition assistant and cannot diagnose deficiencies. Please consult a healthcare professional for blood tests and personalized supplementation advice."

---

### 5. **Improved Title Generation**

**Function:** `generateChatTitle(firstMessage)`

**Improvements:**
- ✅ Uses a **separate lightweight prompt** (`TITLE_GENERATOR_SYSTEM_PROMPT`)
- ✅ Truncates long first messages to 150 chars for efficiency
- ✅ Runs **asynchronously** (doesn't block chat response)
- ✅ Marks `titleGenerated = true` after saving
- ✅ Fallback: Uses first 5 words of user's message if LLM fails
- ✅ Hard limit: 60 characters to prevent UI overflow
- ✅ Cleans quotes, punctuation, and extra whitespace

**Example Titles:**
```
Input: "Create a 7-day vegetarian diet plan for weight loss"
Output: "7-Day Vegetarian Weight Loss Plan"

Input: "What are good sources of protein?"
Output: "Good Protein Sources"
```

---

### 6. **Conversation History Filtering**

**Database Queries:**
- Only fetch `user` and `assistant` messages
- Exclude `system` messages (never stored, but filter for safety)
- Prevents system prompt leakage in history API

**Query Example:**
```javascript
await AiChatMessage.find({
  sessionId,
  role: { $in: ['user', 'assistant'] }  // Only real conversation
})
```

---

### 7. **Enhanced Validation & Security**

**Input Validation:**
- ✅ Checks `userId` is present
- ✅ Ensures `prompt` is non-empty string
- ✅ Trims whitespace from user input
- ✅ Validates session ownership (prevents cross-user access)

**Authorization:**
- ✅ All endpoints verify session belongs to requesting user
- ✅ Returns `404` (not 403) to prevent session enumeration attacks

**Error Messages:**
- ✅ User-friendly messages (no stack traces)
- ✅ Detailed server logs with ❌ emoji for easy debugging
- ✅ Actionable guidance for common issues

**Runtime Guards:**
- ✅ Per-user/session throttle to avoid burst rate limits
- ✅ Validates AI replies are non-empty strings before saving
- ✅ Logs model switch events when falling back on 429

---

## 🔧 Configuration

**Environment Variables Required:**

```env
# OpenRouter Configuration
OPENROUTER_API_KEY=your_api_key_here

# MongoDB (already configured)
MONGODB_URI_DEV=mongodb://localhost:27017/wellio
```

**Constants (in aiController.js):**
```javascript
OPENROUTER_TIMEOUT_MS = 120000   // 2 minutes for chat
MAX_CONTEXT_MESSAGES = 10        // Last 10 messages for context
```

---

## 📊 Performance Characteristics

| Operation | Typical Time | Timeout |
|-----------|-------------|---------|
| Simple question (1 sentence) | 2-5 seconds | 120s |
| Diet plan (7-day) | 15-30 seconds | 120s |
| Title generation | 1-3 seconds | 15s |

**Token Usage (Approximate):**
- System prompt: ~250 tokens
- Average user message: 20-100 tokens
- Average AI reply: 300-1000 tokens (diet plans)
- 10-message context: ~2000-4000 tokens total

**Why 10 Messages?**
- Mistral context window: 8192 tokens
- Leaves room for system prompt + long responses
- Balances context quality vs. performance

---

## 🛡️ Safety Examples

### Medical Questions (Rejected)

**User:** "I have constant fatigue and weight gain. Do I have a thyroid problem?"

**AI Response:**
```markdown
I'm a nutrition assistant and cannot provide medical advice or diagnose conditions like thyroid disorders. 

Constant fatigue and weight gain can have many causes, and it's important to consult a healthcare professional who can:
- Order appropriate blood tests (TSH, T3, T4)
- Evaluate your symptoms comprehensively
- Provide a proper diagnosis and treatment plan

In the meantime, I can help you with general healthy eating habits if you'd like.
```

### Supplement Requests (Cautious)

**User:** "What supplements should I take?"

**AI Response:**
```markdown
I can provide general information about common supplements, but I cannot prescribe specific dosages or recommend supplements without knowing your individual health status.

**Common Supplements (Always consult a doctor first):**
- **Vitamin D**: Often recommended for people with limited sun exposure
- **B12**: Important for vegetarians/vegans
- **Omega-3**: Supports heart and brain health

**Important:** Please consult a healthcare provider or registered dietitian before starting any supplement regimen. They can:
- Test for deficiencies via blood work
- Recommend appropriate dosages based on your needs
- Check for interactions with medications

Would you like help with food-based sources of these nutrients instead?
```

### Diet Plan (Encouraged)

**User:** "Create a weight loss diet plan for me"

**AI Response:**
```markdown
I'd be happy to help create a personalized weight loss diet plan! To provide the best recommendations, I need some information:

**Please share:**
1. **Age** and **Gender**
2. **Current weight** and **height**
3. **Activity level** (sedentary, moderate, active)
4. **Weight loss goal** (how many kg/lbs?)
5. **Dietary restrictions or allergies**
6. **Food preferences** (vegetarian, non-vegetarian, etc.)
7. **Meal timing preferences** (3 meals, 5 small meals, etc.)

Once I have this information, I can create a safe, balanced plan with:
- Daily calorie target
- Macronutrient breakdown
- Sample meal ideas
- Portion guidelines

Looking forward to helping you! 😊
```

---

## 🧪 Testing the Implementation

### Test 1: New Conversation

```bash
curl -X POST http://localhost:8080/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "60d5ec49f1b2c72b8c8e4f1a",
    "prompt": "Create a 7-day vegetarian diet plan for weight loss"
  }'
```

**Expected:**
- ✅ Creates new session
- ✅ Returns markdown-formatted diet plan
- ✅ Title generated asynchronously (check logs)

### Test 2: Continue Conversation

```bash
curl -X POST http://localhost:8080/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "60d5ec49f1b2c72b8c8e4f1a",
    "sessionId": "<session_id_from_test_1>",
    "prompt": "Can you add more protein options?"
  }'
```

**Expected:**
- ✅ Uses previous conversation context
- ✅ AI remembers the diet plan from before
- ✅ Provides relevant protein additions

### Test 3: Medical Question (Safety)

```bash
curl -X POST http://localhost:8080/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "60d5ec49f1b2c72b8c8e4f1a",
    "prompt": "I have chest pain after eating. What should I do?"
  }'
```

**Expected:**
- ✅ AI redirects to healthcare professional
- ✅ Does NOT attempt diagnosis
- ✅ Provides safe, supportive response

### Test 4: Missing OpenRouter API Key

```bash
# Temporarily unset the key to verify error handling
OPENROUTER_API_KEY= \
curl -X POST http://localhost:8080/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "60d5ec49f1b2c72b8c8e4f1a",
    "prompt": "Hello"
  }'
```

**Expected:**
- ✅ Returns `503 Service Unavailable`
- ✅ Error message about missing OpenRouter API key
- ✅ No crash, clean error handling

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set `OPENROUTER_API_KEY` in your environment/secret manager
- [ ] Ensure outbound HTTPS to `openrouter.ai` is allowed
- [ ] Test all 4 test cases above
- [ ] Review system prompt for your specific use case
- [ ] Adjust `MAX_CONTEXT_MESSAGES` if needed (default: 10)
- [ ] Monitor initial response times (should be <30s for diet plans)

---

## 📝 Code Structure

```
src/controllers/aiController.js
│
├── Constants
│   ├── DIET_ASSISTANT_SYSTEM_PROMPT (never stored in DB)
│   ├── TITLE_GENERATOR_SYSTEM_PROMPT
│   ├── OPENROUTER_TIMEOUT_MS
│   └── MAX_CONTEXT_MESSAGES
│
├── Helper Functions
│   ├── buildConversationContext()  // Smart truncation
│   ├── callLLM()                   // OpenRouter integration + error handling
│   └── generateChatTitle()         // Async title generation
│
└── AiController Class
    ├── chat()              // POST /v1/ai/chat
    ├── getSessions()       // GET /v1/ai/sessions
    ├── getSessionMessages() // GET /v1/ai/sessions/:id/messages
    └── deleteSession()     // DELETE /v1/ai/sessions/:id
```

---

## 🔄 Backward Compatibility

✅ **All existing chat sessions continue to work**
- Database schema unchanged
- API response shapes unchanged
- Existing sessions automatically benefit from new context handling

---

## 🐛 Troubleshooting

### Problem: "OpenRouter API key is not configured"

**Solution:**
```bash
export OPENROUTER_API_KEY=your_api_key_here
```

### Problem: "OpenRouter rate limit reached"

**Solution:**
- Wait and retry after a short pause
- Consider using a smaller model (e.g., `google/gemini-2.0-flash-exp:free`)
- Reduce request frequency on the client

### Problem: "AI request timed out"

**Possible Causes:**
- Complex question requiring long response
- Network slowness to OpenRouter

**Solution:**
- Simplify the question
- Keep `MAX_CONTEXT_MESSAGES` at 10 or lower
- Increase `OPENROUTER_TIMEOUT_MS` if necessary

### Problem: Title not generating

**Check:**
```bash
# Look for error logs
grep "Title generation failed" <log_file>
```

**Note:** Title generation is async and non-critical. Chat will work even if title fails (defaults to "New Chat").

---

## 📚 Related Documentation

- [AI Chat API Reference](./AI_CHAT_API.md) - Full API documentation
- [OpenRouter Docs](https://openrouter.ai/docs) - API usage and models
- [OpenAI GPT-4o Mini](https://platform.openai.com/docs/models#gpt-4o-mini) - Model details

---

## ✨ Summary of Changes

| Feature | Before | After |
|---------|--------|-------|
| System Prompt | Generic assistant | Diet/Nutrition specialist with safety rules |
| Context Handling | All messages (risk of overflow) | First + last 10 messages (optimized) |
| Error Messages | Generic errors | Specific, actionable guidance |
| Title Generation | Basic | Smart fallback, async, truncated input |
| Medical Safety | None | Explicit rejection with redirection |
| Timeout | Default (none) | 2 minutes with detection |
| Validation | Basic | Enhanced with trimming and ownership checks |

---

## 🎯 Result

The AI Chat feature is now **production-ready** with:
- ✅ Professional, domain-specific responses
- ✅ Safety guardrails for medical questions
- ✅ Robust error handling for LLM issues
- ✅ Optimized performance (no token overflow)
- ✅ Clean, maintainable code with clear documentation

**All improvements maintain backward compatibility with existing sessions.**









