# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Figma plugin built with TypeScript that demonstrates basic plugin functionality with UI interaction. The plugin creates rectangles in Figma based on user input.

## Essential Commands

### Building
```bash
npm run build       # Compile TypeScript and bundle HTML
npm run bundle      # Bundle HTML into code.js (run after tsc)
npm run watch       # Watch mode - auto-recompile TypeScript on changes
```

**Important**: `npm run build` runs both `tsc` and the custom bundling script. The bundling step is critical—it injects the HTML content into the compiled JavaScript by replacing the `__html__` placeholder.

### Testing in Figma
1. Build the plugin first: `npm run build`
2. Open Figma desktop app
3. Navigate to `Plugins` → `Development` → `Import plugin from manifest...`
4. Select `manifest.json` from this project root
5. Run via `Plugins` → `Development` → `HMW Extension`

After code changes:
- Run `npm run build` again
- In Figma, close and reopen the plugin to see changes

## Architecture

### Two-Thread Model

Figma plugins run on a **dual-thread architecture**:

1. **Main Thread** (`src/code.ts`): 
   - Runs in Figma's sandbox
   - Has full access to Figma Document API (`figma.*`)
   - Cannot access browser APIs or external network
   - Handles all document manipulation (creating/modifying nodes)

2. **UI Thread** (`src/ui.html`):
   - Runs in an isolated iframe
   - Has access to standard web APIs (DOM, etc.)
   - Cannot access Figma Document API
   - Handles user interface and interactions

**Communication**: The two threads communicate via the `postMessage` API:
- UI → Main: `parent.postMessage({ pluginMessage: {...} }, '*')`
- Main → UI: `figma.ui.postMessage({...})`
- Main listens via: `figma.ui.onmessage = (msg) => {...}`

### Build Process

The build process has a critical custom step:

1. TypeScript compiles `src/code.ts` → `dist/code.js`
2. The custom `build.js` script:
   - Reads `src/ui.html`
   - Injects the HTML as a string into `dist/code.js` (replacing `__html__`)
   - Copies `ui.html` to `dist/` for the manifest reference

This is why `src/code.ts` can reference `__html__`—it's replaced during the build step.

### File Structure

```
src/
├── code.ts        # Main plugin logic (Figma API access)
└── ui.html        # Plugin UI with embedded CSS and JS

dist/              # Build output (generated, not in git)
├── code.js        # Compiled and bundled code
└── ui.html        # Copied UI file

manifest.json      # Plugin metadata and configuration
build.js          # Custom build script for HTML bundling
```

## Key Patterns

### Adding New Figma Operations

When adding functionality that manipulates the Figma document:

1. Add UI controls in `src/ui.html`
2. Send message from UI with `parent.postMessage()`
3. Handle in `src/code.ts` in the `figma.ui.onmessage` handler
4. Use Figma API calls (e.g., `figma.createRectangle()`, `figma.currentPage.appendChild()`)

### Message Types

Current message types in use:
- `create-rectangles`: Creates N rectangles (includes `count` parameter)
- `cancel`: Closes the plugin

Add new message types following this pattern with a descriptive `type` field.

## TypeScript Configuration

- Target: ES2017
- Strict mode enabled
- Types include `@figma/plugin-typings` for Figma API access
- Output directory: `dist/`

## Plugin Manifest

The `manifest.json` defines:
- Plugin name and ID
- Entry points (`main`: `dist/code.js`, `ui`: `dist/ui.html`)
- API version: 1.0.0
- Editor type: Figma only
- Network access: Disabled (`allowedDomains: ["none"]`)

## Development Constraints

- **No external network access** by default (configured in manifest)
- **No npm packages in runtime code** unless they're bundled
- **UI thread has no Figma API access** - all document operations must go through main thread
- **Main thread has no DOM access** - all UI operations must go through UI thread
