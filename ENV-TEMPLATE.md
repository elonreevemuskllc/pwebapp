# Template du fichier .env

## 📋 Variables obligatoires

```env
# Base de données MySQL
DB_HOST=92.113.31.55
DB_USER=admin
DB_PASSWORD=Oxcello1313@
DB_NAME=elonwebsite
DB_PORT=3306

# Serveur backend
PORT=3002
NODE_ENV=production

# CORS (URLs autorisées)
VITE_SITE_URL=http://72.61.102.27:5174,https://prgweapp.netlify.app

# API URL (VIDE pour Netlify = utilise le proxy)
VITE_API_URL=
```

## 🔧 Variables optionnelles

### API Affiliate (pour les commissions FTD)
```env
AFFILIATE_API_URL=https://votre-api-affiliate.com
AFFILIATE_ID=votre_affiliate_id
AFFILIATE_API_KEY=votre_api_key
```

### Email (Resend)
```env
RESEND_API_KEY=re_votre_cle_api
RESEND_FROM_DOMAIN=votre-domaine.com
CLIENT_URL=https://prgweapp.netlify.app
```

### Admin par défaut
```env
DEFAULT_ADMIN_PASSWORD=changeme123
DEFAULT_ADMIN_EMAIL=admin@example.com
```

## 📝 Notes importantes

1. **VITE_API_URL** : 
   - Pour **Netlify** (production) : laisser **VIDE** (`VITE_API_URL=`)
   - Pour **développement local** : mettre `http://72.61.102.27:3002`

2. **NODE_ENV** :
   - `production` : pour la production
   - `development` : pour le développement local

3. **VITE_SITE_URL** : 
   - Séparer plusieurs URLs par des virgules
   - Inclure toutes les URLs autorisées (localhost, Netlify, etc.)

4. **Base de données** :
   - Les identifiants sont déjà configurés
   - Vérifiez que MySQL est accessible depuis le serveur

## ✅ Vérification

Après avoir configuré le `.env`, testez la connexion :

```bash
node scripts/test-db-connection.js
```
