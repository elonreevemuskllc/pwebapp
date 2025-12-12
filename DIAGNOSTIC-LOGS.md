# Logs de diagnostic - Problème %60%60 dans les URLs

## Problème observé

Les URLs API contiennent `%60%60` (backticks encodés) au lieu de `/api/...`:
- `POST https://prgweapp.netlify.app/%60%60/api/auth/check-email 404`
- `workbox Router is responding to: /%60%60/api/auth/verify-session`

## Diagnostic effectué

### 1. Build local
- ✅ Build réussit sans erreur
- ✅ `VITE_API_URL` est bien injecté comme `""` (chaîne vide)
- ✅ Code source nettoie les backticks dans `getApiBaseUrl()` et `buildApiUrl()`

### 2. Code compilé local
- ✅ `VITE_API_URL:"")` dans le bundle
- ❓ Pas de backticks visibles dans le code compilé local

### 3. Problème probable

Le problème vient probablement de **Netlify** où :
1. La variable `VITE_API_URL` contient réellement des backticks (`` ` ``)
2. Ou le build sur Netlify utilise une ancienne version du code
3. Ou il y a un problème avec la façon dont Netlify injecte les variables d'environnement

## Solution

### Action immédiate sur Netlify

1. **Vérifier la variable `VITE_API_URL`** :
   - Allez dans **Site settings** → **Environment variables**
   - Cherchez `VITE_API_URL`
   - **Supprimez-la complètement** ou mettez une **chaîne vide** `""`
   - ⚠️ **IMPORTANT** : Vérifiez qu'il n'y a **PAS de backticks** dans la valeur

2. **Redéployer** :
   - Déclenchez un nouveau build manuellement
   - Ou faites un commit vide pour forcer un rebuild

### Vérification de la base de données

La base de données est configurée sur le **serveur backend** (`72.61.102.27:3002`), pas sur Netlify.

**Variables à configurer sur le serveur backend** :
```env
DB_HOST=votre_host_mysql
DB_USER=votre_user_mysql
DB_PASSWORD=votre_password_mysql
DB_NAME=votre_nom_db
DB_PORT=3306
PORT=3002
NODE_ENV=production
```

**Pour vérifier la connexion DB** :
- Vérifiez les logs du serveur backend
- Testez une requête API depuis le frontend
- Vérifiez que le serveur backend tourne bien sur `http://72.61.102.27:3002`

## Logs à vérifier

### Sur Netlify
1. Allez dans **Deploys** → **Latest deploy** → **Deploy log**
2. Cherchez la ligne avec `VITE_API_URL` dans le build
3. Vérifiez la valeur injectée

### Sur le serveur backend
1. Vérifiez les logs du serveur Node.js
2. Vérifiez les erreurs de connexion MySQL
3. Testez une requête API directement : `curl http://72.61.102.27:3002/api/auth/verify-session`

## Prochaines étapes

1. ✅ Code corrigé et poussé sur GitHub
2. ⏳ Vérifier `VITE_API_URL` sur Netlify (supprimer ou mettre vide)
3. ⏳ Redéployer sur Netlify
4. ⏳ Vérifier les logs du build Netlify
5. ⏳ Vérifier la connexion DB sur le serveur backend
