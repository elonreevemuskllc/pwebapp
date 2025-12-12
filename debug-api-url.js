#!/usr/bin/env node
/**
 * Script de diagnostic pour comprendre le problème des backticks dans les URLs
 */

// Simuler import.meta.env.VITE_API_URL comme Vite l'injecte
const simulateViteEnv = {
	VITE_API_URL: process.env.VITE_API_URL || ''
};

console.log('=== DIAGNOSTIC API URL ===\n');
console.log('1. Valeur de VITE_API_URL:');
console.log('   Raw:', JSON.stringify(simulateViteEnv.VITE_API_URL));
console.log('   Type:', typeof simulateViteEnv.VITE_API_URL);
console.log('   Length:', simulateViteEnv.VITE_API_URL?.length || 0);
console.log('   Chars:', Array.from(simulateViteEnv.VITE_API_URL || '').map(c => `'${c}' (${c.charCodeAt(0)})`).join(', '));

// Simuler getApiBaseUrl
function getApiBaseUrl() {
	const envUrl = simulateViteEnv.VITE_API_URL;
	const cleanEnvUrl = typeof envUrl === 'string' ? envUrl.replace(/[`'"]/g, '').trim() : envUrl;
	const urlValue = cleanEnvUrl === 'undefined' || cleanEnvUrl === 'null' || cleanEnvUrl === undefined || cleanEnvUrl === null || cleanEnvUrl === '' ? null : cleanEnvUrl;
	
	if (!urlValue) {
		// Simuler window.location.origin pour Netlify
		const mockOrigin = 'https://prgweapp.netlify.app';
		return mockOrigin;
	}
	return urlValue;
}

// Simuler buildApiUrl
function buildApiUrl(endpoint) {
	const baseUrl = getApiBaseUrl();
	let cleanBase = (baseUrl || '').toString().replace(/[`'"]/g, '').trim();
	
	if (cleanBase.includes('`') || cleanBase === '``' || cleanBase === '%60%60') {
		cleanBase = '';
	}
	
	const finalBase = cleanBase.endsWith('/') ? cleanBase.slice(0, -1) : cleanBase;
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	
	if (!finalBase || finalBase === '' || finalBase === '``' || finalBase === '%60%60') {
		return cleanEndpoint;
	}
	
	return `${finalBase}${cleanEndpoint}`;
}

console.log('\n2. Test getApiBaseUrl():');
const baseUrl = getApiBaseUrl();
console.log('   Result:', JSON.stringify(baseUrl));
console.log('   Type:', typeof baseUrl);
console.log('   Contains backticks:', baseUrl?.includes('`') || false);

console.log('\n3. Test buildApiUrl("/api/auth/verify-session"):');
const fullUrl = buildApiUrl('/api/auth/verify-session');
console.log('   Result:', JSON.stringify(fullUrl));
console.log('   Encoded:', encodeURI(fullUrl));
console.log('   Contains %60:', fullUrl.includes('%60') || encodeURI(fullUrl).includes('%60'));

console.log('\n4. Test avec différentes valeurs de VITE_API_URL:');
const testValues = ['', '``', '`', '%60%60', 'undefined', null, undefined];
testValues.forEach(val => {
	simulateViteEnv.VITE_API_URL = val;
	const testBase = getApiBaseUrl();
	const testUrl = buildApiUrl('/api/test');
	console.log(`   VITE_API_URL=${JSON.stringify(val)} => base=${JSON.stringify(testBase)} => url=${JSON.stringify(testUrl)}`);
});

console.log('\n=== FIN DIAGNOSTIC ===');
