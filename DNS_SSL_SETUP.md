# GaexPay — Configuration DNS & SSL pour LWS

## 1. Configuration DNS (Zone LWS)

Configurez les enregistrements suivants dans la zone DNS de chaque domaine chez LWS :

### gaexpay.com
```
Type: A
Nom: @
Valeur: <IP_SERVEUR>
TTL: 3600

Type: A
Nom: www
Valeur: <IP_SERVEUR>
TTL: 3600

Type: A
Nom: admin
Valeur: <IP_SERVEUR>
TTL: 3600

Type: A
Nom: support
Valeur: <IP_SERVEUR>
TTL: 3600

Type: A
Nom: ksp
Valeur: <IP_SERVEUR>
TTL: 3600

Type: A
Nom: api
Valeur: <IP_SERVEUR>
TTL: 3600

Type: MX
Nom: @
Valeur: mail.gaexpay.com
Priorité: 10
TTL: 3600

Type: TXT
Nom: @
Valeur: v=spf1 a mx include:_spf.lws-hosting.com ~all
TTL: 3600
```

### gaexpay.online, gaexpay.site, gaexpay.store, gaexpay.xyz
Répétez la même configuration pour chaque domaine (A records pour @, www, admin, support, ksp, api).

## 2. Certificat SSL Wildcard

### Option A: Let's Encrypt Wildcard (gratuit, via Caddy)
Caddy gère automatiquement les certificats SSL wildcard. Le Caddyfile configure:
```
*.gaexpay.com, gaexpay.com {
  tls {
    dns cloudflare <API_TOKEN>
  }
  reverse_proxy localhost:3000
}
```

### Option B: Certbot manuel
```bash
certbot certonly --manual --preferred-challenges dns -d *.gaexpay.com -d gaexpay.com
```

### Option C: Certificat LWS
Commander un certificat SSL wildcard depuis le panel LWS.

## 3. Caddyfile (Reverse Proxy + SSL)

Le fichier Caddyfile à la racine du projet gère:
- SSL automatique pour tous les domaines
- Redirect HTTP → HTTPS
- Reverse proxy vers Next.js (port 3000)
- Support WebSocket

## 4. Configuration SMTP (LWS Mail)

Configurez dans le fichier .env:
```
SMTP_HOST=mail.gaexpay.com
SMTP_PORT=465
SMTP_USER=noreply@gaexpay.com
SMTP_PASS=<mot_de_passe_email>
SMTP_FROM=GaexPay <noreply@gaexpay.com>
```

L'application utilise ce service pour:
- Email de bienvenue après inscription
- Email de confirmation de compte
- Notification de transfert (expéditeur + destinataire)
- Notification de réception de paiement

## 5. Sous-domaines et routage

| Sous-domaine | Route | Description |
|---|---|---|
| gaexpay.com | / | Plateforme principale (landing + app) |
| www.gaexpay.com | / | Redirection vers gaexpay.com |
| admin.gaexpay.com | /?view=admin-panel | Panel administrateur |
| support.gaexpay.com | /?view=support | Centre de support |
| ksp.gaexpay.com | /?view=marketplace | Plateforme KSP/Marketplace |
| api.gaexpay.com | /api/* | API REST |
| mail.gaexpay.com | SMTP | Serveur mail LWS |
