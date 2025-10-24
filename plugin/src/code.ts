// This plugin runs in the main thread and has access to the Figma document

figma.showUI(__html__, { width: 400, height: 500 });

// Handle messages from the UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'create-rectangles') {
    const nodes: SceneNode[] = [];
    
    for (let i = 0; i < msg.count; i++) {
      const rect = figma.createRectangle();
      rect.x = i * 150;
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }
    
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
