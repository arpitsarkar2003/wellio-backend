# AI Chat Feature - Frontend Integration Guide

## 📋 Overview

The AI Chat feature provides a **ChatGPT-style conversation experience** where users can:
- Start new conversations about diet and nutrition
- Continue existing conversations with full context
- View their chat history organized by sessions
- Each session has an auto-generated title based on the first message

All AI responses are formatted in **GitHub-flavored Markdown** and ready for direct rendering in your UI.

---

## 🎯 How It Works (The Flow)

### **Concept: Sessions & Messages**

Think of it like ChatGPT:
- **Session** = One conversation thread (e.g., "7-Day Vegetarian Diet Plan")
- **Message** = Individual user question or AI reply within that session
- **History** = List of all sessions the user has created

### **User Journey**

1. **User opens chat screen** → No active session
2. **User types first message** → Backend creates new session automatically
3. **User continues chatting** → All messages saved to same session (maintains context)
4. **User clicks "History"** → Sees list of all previous sessions with titles
5. **User clicks a session** → Loads all messages from that conversation
6. **User can start new chat** → Creates a fresh session

---

## 🔌 API Endpoints

### **Base URL**
```
http://localhost:8080/v1/ai
```

---

### **1. Send a Chat Message**

**Endpoint:** `POST /v1/ai/chat`

**When to use:**
- User sends a new message
- Starting a new conversation OR continuing an existing one

**Request Body:**
```json
{
  "userId": "string (required)",
  "prompt": "string (required) - The user's message",
  "sessionId": "string (optional) - Include to continue existing conversation"
}
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Message sent successfully",
  "data": {
    "sessionId": "string - Use this for follow-up messages",
    "reply": "string - AI response in markdown format",
    "userMessage": {
      "id": "string",
      "content": "string - The user's message",
      "createdAt": "ISO date string"
    },
    "assistantMessage": {
      "id": "string",
      "content": "string - AI reply in markdown",
      "createdAt": "ISO date string"
    },
    "isNewSession": "boolean - true if this created a new session"
  }
}
```

**Response (Error - 400):**
```json
{
  "status": "error",
  "message": "userId is required" // or "prompt is required and cannot be empty"
}
```

**Response (Error - 404):**
```json
{
  "status": "error",
  "message": "Chat session not found or access denied"
}
```

**Response (Error - 503):**
```json
{
  "status": "error",
  "message": "Cannot connect to Ollama. Please ensure Ollama is running..."
}
```

**Frontend Handling:**
- If `isNewSession: true` → Store the `sessionId` for future messages in this conversation
- If `isNewSession: false` → Continue using the same `sessionId`
- Display `reply` using a markdown renderer
- Show loading state while waiting for response (can take 2-30 seconds)

---

### **2. Get All Chat Sessions (History)**

**Endpoint:** `GET /v1/ai/sessions?userId={userId}`

**When to use:**
- User clicks "History" button
- Loading the history sidebar
- Showing list of previous conversations

**Query Parameters:**
- `userId` (required) - The current user's ID

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Chat sessions retrieved successfully",
  "data": {
    "sessions": [
      {
        "id": "string - Session ID",
        "title": "string - Auto-generated title (e.g., '7-Day Vegetarian Diet Plan')",
        "preview": "string - First 100 chars of first user message",
        "lastMessageAt": "ISO date string - When last message was sent",
        "createdAt": "ISO date string - When session was created",
        "updatedAt": "ISO date string"
      },
      // ... more sessions
    ]
  }
}
```

**Response (Error - 400):**
```json
{
  "status": "error",
  "message": "userId is required"
}
```

**Frontend Handling:**
- Display sessions in a list/sidebar
- Sort by `lastMessageAt` (most recent first) - backend already sorts this way
- Show `title` as the main text
- Show `preview` as subtitle or tooltip
- Show `lastMessageAt` formatted as relative time (e.g., "2 hours ago")
- When user clicks a session → Call endpoint #3 to load messages

---

### **3. Get Messages in a Session**

**Endpoint:** `GET /v1/ai/sessions/{sessionId}/messages?userId={userId}`

**When to use:**
- User clicks on a session from history
- Loading a specific conversation thread
- Displaying full conversation in chat window

**Path Parameters:**
- `sessionId` (required) - The session ID from the sessions list

**Query Parameters:**
- `userId` (required) - The current user's ID

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Messages retrieved successfully",
  "data": {
    "session": {
      "id": "string",
      "title": "string - Session title",
      "createdAt": "ISO date string"
    },
    "messages": [
      {
        "id": "string",
        "role": "user" | "assistant",
        "content": "string - Message content (markdown for assistant)",
        "createdAt": "ISO date string"
      },
      // ... more messages in chronological order
    ]
  }
}
```

