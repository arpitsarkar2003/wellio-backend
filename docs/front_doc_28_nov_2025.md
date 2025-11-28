# Wellio Backend API Documentation (Nov 28, 2025)

Base URL: `http://wellio-backend.vercel.app/v1`

## 1. Authentication (`/auth`)

### Signup
*   **Method:** `POST`
*   **URL:** `/auth/signup`
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "mypassword123",
      "name": "John Doe",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe"
    }
    ```
*   **Response:**
    ```json
    {
      "status": "success",
      "message": "User account created successfully",
      "data": {
        "user": {
          "id": "...",
          "name": "John Doe",
          "username": "johndoe",
          "firstName": "John",
          "lastName": "Doe",
          "email": "...",
          "isVerified": false
        }
      }
    }
    ```

### Login (Step 1)
*   **Method:** `POST`
*   **URL:** `/auth/login`
*   **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "mypassword123"
    }
    ```
*   **Response:**
    ```json
    {
      "status": "success",
      "message": "OTP sent to your email address",
      "data": {
        "tempAuthToken": "eyJhbGciOiJIUzI1Ni..."
      }
    }
    ```

### Verify OTP (Step 2)
*   **Method:** `POST`
*   **URL:** `/auth/verify-otp`
*   **Request Body:**
    ```json
    {
      "token": "temp_auth_token_from_login_step",
      "otp": "123456"
    }
    ```
*   **Response:**
    ```json
    {
      "status": "success",
      "message": "Authentication successful",
      "data": {
        "tokens": {
          "accessToken": "...",
          "refreshToken": "...",
          "expiresIn": "1h"
        },
        "user": { ... }
      }
    }
    ```

### Google Login
*   **Method:** `POST`
*   **URL:** `/auth/google-login`
*   **Request Body:**
    ```json
    {
      "googleToken": "google_id_token"
    }
    ```
*   **Response:** (Same as Verify OTP - returns tokens)

### Refresh Token
*   **Method:** `POST`
*   **URL:** `/auth/refresh-token`
*   **Headers:** `Authorization: Bearer <refresh_token>`
*   **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "accessToken": "...",
        "refreshToken": "..."
      }
    }
    ```

### Get My Profile
*   **Method:** `GET`
*   **URL:** `/auth/profile`
*   **Headers:** `Authorization: Bearer <access_token>`
*   **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "id": "...",
        "name": "John Doe",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "email": "...",
        "profile": {
           "phoneNumber": "...",
           "address": { ... },
           "physicalInfo": { ... }
        }
      }
    }
    ```

### Logout
*   **Method:** `POST`
*   **URL:** `/auth/logout`
*   **Headers:** `Authorization: Bearer <access_token>`

---

## 2. User Management (`/user`)

### Update Profile
*   **Method:** `PUT`
*   **URL:** `/user/profile`
*   **Headers:** `Authorization: Bearer <access_token>`
*   **Request Body:**
    ```json
    {
      "phoneNumber": "+1234567890",
      "address": {
        "street1": "123 St",
        "city": "NY",
        "state": "NY",
        "pincode": "10001"
      },
      "physicalInfo": {
        "currentWeight": 70,
        "currentHeight": 175,
        "weightUnit": "kg",
        "heightUnit": "cm"
      }
    }
    ```

### Forgot Password
*   **Method:** `POST`
*   **URL:** `/user/forgot-password`
*   **Request Body:** `{"email": "user@example.com"}`

### Reset Password
*   **Method:** `POST`
*   **URL:** `/user/reset-password`
*   **Request Body:**
    ```json
    {
      "resetToken": "token_from_email",
      "newPassword": "new_password"
    }
    ```

---

## 3. Public Data

### Get Company Info
*   **Method:** `GET`
*   **URL:** `/company`
*   **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "company": {
          "name": "Wellio",
          "logo": { "imageUrl": "..." },
          "contactInfo": { ... }
        }
      }
    }
    ```

### Get Privacy Policy
*   **Method:** `GET`
*   **URL:** `/policy/privacy-policy`
*   **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "policy": {
          "content": "# Markdown Content...",
          "lastUpdated": "..."
        }
      }
    }
    ```

### Get Terms & Conditions
*   **Method:** `GET`
*   **URL:** `/policy/terms-conditions`

---

## 4. Admin (`/admin`)

### Admin Login
*   **Method:** `POST`
*   **URL:** `/admin/login`
*   **Request Body:**
    ```json
    {
      "username": "admin",
      "password": "password"
    }
    ```

### Get Admin Profile
*   **Method:** `GET`
*   **URL:** `/admin/profile`
*   **Headers:** `Authorization: Bearer <admin_token>`

### Update Company Info
*   **Method:** `PUT`
*   **URL:** `/admin/company`
*   **Headers:** `Authorization: Bearer <admin_token>`
*   **Request Body:** (See Company Model)

### Upload Policy
*   **Method:** `POST`
*   **URL:** `/admin/policy/privacy-policy` (or `/terms-conditions`)
*   **Headers:** `Authorization: Bearer <admin_token>`
*   **Request Body:**
    ```json
    {
      "title": "Privacy Policy",
      "content": "# Markdown...",
      "changes": "Updated section X"
    }
    ```
