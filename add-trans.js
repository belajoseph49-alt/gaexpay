const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'lib', 'i18n', 'translations.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The keys
const newKeys = [
  '  "admin.users.userDetails",',
  '  "admin.users.phone",',
  '  "admin.users.country",',
  '  "admin.users.accountType",',
  '  "admin.users.role",',
  '  "admin.users.kyc",',
  '  "admin.users.tier",',
  '  "admin.users.status",',
  '  "admin.users.joined",',
  '  "admin.users.lastLogin",',
  '  "admin.users.rewardPoints",',
  '  "admin.users.edit",',
  '  "admin.users.close",'
].join('\n');

if (!content.includes('"admin.users.userDetails"')) {
  content = content.replace(
    /\] as const;/,
    `\n  // Admin Users\n${newKeys}\n] as const;`
  );
}

const enAppend = [
  '  "admin.users.userDetails": "User Details",',
  '  "admin.users.phone": "Phone",',
  '  "admin.users.country": "Country",',
  '  "admin.users.accountType": "Account Type",',
  '  "admin.users.role": "Role",',
  '  "admin.users.kyc": "KYC",',
  '  "admin.users.tier": "Tier",',
  '  "admin.users.status": "Status",',
  '  "admin.users.joined": "Joined",',
  '  "admin.users.lastLogin": "Last Login",',
  '  "admin.users.rewardPoints": "Reward Points",',
  '  "admin.users.edit": "Edit",',
  '  "admin.users.close": "Close",'
].join('\n');

if (!content.includes('"admin.users.userDetails": "User Details"')) {
  const marker = '"misc.updated": "Updated",\n});';
  const pos = content.indexOf(marker);
  if (pos !== -1) {
    content = content.substring(0, pos) + enAppend + '\n  ' + marker + content.substring(pos + marker.length);
  }
}

const frAppend = [
  '  "admin.users.userDetails": "Détails de l\'utilisateur",',
  '  "admin.users.phone": "Téléphone",',
  '  "admin.users.country": "Pays",',
  '  "admin.users.accountType": "Type de compte",',
  '  "admin.users.role": "Rôle",',
  '  "admin.users.kyc": "KYC",',
  '  "admin.users.tier": "Niveau",',
  '  "admin.users.status": "Statut",',
  '  "admin.users.joined": "Inscrit le",',
  '  "admin.users.lastLogin": "Dernière connexion",',
  '  "admin.users.rewardPoints": "Points de récompense",',
  '  "admin.users.edit": "Modifier",',
  '  "admin.users.close": "Fermer",'
].join('\n');

if (!content.includes('"admin.users.userDetails": "Détails')) {
  const markerFr = '"misc.updated": "Mis à jour",\n});';
  const posFr = content.indexOf(markerFr);
  if (posFr !== -1) {
    content = content.substring(0, posFr) + frAppend + '\n  ' + markerFr + content.substring(posFr + markerFr.length);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
