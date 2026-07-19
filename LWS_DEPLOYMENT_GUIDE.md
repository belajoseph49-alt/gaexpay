# Guide de Mise en Ligne — GaexPay sur LWS

## 1. Vue d'ensemble

Votre domaine `gaexpay.com` est hébergé chez LWS sur un plan "Starter". Voici les étapes pour mettre GaexPay en ligne.

## 2. Étape 1 : Préparer le serveur

### Option A : Serveur VPS LWS (recommandé)
1. Dans le panel LWS, allez dans **Serveurs** → **Commander un VPS**
2. Choisissez un VPS avec au moins :
   - 2 Go RAM
   - 2 vCPU
   - 40 Go SSD
   - Ubuntu 22.04 ou 24.04
3. Notez l'adresse IP du serveur

### Option B : Hébergement mutualisé LWS
Si vous restez sur le plan "Starter" :
1. GaexPay est une application Node.js/Next.js
2. L'hébergement mutualisé LWS supporte Node.js via PM2
3. Vérifiez que Node.js est activé dans **Hébergement → Configuration → Node.js**

## 3. Étape 2 : Configurer les DNS (Zone LWS)

Dans le panel LWS → **Domaine & Hébergement** → **gaexpay.com** → **Gérer** → **Zone DNS** :

### Enregistrements A (pointent vers l'IP du serveur)
```
Type  | Nom  | Valeur              | TTL
A     | @    | <IP_SERVEUR>        | 3600
A     | www  | <IP_SERVEUR>        | 3600
A     | admin | <IP_SERVEUR>       | 3600
A     | support | <IP_SERVEUR>     | 3600
A     | api  | <IP_SERVEUR>        | 3600
```

### Enregistrement MX (messagerie LWS)
```
Type  | Nom  | Valeur              | Priorité | TTL
MX    | @    | mail.gaexpay.com    | 10       | 3600
```

### Enregistrement SPF (sécurité email)
```
Type  | Nom  | Valeur                                   | TTL
TXT   | @    | v=spf1 a mx include:_spf.lws-hosting.com ~all | 3600
```

Répétez pour `gaexpay.online`, `gaexpay.site`, `gaexpay.store`, `gaexpay.xyz`.

## 4. Étape 3 : Installer Node.js sur le serveur

```bash
# Sur le serveur (via SSH)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Installer PM2 (gestion de processus)
sudo npm install -g pm2
```

## 5. Étape 4 : Déployer le code

```bash
# Cloner ou uploader le projet
cd /var/www
git clone <votre-repo> gaexpay  # OU uploader via FTP/SCP
cd gaexpay

# Installer les dépendances
bun install

# Configurer le .env
nano .env
# Vérifiez que DATABASE_URL, GAEXPAY_JWT_SECRET, GAEXPAY_ENC_KEY, SMTP_* sont configurés

# Exécuter le déploiement automatique
bash deploy.sh

# Démarrer avec PM2
pm2 start "bun run start" --name gaexpay
pm2 save
pm2 startup  # Suivre les instructions
```

## 6. Étape 5 : Configurer le SSL (HTTPS)

### Option A : Caddy (automatique)
```bash
# Installer Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configurer Caddy
sudo nano /etc/caddy/Caddyfile
```

Contenu du Caddyfile :
```
gaexpay.com, www.gaexpay.com, admin.gaexpay.com, support.gaexpay.com, api.gaexpay.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip
}

# Redirect HTTP to HTTPS is automatic with Caddy
```

```bash
sudo systemctl restart caddy
```

