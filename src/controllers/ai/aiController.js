const axios = require('axios');
const AiChatSession = require('../../models/AiChatSession');
const AiChatMessage = require('../../models/AiChatMessage');
const User = require('../../models/User');
const ResponseUtils = require('../../utils/responseUtils');
const imgbbService = require('../../services/imgbbService');
// ===========================
// PROVIDER CONFIG (OpenRouter)
// ===========================
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Model Configuration (controlled via environment variables)
// Text Chat Model (for diet plans and general chat)
const OPENROUTER_MODEL = process.env.OPENROUTER_TEXT_MODEL || 'openai/gpt-oss-120b:free';

// Vision Models (for food image recognition with fallback)
// Using best free vision models to prevent hallucinations and "I can't see images" errors
const VISION_MODEL_PRIMARY = process.env.OPENROUTER_VISION_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
const VISION_MODEL_FALLBACK = process.env.OPENROUTER_VISION_FALLBACK || 'google/gemini-2.0-pro-exp-02-05:free';

const OPENROUTER_TIMEOUT_MS = 120000; // 2 minutes
const OPENROUTER_GEN_PARAMS = {
  temperature: 0.4,
  top_p: 0.9,      
};
const OPENROUTER_REFERER = process.env.APP_URL || 'http://localhost';
const OPENROUTER_TITLE = process.env.APP_NAME || 'Wellio Diet Assistant';

// ===========================
// SYSTEM PROMPTS (never stored in DB)
// ===========================

/**
 * Main system prompt for Diet & Nutrition Assistant
 * This is ALWAYS inserted as the first message in every LLM call
 * and is NEVER stored in the database
 */
const DIET_ASSISTANT_SYSTEM_PROMPT = `You are Wellio AI, a friendly nutrition assistant. Keep responses conversational and natural - don't introduce yourself in every message.

**Your job:**
- Help with diet plans based on user goals (weight loss, muscle gain, maintenance)
- Analyze food images and provide nutrition estimates
- Give practical meal suggestions and tips
- Answer nutrition questions casually
- Label calorie/macro numbers as **estimates**

**What you DON'T do:**
1. **NO Medical Advice**: If asked about symptoms, conditions, or diagnoses → "I can't give medical advice - please see a healthcare professional."
2. **NO Extreme Diets**: No <1200 cal/day diets or dangerous restrictions
3. **NO Supplement Dosages**: Only mention if asked, always say "consult a doctor for dosages"
4. **Safety**: If user mentions health conditions → remind them to work with a healthcare provider

**Tone:** Friendly, casual, helpful. Like texting a knowledgeable friend. Don't over-explain or be preachy.

**Mobile-First Formatting:**
DO NOT use Markdown Tables (e.g., | Food | Calories |). Tables render poorly on mobile screens.
Instead, use Bulleted Lists with bold keys for data.
Example format:
* **Greek Yogurt (200g):** 300 kcal
* **Apple:** 180 kcal
This ensures the data is always readable without horizontal scrolling.`;

/**
 * Lightweight system prompt for title generation
 */
const TITLE_GENERATOR_SYSTEM_PROMPT = `You are a title generator. Create a short, concise title (4-6 words maximum) that captures the essence of the user's question. Respond with ONLY the title text, no quotes, no punctuation at the end.`;

// ===========================
// CONFIGURATION
// ===========================
const MAX_CONTEXT_MESSAGES = 10; // Last 10 messages for context (to avoid token overflow)
const THROTTLE_MS = 1500;

const throttleMap = new Map();
const titleCache = new Map();

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Extract JSON from AI response (handles cases where JSON is embedded in text)
 * @param {String} text - AI response text
 * @returns {Object|null} - Parsed JSON or null
 */
function extractJSON(text) {
  // Try 1: Parse as-is (after cleaning markdown)
  try {
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // Failed - try extracting JSON from text
  }

  // Try 2: Find JSON object in text
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Failed - try next method
  }

  // Try 3: Look for JSON between code blocks
  try {
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }
  } catch (e) {
    // Failed
  }

  return null;
}

/**
 * Create fallback food analysis from plain text response
 * @param {String} text - AI's plain text response
 * @returns {Object} - Structured food analysis
 */
