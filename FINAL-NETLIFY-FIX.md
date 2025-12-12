# 🔴 URGENT : Fix définitif pour "undefined" sur Netlify

## Problème actuel

Le code compilé contient toujours `/undefined/api/...` car `import.meta.env.VITE_API_URL` devient la chaîne littérale "undefined" au build.

## ✅ Solution appliquée

1. **`vite.config.ts`** : Injecte une chaîne vide `""` pour `VITE_API_URL` en production si non définie
2. **`src/config/api.ts`** : Détecte la chaîne "undefined" et utilise `window.location.origin` sur Netlify
3. **`netlify.toml`** : Proxy configuré pour `/api/*`

## ⚠️ ACTION REQUISE SUR NETLIFY

### Option 1 : Supprimer complètement VITE_API_URL (RECOMMANDÉ)

1. Allez dans **Netlify** → **Site settings** → **Environment variables**
2. **Supprimez** complètement la variable `VITE_API_URL`
3. **Redéployez** le site

### Option 2 : Mettre VITE_API_URL = "" (chaîne vide)

1. Allez dans **Netlify** → **Site settings** → **Environment variables**
2. Modifiez `VITE_API_URL` et mettez exactement : `""` (deux guillemets, rien entre)
3. **Redéployez** le site

## 🔍 Vérification après redéploiement

Dans la console du navigateur, vous devriez voir :
- ✅ Les requêtes vers `https://prgweapp.netlify.app/api/...`
- ❌ PAS `/undefined/api/...`
- ❌ PAS d'erreur "Failed to fetch"

## 📝 Comment ça fonctionne maintenant

1. **Si VITE_API_URL n'est pas définie sur Netlify** :
   - `vite.config.ts` injecte `""` (chaîne vide)
   - Le code détecte Netlify et utilise `window.location.origin`
   - Les requêtes vont vers `https://prgweapp.netlify.app/api/*`
   - Netlify proxy vers `YOUR_BACKEND_URL/api/*`

2. **Si VITE_API_URL = "undefined" (chaîne littérale)** :
   - Le code dans `src/config/api.ts` détecte `envUrl === 'undefined'`
   - Utilise `window.location.origin` sur Netlify
   - Même résultat : proxy Netlify

## 🚀 Prochaines étapes

1. **Supprimez VITE_API_URL sur Netlify**
2. **Redéployez**
3. **Testez** - les erreurs devraient disparaître

Si le problème persiste après avoir supprimé la variable, c'est que le cache du navigateur contient encore l'ancien code. Videz le cache ou faites un hard refresh (Ctrl+Shift+R).


