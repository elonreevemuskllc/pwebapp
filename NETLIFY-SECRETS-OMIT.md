# Configuration Netlify - Exclusion des faux positifs du scanner de secrets

## Problème

Le scanner de secrets Netlify détecte les variables d'environnement suivantes comme des secrets potentiels :
- `NODE_ENV`
- `DB_NAME`
- `DB_PORT`
- `PORT`
- `DB_USER`
- `VITE_SITE_URL`

Ces variables sont des **faux positifs** car :
- Ce sont des variables d'environnement standard, pas des secrets réels
- Elles sont utilisées dans le code via `process.env`, ce qui est la pratique recommandée
- Les vraies valeurs sont stockées dans les variables d'environnement Netlify, pas dans le code

## Solution appliquée

### 1. Configuration dans netlify.toml

Ajout de `SECRETS_SCAN_OMIT_KEYS` pour ignorer ces faux positifs :

```toml
[build.environment]
  SECRETS_SCAN_OMIT_KEYS = "NODE_ENV,DB_NAME,DB_PORT,PORT,DB_USER,VITE_SITE_URL"
```

### 2. Nettoyage des fichiers

- ✅ Tous les fichiers `.env` ont été nettoyés (remplacés par des placeholders)
- ✅ Tous les fichiers `.md` ont été mis à jour avec des placeholders
- ✅ `.env.example` contient maintenant tous les exemples avec des placeholders

### 3. Fichiers ignorés par Git

Les fichiers suivants sont dans `.gitignore` et ne seront pas commités :
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- `.env.backup`

## Variables d'environnement sur Netlify

Ces variables doivent être définies sur Netlify (pas dans le code) :

| Variable | Description | Où la définir |
|----------|-------------|---------------|
| `NODE_ENV` | Environnement Node.js | Netlify (automatique) ou backend |
| `DB_NAME` | Nom de la base de données | Backend uniquement |
| `DB_PORT` | Port de la base de données | Backend uniquement |
| `PORT` | Port du serveur | Backend uniquement |
| `DB_USER` | Utilisateur de la base de données | Backend uniquement |
| `VITE_SITE_URL` | URLs autorisées pour CORS | Backend uniquement |

**Note importante** : Ces variables ne doivent **JAMAIS** être commitées dans le code avec de vraies valeurs. Utilisez toujours des placeholders dans les fichiers d'exemple.

## Vérification

Après le déploiement, vérifiez que :
1. ✅ Le build passe sans erreur de secrets
2. ✅ Le scanner Netlify ignore ces variables (grâce à `SECRETS_SCAN_OMIT_KEYS`)
3. ✅ Aucune vraie valeur de secret n'est dans le code source
