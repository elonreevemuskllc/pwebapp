#!/usr/bin/env node
/**
 * Script pour générer le fichier _redirects avec la variable d'environnement
 * Netlify ne supporte pas les variables d'environnement dans netlify.toml redirects
 * donc on génère le fichier _redirects dans public/ au build
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

try {
	// Récupérer l'URL du backend depuis les variables d'environnement
	// Netlify utilisera NETLIFY_BACKEND_URL si définie
	const backendUrl = process.env.NETLIFY_BACKEND_URL || '';

	// Si une URL backend est définie, créer le redirect vers cette URL
	// Sinon, ne pas créer de redirect pour /api/* (Netlify utilisera netlify.toml si configuré)
	const apiRedirect = backendUrl 
		? `/api/*    ${backendUrl}/api/:splat    200\n`
		: '';

	const redirectsContent = `# Redirections Netlify pour le SPA
/*    /index.html   200
${apiRedirect}`;

	const publicDir = join(process.cwd(), 'public');
	const redirectsPath = join(publicDir, '_redirects');

	// S'assurer que le dossier public existe
	try {
		mkdirSync(publicDir, { recursive: true });
	} catch (err) {
		// Le dossier existe déjà, continuer
	}

	writeFileSync(redirectsPath, redirectsContent, 'utf-8');
	console.log(`✓ Fichier _redirects généré${backendUrl ? ` avec l'URL backend: ${backendUrl}` : ' (sans redirect API - utilisez netlify.toml ou fonctions Edge)'}`);
	process.exit(0);
} catch (error) {
	console.error('Erreur lors de la génération du fichier _redirects:', error);
	process.exit(1);
}
