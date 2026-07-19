import re
import os

file_path = os.path.join("src", "lib", "i18n", "translations.ts")
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_keys = [
    '"admin.users.userDetails"', '"admin.users.phone"', '"admin.users.country"', 
    '"admin.users.accountType"', '"admin.users.role"', '"admin.users.kyc"', 
    '"admin.users.tier"', '"admin.users.status"', '"admin.users.joined"', 
    '"admin.users.lastLogin"', '"admin.users.rewardPoints"', '"admin.users.edit"', '"admin.users.close"'
]

if '"admin.users.userDetails"' not in content:
    content = re.sub(
        r'\] as const;',
        '  // Admin Users\n  ' + ', '.join(new_keys) + ',\n] as const;',
        content
    )

if '"admin.users.userDetails": "User Details"' not in content:
    en_insert = """  "admin.users.userDetails": "User Details",
  "admin.users.phone": "Phone",
  "admin.users.country": "Country",
  "admin.users.accountType": "Account Type",
  "admin.users.role": "Role",
  "admin.users.kyc": "KYC",
  "admin.users.tier": "Tier",
  "admin.users.status": "Status",
  "admin.users.joined": "Joined",
  "admin.users.lastLogin": "Last login",
  "admin.users.rewardPoints": "Reward Points",
  "admin.users.edit": "Edit",
  "admin.users.close": "Close",\n};"""
    content = re.sub(r'(const en: Record<string, string> = \{[\s\S]*?^\)};', r'\1' + en_insert, content, flags=re.MULTILINE)

if '"admin.users.userDetails": "Détails de l\'utilisateur"' not in content:
    fr_insert = """  "admin.users.userDetails": "Détails de l'utilisateur",
  "admin.users.phone": "Téléphone",
  "admin.users.country": "Pays",
  "admin.users.accountType": "Type de compte",
  "admin.users.role": "Rôle",
  "admin.users.kyc": "KYC",
  "admin.users.tier": "Niveau",
  "admin.users.status": "Statut",
  "admin.users.joined": "Inscrit",
  "admin.users.lastLogin": "Dernière connexion",
  "admin.users.rewardPoints": "Points de récompense",
  "admin.users.edit": "Modifier",
  "admin.users.close": "Fermer",\n};"""
    content = re.sub(r'(const fr: Record<string, string> = \{[\s\S]*?^\)};', r'\1' + fr_insert, content, flags=re.MULTILINE)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated translations.ts")
