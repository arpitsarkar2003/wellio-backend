# 🥗 Wellio Diet Tracker Backend

A comprehensive Node.js/Express backend API for the Wellio Diet Tracking Application with user management, super admin features, company management, and policy handling.

## ✨ Features

- 🔐 **User Authentication** - JWT-based authentication with OTP verification
- 🛡️ **Super Admin Management** - Secure admin panel with security question recovery
- 👤 **User Profile Management** - Complete profile system with address and physical info
- 🏢 **Company Management** - Logo upload via ImgBB API and contact management  
- 📋 **Policy Management** - Privacy Policy & Terms & Conditions with Markdown support
- 📚 **API Documentation** - Comprehensive Swagger/OpenAPI documentation
- 🔒 **Security Features** - Rate limiting, CORS, Helmet, token blacklisting
- 📧 **Email Integration** - SMTP support for OTP and notifications

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- SMTP Server (Gmail recommended)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Update .env with your MongoDB and SMTP credentials
   ```

3. **Create initial Super Admin**
   ```bash
   npm run setup
   ```

4. **Start the server**
   ```bash
   # Full version (requires MongoDB)
   npm run dev
   
   # Or development mode without database
   npm run dev-no-db
   ```

## 🔐 Super Admin Setup

### Default Credentials (Change immediately!)

```
Username: wellio_admin
Password: WellioAdmin@2024
Security Question: "Hi, what is your bday?"
Security Answer: "10092003"
```

### Security Question Recovery Flow

1. **Get Security Question**
   ```bash
   POST /v1/admin/security-question
   {
     "username": "wellio_admin"
   }
   ```

2. **Recover Password**
   ```bash
   POST /v1/admin/recover-password
   {
     "username": "wellio_admin",
     "securityAnswer": "10092003",
     "newPassword": "YourNewSecurePassword123"
   }
   ```

## 📋 API Endpoints

### 🔐 Authentication (`/v1/auth`)
- POST `/signup` - User registration
- POST `/login` - User login (sends OTP)
- POST `/verify-otp` - Verify OTP and get tokens
- POST `/google-login` - Google OAuth login
- POST `/refresh-token` - Refresh access token
- POST `/logout` - User logout

### 👤 User Profile (`/v1/user`)
- GET `/profile` - Get user profile
- PUT `/profile` - Update user profile (phone, address, weight, height)
- GET `/:id` - Get user by ID (admin/own)
- POST `/forgot-password` - Request password reset
- POST `/reset-password` - Reset password with token
- DELETE `/account` - Delete user account

### 🛡️ Super Admin (`/v1/admin`)
- POST `/setup` - Create initial super admin (one-time)
- POST `/login` - Super admin login
- POST `/security-question` - Get security question
- POST `/recover-password` - Recover password with security answer
- GET `/profile` - Get admin profile
- PUT `/change-password` - Change admin password
- POST `/logout` - Admin logout
- GET `/sessions` - Get active sessions
- DELETE `/sessions/:id` - Revoke specific session

### 🏢 Company Management (`/v1/admin/company`)
- GET `/` - Get company information
- PUT `/` - Update company information
- POST `/logo` - Upload company logo (base64 → ImgBB)
- DELETE `/logo` - Remove company logo
- POST `/phone` - Add phone number
- POST `/email` - Add email address

### 📋 Policy Management (`/v1/admin/policy`)
- GET `/` - Get all policies
- POST `/privacy-policy` - Upload privacy policy (Markdown)
- POST `/terms-conditions` - Upload terms & conditions (Markdown)
- GET `/:id` - Get policy by ID
- PATCH `/:id/status` - Update policy status
- DELETE `/:id` - Delete policy
- GET `/stats` - Get policy statistics

### 📋 Public Policies (`/v1/policy`)
- GET `/privacy-policy` - Get current privacy policy
- GET `/terms-conditions` - Get current terms & conditions

## 🧪 Available Scripts

```bash
npm start          # Production server
npm run dev        # Development with nodemon  
npm run dev-no-db  # Development without MongoDB
npm run setup      # Create initial super admin
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (3000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `MONGODB_URI_DEV` | Development MongoDB URI | Yes |
| `JWT_1F_SECRET` | 1F auth token secret | Yes |
| `JWT_ACCESS_SECRET` | Access token secret | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes |
| `SMTP_HOST` | SMTP server host | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `IMGBB_API_KEY` | ImgBB API key for uploads | No |

## 🏗️ User Profile Structure

```json
{
  "phoneNumber": "+1234567890",
  "address": {
    "street1": "123 Main St",
    "street2": "Apt 4B", 
    "lane": "Oak Lane",
    "city": "New York",
    "state": "NY",
    "pincode": "123456"
  },
  "physicalInfo": {
    "currentWeight": 70.5,
    "currentHeight": 175.5,
    "weightUnit": "kg",
    "heightUnit": "cm"
  }
}
```

## 📚 API Documentation

- **Swagger UI**: `http://localhost:3000/api-docs`
- **Welcome**: `http://localhost:3000/`
- **Health Check**: `http://localhost:3000/health`
- **API v1 Info**: `http://localhost:3000/v1`

## 🔒 Security Features

- JWT token system (1F, Access, Refresh tokens)
- Super admin security question recovery
- Account lockout after failed attempts
- Token blacklisting and session management
- Rate limiting on sensitive endpoints
- Password hashing with SHA-256
- CORS and Helmet security middleware

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js  
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt
- **Email**: Nodemailer
- **Image Upload**: ImgBB API
- **Validation**: Joi
- **Documentation**: Swagger/OpenAPI

## 🎯 Testing

### Test Super Admin Login
```bash
curl -X POST http://localhost:3000/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "wellio_admin",
    "password": "WellioAdmin@2024"
  }'
```

### Test User Registration
```bash
curl -X POST http://localhost:3000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

## 📄 License

ISC

---

**Built with ❤️ for health and wellness tracking**