### Option B : Let's Encrypt avec Nginx
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/gaexpay
```

Configuration Nginx :
```nginx
server {
    listen 80;
    server_name gaexpay.com www.gaexpay.com admin.gaexpay.com support.gaexpay.com api.gaexpay.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gaexpay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d gaexpay.com -d www.gaexpay.com -d admin.gaexpay.com -d support.gaexpay.com -d api.gaexpay.com
```

## 7. Étape 6 : Configurer la messagerie LWS

Dans le panel LWS → **Hébergement** → **Emails** :

1. Créer l'adresse `noreply@gaexpay.com`
2. Noter le mot de passe
3. Le serveur SMTP est `mail.gaexpay.com` (port 465 SSL)

Dans le fichier `.env` du serveur :
```
SMTP_HOST=mail.gaexpay.com
SMTP_PORT=465
SMTP_USER=noreply@gaexpay.com
SMTP_PASS=<mot_de_passe_email>
SMTP_FROM=GaexPay <noreply@gaexpay.com>
```

## 8. Étape 7 : Configurer Google OAuth (optionnel)

1. Aller sur https://console.cloud.google.com
2. Créer un projet "GaexPay"
3. APIs & Services → Credentials → Create OAuth client ID
4. Application type: Web
5. Authorized redirect URIs: `https://gaexpay.com/api/auth/google/callback`
6. Copier Client ID et Client Secret

Dans le panel admin GaexPay → **API & Integrations** → **Google** :
- Coller Client ID et Client Secret
- Redirect URI: `https://gaexpay.com/api/auth/google/callback`
- Cliquer "Save"

## 9. Étape 8 : Configurer Facebook OAuth (optionnel)

1. Aller sur https://developers.facebook.com
2. Créer une app "GaexPay"
3. Facebook Login → Settings
4. Valid OAuth Redirect URIs: `https://gaexpay.com/api/auth/facebook/callback`
5. Copier App ID et App Secret

Dans le panel admin → **API & Integrations** → **Facebook** :
- Coller App ID et App Secret
- Redirect URI: `https://gaexpay.com/api/auth/facebook/callback`
- Cliquer "Save"

## 10. Étape 9 : Vérifications finales

```bash
# Vérifier que le site est accessible
curl -sI https://gaexpay.com

# Vérifier le SSL
curl -sI https://gaexpay.com | grep -i strict-transport

# Vérifier les sous-domaines
curl -sI https://admin.gaexpay.com
curl -sI https://support.gaexpay.com
curl -sI https://api.gaexpay.com/api/auth/me

# Vérifier PM2
pm2 status

# Vérifier les logs
pm2 logs gaexpay --lines 20
```

## 11. Checklist finale

- [ ] DNS configurés (A records pour @, www, admin, support, api)
- [ ] Serveur Node.js installé
- [ ] Code déployé et `deploy.sh` exécuté
- [ ] `.env` configuré (JWT secret, encryption key, SMTP)
- [ ] PM2 démarre l'app automatiquement
- [ ] Caddy/Nginx configuré (reverse proxy + SSL)
- [ ] SSL actif (HTTPS fonctionne)
- [ ] Email LWS configuré (noreply@gaexpay.com)
- [ ] Google OAuth configuré (si activé)
- [ ] Facebook OAuth configuré (si activé)
- [ ] Sauvegarde automatique activée (Admin → Backup)
- [ ] Test d'inscription réalisé
- [ ] Test de transfert réalisé
- [ ] Test de notification réalisé

## 12. Accès après déploiement

| URL | Description |
|---|---|
| https://gaexpay.com | Plateforme principale |
| https://admin.gaexpay.com | Panel administrateur |
| https://support.gaexpay.com | Centre de support |
| https://api.gaexpay.com | API REST |
| Admin email | admin@gaexpay.com |
| Admin password | Admin@2025 |

## 13. Maintenance

### Sauvegardes automatiques
- Panel Admin → Administration → Sauvegarde & Restauration
- Activer la sauvegarde automatique (daily/weekly)
- Max 30 sauvegardes conservées

### Mises à jour
```bash
cd /var/www/gaexpay
git pull
bun install
bun run db:push
pm2 restart gaexpay
```

### Surveillance
```bash
pm2 monit       # Surveillance temps réel
pm2 logs gaexpay # Logs de l'application
```
