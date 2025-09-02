# Wellio Backend (Dev Branch)

Backend API for Wellio - Diet Tracking Application - Development Environment

## Features

- 🚀 Express.js server
- 🗄️ MongoDB integration with Mongoose
- 📚 Swagger API documentation
- 🔒 Security middleware (Helmet, CORS)
- 📝 Request logging with Morgan
- 🔄 Hot reload with Nodemon (development)
- ⚡ Health check endpoint

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB connection string if needed

5. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload

## API Endpoints

- `GET /` - Welcome message
- `GET /v1` - API v1 base endpoint
- `GET /health` - Health check
- `GET /api-docs` - Swagger API documentation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/wellio |
| `NODE_ENV` | Environment mode | development |

## Project Structure

```
├── src/
│   ├── config/
│   │   └── swagger.js
│   ├── controllers/
│   ├── middleware/
│   └── routes/
├── index.js
├── package.json
└── README.md
```

## Documentation

API documentation is available at `/api-docs` when the server is running.

## License

ISC
