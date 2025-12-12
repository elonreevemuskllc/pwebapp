# 📱 Guide d'Installation de l'App AprilFTD

## 🚀 Comment installer l'app sur votre appareil

### 📱 Sur Mobile (Android/iOS)

#### Android (Chrome/Samsung Internet)
1. Ouvrez **http://localhost:5174** (ou votre URL de production) dans Chrome
2. Appuyez sur le **menu** (3 points en haut à droite)
3. Sélectionnez **"Ajouter à l'écran d'accueil"** ou **"Installer l'application"**
4. Confirmez l'installation
5. ✅ L'app apparaît sur votre écran d'accueil avec une icône !

#### iOS (Safari uniquement)
1. Ouvrez **http://localhost:5174** dans **Safari** (pas Chrome)
2. Appuyez sur le bouton **Partager** (carré avec flèche)
3. Faites défiler et sélectionnez **"Sur l'écran d'accueil"**
4. Personnalisez le nom si besoin
5. Appuyez sur **"Ajouter"**
6. ✅ L'app apparaît sur votre écran d'accueil !

### 💻 Sur Desktop (Windows/Mac/Linux)

#### Chrome/Edge
1. Ouvrez **http://localhost:5174** dans Chrome ou Edge
2. Cherchez l'icône **"Installer"** dans la barre d'adresse (à droite)
   - Ou allez dans **Menu** (3 points) > **"Installer AprilFTD"**
3. Cliquez sur **"Installer"**
4. ✅ L'app s'ouvre dans une fenêtre séparée, comme une vraie application !

#### Firefox
- Firefox ne supporte pas encore l'installation de PWA sur desktop
- Utilisez Chrome ou Edge pour l'installation

## 🔔 Comment activer les notifications

### Étape 1 : Demander la permission

L'app va automatiquement demander la permission pour les notifications lors de la première visite (ou vous pouvez le faire manuellement).

### Étape 2 : Vérifier l'activation

1. Ouvrez l'app installée
2. Allez dans les **Paramètres** de votre navigateur/appareil
3. Vérifiez que les notifications sont activées pour AprilFTD

### 📲 Sur Mobile

#### Android
- **Paramètres** > **Applications** > **AprilFTD** > **Notifications** > **Activer**

#### iOS
- **Réglages** > **Notifications** > **AprilFTD** > **Autoriser les notifications**

### 💻 Sur Desktop

#### Chrome/Edge
- **Paramètres** > **Confidentialité et sécurité** > **Paramètres du site** > **Notifications**
- Trouvez "AprilFTD" et assurez-vous que c'est sur **"Autoriser"**

## 🧪 Tester l'installation maintenant

### En développement (localhost)

1. **Lancez le serveur** :
   ```bash
   npm run dev
   ```

2. **Ouvrez Chrome** et allez sur **http://localhost:5174**

3. **Vérifiez le Service Worker** :
   - Appuyez sur **F12** (DevTools)
   - Onglet **"Application"**
   - Section **"Service Workers"** → doit être **"activated and running"**

4. **Installez l'app** :
   - Cherchez l'icône d'installation dans la barre d'adresse
   - Ou : Menu (3 points) > **"Installer AprilFTD"**

### En production

Pour que l'installation fonctionne en production, vous devez :
- ✅ Avoir un **HTTPS** (obligatoire pour PWA)
- ✅ Avoir le **manifest.json** accessible
- ✅ Avoir le **service worker** actif

## 🔍 Vérifier que ça fonctionne

### Checklist d'installation

- [ ] Le service worker est actif (DevTools > Application > Service Workers)
- [ ] Le manifest.json est accessible (DevTools > Application > Manifest)
- [ ] L'icône d'installation apparaît dans le navigateur
- [ ] L'app s'installe sans erreur
- [ ] L'app s'ouvre dans une fenêtre séparée (desktop) ou comme app (mobile)
- [ ] L'icône apparaît sur l'écran d'accueil (mobile)

## ❓ Problèmes courants

### L'icône d'installation n'apparaît pas
- ✅ Vérifiez que vous êtes en **HTTPS** ou sur **localhost**
- ✅ Vérifiez que le service worker est actif
- ✅ Videz le cache et rechargez la page

### L'app ne s'installe pas sur iOS
- ✅ Utilisez **Safari** (pas Chrome)
- ✅ iOS nécessite Safari pour installer les PWA

### Les notifications ne fonctionnent pas
- ✅ Vérifiez les permissions dans les paramètres
- ✅ Vérifiez que vous avez autorisé les notifications
- ✅ En développement, les notifications peuvent être limitées

## 📚 Prochaines étapes

Une fois l'app installée, vous pouvez :
- ✅ L'utiliser hors ligne (pages visitées)
- ✅ Recevoir des notifications (une fois configurées)
- ✅ L'utiliser comme une vraie application native

---

**Besoin d'aide ?** Consultez `PWA-GUIDE.md` pour plus de détails techniques.

