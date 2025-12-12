#!/usr/bin/env python3
"""
Script pour remplacer tous les usages de import.meta.env.VITE_API_URL
par buildApiUrl() dans tous les fichiers du projet.
"""
import re
import os
from pathlib import Path

def fix_file(file_path):
    """Remplace les occurrences dans un fichier."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Vérifier si le fichier utilise import.meta.env.VITE_API_URL
        if 'import.meta.env.VITE_API_URL' not in content:
            return False
        
        # Ajouter l'import si nécessaire
        import_pattern = r"import\s+.*from\s+['\"](.*utils/api|.*config/api)['\"]"
        build_api_import = "import { buildApiUrl } from '../utils/api';"
        
        # Déterminer le chemin relatif pour l'import
        file_dir = os.path.dirname(file_path)
        rel_path = os.path.relpath('src/utils/api.ts', file_dir).replace('\\', '/')
        if rel_path.startswith('..'):
            build_api_import = f"import {{ buildApiUrl }} from '{rel_path.replace('.ts', '')}';"
        else:
            build_api_import = f"import {{ buildApiUrl }} from './{rel_path.replace('.ts', '')}';"
        
        # Vérifier si l'import existe déjà
        if 'buildApiUrl' not in content:
            # Trouver la dernière ligne d'import
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import '):
                    last_import_idx = i
            
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, build_api_import)
                content = '\n'.join(lines)
            else:
                # Pas d'imports, ajouter au début
                content = build_api_import + '\n' + content
        
        # Remplacer les patterns
        # Pattern 1: ${import.meta.env.VITE_API_URL}/api/...
        pattern1 = r'\$\{import\.meta\.env\.VITE_API_URL\}/api/([^`\'"]+)'
        def replace1(match):
            endpoint = match.group(1)
            return f"buildApiUrl('/api/{endpoint}')"
        content = re.sub(pattern1, replace1, content)
        
        # Pattern 2: `${import.meta.env.VITE_API_URL}/api/...`
        pattern2 = r'`\$\{import\.meta\.env\.VITE_API_URL\}/api/([^`]+)`'
        def replace2(match):
            endpoint = match.group(1).rstrip('`')
            return f"buildApiUrl('/api/{endpoint}')"
        content = re.sub(pattern2, replace2, content)
        
        # Pattern 3: import.meta.env.VITE_API_URL}/api/... (dans template literals)
        pattern3 = r'import\.meta\.env\.VITE_API_URL\}/api/([^`\'"]+)'
        def replace3(match):
            endpoint = match.group(1)
            return f"buildApiUrl('/api/{endpoint}')"
        content = re.sub(pattern3, replace3, content)
        
        # Pattern 4: ${import.meta.env.VITE_API_URL}${...} (pour les images)
        pattern4 = r'\$\{import\.meta\.env\.VITE_API_URL\}(\$\{[^}]+\})'
        def replace4(match):
            path = match.group(1)
            # Extraire le chemin du template literal
            path_content = path.strip('${}')
            return f"buildApiUrl({path})"
        content = re.sub(pattern4, replace4, content)
        
        # Pattern 5: `${import.meta.env.VITE_API_URL}${...}`
        pattern5 = r'`\$\{import\.meta\.env\.VITE_API_URL\}\$\{([^}]+)\}`'
        def replace5(match):
            path_var = match.group(1)
            return f"`\${buildApiUrl('')}\${${path_var}}`"
        content = re.sub(pattern5, replace5, content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Erreur lors du traitement de {file_path}: {e}")
        return False

def main():
    """Fonction principale."""
    src_dir = Path('src')
    files_to_fix = []
    
    # Trouver tous les fichiers .tsx et .ts
    for ext in ['*.tsx', '*.ts']:
        for file_path in src_dir.rglob(ext):
            # Ignorer les fichiers de configuration
            if 'api.ts' in str(file_path) or 'config' in str(file_path):
                continue
            if 'import.meta.env.VITE_API_URL' in file_path.read_text(encoding='utf-8'):
                files_to_fix.append(file_path)
    
    print(f"Trouvé {len(files_to_fix)} fichiers à corriger")
    
    fixed_count = 0
    for file_path in files_to_fix:
        if fix_file(str(file_path)):
            print(f"✓ Corrigé: {file_path}")
            fixed_count += 1
        else:
            print(f"  Ignoré: {file_path}")
    
    print(f"\n{fixed_count} fichiers corrigés sur {len(files_to_fix)}")

if __name__ == '__main__':
    main()
