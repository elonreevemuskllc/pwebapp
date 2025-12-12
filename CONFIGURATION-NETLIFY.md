# Configuration Netlify - Guide étape par étape

## Étape 1 : Trouver votre URL Netlify

1. Connectez-vous à [Netlify](https://app.netlify.com)
2. Cliquez sur votre site
3. L'URL est affichée en haut (exemple : `mon-site-abc123.netlify.app`)
4. **Copiez cette URL** - vous en aurez besoin

## Étape 2 : Configurer les variables d'environnement sur Netlify

1. Dans Netlify, allez dans **Site settings** → **Environment variables**
2. Cliquez sur **Add a variable**
3. Ajoutez :
   - **Key** : `VITE_API_URL`
   - **Value** : `YOUR_BACKEND_URL`
4. Cliquez sur **Save**

## Étape 3 : Mettre à jour le fichier .env du backend

Sur votre serveur (YOUR_SERVER_IP), modifiez le fichier `/root/aprilpgapp/.env` :

**Remplacez cette ligne :**
```
VITE_SITE_URL=http://YOUR_SERVER_IP:5174
```

**Par cette ligne (remplacez VOTRE-URL-NETLIFY par votre vraie URL) :**
```
VITE_SITE_URL=http://YOUR_SERVER_IP:5174,https://VOTRE-URL-NETLIFY.netlify.app
```

**Exemple :**
```
VITE_SITE_URL=http://YOUR_SERVER_IP:5174,https://mon-site-abc123.netlify.app
```

## Étape 4 : Redémarrer le serveur backend

Après avoir modifié le fichier `.env`, redémarrez le serveur backend :

```bash
# Trouver le processus
ps aux | grep "tsx server/index.ts"

# Arrêter le serveur (remplacez PID par le numéro du processus)
kill PID

# Redémarrer
cd /root/aprilpgapp && npm run server
```

## Étape 5 : Commiter et pousser les fichiers de configuration

```bash
cd /root/aprilpgapp
git add netlify.toml public/_redirects
git commit -m "Ajout configuration Netlify"
git push
```

Netlify redéploiera automatiquement.

## Étape 6 : Vérifier

1. Allez sur votre site Netlify
2. Ouvrez la console du navigateur (F12)
3. Vérifiez que les requêtes API pointent vers `YOUR_BACKEND_URL`
4. Vérifiez qu'il n'y a plus d'erreur CORS

## Résumé des fichiers créés

- ✅ `netlify.toml` - Configuration du build
- ✅ `public/_redirects` - Redirections SPA
- ✅ `NETLIFY-SETUP.md` - Documentation
- ✅ `CONFIGURATION-NETLIFY.md` - Ce guide

## Problèmes courants

### Erreur CORS
→ Vérifiez que l'URL Netlify est bien dans `VITE_SITE_URL` du backend

### Erreur "Unexpected token '<'"
→ Vérifiez que `VITE_API_URL` est bien configuré sur Netlify

### Le site ne se charge pas
→ Vérifiez que `netlify.toml` et `public/_redirects` sont bien commités


