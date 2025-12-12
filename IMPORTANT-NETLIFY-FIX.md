# ⚠️ IMPORTANT : Fix Mixed Content sur Netlify

## Problème actuel

Le code utilise encore `import.meta.env.VITE_API_URL` directement dans 113+ fichiers, ce qui cause l'erreur "Mixed Content" sur Netlify.

## Solution temporaire (déjà appliquée)

1. ✅ `vite.config.ts` : Injecte une chaîne vide pour `VITE_API_URL` en production
2. ✅ `src/config/api.ts` : Détecte Netlify et utilise `window.location.origin` (proxy)
3. ✅ `netlify.toml` : Configure le proxy `/api/*` → backend HTTP

## ⚠️ Action requise sur Netlify

### Option 1 : Supprimer VITE_API_URL (Recommandé)

1. Allez dans **Netlify** → **Site settings** → **Environment variables**
2. **Supprimez** la variable `VITE_API_URL` (ou laissez-la vide)
3. Redéployez

Avec cette configuration, le code utilisera automatiquement le proxy Netlify.

### Option 2 : Mettre VITE_API_URL vide

1. Allez dans **Netlify** → **Site settings** → **Environment variables**
2. Modifiez `VITE_API_URL` et mettez une **chaîne vide** `""`
3. Redéployez

## Comment ça fonctionne maintenant

1. En **production** (Netlify) :
   - `VITE_API_URL` = chaîne vide (injecté par vite.config.ts)
   - Le code détecte Netlify et utilise `window.location.origin`
   - Les requêtes vont vers `https://prgweapp.netlify.app/api/*`
   - Netlify proxy vers `YOUR_BACKEND_URL/api/*`

2. En **développement** :
   - `VITE_API_URL` = `YOUR_BACKEND_URL`
   - Les requêtes vont directement vers le backend

## Vérification

Après le redéploiement, dans la console du navigateur :
- ✅ Les requêtes doivent aller vers `https://prgweapp.netlify.app/api/...`
- ❌ PAS vers `YOUR_BACKEND_URL/api/...`
- ❌ PAS d'erreur "Mixed Content"

## Prochaine étape (optionnelle)

Pour une solution plus propre, remplacer progressivement `import.meta.env.VITE_API_URL` par `buildApiUrl()` dans les fichiers, mais ce n'est pas urgent - la solution actuelle fonctionne.


