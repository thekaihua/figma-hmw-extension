# HMW Diverger - Figma Plugin

An AI-powered Figma plugin that generates diverse, actionable UI/UX prototype ideas from "How Might We" statements. Ideas are rendered as styled Figma frames with descriptions ready to copy into Figma Make.

## ✨ Features

- 🎯 Generate 3-15 diverse prototype ideas from HMW statements
- 🎨 Automatically create styled Figma frames with color-coded tags
- 📝 Get detailed, Figma Make-ready descriptions
- 🔄 Choose from 5 prototype types: mobile, web, dashboard, onboarding, feature
- ⚡ Powered by Google Gemini AI (free tier available!)

## 📦 Project Structure

This is a monorepo containing:
- **`/plugin`** - Figma plugin (frontend)
- **`/backend`** - Express + LangChain API server

## 🔧 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Figma Desktop app (not browser version)
- Google AI API key (free) OR Anthropic API key

## 🚀 Quick Start

### Step 1: Get a Google AI API Key (Free!)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy the generated API key

**Note:** Google Gemini offers a generous free tier. Alternatively, you can use Anthropic Claude by getting an API key from [Anthropic Console](https://console.anthropic.com/).

### Step 2: Clone & Install

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd figma-hmw-extension
   ```

2. Install plugin dependencies:
   ```bash
   cd plugin
   npm install
   npm run build
   ```

3. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   ```

### Step 3: Configure Backend

1. Create environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Open `.env` and add your API key:
   ```bash
   # For Google Gemini (recommended - free tier)
   LLM_PROVIDER=gemini
   GOOGLE_API_KEY=your_google_api_key_here

   # OR for Anthropic Claude
   # LLM_PROVIDER=anthropic
   # ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

### Step 4: Install Plugin in Figma

1. **Build the plugin** (if you haven't already):
   ```bash
   cd plugin
   npm run build
   ```

2. **Open Figma Desktop** (must use desktop app, not browser)

3. **Import the plugin:**
   - Go to `Plugins` → `Development` → `Import plugin from manifest...`
   - Navigate to `figma-hmw-extension/plugin/`
   - Select `manifest.json`
   - Click "Open"

4. **You should see:** "HMW Extension" appear in your development plugins list


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

## 📖 How to Use

### Running the Plugin

1. **Start the backend server** (in a separate terminal):
   ```bash
   cd backend
   npm run dev
   ```
   Keep this running while using the plugin.

2. **Open Figma Desktop** and open any file

3. **Run the plugin:**
   - Go to `Plugins` → `Development` → `HMW Extension`
   - The plugin UI will appear

4. **Generate ideas:**
   - Enter a "How Might We" statement (e.g., "How might we help users save time during onboarding?")
   - Adjust the slider to select 3-15 ideas
   - Click **"Generate Ideas"**
   - Wait 20-90 seconds (depends on count)

5. **View results:**
   - Ideas appear as styled Figma frames on your canvas
   - Each frame contains:
     - **Title** (bold, 18px)
     - **Description** (detailed, Make-ready)
     - **Type tag** (color-coded: mobile/web/dashboard/onboarding/feature)

6. **Use with Figma Make:**
   - Copy any description text
   - Paste directly into Figma Make to generate coded prototypes

### Tips

- **Write clear HMW statements:** Be specific about the problem and target users
- **Use more ideas for exploration:** 9-15 ideas give diverse perspectives
- **Use fewer ideas for speed:** 3-6 ideas generate faster
- **Descriptions are actionable:** Include UI elements, interactions, and flows ready for prototyping

## 🎨 Prototype Type Categories

- 🔵 **Mobile**: iOS/Android app interfaces
- 🟢 **Web**: Web applications or websites
- 🟣 **Dashboard**: Data visualization or admin dashboards
- 🟠 **Onboarding**: User onboarding flows or tutorials
- 🟡 **Feature**: Specific features or interaction patterns

## ⚙️ Development Workflow

### Plugin Development

1. Build the plugin:
   ```bash
   cd plugin
   npm run build
   ```

2. Watch mode (auto-recompile TypeScript):
   ```bash
   npm run watch
   # After TypeScript changes, still need to run: npm run bundle
   ```

3. After code changes:
   - Rebuild: `npm run build`
   - In Figma: Close and reopen the plugin to see changes

### Backend Development

1. Start dev server with hot reload:
   ```bash
   cd backend
   npm run dev
   ```

2. Test the agent directly:
   ```bash
   npx tsx src/agents/hmwAgent.ts
   ```

3. Server runs on `http://localhost:3000`

## 🏗️ Architecture

### Plugin Architecture (Dual-Thread)
- **Main Thread (`plugin/src/code.ts`)**: Runs in Figma's sandbox with access to the document API
- **UI Thread (`plugin/src/ui.html`)**: Runs in an iframe and handles user interaction + API calls
- Communication between threads happens via `postMessage` API

### Backend Architecture
- **Express Server**: REST API with CORS for plugin access
- **LangChain Core**: LLM interactions and output parsing
- **Google Gemini / Anthropic Claude**: AI models for idea generation
- **Zod**: Schema validation for structured outputs

## 🐛 Troubleshooting

### Plugin doesn't appear in Figma
- Make sure you're using **Figma Desktop** (not browser version)
- Check that you selected the correct `manifest.json` file
- Try restarting Figma

### "Failed to generate ideas" error
- Verify the backend server is running (`npm run dev`)
- Check that your API key is correctly set in `backend/.env`
- Check backend console for error messages
- Test API directly: `curl http://localhost:3000/health`

### Ideas take too long to generate
- Normal wait times: 20s (3 ideas) to 90s (15 ideas)
- Timeout errors mean the LLM took too long
- Try reducing the idea count
- Check your internet connection

### Backend hangs on macOS
- **Never run dev server in background** (e.g., `npm run dev &`)
- Always run in foreground in a separate terminal window
- This is a macOS TTY/job control limitation

## 📚 API Endpoints

```
GET  /health              # Health check
GET  /api/test            # API test endpoint
POST /api/hmw/generate    # Generate ideas
```

**Generate Ideas Request:**
```json
{
  "hmw": "How might we help users save time?",
  "count": 5  // Optional, 3-15, defaults to 3
}
```

**Generate Ideas Response:**
```json
{
  "ideas": [
    {
      "title": "Smart Auto-Fill",
      "description": "Create a mobile form with...",
      "approach": "mobile"
    },
    // ... more ideas
  ]
}
```

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with [LangChain](https://js.langchain.com/)
- Powered by [Google Gemini](https://ai.google.dev/) and [Anthropic Claude](https://www.anthropic.com/)
- Inspired by design thinking and divergent ideation practices