**Response (Error - 404):**
```json
{
  "status": "error",
  "message": "Chat session not found or access denied"
}
```

**Frontend Handling:**
- Display messages in chronological order (already sorted by backend)
- Show user messages on one side (e.g., right side)
- Show assistant messages on other side (e.g., left side)
- Render `content` as markdown for assistant messages
- Render `content` as plain text for user messages
- Use `createdAt` to show timestamps
- Set this `sessionId` as the active session for continued conversation

---

### **4. Delete a Chat Session**

**Endpoint:** `DELETE /v1/ai/sessions/{sessionId}`

**When to use:**
- User clicks "Delete" on a session
- User swipes to delete (mobile)
- Confirmation dialog after user confirms deletion

**Path Parameters:**
- `sessionId` (required) - The session ID to delete

**Request Body:**
```json
{
  "userId": "string (required)"
}
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Chat session deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "status": "error",
  "message": "Chat session not found or access denied"
}
```

**Frontend Handling:**
- Show confirmation dialog before deleting
- After successful deletion → Remove from UI list
- If deleted session was active → Clear chat window and reset to "new chat" state

---

## 🎨 UI/UX Recommendations

### **Chat Screen Layout**

```
┌─────────────────────────────────────┐
│  [History Button]  AI Chat Assistant │
├─────────────────────────────────────┤
│                                     │
│  [AI Message]                       │
│  Hello! I'm your nutrition...       │
│                                     │
│                    [User Message]   │
│                    Create a diet... │
│                                     │
│  [AI Message]                       │
│  ## 7-Day Diet Plan                │
│  ### Day 1                         │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  [Type message...]  [Send Button] │
└─────────────────────────────────────┘
```

### **History Sidebar**

```
┌──────────────────────┐
│  Chat History        │
│  [X Close]           │
├──────────────────────┤
│  📝 7-Day Vegetarian │
│     Diet Plan        │
│     2 hours ago      │
├──────────────────────┤
│  📝 Protein Sources   │
│     Yesterday        │
├──────────────────────┤
│  📝 Meal Prep Tips    │
│     3 days ago       │
└──────────────────────┘
```

### **Key UI States**

1. **New Chat State**
   - No active `sessionId`
   - Empty message list
   - Placeholder: "Ask me anything about diet and nutrition..."

2. **Active Conversation State**
   - Has active `sessionId`
   - Messages displayed
   - Input field ready for new message

3. **Loading State**
   - Show spinner/loading indicator
   - Disable send button
   - Display "AI is thinking..." message

4. **Error State**
   - Show error message from API
   - Allow retry
   - For 503 errors: "AI service unavailable. Please try again later."

---

## 📱 Frontend State Management

### **Recommended State Variables**

```javascript
// Session Management
currentSessionId: null | string
isNewChat: boolean

// Messages
messages: Array<{
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}>

// History
sessions: Array<{
  id: string
  title: string
  preview: string
  lastMessageAt: string
}>

// UI State
isLoading: boolean
error: string | null
```

### **State Flow**

1. **User opens chat** → `currentSessionId = null`, `messages = []`
2. **User sends first message** → API returns `isNewSession: true` → Store `sessionId`
3. **User sends follow-up** → Include `sessionId` in request → Continue same session
4. **User clicks history** → Load sessions list → Display in sidebar
5. **User clicks session** → Load messages → Set `currentSessionId` → Display messages
6. **User starts new chat** → Reset `currentSessionId = null`, `messages = []`

---

## 🎯 Implementation Checklist

### **Chat Screen**
- [ ] Input field for user messages
- [ ] Send button (disabled while loading)
- [ ] Message list with user/assistant styling
- [ ] Markdown renderer for AI responses
- [ ] Loading indicator during API calls
- [ ] Error message display
- [ ] Auto-scroll to latest message

### **History Feature**
- [ ] History button/icon
- [ ] Sidebar/drawer for sessions list
- [ ] Session list items with title, preview, timestamp
- [ ] Click handler to load session messages
- [ ] Delete session functionality
- [ ] Empty state when no history

### **Session Management**
- [ ] Store `sessionId` when `isNewSession: true`
- [ ] Include `sessionId` in follow-up messages
- [ ] Clear `sessionId` when starting new chat
- [ ] Handle session switching (load new session messages)

### **Error Handling**
- [ ] Handle 400 errors (validation)
- [ ] Handle 404 errors (session not found)
- [ ] Handle 503 errors (Ollama unavailable)
- [ ] Show user-friendly error messages
- [ ] Retry mechanism for transient errors

