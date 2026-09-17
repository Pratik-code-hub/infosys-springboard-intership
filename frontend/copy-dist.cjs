const fs = require('fs');
const path = require('path');

const localDist = path.resolve(__dirname, 'dist');
const parentDist = path.resolve(__dirname, '..', 'dist');

try {
  if (fs.existsSync(localDist)) {
    fs.cpSync(localDist, parentDist, { recursive: true });
    console.log('[build-hook] Synced dist -> ../dist');
  }
} catch (e) {
  // Ignored if parent is read-only
}
