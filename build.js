const fs = require('fs');
const path = require('path');

// Read the compiled code.js
const codePath = path.join(__dirname, 'dist', 'code.js');
let code = fs.readFileSync(codePath, 'utf8');

// Read the UI HTML
const uiPath = path.join(__dirname, 'src', 'ui.html');
const html = fs.readFileSync(uiPath, 'utf8');

// Replace __html__ placeholder with the actual HTML
code = code.replace('__html__', JSON.stringify(html));

// Write the bundled code back
fs.writeFileSync(codePath, code);

// Copy the HTML to dist folder
fs.copyFileSync(uiPath, path.join(__dirname, 'dist', 'ui.html'));

console.log('Build complete!');
