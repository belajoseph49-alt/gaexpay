const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'src', 'app');
const localeDir = path.join(appDir, '[locale]');

if (!fs.existsSync(localeDir)) {
  fs.mkdirSync(localeDir);
}

const itemsToMove = ['cookies', 'licenses', 'pay', 'privacy', 'terms', 'layout.tsx', 'page.tsx'];

for (const item of itemsToMove) {
  const srcPath = path.join(appDir, item);
  const destPath = path.join(localeDir, item);
  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
    console.log(`Moved ${item} to [locale]`);
  }
}
