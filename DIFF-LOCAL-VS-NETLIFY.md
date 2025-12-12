# 🔍 Différences Local vs Netlify - Pourquoi ça marche en local mais pas sur Netlify ?

## 📊 Résumé

| Aspect | Local (dev) | Netlify (production) |
|--------|-------------|---------------------|
| **Proxy API** | Vite proxy (`vite.config.ts`) | Fichier `_redirects` (Netlify) |
| **URLs API** | `/api/*` → `http://localhost:3002` | `/api/*` → `NETLIFY_BACKEND_URL` |
| **VITE_API_URL** | Vide (proxy Vite) | Vide (proxy Netlify) |
| **Service Worker** | Désactivé (`enabled: false`) | Activé (production) |

## 🔧 Configuration Local

### 1. Proxy Vite (`vite.config.ts`)

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3002',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

**Comment ça marche :**
- Vite intercepte toutes les requêtes `/api/*`
- Les redirige automatiquement vers `http://localhost:3002`
- Le frontend fait des requêtes relatives : `/api/auth/check-email`
- Vite transforme ça en : `http://localhost:3002/api/auth/check-email`

### 2. VITE_API_URL en local

```env
VITE_API_URL=  # Vide
```

**Résultat :**
- `httpClient.ts` génère des URLs relatives : `/api/auth/check-email`
- Vite proxy les redirige vers le backend
- ✅ **Ça marche !**

## 🌐 Configuration Netlify

### 1. Fichier `_redirects` (généré au build)

Le fichier `public/_redirects` est généré par `scripts/generate-redirects.js` au build.

**Script `generate-redirects.js` :**
```javascript
const backendUrl = process.env.NETLIFY_BACKEND_URL || '';

if (backendUrl) {
  // Ajouter le proxy API
  redirectsContent = `/api/*  ${backendUrl}/api/:splat  200\n${redirectsContent}`;
}
```

**Si `NETLIFY_BACKEND_URL` est définie :**
```
/api/*  http://72.61.102.27:3002/api/:splat  200
/*      /index.html                           200
```

**Si `NETLIFY_BACKEND_URL` n'est PAS définie :**
```
/*      /index.html                           200
```

### 2. VITE_API_URL sur Netlify

**Doit être :**
- Vide (`VITE_API_URL=`) OU
- Non définie

**Résultat :**
- `httpClient.ts` génère des URLs relatives : `/api/auth/check-email`
- Netlify doit rediriger via `_redirects` vers le backend
- ❌ **Ça ne marche PAS si `NETLIFY_BACKEND_URL` n'est pas définie !**

## ❌ Problèmes possibles sur Netlify

### Problème 1 : `NETLIFY_BACKEND_URL` non définie

**Symptôme :**
- Les requêtes `/api/*` retournent 404
- Le fichier `_redirects` ne contient pas le proxy API

**Solution :**
1. Aller sur Netlify → Site settings → Environment variables
2. Ajouter :
   - **Key** : `NETLIFY_BACKEND_URL`
   - **Value** : `http://72.61.102.27:3002`
3. Rebuild le site

### Problème 2 : `VITE_API_URL` mal configurée

**Symptôme :**
- URLs avec `%22%22/api/...` ou `/undefined/api/...`

**Solution :**
1. Vérifier `VITE_API_URL` sur Netlify
2. Soit la supprimer complètement
3. Soit la mettre vide : `VITE_API_URL=` (sans guillemets)

### Problème 3 : Service Worker cache les anciennes URLs

**Symptôme :**
- Les requêtes utilisent encore les anciennes URLs malformées

**Solution :**
1. Désactiver le Service Worker dans le navigateur
2. Vider le cache
3. Recharger la page

## ✅ Checklist pour Netlify

- [ ] `NETLIFY_BACKEND_URL` est définie sur Netlify
- [ ] `VITE_API_URL` est vide ou non définie
- [ ] Le fichier `_redirects` contient le proxy API après le build
- [ ] Le backend est accessible depuis Netlify (`http://72.61.102.27:3002`)
- [ ] CORS est configuré sur le backend pour autoriser `https://prgweapp.netlify.app`

## 🔍 Vérification

### 1. Vérifier le fichier `_redirects` après build

```bash
cat dist/_redirects
```

**Doit contenir :**
```
/api/*  http://72.61.102.27:3002/api/:splat  200
/*      /index.html                           200
```

### 2. Vérifier les variables d'environnement sur Netlify

1. Netlify Dashboard → Site settings → Environment variables
2. Vérifier :
   - `NETLIFY_BACKEND_URL` = `http://72.61.102.27:3002`
   - `VITE_API_URL` = (vide ou non définie)

### 3. Vérifier les logs de build Netlify

Chercher dans les logs :
```
Running prebuild script...
Generating _redirects file...
```

## 🚀 Solution complète

1. **Sur Netlify, définir :**
   ```
   NETLIFY_BACKEND_URL=http://72.61.102.27:3002
   VITE_API_URL=  (vide)
   ```

2. **Rebuild le site sur Netlify**

3. **Vérifier que `dist/_redirects` contient le proxy**

4. **Tester l'application**

## 📝 Notes importantes

- Le proxy Vite (`vite.config.ts`) ne fonctionne **QUE en développement**
- En production sur Netlify, c'est le fichier `_redirects` qui gère le proxy
- Le fichier `_redirects` est généré **au moment du build** par `scripts/generate-redirects.js`
- Si `NETLIFY_BACKEND_URL` n'est pas définie au build, le proxy API ne sera pas dans `_redirects`
