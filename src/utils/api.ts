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
	
	// Convertir en string et nettoyer agressivement
	let cleanBase = String(baseUrl || '');
	
	// Nettoyer les backticks, guillemets, et l'encodage %60
	cleanBase = cleanBase.replace(/[`'"]/g, '').replace(/%60/g, '').trim();
	
	// Si la base contient encore des caractères invalides, la vider complètement
	// Vérifier les backticks et l'encodage %60 (sans utiliser la chaîne littérale %60%60)
	const hasInvalidChars = cleanBase.includes('`') || cleanBase.includes('%60');
	if (cleanBase === '' || cleanBase === '``' || hasInvalidChars) {
		cleanBase = '';
	}
	
	const finalBase = cleanBase.endsWith('/') ? cleanBase.slice(0, -1) : cleanBase;
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	
	// Si la base est vide (production Netlify), retourner juste l'endpoint
	if (!finalBase || finalBase === '' || finalBase === '``') {
		return cleanEndpoint;
	}
	
	return `${finalBase}${cleanEndpoint}`;
};

/**
 * Raccourci pour getApiBaseUrl() - pour remplacer import.meta.env.VITE_API_URL
 * Ne pas initialiser au niveau du module car window n'est pas disponible
 */
export const getAPI_BASE_URL = () => getApiBaseUrl();


