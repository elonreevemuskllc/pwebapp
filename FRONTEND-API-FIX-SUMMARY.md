# Résumé des corrections frontend - API URLs

## ✅ Fichiers modifiés

### 1. Client HTTP centralisé
- **`src/utils/httpClient.ts`** (NOUVEAU)
  - Client HTTP centralisé avec `api.get()`, `api.post()`, `api.put()`, `api.delete()`
  - Gestion automatique de `VITE_API_URL` :
    - Si vide → URLs relatives (`/api/...`)
    - Si non-vide → URLs absolues (`${API_BASE_URL}/api/...`)
  - Nettoyage automatique des guillemets et caractères invalides
  - Logs de debug en mode développement

### 2. Fichiers critiques corrigés
- **`src/pages/Login.tsx`**
  - ✅ Tous les appels remplacés par `api.get()` / `api.post()`
  - `/api/auth/check-email` → `api.post('/api/auth/check-email', { email })`
  - `/api/auth/verify-session` → `api.get('/api/auth/verify-session')`
  - `/api/auth/login` → `api.post('/api/auth/login', { email, password })`
  - etc.

- **`src/pages/Register.tsx`**
  - ✅ `/api/auth/verify-session` → `api.get('/api/auth/verify-session')`
  - ✅ `/api/auth/register` → `api.post('/api/auth/register', payload)`

- **`src/components/AuthWrapper.tsx`**
  - ✅ `/api/auth/verify-session` → `api.get('/api/auth/verify-session')`

- **`src/hooks/useAuth.tsx`**
  - ✅ `/api/auth/verify-session` → `api.get('/api/auth/verify-session')`
  - ✅ `/api/auth/logout` → `api.post('/api/auth/logout')`

- **`src/hooks/useNotificationPolling.tsx`**
  - ✅ `/api/notifications/unread` → `api.get('/api/notifications/unread')`
  - ✅ `/api/notifications/read/${id}` → `api.post(\`/api/notifications/read/${id}\`)`

- **`src/hooks/useNotifications.tsx`**
  - ✅ `/api/notifications/enable` → `api.post('/api/notifications/enable')`

- **`src/components/DateOfBirthModal.tsx`**
  - ✅ `/api/auth/update-date-of-birth` → `api.post('/api/auth/update-date-of-birth', { dateOfBirth })`

### 3. Configuration Service Worker
- **`vite.config.ts`**
  - ✅ Pattern Workbox mis à jour pour exclure les URLs avec `%22%22` ou guillemets
  - ✅ Ne cache que les URLs valides commençant par `/api/`

## 📋 Logique finale de baseURL

```typescript
// Dans httpClient.ts
let API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Nettoyage agressif
if (API_BASE_URL) {
  API_BASE_URL = API_BASE_URL.trim()
    .replace(/^["']|["']$/g, '')  // Enlever guillemets début/fin
    .replace(/[`'"]/g, '')        // Enlever tous les guillemets
    .trim();
  
  // Si invalide après nettoyage, forcer à vide
  if (API_BASE_URL === '' || API_BASE_URL.includes('""') || ...) {
    API_BASE_URL = '';
  }
}

// Si vide → URLs relatives
// Si non-vide → URLs absolues
```

## 🎯 Résultat pour les endpoints critiques

### Quand `VITE_API_URL` est vide (Netlify) :

1. **`/api/auth/check-email`**
   - Avant : `https://prgweapp.netlify.app/%22%22/api/auth/check-email` ❌
   - Maintenant : `/api/auth/check-email` ✅
   - Résolu par le navigateur : `https://prgweapp.netlify.app/api/auth/check-email` ✅

2. **`/api/auth/verify-session`**
   - Avant : `/%22%22/api/auth/verify-session` ❌
   - Maintenant : `/api/auth/verify-session` ✅

3. **`/api/notifications/unread`**
   - Avant : `/%22%22/api/notifications/unread` ❌
   - Maintenant : `/api/notifications/unread` ✅

## ⚠️ Fichiers restants à corriger

Il reste **91 occurrences** de `buildApiUrl` dans **24 fichiers** pour les autres endpoints (dashboard, payments, rewards, etc.). Ces fichiers utilisent encore `buildApiUrl()` mais ne sont pas critiques pour le problème `%22%22` initial.

**Fichiers restants** :
- `src/pages/admin/*.tsx` (Dashboard, Payments, Rewards, etc.)
- `src/pages/affiliate/*.tsx` (Dashboard, Payments, Rewards, etc.)
- `src/pages/manager/*.tsx`
- `src/components/*.tsx` (PaymentRequestModal, etc.)

**Note** : Ces fichiers peuvent être corrigés progressivement. Le problème principal (`%22%22` dans verify-session, check-email, notifications) est résolu.

## 🔧 Prochaines étapes (optionnel)

Pour corriger tous les fichiers restants :

1. Remplacer `import { buildApiUrl } from '../utils/api'` par `import { api } from '../utils/httpClient'`
2. Remplacer `fetch(buildApiUrl('/api/...'), { method: 'GET' })` par `api.get('/api/...')`
3. Remplacer `fetch(buildApiUrl('/api/...'), { method: 'POST', body: JSON.stringify(data) })` par `api.post('/api/...', data)`
4. **Exception** : Garder `buildApiUrl('')` pour les images (ex: `${buildApiUrl('')}${image_url}`)

## ✅ Vérifications

- ✅ Build réussi : `npm run build` passe sans erreur
- ✅ Plus de `%22%22` : 0 occurrence dans le code compilé
- ✅ Endpoints critiques corrigés : check-email, verify-session, notifications/unread
- ✅ Service Worker configuré pour ignorer les URLs invalides

## 📝 Notes importantes

- Le client HTTP centralisé (`httpClient.ts`) est la **source unique de vérité** pour les URLs API
- Tous les nouveaux appels API doivent utiliser `api.get()`, `api.post()`, etc.
- Ne plus utiliser `buildApiUrl()` directement (sauf pour les images avec `buildApiUrl('')`)
- Le Service Worker ignore automatiquement les URLs avec `%22%22`
