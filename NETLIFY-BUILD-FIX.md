# Correction du problème de build Netlify (log tronqué)

## Problème

Le build Netlify échoue avec un log tronqué (ne montre qu'une seule accolade fermante). Cela indique que le build échoue très tôt, probablement lors de l'exécution du script de génération des redirects.

## Solution appliquée

### 1. Simplification de la commande de build

La commande de build dans `netlify.toml` a été simplifiée pour utiliser `npm run build` qui exécute automatiquement le script `prebuild` (génération du fichier `_redirects`).

**Avant :**
```toml
command = "node scripts/generate-redirects.js && npm run build"
```

**Après :**
```toml
command = "npm run build"
```

### 2. Amélioration du script generate-redirects.js

Le script a été amélioré avec :
- Gestion d'erreur avec try/catch
- Vérification de l'existence du dossier `public/`
- Code de sortie explicite (0 pour succès, 1 pour erreur)

### 3. Configuration des redirects

Les redirects sont maintenant gérés uniquement par le fichier `_redirects` dans `public/`, qui est généré au build et copié dans `dist/` par Vite.

## Configuration sur Netlify

### Variables d'environnement requises

Dans **Site settings** → **Environment variables**, définissez :

| Variable | Description | Valeur |
|----------|-------------|--------|
| `NETLIFY_BACKEND_URL` | URL du backend pour le proxy API | `http://72.61.102.27:3002` |

**Note** : Si `NETLIFY_BACKEND_URL` n'est pas définie, le fichier `_redirects` ne contiendra que la redirection SPA (pas de proxy API).

## Vérification

1. ✅ Le script `generate-redirects.js` fonctionne localement
2. ✅ Le build local fonctionne (`npm run build`)
3. ✅ Le fichier `_redirects` est généré dans `public/` et copié dans `dist/`

## Si le problème persiste

Si le build échoue toujours sur Netlify :

1. **Vérifiez les logs complets** : Téléchargez le log complet depuis l'interface Netlify
2. **Vérifiez les variables d'environnement** : Assurez-vous que `NETLIFY_BACKEND_URL` est bien définie
3. **Vérifiez la version de Node.js** : Netlify utilise Node.js 18 (configuré dans `netlify.toml`)
4. **Testez localement** : Exécutez `npm run build` localement pour reproduire l'erreur

## Alternative : Utiliser netlify.toml pour les redirects

Si le script continue à poser problème, vous pouvez utiliser directement les redirects dans `netlify.toml` (mais cela nécessitera de hardcoder l'URL, ce qui déclenchera le scanner de secrets) :

```toml
[[redirects]]
  from = "/api/*"
  to = "http://72.61.102.27:3002/api/:splat"
  status = 200
  force = true
```

**⚠️ Attention** : Cette approche hardcode l'URL et déclenchera le scanner de secrets Netlify. Il faudra alors utiliser `SECRETS_SCAN_OMIT_KEYS` pour ignorer cette détection.
