# Fix : Erreur "Failed to fetch" - Mixed Content

## 🔴 Problème

L'erreur "Failed to fetch" se produit parce que :
- Votre site Netlify est en **HTTPS** (`https://prgweapp.netlify.app`)
- Votre backend est en **HTTP** (`http://72.61.102.27:3002`)
- Les navigateurs **bloquent** les requêtes HTTP depuis une page HTTPS (Mixed Content)

## ✅ Solutions possibles

### Solution 1 : Utiliser un proxy Netlify (Recommandé - Simple)

Netlify peut faire un proxy des requêtes API vers votre backend HTTP.

**Modifiez `netlify.toml` :**

```toml
[build]
  command = "npm run build"
  publish = "dist"

# Redirection SPA
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Proxy API vers le backend
[[redirects]]
  from = "/api/*"
  to = "http://72.61.102.27:3002/api/:splat"
  status = 200
  force = true
```

**Puis modifiez `VITE_API_URL` sur Netlify :**
- Au lieu de : `http://72.61.102.27:3002`
- Mettez : `https://prgweapp.netlify.app` (ou laissez vide pour utiliser l'origine)

**Et dans le code, utilisez une URL relative :**
```typescript
const API_URL = import.meta.env.VITE_API_URL || '';
const apiUrl = API_URL || window.location.origin;
```

### Solution 2 : Configurer HTTPS pour le backend (Meilleure - Sécurisée)

Installer un certificat SSL sur votre serveur backend.

**Option A : Let's Encrypt (Gratuit)**
```bash
# Installer certbot
sudo apt install certbot

# Générer un certificat
sudo certbot certonly --standalone -d api.votre-domaine.com

# Configurer nginx comme reverse proxy avec SSL
```

**Option B : Cloudflare (Gratuit)**
- Utiliser Cloudflare comme proxy
- Activer "Always Use HTTPS"
- Le backend sera accessible via HTTPS

### Solution 3 : Utiliser un domaine avec HTTPS

Si vous avez un domaine, configurez-le avec Cloudflare ou un autre service pour avoir HTTPS gratuit.

## 🚀 Solution rapide : Proxy Netlify

Je vais modifier le code pour utiliser le proxy Netlify.

