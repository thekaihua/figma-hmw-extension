# Figma HMW Backend

Backend API server for the Figma HMW Extension, built with Express, TypeScript, and LangChain.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Anthropic API key
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### Test Endpoint
```
GET /api/test
```
Returns API status and environment info.

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key (get from console.anthropic.com)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - CORS allowed origins

## Project Structure

```
backend/
├── src/
│   ├── index.ts        # Express server entry point
│   ├── routes/         # API route handlers
│   ├── agents/         # LangChain agent logic
│   └── config/         # Configuration files
├── dist/               # Compiled JavaScript output
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
└── .env               # Environment variables (not in git)
```

## Development

The server uses `tsx` for hot-reload during development. Any changes to TypeScript files will automatically restart the server.

## Dependencies

- **express** - Web server framework
- **@langchain/core** - Core LangChain primitives and interfaces
- **@langchain/anthropic** - Anthropic Claude integration
- **@langchain/langgraph** - LangGraph for agent orchestration (state machines, workflows)
- **dotenv** - Environment variable management
- **cors** - Cross-origin request handling

## LangChain Architecture

This project uses the modern LangChain TypeScript stack:
- **LangChain Core** - Base abstractions for working with LLMs
- **LangGraph** - For building stateful, multi-step agent workflows
- **Anthropic Integration** - Claude AI model access
