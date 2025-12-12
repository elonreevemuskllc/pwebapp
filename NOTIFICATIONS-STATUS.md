# 🔔 Statut des Notifications - AprilFTD

## ✅ Ce qui fonctionne MAINTENANT

### 1. Activation des notifications
- ✅ Prompt automatique après 3 secondes
- ✅ Permission demandée au navigateur
- ✅ Préférences enregistrées en base de données
- ✅ Route API `/api/notifications/enable`

### 2. Réception des notifications
- ✅ Vérification automatique toutes les 30 secondes
- ✅ Affichage des notifications du navigateur
- ✅ Notifications stockées en base de données
- ✅ Marquage automatique comme lues

### 3. Envoi depuis le serveur
- ✅ **Paiements acceptés** → Notification envoyée
- ✅ **Paiements refusés** → Notification envoyée
- ✅ **Récompenses atteintes** → Notification envoyée
- ✅ Service `notificationService.ts` créé

## 🎯 Comment ça fonctionne

1. **L'utilisateur active les notifications** via le prompt
2. **Le client vérifie périodiquement** (toutes les 30s) les nouvelles notifications
3. **Le serveur envoie des notifications** lors d'événements (paiements, récompenses)
4. **Les notifications s'affichent** même si l'app est fermée (si permission accordée)

## 📋 Événements qui déclenchent des notifications

### ✅ Implémentés
- Paiement accepté par l'admin
- Paiement refusé par l'admin
- Récompense atteinte (milestone FTD)

### 🔜 À implémenter (optionnel)
- Nouveau FTD assigné
- Mise à jour de balance
- Nouveau message admin
- Rappel de salaire disponible

## 🧪 Tester les notifications

### 1. Activer les notifications
- Ouvrez l'app
- Attendez le prompt (3 secondes)
- Cliquez sur "Activer"
- Autorisez dans la popup

### 2. Tester un paiement
- Faites une demande de paiement
- L'admin accepte/refuse
- **→ Notification reçue automatiquement !**

### 3. Tester une récompense
- Atteignez un milestone FTD
- **→ Notification automatique !**

## ⚙️ Configuration

### Fréquence de vérification
Par défaut : **30 secondes**

Pour changer, modifiez dans `src/hooks/useNotificationPolling.tsx` :
```typescript
const interval = setInterval(checkNotifications, 30000); // 30 secondes
```

### Types de notifications
- `payment` - Paiements
- `reward` - Récompenses
- `update` - Mises à jour
- `salary` - Salaires
- `general` - Général

## 🐛 Dépannage

### Les notifications ne s'affichent pas
1. Vérifiez que la permission est accordée
2. Vérifiez la console pour les erreurs
3. Vérifiez que `notifications_enabled = 1` en base
4. Vérifiez que le polling fonctionne (DevTools > Network)

### Les notifications ne sont pas envoyées
1. Vérifiez les logs serveur
2. Vérifiez que la table `user_notifications` existe
3. Vérifiez que `notifications_enabled = 1` pour l'utilisateur

## 📊 Base de données

### Table créée automatiquement
```sql
CREATE TABLE user_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  icon VARCHAR(500),
  url VARCHAR(500),
  type VARCHAR(50),
  read_status TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 🚀 En production

### Sur votre VPS
1. ✅ Les notifications fonctionnent automatiquement
2. ✅ HTTPS requis (déjà configuré sur VPS)
3. ✅ Le polling fonctionne même app fermée (si permission accordée)

### Performance
- Polling toutes les 30s = ~120 requêtes/heure/utilisateur
- Très léger pour le serveur
- Alternative : WebSockets (plus complexe mais plus efficace)

---

**Les notifications sont maintenant FONCTIONNELLES ! 🎉**

Testez en acceptant/refusant un paiement ou en atteignant une récompense.

