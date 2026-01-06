const axios = require('axios');
const AiChatSession = require('../../models/AiChatSession');
const AiChatMessage = require('../../models/AiChatMessage');
const ResponseUtils = require('../../utils/responseUtils');
// ===========================
// PROVIDER CONFIG (OpenRouter)
// ===========================
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = 'xiaomi/mimo-v2-flash:free';
const OPENROUTER_FALLBACK_MODEL = 'z-ai/glm-4.5-air:free';
const OPENROUTER_FALLBACK_MODEL_2 = 'google/gemini-2.0-flash-exp:free';
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
const DIET_ASSISTANT_SYSTEM_PROMPT = `You are a professional Diet & Nutrition Assistant specialized in creating healthy, balanced meal plans and providing evidence-based nutritional guidance.

Your name is **Wellio AI**. Always introduce yourself as "Wellio AI" (never NutriBot or any other name).

**Your Core Responsibilities:**
- Design safe, balanced diet plans based on user goals (weight loss, muscle gain, maintenance)
- Recommend portion sizes and calorie guidelines
- Suggest vegetarian meal options by default (unless user specifies non-vegetarian)
- Provide macronutrient breakdowns (protein, carbs, fats)
- Offer practical meal prep and grocery shopping tips
- Answer questions about nutrition, vitamins, and healthy eating habits
- Clearly label all calorie and macro numbers as **estimates**, not exact values

**STRICT LIMITATIONS (You MUST follow these):**
1. **NO Medical Diagnosis**: Never diagnose medical conditions, allergies, or deficiencies. If a user asks about symptoms, thyroid issues, diabetes management, or medical concerns, respond: "I'm a nutrition assistant and cannot provide medical advice. Please consult a healthcare professional or registered dietitian for personalized medical guidance."

2. **NO Extreme Diets**: Avoid recommending very low-calorie diets (<1200 cal/day), extreme fasting, or unsustainable restrictions.

3. **NO Supplement Prescriptions**: Only mention supplements if the user explicitly asks. Never prescribe dosages. Always suggest consulting a doctor.

4. **Ask Clarifying Questions**: If critical information is missing (age, weight, height, activity level, dietary restrictions, allergies), ask the user before creating a plan.

5. **Safety First**: If a user mentions health conditions (diabetes, heart disease, pregnancy, eating disorders), remind them to work with a healthcare provider.

6. **Health-Adjacent Questions**: For symptoms, diagnoses, medications, lab values, or treatment advice, politely decline and direct the user to a healthcare professional.

**Response Format:**
- Use clear, well-structured **GitHub-flavored Markdown**
- Use headings (##, ###), bullet lists, and tables
- Make meal plans easy to read with clear sections for each day
- Do NOT wrap your entire response in code fences or backticks
- Be concise but thorough

**Tone:** Professional, supportive, and encouraging. Help users make sustainable, healthy choices.`;

/**
 * Lightweight system prompt for title generation
 */
const TITLE_GENERATOR_SYSTEM_PROMPT = `You are a title generator. Create a short, concise title (4-6 words maximum) that captures the essence of the user's question. Respond with ONLY the title text, no quotes, no punctuation at the end.`;

// ===========================
// CONFIGURATION
// ===========================
const MAX_CONTEXT_MESSAGES = 10; // Last 10 messages for context (to avoid token overflow)
const THROTTLE_MS = 1500;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 400;

const throttleMap = new Map();
const titleCache = new Map();

// ===========================
// HELPER FUNCTIONS
// ===========================

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

  if (previousMessages.length === 0) {
    // First message in session - just add current prompt
    messages.push({
      role: 'user',
      content: currentPrompt,
    });
  } else if (previousMessages.length <= MAX_CONTEXT_MESSAGES) {
    // All messages fit within limit - include everything
    messages.push(
      ...previousMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
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
      content: firstUserMessage.content,
    });

    messages.push({
      role: 'system',
      content: '[Previous conversation context truncated for brevity]',
    });

    messages.push(
      ...recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: currentPrompt,
      }
    );
  }

  return messages;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call OpenRouter chat completions API
 * @param {Array} messagesWithSystemPrompt - Messages including system prompt
 * @param {Object} [options]
 * @param {String} [options.model]
 * @param {Number} [options.timeoutMs]
 * @returns {Object} - { reply, raw }
 */
