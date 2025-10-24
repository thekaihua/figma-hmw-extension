# HMW Figma Extension

A Figma plugin extension with an AI-powered backend for "How Might We" question generation and design ideation.

## Project Structure

This is a monorepo containing:
- **`/plugin`** - Figma plugin (frontend)
- **`/backend`** - Express + LangChain API server

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Figma desktop app
- Anthropic API key

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd figma-hmw-extension
   ```

2. Install plugin dependencies:
   ```bash
   cd plugin
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   ```

4. Configure backend environment:
   ```bash
   cp .env.example .env
   # Add your Anthropic API key to .env
   ```

## Development Workflow

### Plugin Development

1. Build the plugin:
   ```bash
   cd plugin
   npm run build
   ```

2. Watch mode for development:
   ```bash
   npm run watch
   ```

3. Load the plugin in Figma:
   - Open Figma desktop app
   - Go to `Plugins` → `Development` → `Import plugin from manifest...`
   - Select `plugin/manifest.json`

### Backend Development

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Server will run on `http://localhost:3000`

## Detailed Project Structure

```
figma-hmw-extension/
├── plugin/
│   ├── manifest.json      # Figma plugin configuration
│   ├── package.json       # Plugin dependencies
│   ├── tsconfig.json      # Plugin TypeScript config
│   ├── build.js           # Build script
│   ├── src/
│   │   ├── code.ts        # Plugin main code
│   │   └── ui.html        # Plugin UI
│   └── dist/              # Compiled plugin output
│
├── backend/
│   ├── package.json       # Backend dependencies
│   ├── tsconfig.json      # Backend TypeScript config
│   ├── .env.example       # Environment template
│   ├── src/
│   │   ├── index.ts       # Express server entry
│   │   ├── routes/        # API routes
│   │   ├── agents/        # LangChain agents
│   │   └── config/        # Configuration
│   └── dist/              # Compiled backend output
│
└── README.md              # This file
```

## How It Works

### Plugin Architecture
- **Main Thread (`plugin/src/code.ts`)**: Runs in Figma's sandbox with access to the document API
- **UI Thread (`plugin/src/ui.html`)**: Runs in an iframe and handles user interaction
- Communication between threads happens via `postMessage` API

### Backend Architecture
- **Express Server**: REST API for AI processing
- **LangGraph**: Stateful agent orchestration with workflow control
- **LangChain Core**: Base primitives for LLM interactions
- **Anthropic Claude**: AI model for HMW question generation

## License

MIT