function createFallbackAnalysis(text) {
  return {
    foodName: "Food Item",
    visualDescription: text.slice(0, 200) || "Unable to analyze the image",
    estimatedPortion: "Unknown",
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0
    },
    clarificationMessage: "The AI couldn't provide detailed nutrition info. Please provide more details about the food and portion size for accurate nutritional data."
  };
}

/**
 * Build conversation context with smart truncation
 * Strategy: Include first user message + last N messages
 * This preserves the original user intent while keeping recent context
 * 
 * @param {Array} previousMessages - All messages from the session
 * @param {String} currentPrompt - The current user message
 * @returns {Array} - Optimized message array for LLM
 */
function buildConversationContext(previousMessages, currentPrompt) {
  const messages = [];

  // Helper to enrich message content with image/food context
  const enrichMessageContent = (msg) => {
    let content = msg.content;
    
    // If message has image context, append it
    if (msg.type === 'image' && msg.imageUrl) {
      content += `\n[User uploaded a food image]`;
    }
    
    // If message has food analysis, append summary for context
    if (msg.type === 'food_analysis' && msg.foodAnalysis) {
      const fa = msg.foodAnalysis;
      content += `\n[Previous analysis: ${fa.foodName}, ${fa.nutrition?.calories || 0} cal]`;
    }
    
    return content;
  };

  if (previousMessages.length === 0) {
    // First message in session - just add current prompt
    messages.push({
      role: 'user',
      content: currentPrompt,
    });
  } else if (previousMessages.length <= MAX_CONTEXT_MESSAGES) {
    // All messages fit within limit - include everything with enriched context
    messages.push(
      ...previousMessages.map((msg) => ({
        role: msg.role,
        content: enrichMessageContent(msg),
      })),
      {
        role: 'user',
        content: currentPrompt,
      }
    );
  } else {
    // Too many messages - use smart truncation
    // Strategy: first user message + marker + last (MAX_CONTEXT_MESSAGES - 2) messages + current
    const firstUserMessage = previousMessages[0];
    const remainingSlots = Math.max(1, MAX_CONTEXT_MESSAGES - 2);
    const recentMessages = previousMessages.slice(-1 * remainingSlots);

    messages.push({
      role: firstUserMessage.role,
      content: enrichMessageContent(firstUserMessage),
    });

    messages.push({
      role: 'system',
      content: '[Previous conversation context truncated for brevity]',
    });

    messages.push(
      ...recentMessages.map((msg) => ({
        role: msg.role,
        content: enrichMessageContent(msg),
      })),
      {
        role: 'user',
        content: currentPrompt,
      }
    );
  }

  return messages;
}
function humanizeValue(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return String(num);
}

function formatMetric(value, unit) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `${num}${unit}`;
}

function formatDietaryPreferences(preferences) {
  if (Array.isArray(preferences)) {
    const formatted = preferences
      .map(humanizeValue)
      .filter(Boolean);
    return formatted.length > 0 ? formatted.join(', ') : null;
  }
  return humanizeValue(preferences);
}

function buildSystemPrompt(userProfile) {
  const basePrompt = DIET_ASSISTANT_SYSTEM_PROMPT;
  const hasAnyContext = !!(
    userProfile &&
    (userProfile.age ||
      userProfile.height ||
      userProfile.weight ||
      userProfile.gender ||
      userProfile.activityLevel ||
      userProfile.dietaryGoal ||
      (Array.isArray(userProfile.dietaryPreferences) &&
        userProfile.dietaryPreferences.length > 0))
  );

  let contextBody = 'User Context: Not provided yet';
  if (hasAnyContext) {
    const age = formatNumber(userProfile.age);
    const height = formatMetric(userProfile.height, 'cm');
    const weight = formatMetric(userProfile.weight, 'kg');
    const gender = humanizeValue(userProfile.gender);
    const goal = humanizeValue(userProfile.dietaryGoal);
    const activityLevel = humanizeValue(userProfile.activityLevel);
    const dietaryPreferences = formatDietaryPreferences(userProfile.dietaryPreferences);

    contextBody = [
      `Age: ${age || 'Not provided yet'}`,
      `Height: ${height || 'Not provided yet'}`,
      `Weight: ${weight || 'Not provided yet'}`,
      `Gender: ${gender || 'Not provided yet'}`,
      `Goal: ${goal || 'Not provided yet'}`,
      `Activity Level: ${activityLevel || 'Not provided yet'}`,
      `Dietary Preferences: ${dietaryPreferences || 'Not provided yet'}`
    ].join('\n\n');
  }

  return `${basePrompt}\n\nCURRENT USER CONTEXT:\n\n${contextBody}\n\nUse this context to personalize all advice (e.g., calorie calculations).\nThis context updates dynamically as the user's profile changes.`;
}

