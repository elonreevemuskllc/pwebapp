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
	const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${cleanBase}${cleanEndpoint}`;
};

/**
 * Raccourci pour getApiBaseUrl() - pour remplacer import.meta.env.VITE_API_URL
 */
export const API_BASE_URL = getApiBaseUrl();

