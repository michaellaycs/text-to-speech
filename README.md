# StandUp Voice

Text-to-Speech application for standup comedians to test and refine their material.

## Overview

StandUp Voice is a web-based text-to-speech tool designed specifically for standup comedians. It allows comedians to quickly convert their written material into audio, providing immediate feedback for timing, flow, and comedic effectiveness before live performance.

## Features

- **Instant Text-to-Speech Conversion** - Convert comedy material to audio within seconds
- **Web-based Audio Playback** - Listen to your material directly in the browser
- **Multiple TTS Providers** - Web Speech API with cloud service fallbacks
- **Session-based Usage** - No account required, temporary storage during browser session
- **File Upload Support** - Import text files in multiple formats
- **Audio Export** - Download MP3 files for offline use

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Git** v2.30.0 or higher
- **VS Code** (recommended for development)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd standup-voice
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Build shared packages:**
   ```bash
   npm run build --workspace=packages/shared
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## Development Commands

### Root Level Commands
- `npm run dev` - Start all services concurrently
- `npm run build` - Build all applications for production
- `npm run test` - Run all test suites
- `npm run typecheck` - TypeScript validation across monorepo
- `npm run lint` - ESLint across all packages
- `npm run clean` - Clean all build artifacts

### Frontend (apps/web)
- `npm run dev:web` - Start frontend development server
- `npm run build:web` - Build frontend for production
- `npm run test:web` - Run frontend tests

### Backend (apps/api)
- `npm run dev:api` - Start backend development server
- `npm run build:api` - Build backend for production
- `npm run test:api` - Run backend tests

## Project Structure

```
standup-voice/
├── apps/
│   ├── web/                    # React frontend application
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API client services
│   │   │   └── styles/         # CSS styles
│   │   └── tests/              # Frontend tests
│   └── api/                    # Express backend application
│       ├── src/
│       │   ├── routes/         # API endpoints
│       │   ├── controllers/    # Request handlers
│       │   ├── services/       # Business logic
│       │   └── config/         # Configuration
│       └── temp-storage/       # Local file storage
├── packages/
│   ├── shared/                 # Shared TypeScript types
│   └── config/                 # Shared configuration
└── docs/                       # Project documentation
```

## Environment Variables

### Frontend (.env or .env.local)
```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_SESSION_TIMEOUT=3600000
```

### Backend (.env)
```bash
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
SESSION_TIMEOUT=3600000
```

### Optional TTS Services
```bash
GOOGLE_TTS_API_KEY=your_api_key_here
AZURE_TTS_API_KEY=your_api_key_here
AZURE_TTS_REGION=eastus
```

## Technology Stack

- **Frontend:** React 18.x + TypeScript + Vite
- **Backend:** Express.js + TypeScript + Winston
- **Testing:** Jest + React Testing Library + Supertest + Playwright
- **Build:** npm workspaces + TypeScript + Vite
- **Styling:** CSS Modules

## API Documentation

### Health Check
```
GET /api/health
```
Returns server health status.

### Text-to-Speech (Coming Soon)
```
POST /api/tts/convert
GET /api/audio/{id}
```

## Testing

### Run Tests
```bash
# All tests
npm run test

# Frontend tests only
npm run test:web

# Backend tests only
npm run test:api

# Watch mode
npm run test:watch
```

### Test Structure
- **Unit tests:** `*.test.ts` files alongside source code
- **Integration tests:** `tests/integration/` directories
- **E2E tests:** `apps/web/tests/e2e/`

## Troubleshooting

### Common Issues

**Port already in use:**
- Frontend (3000): Change `VITE_PORT` in frontend package.json
- Backend (5000): Change `PORT` in .env file

**TypeScript errors:**
```bash
npm run typecheck
```

**Dependencies out of sync:**
```bash
npm run clean
npm install
```

**Hot reload not working:**
- Check that both servers are running
- Verify CORS_ORIGIN matches frontend URL
- Clear browser cache

### Development Performance Targets
- Frontend dev server startup: < 3 seconds
- Backend hot reload: < 2 seconds
- Full monorepo typecheck: < 10 seconds
- Test suite execution: < 30 seconds

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run the test suite: `npm run test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Create an issue on GitHub
- Review the project documentation in `/docs`