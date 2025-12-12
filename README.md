# AprilFTD - Progressive Web App

Plateforme de gestion d'affiliation et de commissions avec support PWA (Progressive Web App).

## 🚀 Fonctionnalités

- ✅ **Progressive Web App (PWA)** - Installation sur mobile et desktop
- ✅ **Notifications push** - Alertes pour paiements, récompenses, etc.
- ✅ **Mode offline** - Accès aux pages visitées sans internet
- ✅ **Système d'affiliation** - Gestion complète des affiliés
- ✅ **Gestion des paiements** - Demandes et suivi des paiements
- ✅ **Récompenses** - Système de récompenses basé sur les FTD
- ✅ **Tableaux de bord** - Pour admin, manager et affiliés
- ✅ **Multi-langue** - Support FR/EN

## 📱 Installation de l'App

### Sur Mobile
- **Android** : Chrome > Menu > "Ajouter à l'écran d'accueil"
- **iOS** : Safari > Partager > "Sur l'écran d'accueil"

### Sur Desktop
- **Chrome/Edge** : Icône "Installer" dans la barre d'adresse

Voir [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md) pour plus de détails.

## 🔔 Notifications

Les notifications sont automatiquement proposées lors de la première visite. Voir [NOTIFICATIONS-GUIDE.md](./NOTIFICATIONS-GUIDE.md) pour plus d'informations.

## 🛠️ Installation et Développement

### Prérequis
- Node.js 18+ 
- MySQL 8+
- npm ou yarn

### Installation

```bash
# Cloner le repository
git clone https://github.com/elonreevemuskllc/pwebapp.git
cd pwebapp

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres de base de données
```

### Configuration

Créer un fichier `.env` à la racine :

```env
# Base de données
DB_HOST=YOUR_DB_HOST
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME
DB_PORT=3306

# Serveur
PORT=3002
NODE_ENV=development

# API
VITE_API_URL=http://localhost:3002
VITE_SITE_URL=http://localhost:5174
```

### Lancer le projet

```bash
# Développement (frontend + backend)
npm run dev

# Frontend uniquement
npm run dev:client

# Backend uniquement
npm run dev:server
```

### Build de production

```bash
npm run build
npm run preview
```

## 📁 Structure du projet

```
├── public/              # Fichiers statiques (icônes PWA, etc.)
├── server/              # Backend Express
│   ├── db/             # Configuration base de données
│   ├── routes/          # Routes API
│   ├── services/        # Services métier
│   └── scripts/        # Scripts utilitaires
├── src/                 # Frontend React
│   ├── components/     # Composants React
│   ├── pages/          # Pages de l'application
│   ├── hooks/          # Hooks React personnalisés
│   └── config/         # Configuration
└── scripts/             # Scripts de build
```

## 🔐 Sécurité

- ⚠️ **NE JAMAIS** commiter le fichier `.env`
- ⚠️ Le fichier `.env` est déjà dans `.gitignore`
- ⚠️ Utiliser des variables d'environnement pour les secrets

## 📚 Documentation

- [PWA-GUIDE.md](./PWA-GUIDE.md) - Guide complet PWA
- [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md) - Guide d'installation
- [NOTIFICATIONS-GUIDE.md](./NOTIFICATIONS-GUIDE.md) - Guide des notifications

## 🚀 Déploiement

### Vercel / Netlify (Frontend)
1. Connecter le repository GitHub
2. Configurer les variables d'environnement
3. Build command: `npm run build`
4. Output directory: `dist`

### Railway / Render (Backend)
1. Connecter le repository GitHub
2. Configurer les variables d'environnement
3. Build command: `npm install`
4. Start command: `npm run server`

### Important pour PWA
- ✅ HTTPS obligatoire en production
- ✅ Service Worker fonctionne uniquement en HTTPS (ou localhost)
- ✅ Vérifier que le manifest.json est accessible

## 🧪 Tests

```bash
# Vérifier les types TypeScript
npm run typecheck

# Linter
npm run lint
```

## 📝 Scripts disponibles

- `npm run dev` - Lance frontend + backend
- `npm run build` - Build de production
- `npm run preview` - Preview du build
- `npm run generate-icons` - Générer les icônes PWA
- `npm run ftd:sync` - Synchroniser les FTD
- `npm run balance:update` - Mettre à jour les balances

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Propriétaire - Tous droits réservés

---

**Développé avec ❤️ pour AprilFTD**
