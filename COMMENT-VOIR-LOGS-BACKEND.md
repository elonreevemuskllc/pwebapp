# Comment voir les logs du backend

## 🔍 Situation actuelle

Le serveur backend tourne sur le port **3002** et utilise `console.log` et `console.error` pour les logs.

## 📋 Méthodes pour voir les logs

### 1. Redémarrer le serveur avec logs visibles

**Arrêter le serveur actuel :**
```bash
# Trouver le PID du serveur
ps aux | grep "tsx server/index.ts" | grep -v grep

# Arrêter le serveur (remplacez PID par le numéro trouvé)
kill PID

# Ou arrêter tous les processus tsx
pkill -f "tsx server/index.ts"
```

**Démarrer avec logs visibles :**
```bash
cd /root/aprilpgapp
npm run server
```

Les logs s'afficheront directement dans le terminal.

### 2. Redémarrer avec logs dans un fichier

```bash
cd /root/aprilpgapp
npm run server > server.log 2>&1 &

# Voir les logs en temps réel
tail -f server.log

# Voir les dernières lignes
tail -20 server.log
```

### 3. Utiliser PM2 (recommandé pour la production)

**Installer PM2 :**
```bash
npm install -g pm2
```

**Démarrer avec PM2 :**
```bash
cd /root/aprilpgapp
pm2 start npm --name "backend" -- run server
```

**Voir les logs :**
```bash
# Logs en temps réel
pm2 logs backend

# Dernières lignes
pm2 logs backend --lines 50

# Suivre les logs
pm2 logs backend --follow
```

**Autres commandes PM2 utiles :**
```bash
pm2 list          # Liste des processus
pm2 restart backend  # Redémarrer
pm2 stop backend     # Arrêter
pm2 delete backend   # Supprimer
```

### 4. Tester la connexion à la base de données

```bash
cd /root/aprilpgapp
node scripts/test-db-connection.js
```

Ce script va :
- Vérifier les variables d'environnement
- Tester la connexion MySQL
- Afficher les tables disponibles
- Donner des messages d'erreur détaillés

## 🔧 Configuration des variables d'environnement

Le backend utilise un fichier `.env` à la racine du projet. Vérifiez qu'il contient :

```env
DB_HOST=votre_host_mysql
DB_USER=votre_user_mysql
DB_PASSWORD=votre_password_mysql
DB_NAME=votre_nom_db
DB_PORT=3306
PORT=3002
NODE_ENV=production
```

## 📊 Logs importants à surveiller

### Au démarrage :
- `Server running on port 3002` ✅
- `Default admin created successfully` ✅
- `🚀 Starting FTD Cron Service` ✅
- `🚀 Starting Balance Cron Service` ✅

### Erreurs courantes :
- `ECONNREFUSED` → MySQL n'est pas accessible
- `ER_ACCESS_DENIED_ERROR` → Mauvais identifiants
- `ER_BAD_DB_ERROR` → Base de données n'existe pas

## 🚀 Scripts utiles

### Voir les logs du backend
```bash
./scripts/view-backend-logs.sh
```

### Tester la connexion DB
```bash
node scripts/test-db-connection.js
```

## 📝 Notes

- Le serveur backend doit tourner sur **72.61.102.27:3002**
- Les logs sont actuellement redirigés vers `/dev/null` si démarré en arrière-plan
- Pour la production, utilisez **PM2** pour une meilleure gestion des logs
