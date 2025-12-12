// Configuration de l'API
// Utilise la variable d'environnement VITE_API_URL ou une valeur par défaut
// Gère le cas où la variable est undefined (problème Netlify)
// En production (Netlify), utilise des URLs relatives pour le proxy

// Fonction pour obtenir l'URL de base de l'API
// Cette fonction doit être utilisée partout au lieu de import.meta.env.VITE_API_URL
export const getApiBaseUrl = (): string => {
	// Récupérer la valeur injectée par Vite au build
	let envUrl = import.meta.env.VITE_API_URL;
	
	// Log en mode développement pour debug
	if (import.meta.env.MODE !== 'production') {
		console.log('[API Config] Raw VITE_API_URL:', JSON.stringify(envUrl), 'Type:', typeof envUrl);
	}
	
	// Convertir en string et nettoyer immédiatement les guillemets et autres caractères invalides
	if (typeof envUrl !== 'string') {
		envUrl = String(envUrl || '');
	}
	
	// Nettoyer les guillemets doubles et simples, backticks, et espaces
	// Important: enlever les guillemets au début et à la fin si présents
	let cleanEnvUrl = envUrl.trim().replace(/^["']|["']$/g, '').replace(/[`'"]/g, '').trim();
	
	// Si après nettoyage c'est vide, undefined, null, ou contient des caractères invalides, retourner chaîne vide
	if (
		cleanEnvUrl === '' ||
		cleanEnvUrl === 'undefined' ||
		cleanEnvUrl === 'null' ||
		cleanEnvUrl.includes('`') ||
		cleanEnvUrl.includes('%60') ||
		cleanEnvUrl.includes('""')
	) {
		// Retourner chaîne vide = utiliser des URLs relatives (pour proxy Netlify)
		if (import.meta.env.MODE !== 'production') {
			console.log('[API Config] VITE_API_URL is empty/invalid, using relative URLs');
		}
		return '';
	}
	
	// Retourner l'URL nettoyée (URL absolue)
	if (import.meta.env.MODE !== 'production') {
		console.log('[API Config] Using absolute base URL:', cleanEnvUrl);
	}
	return cleanEnvUrl;
};

// Fonction helper pour construire les URLs API
export const getApiUrl = (endpoint: string): string => {
	const baseUrl = getApiBaseUrl();
	const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${cleanBase}${cleanEndpoint}`;
};

