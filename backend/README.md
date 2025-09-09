# MYLG Backend v2

A serverless backend architecture using AWS Lambda, API Gateway (HTTP API v2), and WebSocket API.

## Architecture Overview

### HTTP API (v2) with Domain-Based Routing
- **3 router Lambdas** with proxy prefixes for domain isolation:
  - `ANY /auth/{proxy+}` → `auth-router`
  - `ANY /projects/{proxy+}` → `projects-router` 
  - `ANY /messages/{proxy+}` → `messages-router`

### WebSocket API
- **Single `ws-provider` Lambda** handling:
  - `$connect` - Connection establishment
  - `$disconnect` - Connection cleanup
  - `$default` - Default message handler
  - `sendMessage` - Custom message routing

### Shared Layer
- **Lambda Layer** at `/opt/nodejs/utils/` containing:
  - CORS helpers for dynamic origin handling
  - Authentication utilities
  - Response formatting helpers

## Key Benefits

- **Blast radius containment** - Each domain (auth/projects/messages) is isolated
- **WebSocket isolation** - WS logic separated from HTTP APIs
- **Shared CORS handling** - Consistent CORS across all endpoints
- **Fast cold starts** - Minimal dependencies per function

## Project Structure

```
backend/
├── serverless.yml              # Serverless Framework configuration
├── package.json                # Dependencies and scripts
├── shared-layer/               # Lambda Layer
│   └── nodejs/utils/
│       └── cors.mjs           # CORS utilities
├── auth/
│   └── index.mjs              # Authentication router
├── projects/
│   └── index.mjs              # Projects router
├── messages/
│   └── index.mjs              # Messages router
└── ws/
    └── index.mjs              # WebSocket provider
```

## Environment Variables

- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS

## Deployment

```bash
# Install dependencies
npm install

# Deploy to dev
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Remove stack
npm run remove
```

## Local Development

```bash
# Run locally with serverless-offline
npm install -g serverless
npm install
serverless offline
```

## API Routes

### Authentication (`/auth/*`)
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user

### Projects (`/projects/*`)
- `GET /projects/list` - List projects
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project
- `PATCH /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project
- `GET /projects/{id}/budget` - Get project budget
- `PATCH /projects/{id}/budget` - Update project budget

### Messages (`/messages/*`)
- `GET /messages/conversations` - List conversations
- `POST /messages/conversations` - Create conversation
- `GET /messages/conversations/{id}` - Get conversation
- `GET /messages/conversations/{id}/messages` - Get messages
- `POST /messages/conversations/{id}/messages` - Send message
- `PATCH /messages/{id}` - Update message
- `DELETE /messages/{id}` - Delete message

### WebSocket
- Connection with auth token via query string
- Real-time message delivery
- Connection management
