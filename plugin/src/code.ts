// This plugin runs in the main thread and has access to the Figma document
// The UI thread handles all API calls directly since it has access to fetch API

figma.showUI(__html__, { width: 400, height: 500 });

// Handle messages from the UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
  
  // Future: Handle Figma-specific operations here (e.g., creating nodes from ideas)
};
