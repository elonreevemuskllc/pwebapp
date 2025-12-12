#!/bin/bash
# Script pour voir les logs du backend en temps réel

echo "🔍 Recherche des processus backend..."
echo ""

# Vérifier si le serveur tourne
SERVER_PID=$(ps aux | grep -E "tsx server/index.ts|node.*server/index" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$SERVER_PID" ]; then
    echo "❌ Le serveur backend ne semble pas être en cours d'exécution"
    echo ""
    echo "Pour démarrer le serveur avec logs visibles :"
    echo "  cd /root/aprilpgapp && npm run server"
    echo ""
    echo "Ou en arrière-plan avec logs dans un fichier :"
    echo "  cd /root/aprilpgapp && npm run server > server.log 2>&1 &"
    echo "  tail -f server.log"
    exit 1
fi

echo "✅ Serveur backend trouvé (PID: $SERVER_PID)"
echo ""
echo "📋 Options pour voir les logs :"
echo ""
echo "1. Voir les logs en temps réel (si le serveur tourne avec npm run server) :"
echo "   tail -f server.log"
echo ""
echo "2. Voir les logs du processus actuel :"
echo "   strace -p $SERVER_PID 2>&1 | grep -E 'write|read'"
echo ""
echo "3. Redémarrer le serveur avec logs visibles :"
echo "   kill $SERVER_PID"
echo "   cd /root/aprilpgapp && npm run server"
echo ""
echo "4. Vérifier la connexion à la base de données :"
echo "   cd /root/aprilpgapp && node -e \"require('dotenv').config(); const pool = require('./server/db/connection.ts').default; pool.query('SELECT 1').then(() => console.log('✅ DB OK')).catch(e => console.error('❌ DB Error:', e.message));\""
echo ""

# Vérifier si un fichier de log existe
if [ -f "server.log" ]; then
    echo "📄 Fichier server.log trouvé. Dernières lignes :"
    echo ""
    tail -20 server.log
    echo ""
    echo "Pour suivre les logs en temps réel :"
    echo "   tail -f server.log"
fi
