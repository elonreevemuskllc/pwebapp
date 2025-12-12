# Configuration des variables d'environnement Netlify pour ignorer les faux positifs

## ⚠️ IMPORTANT

La variable `SECRETS_SCAN_OMIT_KEYS` doit être définie dans les **variables d'environnement Netlify**, pas dans `netlify.toml`.

## Configuration sur Netlify

### Étape 1 : Aller dans les variables d'environnement

1. Allez sur votre site Netlify
2. Cliquez sur **Site settings**
3. Allez dans **Environment variables**

### Étape 2 : Ajouter la variable SECRETS_SCAN_OMIT_KEYS

Ajoutez une nouvelle variable :

- **Key** : `SECRETS_SCAN_OMIT_KEYS`
- **Value** : `NODE_ENV,DB_NAME,DB_PORT,PORT,DB_USER,VITE_SITE_URL`

**Important** : Pas d'espaces dans la liste, séparée uniquement par des virgules.

### Étape 3 : Autres variables d'environnement

Assurez-vous aussi que ces variables sont définies :

| Variable | Description | Valeur |
|----------|-------------|--------|
| `NETLIFY_BACKEND_URL` | URL du backend pour le proxy API | `http://72.61.102.27:3002` |
| `VITE_API_URL` | URL de l'API (peut être vide) | `` (chaîne vide) |

## Variables à ignorer

Ces variables sont des **faux positifs** car :
- `NODE_ENV` : Variable standard Node.js (production/development)
- `DB_NAME`, `DB_PORT`, `DB_USER` : Variables de configuration DB (backend uniquement)
- `PORT` : Port du serveur (backend uniquement)
- `VITE_SITE_URL` : URLs pour CORS (backend uniquement)

Ces variables sont utilisées dans le code via `process.env`, ce qui est la pratique recommandée. Le scanner les détecte dans le code compilé, mais ce ne sont pas de vrais secrets.

## Vérification

Après avoir ajouté `SECRETS_SCAN_OMIT_KEYS` dans les variables d'environnement Netlify :

1. Redéployez votre site
2. Le build devrait passer sans erreur de secrets
3. Le scanner ignorera ces variables

## Note

Le fichier `netlify.toml` contient déjà `SECRETS_SCAN_OMIT_PATHS` pour exclure les fichiers de documentation et le code backend du scan.
