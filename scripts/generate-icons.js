import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const faviconPath = join(publicDir, 'favicon.png');

try {
	// Lire le favicon existant
	const favicon = readFileSync(faviconPath);
	
	console.log('Génération des icônes PWA...');
	
	// Créer une copie pour chaque taille
	sizes.forEach(size => {
		const iconPath = join(publicDir, `icon-${size}x${size}.png`);
		writeFileSync(iconPath, favicon);
		console.log(`✓ Créé icon-${size}x${size}.png`);
	});
	
	console.log('\n✅ Toutes les icônes ont été générées !');
	console.log('⚠️  Note: Pour une meilleure qualité, remplacez ces fichiers par des icônes optimisées de chaque taille.');
} catch (error) {
	console.error('Erreur lors de la génération des icônes:', error.message);
	console.log('\n💡 Solution: Assurez-vous que favicon.png existe dans le dossier public/');
	process.exit(1);
}

