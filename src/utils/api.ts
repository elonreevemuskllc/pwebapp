// Helper global pour les appels API
// Utilisez cette fonction au lieu de import.meta.env.VITE_API_URL directement
import { getApiBaseUrl } from '../config/api';

/**
 * Construit une URL API complète
 * @param endpoint - Le endpoint API (ex: '/api/auth/login' ou 'api/auth/login')
 * @returns L'URL complète de l'API (relative si VITE_API_URL est vide, absolue sinon)
 */
export const buildApiUrl = (endpoint: string): string => {
	const baseUrl = getApiBaseUrl();
	
	// Cas spécial: endpoint vide = retourner juste la base URL (pour les images/ressources)
	if (!endpoint || endpoint === '') {
		if (!baseUrl || baseUrl === '' || baseUrl.trim() === '') {
			// Pas de base URL = retourner chaîne vide (sera utilisé comme URL relative)
			return '';
		}
		// Retourner la base URL nettoyée
		return baseUrl.trim().replace(/\/$/, '');
	}
	
	// Normaliser l'endpoint pour qu'il commence toujours par /
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	
	// Si baseUrl est vide ou invalide, retourner juste l'endpoint relatif
	// Cela permet au navigateur d'utiliser l'origine actuelle (proxy Netlify)
	if (!baseUrl || baseUrl === '' || baseUrl.trim() === '') {
		// Log en mode développement pour debug
		if (import.meta.env.MODE !== 'production') {
			console.log('[API] Using relative URL:', cleanEndpoint);
		}
		return cleanEndpoint;
	}
	
	// Nettoyer la base URL (enlever slash final si présent)
	const cleanBase = baseUrl.trim().replace(/\/$/, '');
	
	// Log en mode développement pour debug
	if (import.meta.env.MODE !== 'production') {
		console.log('[API] Using absolute base URL:', cleanBase);
	}
	
	// Retourner l'URL absolue
	return `${cleanBase}${cleanEndpoint}`;
};

/**
 * Raccourci pour getApiBaseUrl() - pour remplacer import.meta.env.VITE_API_URL
 * Ne pas initialiser au niveau du module car window n'est pas disponible
 */
export const getAPI_BASE_URL = () => getApiBaseUrl();


