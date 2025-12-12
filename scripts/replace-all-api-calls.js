#!/usr/bin/env node
/**
 * Script pour remplacer tous les appels fetch(buildApiUrl(...)) par api.get/post/put/delete
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Trouver tous les fichiers TypeScript/TSX
function findFiles(dir, fileList = []) {
	const files = fs.readdirSync(dir);
	
	files.forEach(file => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);
		
		if (stat.isDirectory() && !filePath.includes('node_modules')) {
			findFiles(filePath, fileList);
		} else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
			fileList.push(filePath);
		}
	});
	
	return fileList;
}

// Remplacer les imports
function replaceImports(content) {
	// Remplacer les imports buildApiUrl par api
	content = content.replace(
		/import\s+{\s*buildApiUrl\s*}\s+from\s+['"]\.\.\/utils\/api['"]/g,
		"import { api } from '../utils/httpClient'"
	);
	content = content.replace(
		/import\s+{\s*buildApiUrl\s*}\s+from\s+['"]\.\.\/\.\.\/utils\/api['"]/g,
		"import { api } from '../../utils/httpClient'"
	);
	content = content.replace(
		/import\s+{\s*buildApiUrl\s*}\s+from\s+['"]\.\.\/\.\.\/\.\.\/utils\/api['"]/g,
		"import { api } from '../../../utils/httpClient'"
	);
	
	return content;
}

// Remplacer les appels fetch(buildApiUrl(...))
function replaceFetchCalls(content) {
	// Pattern: fetch(buildApiUrl('/api/...'), { method: 'GET', ... })
	// Pattern: fetch(buildApiUrl('/api/...'), { method: 'POST', body: ... })
	
	// GET requests
	content = content.replace(
		/fetch\s*\(\s*buildApiUrl\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*,\s*{\s*method:\s*['"]GET['"]/gi,
		"api.get('$1')"
	);
	
	// POST requests avec body JSON.stringify
	content = content.replace(
		/fetch\s*\(\s*buildApiUrl\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*,\s*{\s*method:\s*['"]POST['"]\s*,\s*headers:\s*{\s*['"]Content-Type['"]:\s*['"]application\/json['"]\s*}\s*,\s*body:\s*JSON\.stringify\s*\(\s*([^)]+)\s*\)/g,
		"api.post('$1', $2"
	);
	
	// POST requests simples
	content = content.replace(
		/fetch\s*\(\s*buildApiUrl\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*,\s*{\s*method:\s*['"]POST['"]/gi,
		"api.post('$1'"
	);
	
	// PUT requests
	content = content.replace(
		/fetch\s*\(\s*buildApiUrl\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*,\s*{\s*method:\s*['"]PUT['"]/gi,
		"api.put('$1'"
	);
	
	// DELETE requests
	content = content.replace(
		/fetch\s*\(\s*buildApiUrl\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*,\s*{\s*method:\s*['"]DELETE['"]/gi,
		"api.delete('$1'"
	);
	
	// fetch(buildApiUrl(...)) avec credentials seulement (GET par défaut)
	content = content.replace(
		/fetch\s*\(\s*buildApiUrl\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)\s*,\s*{\s*credentials:\s*['"]include['"]\s*}/g,
		"api.get('$1')"
	);
	
	return content;
}

// Traiter un fichier
function processFile(filePath) {
	try {
		let content = fs.readFileSync(filePath, 'utf8');
		const originalContent = content;
		
		// Remplacer les imports
		content = replaceImports(content);
		
		// Remplacer les appels fetch
		content = replaceFetchCalls(content);
		
		// Si le contenu a changé, écrire le fichier
		if (content !== originalContent) {
			fs.writeFileSync(filePath, content, 'utf8');
			console.log(`✅ Modifié: ${filePath}`);
			return true;
		}
		
		return false;
	} catch (error) {
		console.error(`❌ Erreur avec ${filePath}:`, error.message);
		return false;
	}
}

// Main
const srcDir = path.join(__dirname, '..', 'src');
const files = findFiles(srcDir);

console.log(`🔍 Trouvé ${files.length} fichiers à traiter...\n`);

let modified = 0;
files.forEach(file => {
	if (processFile(file)) {
		modified++;
	}
});

console.log(`\n✅ ${modified} fichiers modifiés sur ${files.length} fichiers traités.`);
console.log('\n⚠️  Vérifiez manuellement les fichiers modifiés pour :');
console.log('   - Les appels buildApiUrl(\'\') pour les images (doivent rester)');
console.log('   - Les appels avec des options complexes (peuvent nécessiter un ajustement)');
