🛠️ MYLG! App (Making You Look Good)

The MYLG! App is a collaborative project management platform designed for designers, builders, and clients to plan, present, and execute projects seamlessly. Built with React, TypeScript, AWS Amplify, and WebSockets, it combines structured project management tools with real-time communication and visually intuitive design.

✨ Features

- **Global Search**: Unified search across projects and messages with keyboard navigation
- **Projects & Budgets**: Structured project pages with timeline, budget, and floorplans

Structured project pages with timeline, budget, and floorplans

Auto-generated element IDs and budget line tracking (with payment terms, PO, and invoice support)

File upload/download (CSV, floorplans, user assets)

Messaging & Collaboration

Real-time WebSocket messaging with optimistic UI

Project threads and direct messages

Notifications with deduplication logic

Role-based access (Admin, CEO, CTO, Designers, Clients, Workers)

Interactive Tools

Calendar integration for task planning and time-blocking

Lexical-based rich text editor for project notes and proposals with real-time collaboration

Support for voice notes and (planned) voice recognition

Architecture

Frontend: React + TypeScript + custom Webpack/Vite setup

Backend: AWS Amplify, DynamoDB, API Gateway WebSocket, Lambda functions

Auth: AWS Cognito with role claims injected at token issuance

Storage: Amazon S3 for files and assets

🚀 Roadmap

Multi-user calendar sharing and task scheduling

AI-assisted design chat (exploring GPT-J via AWS Bedrock)

Improved rendering workflows for 2D/3D assets

## 📖 Technical Documentation

### 🧪 Dashboard Preview Mode (Dev Only)
When running the frontend locally (`npm run dev`), you can load the dashboard layout without authenticating. Append one of the following query parameters to any `/dashboard` URL:

- `?dashboardPreview` (implicit on)
- `?dashboardPreview=off` (turns it off for the current tab)
- `?preview=dashboard` (alternate shorthand)

Example: `http://localhost:5173/dashboard?dashboardPreview`

The flag is stored in `sessionStorage`, so the preview stays enabled for the current tab until you close it or explicitly disable it. The mode is ignored in production builds and is intended strictly for layout/UX verification—data that normally requires authentication will not load.

### Lexical Editor System
For detailed technical information about the real-time collaborative editor:

- **[Lexical Editor Architecture](./LEXICAL_EDITOR_ARCHITECTURE.md)** - Complete technical analysis including content hydration, YJS WebSocket server role, data persistence, and improvement recommendations
- **[Editor Flow Diagrams](./LEXICAL_EDITOR_DIAGRAMS.md)** - Visual diagrams showing data flow, component relationships, and system architecture
- **[Editor Summary](./LEXICAL_EDITOR_SUMMARY.md)** - Executive summary with actionable recommendations and implementation roadmap

### Key Technical Features
- **Real-time Collaboration**: Operational transforms via Yjs for conflict-free editing
- **Multi-layer Persistence**: IndexedDB for offline support + DynamoDB for permanent storage  
- **Performance Optimization**: Debounced updates and intelligent batching
- **Security**: JWT authentication for WebSocket connections (planned improvements)
- **Scalability**: Architecture supports 100+ concurrent users per document