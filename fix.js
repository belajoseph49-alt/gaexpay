const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n/translations.ts', 'utf8');

const deduplicate = (text) => {
  const lines = text.split('\n');
  const seenKeys = new Set();
  let inObject = false;
  
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^(?:export )?const (en|fr|ru|zh|ar|es|de|ew|ff|sw|ln|ha).*=\s*(?:build\()?\s*\{/)) {
      inObject = true;
      seenKeys.clear();
      newLines.push(line);
      continue;
    }
    
    if (inObject && (line.match(/^\};/) || line.match(/^\}\);/))) {
      inObject = false;
      newLines.push(line);
      continue;
    }
    
    if (inObject) {
      const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);
      if (keyMatch) {
        const key = keyMatch[1];
        if (seenKeys.has(key)) {
          // duplicate! skip it
          continue;
        } else {
          seenKeys.add(key);
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }
  
  return newLines.join('\n');
};

fs.writeFileSync('src/lib/i18n/translations.ts', deduplicate(content));
console.log('Fixed duplicates');
