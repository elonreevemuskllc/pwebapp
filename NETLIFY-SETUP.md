# Configuration Netlify pour April Progressive Web App

## Problème résolu

L'erreur "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" se produit quand Netlify retourne du HTML au lieu de JSON pour les requêtes API.

## Solution

### 1. Variables d'environnement à configurer sur Netlify

Dans les paramètres de votre site Netlify, allez dans **Site settings → Environment variables** et ajoutez :

```
VITE_API_URL=YOUR_BACKEND_URL
```

**Important** : Remplacez `YOUR_BACKEND_URL` par l'URL de votre backend si elle est différente.

### 2. Configuration CORS sur le backend

Sur votre serveur backend (YOUR_SERVER_IP:3002), vous devez mettre à jour la variable d'environnement `VITE_SITE_URL` pour inclure l'URL de votre site Netlify.

Exemple dans `.env` du serveur :
```
VITE_SITE_URL=http://YOUR_SERVER_IP:5174,https://votre-site.netlify.app
```

Ou si vous avez plusieurs environnements :
```
VITE_SITE_URL=http://YOUR_SERVER_IP:5174,https://votre-site.netlify.app,https://votre-site-dev.netlify.app
```

### 3. Redéployer

1. Commitez les fichiers `netlify.toml` et `public/_redirects` dans votre dépôt
2. Poussez vers votre branche principale
3. Netlify redéploiera automatiquement

### 4. Vérification

Après le déploiement, vérifiez dans la console du navigateur que les requêtes API pointent bien vers `YOUR_BACKEND_URL` et non vers le domaine Netlify.

## Structure des fichiers

- `netlify.toml` : Configuration du build et des redirections
- `public/_redirects` : Redirections pour le SPA (toutes les routes vers index.html)

## Notes importantes

- Le backend doit être accessible publiquement depuis Internet
- Le backend doit accepter les requêtes CORS depuis votre domaine Netlify
- Si vous utilisez HTTPS sur Netlify, assurez-vous que le backend accepte aussi les requêtes HTTPS ou configurez un reverse proxy


