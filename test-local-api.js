#!/usr/bin/env node
/**
 * Script pour tester les URLs API en local
 */

// Simuler import.meta.env.VITE_API_URL comme Vite l'injecte
const VITE_API_URL = process.env.VITE_API_URL || '';

console.log('=== TEST URLS API EN LOCAL ===\n');
console.log('1. VITE_API_URL depuis .env:', JSON.stringify(VITE_API_URL));
console.log('   Type:', typeof VITE_API_URL);
console.log('   Length:', VITE_API_URL?.length || 0);

// Simuler la logique de httpClient.ts
let API_BASE_URL = VITE_API_URL || '';

if (API_BASE_URL) {
	API_BASE_URL = String(API_BASE_URL)
		.trim()
		.replace(/^["']|["']$/g, '')
		.replace(/[`'"]/g, '')
		.trim();
	
	if (
		API_BASE_URL === '' ||
		API_BASE_URL === 'undefined' ||
		API_BASE_URL === 'null' ||
		API_BASE_URL.includes('`') ||
		API_BASE_URL.includes('%60') ||
		API_BASE_URL.includes('""')
	) {
		API_BASE_URL = '';
	}
} else {
	API_BASE_URL = '';
}

console.log('\n2. API_BASE_URL après nettoyage:', JSON.stringify(API_BASE_URL));

// Fonction buildUrl
function buildUrl(endpoint) {
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	
	if (!API_BASE_URL || API_BASE_URL === '') {
		return cleanEndpoint;
	}
	
	const cleanBase = API_BASE_URL.trim().replace(/\/$/, '');
	return `${cleanBase}${cleanEndpoint}`;
}

console.log('\n3. Tests buildUrl():');
const endpoints = [
	'/api/auth/check-email',
	'/api/auth/verify-session',
	'/api/notifications/unread',
	'/api/auth/login'
];

endpoints.forEach(endpoint => {
	const url = buildUrl(endpoint);
	const encoded = encodeURI(url);
	const hasPercent22 = url.includes('%22') || encoded.includes('%22');
	console.log(`   ${endpoint}:`);
	console.log(`     → ${JSON.stringify(url)}`);
	console.log(`     → Encodé: ${encoded}`);
	console.log(`     → Contient %22: ${hasPercent22 ? '❌ OUI' : '✅ NON'}`);
});

console.log('\n4. Test avec différentes valeurs de VITE_API_URL:');
const testValues = ['', '""', '"', 'undefined', null, undefined, 'http://localhost:3002'];
testValues.forEach(val => {
	const testBase = val || '';
	let cleanBase = String(testBase).trim().replace(/^["']|["']$/g, '').replace(/[`'"]/g, '').trim();
	if (cleanBase === '' || cleanBase.includes('""')) {
		cleanBase = '';
	}
	const testUrl = cleanBase ? `${cleanBase}/api/test` : '/api/test';
	const hasPercent22 = testUrl.includes('%22') || encodeURI(testUrl).includes('%22');
	console.log(`   VITE_API_URL=${JSON.stringify(val)} => base=${JSON.stringify(cleanBase)} => url=${JSON.stringify(testUrl)} ${hasPercent22 ? '❌' : '✅'}`);
});

console.log('\n=== FIN TEST ===');