/**
 * Call OpenRouter chat completions API
 * @param {Array} messagesWithSystemPrompt - Messages including system prompt
 * @param {Object} [options]
 * @param {Number} [options.timeoutMs]
 * @returns {Object} - { reply, raw }
 */
async function callOpenRouter(messagesWithSystemPrompt, options = {}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OpenRouter API key is not configured. Set OPENROUTER_API_KEY in your environment.'
    );
  }

  const timeout = options.timeoutMs || OPENROUTER_TIMEOUT_MS;

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: OPENROUTER_MODEL,
        messages: messagesWithSystemPrompt,
        stream: false,
        ...OPENROUTER_GEN_PARAMS,
      },
      {
        timeout,
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_REFERER,
          'X-Title': OPENROUTER_TITLE,
        },
      }
    );

    const data = response.data;
    const reply =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      null;

    if (!reply || (typeof reply === 'string' && reply.trim().length === 0)) {
      console.error('OpenRouter response data:', JSON.stringify(data, null, 2));
      throw new Error('LLM returned empty response');
    }

    return {
      reply: typeof reply === 'string' ? reply.trim() : String(reply).trim(),
      raw: data,
    };
  } catch (error) {
    const status = error.response?.status;

    if (status === 401) {
      throw new Error('OpenRouter authentication failed. Check your API key.');
    } else if (status === 429) {
      throw new Error('AI rate limit reached. Please wait and try again.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('AI request timed out. Please try again with a shorter prompt.');
    }

    console.error('OpenRouter call error:', error.message);
    console.error('Error response data:', error.response?.data);
    throw new Error(`AI failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Call LLM (OpenRouter) with conversation history
 * 
 * @param {Array} conversationMessages - User/assistant message history
 * @param {String} systemPrompt - System prompt to prepend
 * @returns {Object} - { reply, raw }
 */
async function callLLM(conversationMessages, systemPrompt = DIET_ASSISTANT_SYSTEM_PROMPT) {
  try {
    const messagesWithSystemPrompt = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...conversationMessages,
    ];
    return await callOpenRouter(messagesWithSystemPrompt);
  } catch (error) {
    console.error('LLM call error:', error.message);
    console.error('Error response data:', error.response?.data);
    throw error;
  }
}

/**
 * Call OpenRouter Vision API for food image analysis with automatic fallback
 * @param {String} imageUrl - URL of the image to analyze
 * @param {String} systemPrompt - System prompt/instructions for the AI
 * @param {String} userPrompt - User prompt text
 * @param {Object} options - Additional options
 * @returns {Object} - { reply, raw, modelUsed }
 */
async function callVisionAPI(imageUrl, systemPrompt, userPrompt, options = {}) {
  const useFallback = options.useFallback || false;
  const model = useFallback ? VISION_MODEL_FALLBACK : VISION_MODEL_PRIMARY;

  try {
    // Combine system prompt and user prompt for better compatibility
    // Some providers don't support separate system messages
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: combinedPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.1, // Lower temperature for precise food recognition
        max_tokens: 1000
      },
      {
        timeout: OPENROUTER_TIMEOUT_MS,
        validateStatus: (status) => status < 600, // Accept all responses for custom handling
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_REFERER,
          'X-Title': OPENROUTER_TITLE
        }
      }
    );

    const data = response.data;
    const status = response.status;

    // Check for error responses
    if (status >= 400) {
      const errorMsg = data?.error?.message || `HTTP ${status} error`;
      throw new Error(errorMsg);
    }

    const reply = data?.choices?.[0]?.message?.content ?? null;

    if (!reply || (typeof reply === 'string' && reply.trim().length === 0)) {
      console.error('Vision API response data:', JSON.stringify(data, null, 2));
      throw new Error('Vision AI returned empty response');
    }

    // Blindness Guard: Check if model claims it can't see the image
    const replyLower = typeof reply === 'string' ? reply.toLowerCase() : '';
    const blindnessPhrases = [
      "i can't see",
      "i cannot see",
      "text-only",
      "unable to view",
      "no image provided",
      "cannot view images",
      "i don't have the ability to see",
      "as a text-based"
    ];
    
    const isBlind = blindnessPhrases.some(phrase => replyLower.includes(phrase));
    if (isBlind) {
      console.error(`❌ Model claimed blindness: ${reply.slice(0, 100)}`);
      throw new Error('Model claimed blindness - Retry with different provider');
    }

    console.log(`✅ Vision API success with model: ${model}`);

    return {
      reply: typeof reply === 'string' ? reply.trim() : String(reply).trim(),
      raw: data,
      modelUsed: model
    };
  } catch (error) {
    const status = error.response?.status || 0;
    const errorMsg = error.response?.data?.error?.message || error.message;

    // Log the error
    console.error(`❌ Vision API error (${model}):`, errorMsg);

    // Handle specific errors
    if (status === 401) {
      throw new Error('OpenRouter authentication failed. Check your API key.');
    }

    if (status === 429) {
      throw new Error('AI rate limit reached. Please try again in a moment.');
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('AI request timed out. Please try again.');
    }

    // Retry with fallback model on server errors (500, 502, 503) OR blindness errors
    if (!useFallback && (
      status === 500 || 
      status === 502 || 
      status === 503 || 
      errorMsg.includes('Provider returned error') ||
      errorMsg.includes('Model claimed blindness')
    )) {
      console.warn(`⚠️ Retrying with fallback model: ${VISION_MODEL_FALLBACK}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return callVisionAPI(imageUrl, systemPrompt, userPrompt, { useFallback: true });
    }

    // If fallback also failed or other errors
    if (status === 502 || status === 503) {
      throw new Error('AI is currently busy. Please try again in a moment.');
    }

    throw new Error(`Vision AI failed: ${errorMsg}`);
  }
}