async function callOpenRouter(messagesWithSystemPrompt, options = {}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OpenRouter API key is not configured. Set OPENROUTER_API_KEY in your environment.'
    );
  }

  const model = options.model || OPENROUTER_MODEL;
  const timeout = options.timeoutMs || OPENROUTER_TIMEOUT_MS;
  const isFallback = options.isFallback || false;
  const attempt = options.attempt || 1;

  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model,
        messages: messagesWithSystemPrompt,
        stream: false,
        ...OPENROUTER_GEN_PARAMS,
      },
      {
        timeout,
        validateStatus: (status) => status < 500,
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
    const transientStatus = [408, 500, 502, 503, 504, 524];
    const isTimeout =
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout');

    if (status === 401) {
      throw new Error('OpenRouter authentication failed. Check your API key.');
    }

    if (status === 429 && !isFallback) {
      console.warn(
        `⚠️ OpenRouter rate limit on ${model}; falling back to ${OPENROUTER_FALLBACK_MODEL}`
      );
      return callOpenRouter(messagesWithSystemPrompt, {
        model: OPENROUTER_FALLBACK_MODEL,
        timeoutMs: timeout,
        isFallback: true,
        attempt,
      });
    }
    if (status === 429 && !isFallback) {
      throw new Error('OpenRouter rate limit reached. Please wait and try again.');
    }

    if ((status && transientStatus.includes(status)) || isTimeout) {
      if (attempt < MAX_RETRIES) {
        const delay = BACKOFF_BASE_MS * 2 ** (attempt - 1);
        await sleep(delay);
        return callOpenRouter(messagesWithSystemPrompt, {
          model,
          timeoutMs: timeout,
          isFallback,
          attempt: attempt + 1,
        });
      }
    }

    if (status === 429) {
      throw new Error('OpenRouter rate limit reached. Please wait and try again.');
    } else if (isTimeout) {
      throw new Error('AI request timed out. Please try again with a shorter prompt.');
    }

    console.error('OpenRouter call error:', error.message);
    console.error('Error response data:', error.response?.data);
    throw error;
  }
}

/**
 * Call LLM (OpenRouter) with conversation history
 * 
 * @param {Array} conversationMessages - User/assistant message history
 * @returns {Object} - { reply, raw }
 */
async function callLLM(conversationMessages) {
  try {
    const messagesWithSystemPrompt = [
      {
        role: 'system',
        content: DIET_ASSISTANT_SYSTEM_PROMPT,
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
   * POST /v1/ai/chat
   * Body: { userId, prompt, sessionId? }
   */
  static async chat(req, res) {
    try {
      const { userId, prompt, sessionId } = req.body;

      // Validation
      if (!userId) {
        return ResponseUtils.error(res, 'userId is required', 400);
      }
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return ResponseUtils.error(res, 'prompt is required and cannot be empty', 400);
      }

      const trimmedPrompt = prompt.trim();

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

      // Fetch previous messages from this session (excluding system messages)
      const previousMessages = await AiChatMessage.find({
        sessionId: session._id,
        role: { $in: ['user', 'assistant'] }, // Only user/assistant, NOT system
      })
        .sort({ createdAt: 1 })
        .select('role content')
        .lean();

      // Build optimized conversation context with smart truncation
      const conversationContext = buildConversationContext(previousMessages, trimmedPrompt);

      // Call LLM (system prompt is added inside callLLM, not stored in DB)
      const { reply } = await callLLM(conversationContext);

      if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
        throw new Error('AI returned empty response');
      }

      // Save user message to database
      const userMessage = await AiChatMessage.create({
        sessionId: session._id,
        role: 'user',
        content: trimmedPrompt,
      });

      // Save assistant reply to database
      const assistantMessage = await AiChatMessage.create({
        sessionId: session._id,
        role: 'assistant',
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
        .select('role content createdAt')
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
          content: msg.content,
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
