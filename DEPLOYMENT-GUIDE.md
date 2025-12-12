# 🚀 Guide de Déploiement - AprilFTD

## 📋 Préparation

### 1. Variables d'environnement

Créez un fichier `.env` en production avec :

```env
# Base de données (production)
DB_HOST=YOUR_DB_HOST
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
DB_PORT=3306

# Serveur
PORT=3002
NODE_ENV=production

# API (URL de production)
VITE_API_URL=https://votre-api.com
VITE_SITE_URL=https://votre-site.com

# Email (optionnel)
RESEND_API_KEY=votre_cle
RESEND_FROM_DOMAIN=votre-domaine.com
```

## 🌐 Déploiement Frontend (Vercel/Netlify)

### Vercel

1. **Connecter GitHub**
   - Allez sur [vercel.com](https://vercel.com)
   - Importez le repository `elonreevemuskllc/pwebapp`

2. **Configuration**
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Variables d'environnement**
   - `VITE_API_URL` = URL de votre backend
   - `VITE_SITE_URL` = URL de votre frontend

4. **Déployer**
   - Cliquez sur "Deploy"
   - Vercel génère automatiquement une URL HTTPS

### Netlify

1. **Connecter GitHub**
   - Allez sur [netlify.com](https://netlify.com)
   - "New site from Git" > GitHub > `elonreevemuskllc/pwebapp`

2. **Configuration**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

3. **Variables d'environnement**
   - Ajoutez `VITE_API_URL` et `VITE_SITE_URL`

4. **Déployer**
   - Netlify déploie automatiquement

## 🖥️ Déploiement Backend (Railway/Render)

### Railway

1. **Créer un projet**
   - Allez sur [railway.app](https://railway.app)
   - "New Project" > "Deploy from GitHub repo"

2. **Configuration**
   - Sélectionnez le repository
   - Railway détecte automatiquement Node.js

3. **Variables d'environnement**
   - Ajoutez toutes les variables du `.env`
   - **Important**: `NODE_ENV=production`

4. **Démarrage**
   - Railway démarre automatiquement avec `npm run server`
   - Notez l'URL générée (ex: `https://votre-app.railway.app`)

### Render

1. **Créer un service**
   - Allez sur [render.com](https://render.com)
   - "New" > "Web Service"
   - Connectez GitHub

2. **Configuration**
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Environment**: Node

3. **Variables d'environnement**
   - Ajoutez toutes les variables

4. **Déployer**
   - Render déploie automatiquement

## 🔒 HTTPS (Obligatoire pour PWA)

### Pourquoi HTTPS ?
- Les PWA nécessitent HTTPS (sauf localhost)
- Les Service Workers ne fonctionnent qu'en HTTPS
- Les notifications push nécessitent HTTPS

### Solutions
- ✅ **Vercel/Netlify** : HTTPS automatique
- ✅ **Railway/Render** : HTTPS automatique
- ✅ **Votre serveur** : Utilisez Let's Encrypt (Certbot)

## ✅ Checklist de déploiement

### Frontend
- [ ] Variables d'environnement configurées
- [ ] `VITE_API_URL` pointe vers le backend
- [ ] Build réussi sans erreurs
- [ ] HTTPS activé
- [ ] Manifest.json accessible
- [ ] Service Worker actif (DevTools > Application)

### Backend
- [ ] Variables d'environnement configurées
- [ ] Base de données accessible
- [ ] CORS configuré pour l'URL frontend
- [ ] HTTPS activé
- [ ] Port configuré correctement

### PWA
- [ ] Manifest.json accessible
- [ ] Service Worker enregistré
- [ ] Icônes accessibles
- [ ] Installation fonctionne
- [ ] Mode offline testé

## 🧪 Tests post-déploiement

1. **Vérifier l'installation PWA**
   - Ouvrez le site en HTTPS
   - Vérifiez l'icône d'installation
   - Installez l'app
   - Vérifiez que ça fonctionne

2. **Tester les notifications**
   - Activez les notifications
   - Vérifiez les permissions
   - Testez une notification

3. **Tester le mode offline**
   - Installez l'app
   - Visitez quelques pages
   - Coupez internet
   - Vérifiez que les pages visitées sont accessibles

## 🔧 Dépannage

### Le Service Worker ne se charge pas
- ✅ Vérifiez HTTPS
- ✅ Vérifiez la console pour les erreurs
- ✅ Videz le cache

### Les notifications ne fonctionnent pas
- ✅ Vérifiez HTTPS
- ✅ Vérifiez les permissions
- ✅ Vérifiez la console

### L'app ne s'installe pas
- ✅ Vérifiez que le manifest.json est accessible
- ✅ Vérifiez HTTPS
- ✅ Vérifiez les icônes

## 📚 Ressources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)

---

**Bon déploiement ! 🚀**

