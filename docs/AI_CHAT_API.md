# AI Chat API Documentation

## Overview

The AI Chat feature provides ChatGPT-style conversation sessions with automatic title generation and full conversation history. All AI responses are formatted in GitHub-flavored Markdown for easy frontend rendering.

## Database Models

### AiChatSession
Represents a conversation thread containing multiple messages.

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,              // Auto-generated from first message
  titleGenerated: Boolean,
  model: String,              // e.g., "google/gemini-2.0-flash-exp:free"
  provider: String,           // "openrouter"
  lastMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### AiChatMessage
Individual messages within a chat session.

```javascript
{
  _id: ObjectId,
  sessionId: ObjectId (ref: AiChatSession),
  role: String,               // "user" | "assistant" | "system"
  content: String,            // Message content (markdown for assistant)
  metadata: Object,           // Optional metadata
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### 1. Send Chat Message

**POST** `/v1/ai/chat`

Send a message to start a new conversation or continue an existing one.

**Request Body:**
```json
{
  "userId": "60d5ec49f1b2c72b8c8e4f1a",
  "prompt": "Create a 7-day vegetarian diet plan for weight loss",
  "sessionId": "optional-session-id-to-continue-conversation"
}
```

**Response (New Session):**
```json
{
  "status": "success",
  "message": "Message sent successfully",
  "data": {
    "sessionId": "60d5ec49f1b2c72b8c8e4f1b",
    "reply": "## 7-Day Vegetarian Diet Plan\n\n### Day 1\n- **Breakfast**: ...",
    "userMessage": {
      "id": "60d5ec49f1b2c72b8c8e4f1c",
      "content": "Create a 7-day vegetarian diet plan for weight loss",
      "createdAt": "2023-06-25T10:30:00.000Z"
    },
    "assistantMessage": {
      "id": "60d5ec49f1b2c72b8c8e4f1d",
      "content": "## 7-Day Vegetarian Diet Plan...",
      "createdAt": "2023-06-25T10:30:15.000Z"
    },
    "isNewSession": true
  }
}
```

**Response (Continuing Conversation):**
```json
{
  "status": "success",
  "message": "Message sent successfully",
  "data": {
    "sessionId": "60d5ec49f1b2c72b8c8e4f1b",
    "reply": "Sure! Here are some vegetarian protein sources...",
    "userMessage": { ... },
    "assistantMessage": { ... },
    "isNewSession": false
  }
}
```

**Flow:**
1. If `sessionId` is not provided → Create new session
2. Save user message to database
3. Fetch all previous messages in session for context
4. Call LLM with full conversation history
5. Save assistant reply
6. If new session → Generate title asynchronously (doesn't block response)
7. Return response

---

### 2. Get All Chat Sessions

**GET** `/v1/ai/sessions?userId={userId}`

Get all chat sessions for a user, sorted by most recent.

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "status": "success",
  "message": "Chat sessions retrieved successfully",
  "data": {
    "sessions": [
      {
        "id": "60d5ec49f1b2c72b8c8e4f1b",
        "title": "7-Day Vegetarian Diet Plan",
        "preview": "Create a 7-day vegetarian diet plan for weight loss",
        "lastMessageAt": "2023-06-25T10:30:15.000Z",
        "createdAt": "2023-06-25T10:30:00.000Z",
        "updatedAt": "2023-06-25T10:30:15.000Z"
      },
      {
        "id": "60d5ec49f1b2c72b8c8e4f1c",
        "title": "Meal Planning Tips",
        "preview": "What are some good meal planning strategies?",
        "lastMessageAt": "2023-06-24T15:20:00.000Z",
        "createdAt": "2023-06-24T15:20:00.000Z",
        "updatedAt": "2023-06-24T15:22:00.000Z"
      }
    ]
  }
}
```

**Use Case:**
Display this list in the chat history sidebar. User clicks on a session to view full conversation.

---

### 3. Get Session Messages

**GET** `/v1/ai/sessions/{sessionId}/messages?userId={userId}`

Get all messages in a specific chat session.

**Path Parameters:**
- `sessionId` (required): Session ID

**Query Parameters:**
- `userId` (required): User ID (for authorization)

**Response:**
```json
{
  "status": "success",
  "message": "Messages retrieved successfully",
  "data": {
    "session": {
      "id": "60d5ec49f1b2c72b8c8e4f1b",
      "title": "7-Day Vegetarian Diet Plan",
      "createdAt": "2023-06-25T10:30:00.000Z"
    },
    "messages": [
      {
        "id": "60d5ec49f1b2c72b8c8e4f1c",
        "role": "user",
        "content": "Create a 7-day vegetarian diet plan for weight loss",
        "createdAt": "2023-06-25T10:30:00.000Z"
      },
      {
        "id": "60d5ec49f1b2c72b8c8e4f1d",
        "role": "assistant",
        "content": "## 7-Day Vegetarian Diet Plan\n\n### Day 1...",
        "createdAt": "2023-06-25T10:30:15.000Z"
      },
      {
        "id": "60d5ec49f1b2c72b8c8e4f1e",
        "role": "user",
        "content": "Can you add more protein options?",
        "createdAt": "2023-06-25T10:35:00.000Z"
      },
      {
        "id": "60d5ec49f1b2c72b8c8e4f1f",
        "role": "assistant",
        "content": "Sure! Here are additional protein-rich options...",
        "createdAt": "2023-06-25T10:35:10.000Z"
      }
    ]
  }
}
```

