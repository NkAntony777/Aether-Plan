# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aether Plan** is an AI-powered Universal Planner that supports travel planning, study goals, project management, event organization, and life goals. The project consists of:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js (TypeScript) running on port 3001
- **State Management**: Zustand

## Commands

### Frontend Development
```bash
npm install           # Install dependencies
npm run dev           # Start Vite dev server (port 5173)
npm run build         # Build for production
npm run lint          # Run ESLint
npm run preview       # Preview production build
```

### Backend Development
```bash
cd server
npm install           # Install server dependencies
npm run dev           # Start backend with tsx watch (port 3001)
npm run build         # Compile TypeScript
npm run start         # Start compiled server
```

### Windows Scripts (root folder)
- `start.bat` - Start both frontend and backend
- `stop.bat` - Stop running servers
- `dev-frontend.bat` - Run frontend only
- `dev-backend.bat` - Run backend only
- `build.bat` - Build both frontend and backend

## Architecture

### Frontend Structure (`src/`)
- `components/chat/` - Chat UI components (ChatContainer, MessageBubble, InputArea, MessageList)
- `components/widgets/` - Interactive widgets (MapWidget, HotelSearchWidget, FlightResultsWidget, TrainResultsWidget, DateRangeWidget, etc.)
- `components/settings/` - Settings modal
- `hooks/` - Custom hooks (useAutoScroll, useSmartChat, useLLM)
- `services/` - API and LLM services (aiService, smartChatService, llm/)
- `stores/` - Zustand state stores
- `types/` - TypeScript type definitions
- `router/` - Route definitions

### Backend Structure (`server/src/`)
- `index.ts` - Main Express server with API endpoints
- `12306/` - 12306 train ticket service integration

### Key Integrations
- **Amap (HighNavi)**: POI search, geocoding, route planning
- **12306**: Real-time Chinese train ticket queries
- **Amadeus**: Global flight data

### LLM Integration
Supports multiple LLM providers configured via environment variables:
- **Ollama** (recommended, free, local) - Set `VITE_LLM_PROVIDER=ollama`
- **OpenAI** - Set `VITE_LLM_PROVIDER=openai` with API key
- **Claude** - Set `VITE_LLM_PROVIDER=claude` with API key

Configuration via `.env` files (root and server folders).

### Key Services
- `aiService.ts` - AI initialization, intent detection, smart response generation
- `smartChatService.ts` - Smart chat management with session handling
- `llm/` - LLM provider abstraction layer

### State Management
Zustand stores in `stores/` manage application state including chat messages, widget states, and user preferences.

## Tambo AI Integration

The project includes optional **Tambo AI** integration for generative UI capabilities. Tambo enables AI-driven dynamic UI components and tool calling within chat interactions.

### Tambo Module Structure (`src/tambo/`)
- `index.ts` - Main entry point, exports all Tambo modules
- `provider.tsx` - `AetherTamboProvider` wrapper component
- `components.ts` - Tambo-wrapped widget components (MapWidget, FlightResultsWidget, etc.)
- `tools.ts` - Local AI tools (searchFlights, searchTrains, searchHotels, etc.)
- `schemas.ts` - Zod schemas for widget data validation
- `mcp-servers.ts` - Optional MCP server configuration
- `interactables/` - AI-controllable component wrappers

### Tambo Components
All existing widgets are wrapped as `TamboComponent` objects for AI-driven UI:
- **Travel Widgets**: MapWidget, DateRangeWidget, FlightResultsWidget, TrainResultsWidget, HotelSearchWidget, PlaceCardsWidget
- **Utility Widgets**: ChecklistWidget, MarkdownCardWidget, ResourceListWidget, RadioCardsWidget, TextInputWidget

### Tambo Tools
Local AI tools for travel and planning services:
- `search_flights` - Flight search via Amadeus API
- `search_trains` - Train ticket search via 12306 API
- `search_hotels` - Hotel search via Amap POI
- `search_places` - Place recommendations via Amap POI
- `geocode` - Address to coordinates via Amap
- `web_search` - Web search via Brave Search
- `search_around` - Nearby POI search
- `calculate_route` - Driving route calculation

### MCP Server Configuration (Optional)
The `mcp-servers.ts` module provides Model Context Protocol (MCP) server configurations:
- **Brave Search** - Web search capabilities
- **Fetch** - URL fetching and content extraction
- **Filesystem** - Local file access (disabled by default)
- **Memory** - Persistent storage
- **Sequential Thinking** - Structured problem solving
- **Puppeteer** - Browser automation
- **Aether Plan Custom** - Travel-specific tools

### Environment Configuration
Add to `.env` file:
```bash
# Tambo AI Configuration (Generative UI)
VITE_TAMBO_API_KEY=your-tambo-api-key
# VITE_TAMBO_API_URL=https://api.tambo.ai
# VITE_TAMBO_DEBUG=true

# MCP Configuration (Optional)
# VITE_MCP_ENABLED=true
# VITE_MCP_SERVERS=brave-search,fetch
```

### Usage in App
Wrap your app with `AetherTamboProvider`:
```tsx
import { AetherTamboProvider } from './tambo/provider';

function App() {
  return (
    <AetherTamboProvider userKey="user-123">
      <TamboChatContainer />
    </AetherTamboProvider>
  );
}
```

### Chat Containers
Two chat container options are available:
- `ChatContainer` - Standard chat with local LLM (Ollama/OpenAI/Claude)
- `TamboChatContainer` - Tambo-powered chat with generative UI

Use the toggle in SettingsModal to switch between modes.

## Auto-Develop Harness

This project uses an automated development harness for iterative development across sessions.

### Harness Files
- `data/tasks.json` - Task queue with pending/completed status
- `data/features.json` - Feature tracking
- `data/claude-progress.txt` - Session progress log
- `prompts/` - Prompt templates (initializer.md, coding.md, task-runner.md)
- `harness/run.ps1` - Run single task
- `harness/loop.ps1` - Iterative execution loop

### Session Workflow

1. **Start of session**: Read `data/tasks.json` and `data/claude-progress.txt`
2. **Implementation**: Complete ONE task from the queue
3. **End of session**:
   - Commit changes: `git add . && git commit -m "feat: description"`
   - Update `data/tasks.json` (mark task completed)
   - Update `data/claude-progress.txt` with notes

### Using the Harness

```powershell
# Run a specific task
.\harness\run.ps1 -TaskId 1

# Run iterative loop (manual execution in external terminal)
.\harness\loop.ps1 -Count 5

# Dry run to see what would execute
.\harness\loop.ps1 -Count 3 -DryRun
```

### Important Rules
- **One task per session**: Never try to do more than one
- **Test before commit**: Always verify the code works
- **Leave it working**: Never leave the codebase broken
- **Update progress**: Always update tasks.json and progress file
