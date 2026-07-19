const fs = require('fs');
const path = require('path');

const locales = ['en', 'fr', 'ru', 'zh', 'ar', 'es', 'de', 'ew', 'ff', 'sw', 'ln', 'ha', 'ja', 'pcm', 'dua'];
const messagesDir = path.join(__dirname, 'messages');

if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir);
}

const defaultContent = {
  "Index": {
    "title": "GaexPay - Borderless Digital Wallet",
    "description": "Send and receive money globally"
  }
};

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
}
console.log('Created locales:', locales.join(', '));
