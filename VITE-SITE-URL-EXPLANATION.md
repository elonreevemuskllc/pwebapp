# Configuration VITE_SITE_URL - Explication

## ⚠️ IMPORTANT : Où configurer VITE_SITE_URL ?

**`VITE_SITE_URL` n'est PAS à configurer sur Netlify !**

Cette variable est utilisée **côté BACKEND** pour la configuration CORS.

## 📍 Où la configurer ?

### Sur votre serveur backend (YOUR_SERVER_IP)

Dans le fichier `/root/aprilpgapp/.env` :

```env
VITE_SITE_URL=http://YOUR_SERVER_IP:5174,https://prgweapp.netlify.app
```

## 🔍 À quoi sert cette variable ?

Cette variable indique au backend quelles origines (domaines) sont autorisées à faire des requêtes API. C'est pour la sécurité CORS.

### Format

- Plusieurs URLs séparées par des **virgules**
- Chaque URL doit être complète (avec `http://` ou `https://`)
- Pas d'espace après les virgules

### Exemple

```env
# Développement local + Production Netlify
VITE_SITE_URL=http://localhost:5174,http://YOUR_SERVER_IP:5174,https://prgweapp.netlify.app
```

## ✅ Configuration actuelle

Votre fichier `.env` contient maintenant :
```
VITE_SITE_URL=http://YOUR_SERVER_IP:5174,https://prgweapp.netlify.app
```

Cela signifie que le backend accepte les requêtes depuis :
- ✅ `http://YOUR_SERVER_IP:5174` (votre serveur de développement)
- ✅ `https://prgweapp.netlify.app` (votre site Netlify)

## 🔄 Redémarrage nécessaire

Après avoir modifié `.env`, **redémarrez le serveur backend** :

```bash
# Trouver le processus
ps aux | grep "tsx server/index.ts"

# Arrêter (remplacez PID par le numéro)
kill PID

# Redémarrer
cd /root/aprilpgapp && npm run server
```

Ou si vous utilisez nodemon, il redémarre automatiquement.

## 📝 Résumé des variables

| Variable | Où configurer | Usage |
|----------|---------------|-------|
| `VITE_API_URL` | **Netlify** (Environment variables) | URL du backend pour le frontend |
| `VITE_SITE_URL` | **Backend** (fichier `.env`) | URLs autorisées pour CORS |