### **Markdown Rendering**
- [ ] Install markdown renderer (e.g., `react-markdown`, `marked`)
- [ ] Render headings, lists, tables
- [ ] Style markdown content appropriately
- [ ] Handle code blocks if needed (unlikely for diet plans)

---

## ⚡ Performance Tips

1. **Debounce History Loading**
   - Don't reload history on every message
   - Refresh only when user opens history sidebar

2. **Optimistic UI Updates**
   - Show user message immediately (before API response)
   - Update with actual message data when API returns

3. **Lazy Load History**
   - Load sessions list only when user clicks "History"
   - Don't fetch all sessions on chat screen load

4. **Cache Session Messages**
   - Cache loaded session messages in memory
   - Only refetch if session was updated elsewhere

5. **Pagination (Future)**
   - If user has 100+ sessions, consider pagination
   - Currently backend returns all sessions (fine for most users)

---

## 🔄 Typical User Flows

### **Flow 1: New Conversation**

1. User opens chat → Empty state
2. User types: "Create a 7-day vegetarian diet plan"
3. Frontend sends: `POST /v1/ai/chat` with `{ userId, prompt }` (no sessionId)
4. Backend creates session, generates reply, starts title generation
5. Frontend receives: `{ sessionId, reply, isNewSession: true }`
6. Frontend stores `sessionId`, displays reply
7. User continues: "Can you add more protein?"
8. Frontend sends: `POST /v1/ai/chat` with `{ userId, prompt, sessionId }`
9. Backend uses full conversation context, responds
10. Frontend displays new reply

### **Flow 2: Viewing History**

1. User clicks "History" button
2. Frontend sends: `GET /v1/ai/sessions?userId=xxx`
3. Backend returns list of sessions with titles
4. Frontend displays sessions in sidebar
5. User clicks on "7-Day Vegetarian Diet Plan"
6. Frontend sends: `GET /v1/ai/sessions/{sessionId}/messages?userId=xxx`
7. Backend returns all messages in chronological order
8. Frontend displays full conversation
9. User can continue chatting (uses same sessionId)

### **Flow 3: Starting Fresh**

1. User is in an active conversation
2. User clicks "New Chat" button
3. Frontend resets: `currentSessionId = null`, `messages = []`
4. User types new message
5. Frontend sends request without `sessionId`
6. Backend creates new session
7. Process continues as Flow 1

---

## 🎨 Markdown Rendering Example

**AI Response (from API):**
```markdown
## 7-Day Vegetarian Diet Plan

### Day 1
- **Breakfast**: Oatmeal with berries
- **Lunch**: Quinoa salad
- **Dinner**: Lentil curry

### Day 2
...
```

**Rendered Output:**
- Large heading: "7-Day Vegetarian Diet Plan"
- Medium heading: "Day 1"
- Bullet list with bold items
- Clean, readable formatting

**Recommendation:**
Use a library like:
- `react-markdown` (React)
- `marked` + `DOMPurify` (vanilla JS)
- `markdown-it` (Vue/React)

---

## ⚠️ Important Notes

1. **Title Generation is Async**
   - Title may be "New Chat" initially
   - Updates to actual title after a few seconds
   - Refresh history list to see updated title

2. **Response Times Vary**
   - Simple questions: 2-5 seconds
   - Complex diet plans: 15-30 seconds
   - Show loading indicator during wait

3. **Markdown is Always Present**
   - All AI responses are markdown
   - User messages are plain text
   - Always render assistant messages as markdown

4. **Session Context is Maintained**
   - AI remembers entire conversation
   - Backend handles context automatically
   - Frontend just needs to include `sessionId`

5. **Error Messages are User-Friendly**
   - Backend provides actionable error messages
   - Display them directly to users
   - For 503 errors, suggest checking Ollama service

---

## 🚀 Quick Start Summary

1. **Send Message**: `POST /v1/ai/chat` with `userId` and `prompt`
2. **Store SessionId**: Save `sessionId` from response for follow-ups
3. **Continue Chat**: Include `sessionId` in subsequent requests
4. **Load History**: `GET /v1/ai/sessions?userId=xxx`
5. **Load Messages**: `GET /v1/ai/sessions/{id}/messages?userId=xxx`
6. **Render Markdown**: Use markdown renderer for AI responses
7. **Handle Errors**: Show user-friendly messages from API

---

## 📞 Support

If you encounter issues:
- Check API response status codes
- Verify `userId` is correct
- Ensure Ollama is running (for 503 errors)
- Check network connectivity
- Review error messages from backend

---

**That's it! You now have everything needed to build a beautiful ChatGPT-style diet assistant UI.** 🎉








