// Configuration de l'API
// Utilise la variable d'environnement VITE_API_URL ou une valeur par défaut
// Gère le cas où la variable est undefined (problème Netlify)
const getApiUrlFromEnv = (): string => {
	const envUrl = import.meta.env.VITE_API_URL;
	// Si undefined ou vide, utiliser la valeur par défaut
	if (!envUrl || envUrl === 'undefined' || envUrl === 'null') {
		return 'http://72.61.102.27:3002';
	}
	return envUrl;
};

export const API_URL = getApiUrlFromEnv();

// Fonction helper pour construire les URLs API
export const getApiUrl = (endpoint: string): string => {
	const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
	const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${baseUrl}${path}`;
};