**Use Case:**
When user clicks on a session in history, fetch and display all messages.

---

### 4. Delete Chat Session

**DELETE** `/v1/ai/sessions/{sessionId}`

Delete a chat session and all its messages.

**Path Parameters:**
- `sessionId` (required): Session ID

**Request Body:**
```json
{
  "userId": "60d5ec49f1b2c72b8c8e4f1a"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Chat session deleted successfully"
}
```

---

## User Flow Example

### Starting a New Conversation

1. **User opens chat screen** → No active session

2. **User types first message**: "Create a 7-day vegetarian diet plan"

3. **Frontend sends**:
```javascript
POST /v1/ai/chat
{
  "userId": "60d5ec49f1b2c72b8c8e4f1a",
  "prompt": "Create a 7-day vegetarian diet plan"
  // No sessionId = new session
}
```

4. **Backend**:
   - Creates new `AiChatSession`
   - Saves user message
   - Calls LLM
   - Saves AI reply
   - Starts async title generation (e.g., "7-Day Vegetarian Diet Plan")
   - Returns response with `sessionId`

5. **Frontend**:
   - Displays AI reply (render markdown)
   - Stores `sessionId` for continued conversation

### Continuing a Conversation

6. **User sends follow-up**: "Can you add more protein?"

7. **Frontend sends**:
```javascript
POST /v1/ai/chat
{
  "userId": "60d5ec49f1b2c72b8c8e4f1a",
  "prompt": "Can you add more protein?",
  "sessionId": "60d5ec49f1b2c72b8c8e4f1b"  // Include session ID
}
```

8. **Backend**:
   - Fetches all previous messages in session
   - Includes full conversation history in LLM call
   - AI responds with context from previous messages
   - Saves new messages
   - Returns reply

### Viewing Chat History

9. **User clicks "History" button**

10. **Frontend sends**:
```javascript
GET /v1/ai/sessions?userId=60d5ec49f1b2c72b8c8e4f1a
```

11. **Backend returns** list of sessions with titles

12. **User clicks on a session**

13. **Frontend sends**:
```javascript
GET /v1/ai/sessions/60d5ec49f1b2c72b8c8e4f1b/messages?userId=60d5ec49f1b2c72b8c8e4f1a
```

14. **Backend returns** all messages in chronological order

15. **Frontend displays** full conversation thread

---

## Frontend Integration Tips

### Rendering Markdown Replies

All assistant replies are in GitHub-flavored Markdown. Use a markdown renderer:

```javascript
import ReactMarkdown from 'react-markdown';

<ReactMarkdown>{message.content}</ReactMarkdown>
```

### Session Management

```javascript
// State for current conversation
const [currentSessionId, setCurrentSessionId] = useState(null);
const [messages, setMessages] = useState([]);

// Start new chat
const startNewChat = () => {
  setCurrentSessionId(null);
  setMessages([]);
};

// Send message
const sendMessage = async (prompt) => {
  const response = await fetch('/v1/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      userId: currentUser.id,
      prompt,
      sessionId: currentSessionId  // null for new, or existing session ID
    })
  });
  
  const data = await response.json();
  
  // Update session ID if new
  if (data.data.isNewSession) {
    setCurrentSessionId(data.data.sessionId);
  }
  
  // Add messages to display
  setMessages([...messages, 
    data.data.userMessage,
    data.data.assistantMessage
  ]);
};

// Load session from history
const loadSession = async (sessionId) => {
  const response = await fetch(
    `/v1/ai/sessions/${sessionId}/messages?userId=${currentUser.id}`
  );
  const data = await response.json();
  
  setCurrentSessionId(sessionId);
  setMessages(data.data.messages);
};
```

---

## Environment Variables

Make sure this is set in your `.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
```

---

## Notes

- OpenRouter requests include required headers (`HTTP-Referer`, `X-Title`) and conservative params (temperature 0.4, top_p 0.9, reasoning disabled). On 429 rate limits the server automatically falls back to `z-ai/glm-4.5-air:free`.
- **Title Generation**: Happens asynchronously after the first message. Won't block the chat response.
- **Conversation Context**: The LLM receives the full conversation history for each request, maintaining context.
- **Markdown Format**: All replies are formatted in markdown by default (via system prompt).
- **User Authorization**: All endpoints verify that the session belongs to the requesting user.









