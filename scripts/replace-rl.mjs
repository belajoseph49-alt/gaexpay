import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/app/api', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // We replace synchronous rate limit calls with awaited ones.
    const regexes = [
      { from: /const rl = rateLimit\(/g, to: 'const rl = await rateLimit(' },
      { from: /const rl = rateLimitSensitive\(/g, to: 'const rl = await rateLimitSensitive(' },
      { from: /const rl = rateLimitGeneral\(/g, to: 'const rl = await rateLimitGeneral(' },
      { from: /const rl = rateLimitAuth\(/g, to: 'const rl = await rateLimitAuth(' }
    ];

    regexes.forEach(r => {
      if (r.from.test(content)) {
        content = content.replace(r.from, r.to);
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
