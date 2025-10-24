// This plugin runs in the main thread and has access to the Figma document

figma.showUI(__html__, { width: 400, height: 500 });

// Handle messages from the UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'generate-ideas') {
    // Placeholder: simulate API call with mock response
    setTimeout(() => {
      try {
        const mockResult = `Ideas for "${msg.hmwStatement}":\n\n1. Idea one\n2. Idea two\n3. Idea three`;
        figma.ui.postMessage({
          type: 'generation-complete',
          result: mockResult
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'generation-error',
          error: 'Failed to generate ideas'
        });
      }
    }, 1500); // Simulate network delay
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
