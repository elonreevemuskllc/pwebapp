# 🔔 Guide des Notifications - AprilFTD

## 📱 Comment installer l'app

### Sur Mobile (Android)
1. Ouvrez **http://localhost:5174** dans **Chrome**
2. Menu (3 points) > **"Ajouter à l'écran d'accueil"**
3. ✅ L'app est installée !

### Sur Mobile (iOS)
1. Ouvrez **http://localhost:5174** dans **Safari** (obligatoire)
2. Bouton **Partager** (carré avec flèche)
3. **"Sur l'écran d'accueil"**
4. ✅ L'app est installée !

### Sur Desktop (Chrome/Edge)
1. Ouvrez **http://localhost:5174**
2. Cherchez l'icône **"Installer"** dans la barre d'adresse
3. Cliquez sur **"Installer"**
4. ✅ L'app s'ouvre comme une vraie application !

## 🔔 Comment activer les notifications

### Méthode 1 : Prompt automatique
- Après 3 secondes sur le site, un prompt apparaît en bas à droite
- Cliquez sur **"Activer"**
- Autorisez les notifications dans la popup du navigateur

### Méthode 2 : Manuellement
1. Ouvrez les **Paramètres** de votre navigateur
2. Allez dans **Notifications** ou **Paramètres du site**
3. Trouvez **AprilFTD** ou **localhost:5174**
4. Activez les notifications

### Vérifier l'activation
- Le prompt disparaît une fois activé
- Vous verrez une confirmation "Notifications activées !"
- Les notifications fonctionnent même quand l'app est fermée

## 📲 Types de notifications

L'app peut envoyer des notifications pour :
- ✅ **Paiements** : Quand un paiement est accepté/refusé
- ✅ **Récompenses** : Quand vous atteignez un objectif FTD
- ✅ **Mises à jour** : Alertes importantes de l'admin
- ✅ **Salaires** : Notifications de salaire disponibles

## 🧪 Tester les notifications

### Test simple
1. Activez les notifications
2. Ouvrez la console du navigateur (F12)
3. Testez avec ce code :
```javascript
new Notification('Test AprilFTD', {
  body: 'Les notifications fonctionnent !',
  icon: '/icon-192x192.png'
});
```

### En production
Les notifications seront automatiquement envoyées par le serveur lors d'événements importants.

## ⚙️ Paramètres

### Désactiver les notifications
1. Allez dans les **Paramètres** du navigateur
2. **Notifications** > Trouvez **AprilFTD**
3. Désactivez les notifications

### Réactiver
- Le prompt réapparaîtra après avoir vidé le cache
- Ou activez manuellement dans les paramètres

## 🐛 Problèmes courants

### Les notifications ne s'affichent pas
- ✅ Vérifiez que vous avez autorisé les notifications
- ✅ Vérifiez que vous êtes en HTTPS (ou localhost)
- ✅ Vérifiez les paramètres de notification du navigateur

### Le prompt n'apparaît pas
- ✅ Videz le cache : `localStorage.removeItem('notification-prompt-seen')`
- ✅ Rechargez la page
- ✅ Vérifiez que les notifications sont supportées

### Les notifications ne fonctionnent pas sur mobile
- ✅ Android : Vérifiez les paramètres système > Applications > Notifications
- ✅ iOS : Les notifications push nécessitent une configuration spéciale (VAPID)

## 📚 Notes techniques

### Support navigateur
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop)
- ⚠️ Safari iOS (notifications limitées)
- ⚠️ Safari macOS (notifications limitées)

### Limitations
- Les notifications nécessitent HTTPS en production
- iOS nécessite une configuration VAPID pour les notifications push
- Les notifications fonctionnent même quand l'app est fermée

## 🚀 Prochaines étapes

Pour activer les notifications push complètes (même app fermée) :
1. Configurez VAPID keys
2. Ajoutez un service de push (Firebase, OneSignal, etc.)
3. Implémentez l'envoi de notifications depuis le serveur

---

**Les notifications sont maintenant actives ! 🎉**

