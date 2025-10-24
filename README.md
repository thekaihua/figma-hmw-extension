# HMW Figma Extension

A Figma plugin extension that demonstrates basic plugin functionality with UI interaction.

## Features

- Create multiple rectangles with customizable count
- Simple and clean UI interface
- TypeScript-based development

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Figma desktop app

### Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd figma-hmw-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

### Development Workflow

1. **Build the plugin:**
   ```bash
   npm run build
   ```

2. **Watch mode for development:**
   ```bash
   npm run watch
   ```
   This will automatically recompile TypeScript files when changes are detected.

3. **Load the plugin in Figma:**
   - Open Figma desktop app
   - Go to `Plugins` → `Development` → `Import plugin from manifest...`
   - Select the `manifest.json` file from this project
   - The plugin will now appear in your development plugins list

4. **Run the plugin:**
   - In Figma, go to `Plugins` → `Development` → `HMW Extension`
   - The plugin UI will appear

## Project Structure

```
figma-hmw-extension/
├── manifest.json          # Plugin configuration
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
├── build.js              # Build script to bundle HTML
├── src/
│   ├── code.ts          # Main plugin code (runs in Figma sandbox)
│   └── ui.html          # Plugin UI interface
└── dist/                # Compiled output (generated)
    ├── code.js
    └── ui.html
```

## How It Works

- **Main Thread (`src/code.ts`)**: Runs in Figma's sandbox with access to the document API
- **UI Thread (`src/ui.html`)**: Runs in an iframe and handles user interaction
- Communication between threads happens via `postMessage` API

## Usage

1. Open the plugin in Figma
2. Enter the number of rectangles you want to create (1-100)
3. Click "Create" to generate rectangles
4. Click "Cancel" to close the plugin

## Building for Production

```bash
npm run build
```

This will:
1. Compile TypeScript to JavaScript
2. Bundle the HTML into the code
3. Output everything to the `dist/` folder

## License

MIT
