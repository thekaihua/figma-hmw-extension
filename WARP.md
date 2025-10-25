# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **monorepo** containing a Figma plugin with an AI-powered backend for "How Might We" (HMW) question ideation. The system generates diverse solution ideas using LangChain and LLM providers (Anthropic Claude or Google Gemini).

**Two main components:**
- **`/plugin`** - Figma plugin (TypeScript, dual-thread architecture)
- **`/backend`** - Express + LangChain API server (Node.js)

## Essential Commands

### Backend Development

```bash
# Setup (first time)
cd backend
npm install
cp .env.example .env    # Then add your API key (Anthropic or Google Gemini)

# Development
npm run dev             # Start dev server with hot reload (uses tsx watch)
npm run build           # Compile TypeScript to dist/
npm start               # Run production build

# Testing the agent directly
npx tsx src/agents/hmwAgent.ts    # Run agent test function
```

**Backend runs on:** `http://localhost:3000`

### Plugin Development

```bash
# Setup (first time)
cd plugin
npm install

# Development
npm run build           # Full build (tsc + HTML bundling)
npm run watch           # Watch mode - only recompiles TypeScript (still need to run bundle after)
npm run bundle          # Bundle HTML into code.js (run after tsc)

# Testing in Figma
# 1. Run `npm run build` first
# 2. In Figma Desktop: Plugins → Development → Import plugin from manifest...
# 3. Select plugin/manifest.json
# 4. After code changes, rebuild and restart plugin in Figma
```

### Development Server Management

**CRITICAL:** Never run the backend server in background mode on macOS (e.g., `npm run dev &`). It will hang due to TTY/job control issues.

**Correct approach:**
1. Open a separate terminal window/tab
2. Navigate to `backend/`
3. Run `npm run dev` in foreground
4. Keep it running while developing

## Architecture

### Plugin Architecture (Dual-Thread Model)

Figma plugins run on two isolated threads that communicate via `postMessage`:

**1. Main Thread** (`plugin/src/code.ts`):
- Runs in Figma's sandbox
- Has full access to Figma Document API (`figma.*`)
- **Cannot** make network requests or access browser APIs
- Handles document manipulation (creating/modifying nodes)

**2. UI Thread** (`plugin/src/ui.html`):
- Runs in an isolated iframe
- Has access to standard web APIs (DOM, fetch, etc.)
- **Cannot** access Figma Document API
- Handles UI and makes API calls to backend

**Communication:**
- UI → Main: `parent.postMessage({ pluginMessage: {...} }, '*')`
- Main → UI: `figma.ui.postMessage({...})`
- Main listens: `figma.ui.onmessage = (msg) => {...}`

### Plugin Build Process

The plugin has a **critical custom build step**:

1. `tsc` compiles `src/code.ts` → `dist/code.js`
2. Custom `build.js` script:
   - Reads `src/ui.html`
   - Injects HTML as a string into `dist/code.js` (replaces `__html__` placeholder)
   - Copies `ui.html` to `dist/`

This is why `code.ts` can reference `__html__`—it's replaced during bundling.

**Important:** Always run `npm run build` (not just `tsc`) to ensure HTML bundling happens.

### Backend Architecture

**Tech Stack:**
- Express server with CORS and JSON middleware
- LangChain Core for LLM interactions
- LangChain integrations: `@langchain/anthropic`, `@langchain/google-genai`
- Structured output parsing with Zod schemas
- TypeScript with tsx for development

**Request Flow:**
1. Plugin UI calls `POST /api/hmw/generate` with HMW statement
2. Route validates input (`routes/hmw.ts`)
3. Agent orchestrates LLM call (`agents/hmwAgent.ts`)
4. LLM generates 3 diverse ideas (technical/service/behavioral)
5. Structured output parsed and validated via Zod
6. Response returned to plugin

**LLM Provider Configuration:**
- Set `LLM_PROVIDER=anthropic` or `LLM_PROVIDER=gemini` in `.env`
- Default: Gemini (free tier available)
- Anthropic: Claude 3.5 Sonnet
- Gemini: 2.5 Flash model

### API Endpoints

```
GET  /health              # Health check
GET  /api/test            # API test endpoint
POST /api/hmw/generate    # Generate 3 HMW ideas
```

**HMW Generate Request:**
```json
{
  "hmw": "How might we help users save time during onboarding?"
}
```

**HMW Generate Response:**
```json
{
  "ideas": [
    {
      "title": "Smart Pre-fill",
      "description": "Auto-populate forms using...",
      "approach": "technical"
    },
    {
      "title": "Concierge Onboarding",
      "description": "Provide guided tours...",
      "approach": "service"
    },
    {
      "title": "Gamified Progress",
      "description": "Motivate completion through...",
      "approach": "behavioral"
    }
  ]
}
```

## Key Files

### Plugin
- `plugin/manifest.json` - Plugin configuration, network access settings
- `plugin/src/code.ts` - Main thread logic
- `plugin/src/ui.html` - UI with embedded CSS/JS
- `plugin/build.js` - Custom HTML bundler
- `plugin/WARP.md` - Plugin-specific rules (read this for plugin work)

### Backend
- `backend/src/index.ts` - Express server entry point
- `backend/src/routes/hmw.ts` - API route handlers with validation
- `backend/src/agents/hmwAgent.ts` - LangChain agent orchestration
- `backend/.env` - Environment configuration (not in git)
- `backend/.env.example` - Environment template

## Development Constraints

### Plugin Constraints
- **No external network access** by default (configured in manifest)
- Network access only to `http://localhost:3000` in development mode
- UI thread cannot access Figma API
- Main thread cannot make network requests
- All npm packages must be bundled (no runtime imports)

### Backend Constraints
- Requires API key for LLM provider (Anthropic or Google)
- API calls can take 10-30 seconds for LLM generation
- CORS configured for Figma and localhost origins

## Common Patterns

### Adding New Plugin Features

When adding Figma document manipulation:
1. Add UI controls in `plugin/src/ui.html`
2. Send message from UI: `parent.postMessage({ pluginMessage: { type: 'action-name', data } }, '*')`
3. Handle in `plugin/src/code.ts` within `figma.ui.onmessage`
4. Use Figma API: `figma.createRectangle()`, `figma.currentPage.appendChild()`, etc.
5. Rebuild: `npm run build`

### Adding New API Endpoints

1. Create route handler in `backend/src/routes/`
2. Register route in `backend/src/index.ts`
3. Add validation and error handling
4. Update plugin network access in `manifest.json` if needed

### Modifying LLM Behavior

Edit `backend/src/agents/hmwAgent.ts`:
- Adjust `promptTemplate` for different instructions
- Modify `ideaSchema` to change output structure
- Change `temperature` parameter for creativity control
- Switch LLM provider via `.env` configuration
