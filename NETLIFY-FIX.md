# Fix : Erreur "undefined" dans les URLs API sur Netlify

## Problème résolu

L'erreur `GET https://prgweapp.netlify.app/undefined/api/auth/verify-session` était due à la variable d'environnement `VITE_API_URL` non définie sur Netlify.

## Solution appliquée

1. **Valeur par défaut dans vite.config.ts** : Si `VITE_API_URL` n'est pas définie, elle utilisera `YOUR_BACKEND_URL` par défaut.

2. **Fichier .env.example** : Créé pour documenter les variables nécessaires.

## Action requise sur Netlify

**IMPORTANT** : Vous devez quand même configurer la variable d'environnement sur Netlify pour que tout fonctionne correctement.

1. Allez dans **Netlify Dashboard** → Votre site → **Site settings** → **Environment variables**
2. Ajoutez :
   - **Key** : `VITE_API_URL`
   - **Value** : `YOUR_BACKEND_URL`
3. **Sauvegardez**
4. **Redéployez** votre site (ou attendez le prochain push)

## Vérification

Après le redéploiement, vérifiez dans la console du navigateur que les requêtes API pointent vers `YOUR_BACKEND_URL` et non vers `undefined`.

## Fichiers modifiés

- ✅ `vite.config.ts` - Ajout d'une valeur par défaut
- ✅ `.env.example` - Documentation des variables d'environnement


