# Correction du problème de secrets détectés par Netlify

## Problème résolu

Le scanner de secrets Netlify a détecté l'URL du backend hardcodée dans le code. Toutes les URLs hardcodées ont été retirées et remplacées par des variables d'environnement.

## Changements effectués

### 1. Fichiers modifiés

- ✅ `vite.config.ts` : Retiré l'URL hardcodée, utilise uniquement les variables d'environnement
- ✅ `netlify.toml` : Retiré l'URL hardcodée, utilise maintenant un script de génération
- ✅ `src/config/api.ts` : Retiré l'URL hardcodée, utilise les variables d'environnement
- ✅ `.gitignore` : Ajouté `.env.backup` pour éviter de commiter des secrets

### 2. Nouveau système de redirects

Un script `scripts/generate-redirects.js` génère automatiquement le fichier `_redirects` au build avec la variable d'environnement `NETLIFY_BACKEND_URL`.

## Configuration sur Netlify

### Option 1 : Utiliser une variable d'environnement (Recommandé)

1. Allez dans **Site settings** → **Environment variables**
2. Ajoutez une nouvelle variable :
   - **Key** : `NETLIFY_BACKEND_URL`
   - **Value** : `YOUR_BACKEND_URL` (ou votre URL backend)
3. Redéployez votre site

Le script générera automatiquement le fichier `_redirects` avec cette URL au moment du build.

### Option 2 : Ne pas définir NETLIFY_BACKEND_URL

Si vous ne définissez pas `NETLIFY_BACKEND_URL`, le fichier `_redirects` ne contiendra pas de redirect pour `/api/*`. Dans ce cas, vous devrez :

- Utiliser les fonctions Edge de Netlify pour le proxy
- Ou configurer le proxy directement dans `netlify.toml` (mais cela nécessitera de hardcoder l'URL, ce qui déclenchera à nouveau le scanner)

**Recommandation** : Utilisez l'Option 1 avec la variable d'environnement.

## Variables d'environnement Netlify

Configurez ces variables sur Netlify :

| Variable | Description | Valeur recommandée |
|----------|-------------|-------------------|
| `NETLIFY_BACKEND_URL` | URL du backend pour le proxy API | `YOUR_BACKEND_URL` |
| `VITE_API_URL` | URL de l'API pour le frontend (peut être vide) | `` (chaîne vide) |

**Note** : `VITE_API_URL` peut rester vide car le code utilise automatiquement `window.location.origin` en production (proxy Netlify).

## Vérification

Après le déploiement, vérifiez que :

1. ✅ Le build passe sans erreur de secrets
2. ✅ Les requêtes API fonctionnent correctement
3. ✅ Le fichier `_redirects` dans `dist/` contient le redirect vers votre backend

## Fichiers ignorés par Git

Les fichiers suivants sont maintenant dans `.gitignore` et ne seront pas commités :

- `.env`
- `.env.local`
- `.env.production`
- `.env.development`
- `.env.backup`

**Important** : Ne commitez jamais de fichiers contenant des secrets ou des mots de passe !
