// Helper global pour les appels API
// Utilisez cette fonction au lieu de import.meta.env.VITE_API_URL directement
import { getApiBaseUrl } from '../config/api';

/**
 * Construit une URL API complète
 * @param endpoint - Le endpoint API (ex: '/api/auth/login' ou 'api/auth/login')
 * @returns L'URL complète de l'API
 */
export const buildApiUrl = (endpoint: string): string => {
	const baseUrl = getApiBaseUrl();
	// Nettoyer la base URL : enlever les backticks et autres caractères invalides
	const cleanBase = (baseUrl || '').replace(/[`'"]/g, '').trim();
	const finalBase = cleanBase.endsWith('/') ? cleanBase.slice(0, -1) : cleanBase;
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	// Si la base est vide (production Netlify), retourner juste l'endpoint
	if (!finalBase) {
		return cleanEndpoint;
	}
	return `${finalBase}${cleanEndpoint}`;
};

/**
 * Raccourci pour getApiBaseUrl() - pour remplacer import.meta.env.VITE_API_URL
 * Ne pas initialiser au niveau du module car window n'est pas disponible
 */
export const getAPI_BASE_URL = () => getApiBaseUrl();


