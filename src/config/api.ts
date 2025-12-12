// Configuration de l'API
// Utilise la variable d'environnement VITE_API_URL ou une valeur par défaut
// Gère le cas où la variable est undefined (problème Netlify)
// En production (Netlify), utilise le proxy pour éviter Mixed Content

// Fonction pour obtenir l'URL de l'API
// Cette fonction doit être utilisée partout au lieu de import.meta.env.VITE_API_URL
export const getApiBaseUrl = (): string => {
	const envUrl = import.meta.env.VITE_API_URL;
	
	// Si chaîne vide (production Netlify), utiliser l'origine actuelle (proxy)
	if (envUrl === '' || !envUrl || envUrl === 'undefined' || envUrl === 'null') {
		// En production (Netlify), utiliser l'origine actuelle (proxy)
		if (typeof window !== 'undefined') {
			const hostname = window.location.hostname;
			if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
				return window.location.origin;
			}
		}
		// En développement, utiliser l'URL par défaut
		return 'http://72.61.102.27:3002';
	}
	return envUrl;
};

// URL de base de l'API (pour compatibilité)
export const API_URL = getApiBaseUrl();

// Fonction helper pour construire les URLs API
export const getApiUrl = (endpoint: string): string => {
	const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
	const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${baseUrl}${path}`;
};

