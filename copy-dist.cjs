const fs = require('fs');
const path = require('path');

// Ensure dist exists at both ./dist and ./frontend/dist
const rootDist = path.resolve(__dirname, 'dist');
const frontendDist = path.resolve(__dirname, 'frontend', 'dist');

if (fs.existsSync(frontendDist) && !fs.existsSync(rootDist)) {
  fs.cpSync(frontendDist, rootDist, { recursive: true });
  console.log('[build-hook] Copied frontend/dist -> ./dist');
} else if (fs.existsSync(rootDist) && !fs.existsSync(frontendDist)) {
  fs.cpSync(rootDist, frontendDist, { recursive: true });
  console.log('[build-hook] Copied ./dist -> frontend/dist');
} else if (fs.existsSync(frontendDist) && fs.existsSync(rootDist)) {
  fs.cpSync(frontendDist, rootDist, { recursive: true });
  console.log('[build-hook] Synced frontend/dist -> ./dist');
}
