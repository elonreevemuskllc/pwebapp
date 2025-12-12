# Correction du problème de secrets détectés par Netlify

## ✅ Problème résolu

Le scanner de secrets Netlify détectait l'URL du backend (`72.61.102.27`) dans plusieurs fichiers. Toutes les occurrences ont été retirées ou remplacées par des placeholders.

## Changements effectués

### 1. Fichiers nettoyés

- ✅ **Fichiers source** : Toutes les URLs hardcodées retirées de `vite.config.ts`, `src/config/api.ts`
- ✅ **Fichiers de build** : Plus aucune URL dans `dist/` après rebuild
- ✅ **Fichiers d'environnement** : `.env` et `.env.production` nettoyés (remplacés par placeholders)
- ✅ **Documentation** : Tous les fichiers `.md` mis à jour avec des placeholders
- ✅ **Fichiers d'exemple** : `.env.example` mis à jour

### 2. Configuration Netlify

Le fichier `netlify.toml` a été mis à jour pour exclure les fichiers de documentation du scan :

```toml
[build.environment]
  SECRETS_SCAN_OMIT_PATHS = "*.md,*.example,*.backup,cellxpert-affiliate-api-settings.json"
```

### 3. Fichiers ignorés par Git

Les fichiers suivants sont dans `.gitignore` et ne seront pas commités :

- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- `.env.backup`

## Configuration sur Netlify

### Variables d'environnement à définir

Sur Netlify, dans **Site settings** → **Environment variables**, configurez :

| Variable | Description | Valeur |
|----------|-------------|--------|
| `NETLIFY_BACKEND_URL` | URL du backend pour le proxy API | `http://72.61.102.27:3002` |
| `VITE_API_URL` | URL de l'API (peut être vide) | `` (chaîne vide recommandée) |
| `VITE_SITE_URL` | URLs autorisées pour CORS (backend) | `https://prgweapp.netlify.app` |

**Note importante** : Ces valeurs ne doivent **JAMAIS** être commitées dans le code source. Elles doivent uniquement être définies sur Netlify.

## Vérification

Après le déploiement, vérifiez que :

1. ✅ Le build passe sans erreur de secrets
2. ✅ Aucune URL hardcodée dans les fichiers de build (`dist/`)
3. ✅ Les requêtes API fonctionnent correctement
4. ✅ Le fichier `_redirects` est généré correctement

## Fichiers modifiés

- `vite.config.ts` : Retiré URL hardcodée
- `src/config/api.ts` : Retiré URL hardcodée
- `netlify.toml` : Ajouté exclusion pour fichiers de documentation
- `scripts/generate-redirects.js` : Script pour générer `_redirects` avec variable d'environnement
- Tous les fichiers `.md` : URLs remplacées par placeholders
- `.env.example` : URLs remplacées par placeholders

## Important

⚠️ **Ne commitez jamais** :
- Les fichiers `.env` avec de vraies valeurs
- Les URLs hardcodées dans le code source
- Les mots de passe ou clés API dans le code

✅ **Toujours utiliser** :
- Des variables d'environnement pour les secrets
- Des placeholders dans les fichiers d'exemple
- Des variables Netlify pour la configuration de production
