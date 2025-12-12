# Configuration VITE_API_URL sur Netlify - GUIDE COMPLET

## ⚠️ IMPORTANT : Le problème "undefined"

L'erreur `undefined/api/auth/verify-session` se produit parce que la variable `VITE_API_URL` n'est **pas définie au moment du BUILD** sur Netlify.

## ✅ Solution : Configurer la variable d'environnement

### Étape 1 : Aller dans les paramètres Netlify

1. Connectez-vous à [app.netlify.com](https://app.netlify.com)
2. Cliquez sur votre site **prgweapp**
3. Allez dans **Site settings** (en haut à droite)
4. Dans le menu de gauche, cliquez sur **Environment variables**

### Étape 2 : Ajouter la variable

1. Cliquez sur **Add a variable** (bouton en haut)
2. Remplissez :
   - **Key** : `VITE_API_URL`
   - **Value** : `http://72.61.102.27:3002`
   - **Scopes** : Cochez **Build** (IMPORTANT !) et **Deploy**
3. Cliquez sur **Save**

### Étape 3 : Redéployer

**Option A : Redéploiement manuel**
1. Allez dans **Deploys**
2. Cliquez sur **Trigger deploy** → **Deploy site**

**Option B : Push un commit**
```bash
git push
```
Netlify redéploiera automatiquement.

## 🔍 Vérification

Après le redéploiement :

1. Ouvrez votre site Netlify
2. Ouvrez la console du navigateur (F12)
3. Vérifiez dans l'onglet **Network** que les requêtes API pointent vers :
   - ✅ `http://72.61.102.27:3002/api/...`
   - ❌ PAS `undefined/api/...`

## 📝 Note importante

- La variable doit être définie avec le scope **Build** pour être disponible pendant le build
- Si vous ne cochez que **Deploy**, la variable ne sera pas disponible au moment du build et vous aurez toujours "undefined"
- Le code a maintenant une valeur par défaut (`http://72.61.102.27:3002`), mais il est préférable de la définir explicitement sur Netlify

## 🐛 Si ça ne fonctionne toujours pas

1. Vérifiez que la variable est bien dans la section **Build environment variables**
2. Vérifiez l'orthographe : `VITE_API_URL` (en majuscules)
3. Vérifiez qu'il n'y a pas d'espaces avant/après la valeur
4. Redéployez complètement (pas juste un cache clear)

