// Configuration de l'API
// Utilise la variable d'environnement VITE_API_URL ou une valeur par défaut
export const API_URL = import.meta.env.VITE_API_URL || 'http://72.61.102.27:3002';

// Fonction helper pour construire les URLs API
export const getApiUrl = (endpoint: string): string => {
	const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
	const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${baseUrl}${path}`;
};