/**
 * Generate a short, meaningful title for a new chat session
 * Uses a separate lightweight prompt to avoid token waste
 * Runs asynchronously and doesn't block the main chat response
 * 
 * @param {String} firstMessage - The first user message in the session
 * @returns {String} - Generated title (fallback to "New Chat" on failure)
 */
async function generateChatTitle(firstMessage, sessionId) {
  try {
    if (sessionId && titleCache.has(sessionId)) {
      return titleCache.get(sessionId);
    }
    // Truncate very long first messages for title generation
    const truncatedMessage =
      firstMessage.length > 150 ? firstMessage.slice(0, 150) + '...' : firstMessage;
    const { reply: title } = await callOpenRouter(
      [
        { role: 'system', content: TITLE_GENERATOR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `User's question: "${truncatedMessage}"`,
        },
      ],
      { timeoutMs: 15000 }
    );
    const safeTitle = title || 'New Chat';

    // Clean up title: remove quotes, extra whitespace, limit length
    const finalTitle = String(safeTitle)
      .replace(/^[\"'\\s]+|[\"'\\s]+$/g, '')
      .replace(/\\.$/, '') // Remove trailing period
      .trim()
      .slice(0, 60); // Hard limit to prevent extremely long titles

    if (sessionId) {
      titleCache.set(sessionId, finalTitle);
    }

    return finalTitle;
  } catch (error) {
    console.error('Title generation failed:', error.message);
    // Fallback: Use first few words of the user's message
    const words = firstMessage.split(' ').slice(0, 5).join(' ');
    return words.length > 40 ? words.slice(0, 40) + '...' : words || 'New Chat';
  }
}

// ===========================
// MAIN CONTROLLER
// ===========================

class AiController {
  /**
   * Send a chat message (create new session or continue existing)
   * Supports both text messages and food image uploads
   * POST /v1/ai/chat
   * Body: { userId, prompt?, sessionId? } OR multipart/form-data with image
   */
  static async chat(req, res) {
    try {
      const { userId, prompt, sessionId } = req.body;
      const hasImage = !!req.file;

      // Validation
      if (!userId) {
        return ResponseUtils.error(res, 'userId is required', 400);
      }
      
      // Either prompt or image must be provided
      if (!hasImage && (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0)) {
        return ResponseUtils.error(res, 'Either prompt (text) or image file is required', 400);
      }

      const trimmedPrompt = prompt ? prompt.trim() : '';

      // Simple per-user/session throttle
      const throttleKey = sessionId ? `session:${sessionId}` : `user:${userId}`;
      const now = Date.now();
      const lastHit = throttleMap.get(throttleKey);
      if (lastHit && now - lastHit < THROTTLE_MS) {
        throttleMap.set(throttleKey, now);
        return ResponseUtils.error(
          res,
          'Please wait a moment before sending another message (rate limited).',
          429
        );
      }
      throttleMap.set(throttleKey, now);
      let session;
      let isNewSession = false;

      // Find or create session
      if (sessionId) {
        session = await AiChatSession.findOne({ _id: sessionId, userId });
        if (!session) {
          return ResponseUtils.error(res, 'Chat session not found or access denied', 404);
        }
      } else {
        // Create new session
        session = await AiChatSession.create({
          userId,
          model: OPENROUTER_MODEL,
          provider: 'openrouter',
          lastMessageAt: new Date(),
        });
        isNewSession = true;
      }

      // =======================
      // HANDLE IMAGE UPLOAD (Food Analysis)
      // =======================
      if (hasImage) {
        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname || `food_${Date.now()}`;

        console.log(`📸 Processing food image: ${fileName} (${(req.file.size / 1024).toFixed(2)} KB)`);

        // Upload image to ImgBB
        let imgbbUrl;
        try {
          imgbbUrl = await imgbbService.uploadToImgBB(fileBuffer, fileName);
          console.log(`✅ Image uploaded to ImgBB: ${imgbbUrl}`);
        } catch (imgbbError) {
          console.error('❌ ImgBB upload failed:', imgbbError.message);
          return ResponseUtils.error(
            res,
            `Failed to upload image: ${imgbbError.message}`,
            500
          );
        }

        // Define food analysis system prompt with Chain of Thought (CoT) prompting
        const FOOD_ANALYSIS_SYSTEM_PROMPT = `You are a professional food recognition and nutrition analysis AI.

Your task is to analyze food images and provide detailed nutritional information.

IMPORTANT: Use Chain of Thought reasoning. Think step-by-step before providing the final JSON.

Step 1: Identify all visible ingredients
Step 2: Analyze the composition and cooking method
Step 3: Determine the accurate dish name
Step 4: Output the JSON with your reasoning

CRITICAL: You MUST respond with ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text.

Response format (JSON only):
{
  "reasoning": "I see [describe all visible ingredients and composition here]. Based on this, the dish is...",
  "foodName": "Name of the food item",
  "visualDescription": "Brief description of what you see in the image",
  "estimatedPortion": "Estimated portion size (e.g., '1 cup', '200g', '1 medium bowl')",
  "nutrition": {
    "calories": <number>,
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fats": <number in grams>
  },
  "clarificationMessage": "A polite message asking the user to confirm the exact weight/portion for more accurate nutrition data"
}

Rules:
1. ALWAYS include your reasoning in the "reasoning" field
2. Identify ALL visible ingredients before naming the dish
3. Provide realistic estimates based on visual appearance
4. All nutrition values should be numbers (no strings)
5. Be conservative with portion estimates
6. If multiple food items are visible, analyze the dominant/main item
7. If the image is unclear or not food, set foodName to "Unknown" and provide a helpful clarificationMessage`;

        // Call Vision API with robust error handling
        let analysisData;
        let modelUsed;
        try {
          const { reply: aiReply, modelUsed: model } = await callVisionAPI(
            imgbbUrl,
            FOOD_ANALYSIS_SYSTEM_PROMPT,
            `Analyze this food image and provide nutritional information in the specified JSON format.${trimmedPrompt ? ` User notes: ${trimmedPrompt}` : ''}`
          );

          modelUsed = model;
          console.log(`🤖 Using model: ${modelUsed}`);

          // Parse AI response with robust JSON extraction
          analysisData = extractJSON(aiReply);

          if (!analysisData) {
            // AI didn't return JSON - log the response and create fallback
            console.warn('⚠️ AI returned non-JSON response:', aiReply.slice(0, 100));
            analysisData = createFallbackAnalysis(aiReply);
          }

          // Validate and set defaults if fields are missing
          if (!analysisData.foodName) {
            analysisData.foodName = "Food Item";
          }
          if (!analysisData.nutrition) {
            analysisData.nutrition = {
              calories: 0,
              protein: 0,
              carbs: 0,
              fats: 0
            };
          }
          if (!analysisData.visualDescription) {
            analysisData.visualDescription = "Unable to provide a detailed description";
          }
          if (!analysisData.estimatedPortion) {
            analysisData.estimatedPortion = "Unknown";
          }
          if (!analysisData.clarificationMessage) {
            analysisData.clarificationMessage = "Please provide more details about the food and portion size for accurate nutritional data.";
          }

          console.log(`✅ Food analysis completed: ${analysisData.foodName}`);
        } catch (aiError) {
          console.error('❌ AI analysis failed:', aiError.message);
          
          // Provide user-friendly error messages
          const errorMsg = aiError.message?.toLowerCase() || '';
          
          if (errorMsg.includes('currently busy') || errorMsg.includes('502') || errorMsg.includes('503')) {
            return ResponseUtils.error(
              res,
              'AI is currently busy. Please try again in a moment.',
              503
            );
          } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            return ResponseUtils.error(
              res,
              'AI rate limit reached. Please wait a moment and try again.',
              429
            );
          } else if (errorMsg.includes('timeout')) {
            return ResponseUtils.error(
              res,
              'AI request timed out. Please try again.',
              504
            );
          } else if (errorMsg.includes('authentication')) {
            return ResponseUtils.error(
              res,
              'AI authentication error. Please contact support.',
              503
            );
          }
          
          // Generic error
          return ResponseUtils.error(
            res,
            'Unable to analyze image at the moment. Please try again.',
            500
          );
        }

        // Create friendly response message
        const friendlyResponse = `I can see this is **${analysisData.foodName}**! 🍽️

${analysisData.visualDescription}

**Estimated Portion:** ${analysisData.estimatedPortion}

**Nutritional Information (approximate):**
- 🔥 Calories: ${analysisData.nutrition.calories} kcal
- 💪 Protein: ${analysisData.nutrition.protein}g
- 🍚 Carbs: ${analysisData.nutrition.carbs}g
- 🥑 Fats: ${analysisData.nutrition.fats}g

${analysisData.clarificationMessage}`;

        // Save user message (with image)
        const userMessage = await AiChatMessage.create({
          sessionId: session._id,
          role: 'user',
          type: 'image',
          content: trimmedPrompt || 'Uploaded a food image',
          imageUrl: imgbbUrl,
        });

        // Save assistant message (with analysis data)
        const assistantMessage = await AiChatMessage.create({
          sessionId: session._id,
          role: 'assistant',
          type: 'food_analysis',
          content: friendlyResponse,
          imageUrl: imgbbUrl,
          foodAnalysis: {
            foodName: analysisData.foodName,
            visualDescription: analysisData.visualDescription || '',
            estimatedPortion: analysisData.estimatedPortion || 'Unknown',
            nutrition: {
              calories: Number(analysisData.nutrition.calories) || 0,
              protein: Number(analysisData.nutrition.protein) || 0,
              carbs: Number(analysisData.nutrition.carbs) || 0,
              fats: Number(analysisData.nutrition.fats) || 0,
            },
            clarificationMessage: analysisData.clarificationMessage || '',
          },
          modelUsed,
        });

        // Update session
        session.lastMessageAt = new Date();
        await session.save();

        // Generate title for new sessions
        if (isNewSession && !session.titleGenerated) {
          const titlePrompt = `Food Image: ${analysisData.foodName}`;
          generateChatTitle(titlePrompt, session._id)
            .then(async (title) => {
              const sessionToUpdate = await AiChatSession.findById(session._id);
              if (sessionToUpdate && !sessionToUpdate.titleGenerated) {
                sessionToUpdate.title = title;
                sessionToUpdate.titleGenerated = true;
                await sessionToUpdate.save();
                console.log(`✅ Generated title for session ${session._id}: "${title}"`);
              }
            })
            .catch((err) => console.error('❌ Title generation failed:', err.message));
        }

        // Return response
        return ResponseUtils.success(res, 'Food image analyzed successfully', {
          sessionId: session._id,
          reply: assistantMessage.content,
          userMessage: {
            id: userMessage._id,
            type: userMessage.type,
            content: userMessage.content,
            imageUrl: userMessage.imageUrl,
            createdAt: userMessage.createdAt,
          },
          assistantMessage: {
            id: assistantMessage._id,
            type: assistantMessage.type,
            content: assistantMessage.content,
            imageUrl: assistantMessage.imageUrl,
            foodAnalysis: assistantMessage.foodAnalysis,
            modelUsed: assistantMessage.modelUsed,
            createdAt: assistantMessage.createdAt,
          },
          isNewSession,
        });
      }

      // =======================
      // HANDLE TEXT MESSAGE (Normal Chat)
      // =======================
      
      // Fetch previous messages from this session (excluding system messages)
      // IMPORTANT: Include imageUrl and foodAnalysis for context continuity
      const previousMessages = await AiChatMessage.find({
        sessionId: session._id,
        role: { $in: ['user', 'assistant'] }, // Only user/assistant, NOT system
      })
        .sort({ createdAt: 1 })
        .select('role content type imageUrl foodAnalysis')
        .lean();
      // Fetch user profile for persistent context
      const user = await User.findById(userId);
      if (!user) {
        return ResponseUtils.notFound(res, 'User not found');
      }
      const userProfile = user.fullProfile || user;

      // Build optimized conversation context with smart truncation
      const conversationContext = buildConversationContext(previousMessages, trimmedPrompt);
      // Call LLM with dynamic system prompt (not stored in DB)
      const systemPrompt = buildSystemPrompt(userProfile);
      const { reply } = await callLLM(conversationContext, systemPrompt);

      if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
        throw new Error('AI returned empty response');
      }

      // Save user message to database
      const userMessage = await AiChatMessage.create({
        sessionId: session._id,
        role: 'user',
        type: 'text',
        content: trimmedPrompt,
      });

      // Save assistant reply to database
      const assistantMessage = await AiChatMessage.create({
        sessionId: session._id,
        role: 'assistant',
        type: 'text',
        content: reply,
      });

      // Update session's lastMessageAt timestamp
      session.lastMessageAt = new Date();
      await session.save();

      // Generate title for new sessions (async, non-blocking)
      if (isNewSession && !session.titleGenerated) {
        generateChatTitle(trimmedPrompt, session._id)
          .then(async (title) => {
            // Re-fetch session to avoid overwriting concurrent updates
            const sessionToUpdate = await AiChatSession.findById(session._id);
            if (sessionToUpdate && !sessionToUpdate.titleGenerated) {
              sessionToUpdate.title = title;
              sessionToUpdate.titleGenerated = true;
              await sessionToUpdate.save();
              console.log(`✅ Generated title for session ${session._id}: "${title}"`);
            }
          })
          .catch((err) => console.error('❌ Title generation failed:', err.message));
      }

      // Return success response
      return ResponseUtils.success(res, 'Message sent successfully', {
        sessionId: session._id,
        reply: assistantMessage.content,
        userMessage: {
          id: userMessage._id,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        assistantMessage: {
          id: assistantMessage._id,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
        },
        isNewSession,
      });
    } catch (error) {
      console.error('❌ AI chat error:', error);

      // Return user-friendly error messages
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('rate limit')) {
        return ResponseUtils.error(
          res,
          'AI rate limit reached. Please wait a moment and try again.',
          429
        );
      } else if (msg.includes('timeout')) {
        return ResponseUtils.error(
          res,
          'AI request timed out. Please try again with a shorter prompt.',
          504
        );
      } else if (msg.includes('authentication')) {
        return ResponseUtils.error(
          res,
          'AI authentication failed. Please check server AI credentials.',
          503
        );
      } else if (msg.includes('empty response')) {
        return ResponseUtils.error(
          res,
          'AI returned an empty response. Please ask again.',
          502
        );
      }

      return ResponseUtils.internalError(
        res,
        'Failed to generate AI response. Please try again.'
      );
    }
  }

  /**
   * Get all chat sessions for a user
   * GET /v1/ai/sessions?userId=xxx
   */
  static async getSessions(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return ResponseUtils.error(res, 'userId is required', 400);
      }

      // Fetch sessions sorted by most recent
      const sessions = await AiChatSession.find({ userId })
        .sort({ lastMessageAt: -1 })
        .lean();

      // For each session, get the first user message as preview
      const sessionsWithPreview = await Promise.all(
        sessions.map(async (session) => {
          const firstMessage = await AiChatMessage.findOne({
            sessionId: session._id,
            role: 'user',
          })
            .sort({ createdAt: 1 })
            .select('content')
            .lean();

          return {
            id: session._id,
            title: session.title,
            preview: firstMessage?.content?.slice(0, 100) || '',
            lastMessageAt: session.lastMessageAt,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          };
        })
      );

      return ResponseUtils.success(res, 'Chat sessions retrieved successfully', {
        sessions: sessionsWithPreview,
      });
    } catch (error) {
      console.error('❌ Get sessions error:', error);
      return ResponseUtils.internalError(res, 'Failed to fetch chat sessions');
    }
  }

  /**
   * Get all messages in a specific chat session
   * GET /v1/ai/sessions/:sessionId/messages?userId=xxx
   */
  static async getSessionMessages(req, res) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return ResponseUtils.error(res, 'userId is required', 400);
      }

      // Verify session belongs to user
      const session = await AiChatSession.findOne({ _id: sessionId, userId });
      if (!session) {
        return ResponseUtils.error(res, 'Chat session not found or access denied', 404);
      }

      // Fetch all messages (exclude system messages from display)
      const messages = await AiChatMessage.find({
        sessionId,
        role: { $in: ['user', 'assistant'] },
      })
        .sort({ createdAt: 1 })
        .select('role content type imageUrl foodAnalysis modelUsed createdAt')
        .lean();

      return ResponseUtils.success(res, 'Messages retrieved successfully', {
        session: {
          id: session._id,
          title: session.title,
          createdAt: session.createdAt,
        },
        messages: messages.map((msg) => ({
          id: msg._id,
          role: msg.role,
          type: msg.type || 'text',
          content: msg.content,
          imageUrl: msg.imageUrl || null,
          foodAnalysis: msg.foodAnalysis || null,
          modelUsed: msg.modelUsed || null,
          createdAt: msg.createdAt,
        })),
      });
    } catch (error) {
      console.error('❌ Get session messages error:', error);
      return ResponseUtils.internalError(res, 'Failed to fetch messages');
    }
  }

  /**
   * Delete a chat session and all its messages
   * DELETE /v1/ai/sessions/:sessionId
   * Body: { userId }
   */
  static async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return ResponseUtils.error(res, 'userId is required', 400);
      }

      // Verify session belongs to user
      const session = await AiChatSession.findOne({ _id: sessionId, userId });
      if (!session) {
        return ResponseUtils.error(res, 'Chat session not found or access denied', 404);
      }

      // Delete all messages in this session
      await AiChatMessage.deleteMany({ sessionId });

      // Delete the session itself
      await AiChatSession.findByIdAndDelete(sessionId);

      return ResponseUtils.success(res, 'Chat session deleted successfully');
    } catch (error) {
      console.error('❌ Delete session error:', error);
      return ResponseUtils.internalError(res, 'Failed to delete chat session');
    }
  }

}

module.exports = AiController;
