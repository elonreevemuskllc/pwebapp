# Guide PWA - AprilFTD

## ✅ Ce qui a été fait

Votre application est maintenant une **Progressive Web App (PWA)** ! Voici ce qui a été configuré :

### 1. Installation et Configuration
- ✅ Plugin `vite-plugin-pwa` installé
- ✅ Configuration PWA dans `vite.config.ts`
- ✅ Manifest.json créé avec toutes les métadonnées
- ✅ Meta tags PWA ajoutés dans `index.html`
- ✅ Icônes générées pour toutes les tailles requises

### 2. Fonctionnalités PWA Actives

#### 📱 Installation sur appareil
- L'application peut être installée sur mobile et desktop
- Icône sur l'écran d'accueil
- Lancement en mode standalone (sans barre d'adresse)

#### 🔄 Service Worker
- Mise en cache automatique des ressources
- Mise à jour automatique en arrière-plan
- Mode offline partiel (les pages visitées restent accessibles)

#### 🎨 Personnalisation
- Thème color: `#3b82f6` (bleu)
- Background color: `#ffffff` (blanc)
- Mode d'affichage: `standalone`
- Orientation: `portrait-primary`

#### ⚡ Raccourcis
- Dashboard: `/affiliate/dashboard`
- Paiements: `/affiliate/payments`

## 🚀 Comment tester

### En développement
1. Lancez `npm run dev`
2. Ouvrez Chrome DevTools (F12)
3. Allez dans l'onglet "Application" > "Service Workers"
4. Vérifiez que le service worker est actif

### Installation sur mobile
1. Ouvrez l'app dans Chrome/Safari mobile
2. Menu > "Ajouter à l'écran d'accueil"
3. L'app s'installe comme une application native

### Installation sur desktop (Chrome/Edge)
1. Ouvrez l'app dans le navigateur
2. Cliquez sur l'icône d'installation dans la barre d'adresse
3. Ou : Menu > "Installer l'application"

## 📝 Améliorations possibles

### 1. Icônes optimisées
Les icônes actuelles sont des copies du favicon. Pour une meilleure qualité :
- Utilisez un outil comme [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- Ou créez des icônes optimisées pour chaque taille

### 2. Mode offline complet
Actuellement, seules les pages visitées sont en cache. Pour un mode offline complet :
- Ajoutez une page "Offline" personnalisée
- Implémentez une stratégie de cache pour les API critiques
- Ajoutez une synchronisation en arrière-plan

### 3. Notifications push
Pour activer les notifications :
- Configurez Firebase Cloud Messaging ou Web Push
- Ajoutez la gestion des notifications dans le service worker

### 4. Partage de contenu
- Ajoutez Web Share API pour partager des données
- Implémentez le partage de liens de paiement, etc.

## 🔧 Commandes utiles

```bash
# Générer les icônes (si vous modifiez le favicon)
npm run generate-icons

# Build de production (génère le service worker)
npm run build

# Preview de la build
npm run preview
```

## 📱 Compatibilité

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari iOS 11.3+
- ✅ Firefox (support partiel)
- ✅ Samsung Internet

## 🐛 Dépannage

### Le service worker ne se charge pas
- Vérifiez que vous êtes en HTTPS (ou localhost)
- Videz le cache du navigateur
- Vérifiez la console pour les erreurs

### L'icône ne s'affiche pas
- Vérifiez que les fichiers icon-*.png existent dans `public/`
- Régénérez les icônes avec `npm run generate-icons`

### L'app ne s'installe pas
- Vérifiez que le manifest.json est accessible
- Vérifiez que le service worker est actif
- Sur iOS, utilisez Safari (pas Chrome)

## 📚 Ressources

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

---

**Votre app est maintenant une PWA ! 🎉**

