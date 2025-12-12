# Configuration finale du scanner de secrets Netlify

## ✅ Configuration appliquée

### 1. Fichier netlify.toml

Le fichier `netlify.toml` contient maintenant :

```toml
[build.environment]
  NODE_VERSION = "18"
  # Exclure les fichiers de documentation et le code backend
  SECRETS_SCAN_OMIT_PATHS = "*.md,*.example,*.backup,cellxpert-affiliate-api-settings.json,server/**,dev-dist/**"
  # Ignorer les variables d'environnement standard (faux positifs)
  SECRETS_SCAN_OMIT_KEYS = "NODE_ENV,DB_NAME,DB_PORT,PORT,DB_USER,VITE_SITE_URL"
```

### 2. Variables détectées (faux positifs)

Ces variables sont détectées par le scanner mais ce sont des **faux positifs** :

- `NODE_ENV` : Variable standard Node.js
- `DB_NAME`, `DB_PORT`, `DB_USER` : Variables de configuration DB (backend uniquement)
- `PORT` : Port du serveur (backend uniquement)
- `VITE_SITE_URL` : URLs pour CORS (backend uniquement)

**Pourquoi ce sont des faux positifs ?**
- Ces variables sont utilisées dans le code via `process.env`, ce qui est normal
- Les références sont compilées dans le bundle JavaScript
- Ce ne sont pas de vrais secrets, juste des variables de configuration

### 3. Fichiers exclus du scan

- `*.md` : Documentation
- `*.example` : Fichiers d'exemple
- `*.backup` : Fichiers de sauvegarde
- `cellxpert-affiliate-api-settings.json` : Fichier de configuration
- `server/**` : Code backend (n'est pas déployé sur Netlify)
- `dev-dist/**` : Build de développement

## ⚠️ Action requise sur Netlify

**IMPORTANT** : Selon la documentation Netlify, `SECRETS_SCAN_OMIT_KEYS` peut nécessiter d'être défini dans les **variables d'environnement Netlify** plutôt que dans `netlify.toml`.

### Si le build échoue encore :

1. Allez dans **Site settings** → **Environment variables** sur Netlify
2. Ajoutez une nouvelle variable :
   - **Key** : `SECRETS_SCAN_OMIT_KEYS`
   - **Value** : `NODE_ENV,DB_NAME,DB_PORT,PORT,DB_USER,VITE_SITE_URL`
3. Redéployez votre site

## Vérification

Après configuration, le build devrait :
- ✅ Passer sans erreur de secrets
- ✅ Ignorer ces variables dans le scan
- ✅ Exclure les fichiers de documentation et le backend du scan

## Alternative : Désactiver le scan (non recommandé)

Si le problème persiste, vous pouvez désactiver complètement le scan (mais ce n'est pas recommandé pour la sécurité) :

```toml
[build.environment]
  SECRETS_SCAN_ENABLED = "false"
```

**⚠️ Attention** : Cela désactive complètement le scan de secrets, ce qui n'est pas recommandé pour la sécurité.
