# 🔧 Fix Netlify - Pourquoi ça marche en local mais pas sur Netlify

## 🔍 Le problème

### ✅ En local (ça marche)
- **Vite proxy** (`vite.config.ts`) redirige automatiquement `/api/*` → `http://localhost:3002`
- Le frontend fait des requêtes relatives : `/api/auth/check-email`
- Vite transforme ça en : `http://localhost:3002/api/auth/check-email`
- ✅ **Ça marche !**

### ❌ Sur Netlify (ça ne marche pas)
- **Pas de proxy Vite** (Vite ne tourne pas en production)
- Netlify utilise le fichier `_redirects` pour les redirections
- Le fichier `_redirects` est généré par `scripts/generate-redirects.js` au build
- **Si `NETLIFY_BACKEND_URL` n'est pas définie**, le proxy API n'est pas dans `_redirects`
- Les requêtes `/api/*` retournent 404
- ❌ **Ça ne marche pas !**

## 🔧 Solution

### 1. Vérifier les variables d'environnement sur Netlify

1. Aller sur **Netlify Dashboard** → Votre site → **Site settings** → **Environment variables**
2. Vérifier que ces variables sont définies :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NETLIFY_BACKEND_URL` | `http://72.61.102.27:3002` | URL du backend pour le proxy API |
| `VITE_API_URL` | (vide ou non définie) | URL de l'API (vide = utiliser proxy) |

### 2. Vérifier le fichier `_redirects` après build

Le fichier `_redirects` doit contenir :

```
/api/*  http://72.61.102.27:3002/api/:splat  200
/*      /index.html                           200
```

**Si la ligne `/api/*` manque**, c'est que `NETLIFY_BACKEND_URL` n'était pas définie au moment du build.

### 3. Rebuild le site

1. Netlify Dashboard → **Deploys** → **Trigger deploy** → **Deploy site**
2. Vérifier les logs de build :
   ```
   Running prebuild script...
   ✓ Fichier _redirects généré avec l'URL backend: http://72.61.102.27:3002
   ```

### 4. Vérifier que le backend est accessible

```bash
curl http://72.61.102.27:3002/api/health
```

## 📋 Checklist

- [ ] `NETLIFY_BACKEND_URL` est définie sur Netlify = `http://72.61.102.27:3002`
- [ ] `VITE_API_URL` est vide ou non définie sur Netlify
- [ ] Le fichier `_redirects` contient le proxy API après le build
- [ ] Le backend est accessible depuis Netlify
- [ ] CORS est configuré sur le backend pour autoriser `https://prgweapp.netlify.app`

## 🧪 Test local du script

Pour tester que le script fonctionne :

```bash
NETLIFY_BACKEND_URL=http://72.61.102.27:3002 node scripts/generate-redirects.js
cat public/_redirects
```

**Résultat attendu :**
```
# Redirections Netlify pour le SPA
/api/*  http://72.61.102.27:3002/api/:splat  200
/*      /index.html                           200
```

## 🚨 Problèmes courants

### Problème 1 : `NETLIFY_BACKEND_URL` non définie

**Symptôme :**
- Fichier `_redirects` ne contient pas `/api/*`
- Requêtes `/api/*` retournent 404

**Solution :**
- Ajouter `NETLIFY_BACKEND_URL=http://72.61.102.27:3002` sur Netlify
- Rebuild

### Problème 2 : `VITE_API_URL` mal configurée

**Symptôme :**
- URLs avec `%22%22/api/...` ou `/undefined/api/...`

**Solution :**
- Supprimer `VITE_API_URL` sur Netlify OU
- La mettre vide : `VITE_API_URL=` (sans guillemets)

### Problème 3 : Backend non accessible depuis Netlify

**Symptôme :**
- Proxy configuré mais erreur de connexion

**Solution :**
- Vérifier que le backend est accessible depuis Internet
- Vérifier le firewall/ports
- Vérifier CORS sur le backend

## 📝 Résumé

**En local :** Vite proxy gère tout automatiquement ✅

**Sur Netlify :** Il faut :
1. Définir `NETLIFY_BACKEND_URL` sur Netlify
2. Le script `generate-redirects.js` génère le proxy dans `_redirects`
3. Netlify utilise `_redirects` pour rediriger `/api/*` vers le backend

**Sans `NETLIFY_BACKEND_URL`**, le proxy API n'est pas généré et les requêtes `/api/*` retournent 404.
