#!/bin/bash
# Script pour remplacer tous les appels fetch(buildApiUrl(...)) par api.get/post/put/delete

echo "🔍 Recherche des fichiers à modifier..."

# Trouver tous les fichiers qui utilisent buildApiUrl
FILES=$(grep -r "buildApiUrl\|fetch.*buildApiUrl" src/ --include="*.tsx" --include="*.ts" -l)

for file in $FILES; do
    echo "📝 Traitement de $file..."
    
    # Remplacer l'import
    sed -i "s|import { buildApiUrl } from|import { api } from|g" "$file"
    sed -i "s|from '../utils/api'|from '../utils/httpClient'|g" "$file"
    sed -i "s|from '../../utils/api'|from '../../utils/httpClient'|g" "$file"
    sed -i "s|from '\.\./utils/api'|from '\.\./utils/httpClient'|g" "$file"
    
    echo "✅ $file traité"
done

echo "✅ Remplacement terminé !"
echo ""
echo "⚠️  Vérifiez manuellement les fichiers modifiés pour :"
echo "   - Les appels fetch(buildApiUrl(...)) qui doivent être remplacés par api.get/post/put/delete"
echo "   - Les appels buildApiUrl('') pour les images qui doivent rester"
