// This plugin runs in the main thread and has access to the Figma document
// The UI thread handles all API calls directly since it has access to fetch API

figma.showUI(__html__, { width: 400, height: 500 });

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
  
  if (msg.type === 'create-ideas') {
    const ideas = msg.ideas;
    
    if (!ideas || ideas.length === 0) {
      figma.notify('No ideas to create');
      return;
    }
    
    try {
      // Load the default font
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      
      const frameWidth = 300;
      const frameHeight = 240;
      const spacing = 40;
      const padding = 20;
      let xPosition = 0;
      
      // Define colors for different prototype types
      const approachColors: Record<string, { r: number; g: number; b: number }> = {
        mobile: { r: 0.4, g: 0.6, b: 1 },       // Blue
        web: { r: 0.5, g: 0.8, b: 0.5 },        // Green
        dashboard: { r: 0.6, g: 0.4, b: 0.8 },  // Purple
        onboarding: { r: 1, g: 0.6, b: 0.4 },   // Orange
        feature: { r: 1, g: 0.8, b: 0.3 }       // Yellow
      };
      
      for (const idea of ideas) {
        // Create the main frame
        const frame = figma.createFrame();
        frame.name = idea.title;
        frame.x = xPosition;
        frame.y = 0;
        frame.resize(frameWidth, frameHeight);
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
        frame.strokeWeight = 2;
        frame.cornerRadius = 8;
        frame.paddingTop = padding;
        frame.paddingBottom = padding;
        frame.paddingLeft = padding;
        frame.paddingRight = padding;
        frame.layoutMode = 'VERTICAL';
        frame.primaryAxisSizingMode = 'AUTO'; // Hug contents vertically
        frame.counterAxisSizingMode = 'FIXED'; // Fixed width
        frame.itemSpacing = 12;
        
        // Create title text
        const titleText = figma.createText();
        titleText.fontName = { family: 'Inter', style: 'Bold' };
        titleText.characters = idea.title;
        titleText.fontSize = 18;
        titleText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
        titleText.textAlignHorizontal = 'LEFT';
        titleText.layoutAlign = 'STRETCH';
        frame.appendChild(titleText);
        
        // Create description text
        const descText = figma.createText();
        descText.fontName = { family: 'Inter', style: 'Regular' };
        descText.characters = idea.description;
        descText.fontSize = 14;
        descText.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }];
        descText.textAlignHorizontal = 'LEFT';
        descText.textAutoResize = 'HEIGHT'; // Auto height for text
        descText.lineHeight = { value: 140, unit: 'PERCENT' };
        descText.layoutAlign = 'STRETCH';
        frame.appendChild(descText);
        
        // Create approach tag
        const tagFrame = figma.createFrame();
        tagFrame.name = 'Tag';
        tagFrame.layoutMode = 'HORIZONTAL';
        tagFrame.primaryAxisSizingMode = 'AUTO';
        tagFrame.counterAxisSizingMode = 'AUTO';
        tagFrame.paddingTop = 6;
        tagFrame.paddingBottom = 6;
        tagFrame.paddingLeft = 12;
        tagFrame.paddingRight = 12;
        tagFrame.cornerRadius = 4;
        
        // Set tag color based on approach
        const approachKey = idea.approach.toLowerCase();
        const tagColor = approachColors[approachKey] || { r: 0.5, g: 0.5, b: 0.5 };
        tagFrame.fills = [{ type: 'SOLID', color: { ...tagColor }, opacity: 0.2 }];
        
        const tagText = figma.createText();
        tagText.fontName = { family: 'Inter', style: 'Bold' };
        tagText.characters = idea.approach.toUpperCase();
        tagText.fontSize = 11;
        tagText.fills = [{ type: 'SOLID', color: tagColor }];
        tagText.textCase = 'UPPER';
        tagText.letterSpacing = { value: 5, unit: 'PERCENT' };
        tagFrame.appendChild(tagText);
        
        frame.appendChild(tagFrame);
        
        // Add frame to current page
        figma.currentPage.appendChild(frame);
        
        // Move position for next frame
        xPosition += frameWidth + spacing;
      }
      
      // Zoom to fit all frames
      figma.viewport.scrollAndZoomIntoView(figma.currentPage.children.slice(-ideas.length));
      
      figma.notify(`✓ Created ${ideas.length} idea frames!`);
    } catch (error) {
      console.error('Error creating frames:', error);
      figma.notify('Error creating frames. See console for details.');
    }
  }
};
