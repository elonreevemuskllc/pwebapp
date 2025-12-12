// Configuration de l'API
// Utilise la variable d'environnement VITE_API_URL ou une valeur par défaut
// Gère le cas où la variable est undefined (problème Netlify)
// En production (Netlify), utilise le proxy pour éviter Mixed Content

// Fonction pour obtenir l'URL de l'API
// Cette fonction doit être utilisée partout au lieu de import.meta.env.VITE_API_URL
export const getApiBaseUrl = (): string => {
	// Récupérer la valeur injectée par Vite au build
	const envUrl = import.meta.env.VITE_API_URL;
	
	// Gérer tous les cas possibles : undefined, null, chaîne vide, ou la chaîne littérale "undefined"
	const urlValue = envUrl === 'undefined' || envUrl === 'null' || envUrl === undefined || envUrl === null || envUrl === '' ? null : envUrl;
	
	// Si pas d'URL définie (production Netlify), utiliser l'origine actuelle (proxy)
	if (!urlValue) {
		// En production (Netlify), utiliser l'origine actuelle (proxy)
		if (typeof window !== 'undefined') {
			const hostname = window.location.hostname;
			// Détecter Netlify ou tout autre domaine de production
			if (hostname.includes('netlify.app') || hostname.includes('netlify.com') || hostname !== 'localhost' && hostname !== '127.0.0.1') {
				return window.location.origin;
			}
		}
		// En développement, utiliser la variable d'environnement ou une valeur par défaut
		// Note: Cette valeur ne devrait être utilisée qu'en développement local
		// En production, utilisez toujours une chaîne vide pour le proxy Netlify
		return process.env.VITE_API_URL || '';
	}
	return urlValue;
};

// Fonction helper pour construire les URLs API
export const getApiUrl = (endpoint: string): string => {
	const baseUrl = getApiBaseUrl();
	const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${cleanBase}${cleanEndpoint}`;
};

