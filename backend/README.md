# MYLG Backend v1.2

Serverless backend using AWS Lambda, API Gateway (HTTP API v2), and WebSocket API. Each domain is its own Serverless service for clean isolation and fast iteration.

## Architecture Overview

### HTTP API (v2) with Domain-Based Services
- Router Lambdas per domain with proxy prefixes:
  - `ANY /auth/{proxy+}` → auth service
  - `ANY /projects/{proxy+}` → projects service
  - `ANY /messages/{proxy+}` → messages service
  - `ANY /user{,/...}` → users service

### WebSocket API
- Single `ws` service handling:
  - `$connect` - Connection establishment
  - `$disconnect` - Connection cleanup
  - `$default` - Default message handler
  - `sendMessage` - Custom message routing

### Shared Layer
- Lambda Layer (exported) mounted at `/opt/nodejs/utils/` with:
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
├── package.json                 # Dev dependencies and convenience scripts
├── serverless.common.yml        # Shared env/config across services
├── shared-layer/                # Lambda Layer (exported ARN)
│   └── serverless.yml
├── auth/                        # Auth service (Cognito triggers, authorizer, routes)
│   └── serverless.yml
├── projects/                    # Projects domain router + handlers
│   └── serverless.yml
├── messages/                    # Messages domain router + handlers
│   └── serverless.yml
├── user/                        # Users domain router + handlers
│   └── serverless.yml
└── ws/                          # WebSocket provider (connect/default/etc.)
    └── serverless.yml
```

## Environment Variables

- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
- Others are centrally defined in `backend/serverless.common.yml` and imported per service.

## Deployment

Deploy services independently for faster, smaller stacks.

```bash
# Install once at repo root (optional)
npm install -g serverless

# Then deploy each service from its folder, e.g.:
cd backend/shared-layer && sls deploy --stage dev
cd ../auth && sls deploy --stage dev
cd ../projects && sls deploy --stage dev
cd ../messages && sls deploy --stage dev
cd ../user && sls deploy --stage dev
cd ../ws && sls deploy --stage dev

# Remove a service stack when needed
sls remove --stage dev
```

## Local Development

Run `serverless-offline` from the specific service you’re working on.

```bash
cd backend/projects
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

## Templates & DBS (White‑Label)

- Minimal by design: this repo intentionally avoids checking in large CloudFormation templates to keep the core codebase uncluttered.
- Serverless Framework synthesizes CloudFormation under the hood, so an explicit `AWSTemplateFormatVersion` is not required for current services.
- Optional DBS (Database Stack) will be introduced later, primarily for white‑label deployments. It will live in its own service or template to preserve separation of concerns.

Suggested layout when DBS is needed (example only, not yet included):

```
backend/
└── dbs/
    ├── template.yml   # CloudFormation/SAM template for DB resources
    └── README.md      # Usage and rollout notes per tenant/brand
```

Template header example for DBS (when added):

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: MYLG Database Stack (optional, white‑label)
# Resources:
#   ... DynamoDB tables, indexes, streams, etc.
```

This keeps DBS fully optional: only teams enabling white‑label flows pull in the DBS stack; everyone else avoids extra resources and config noise.
