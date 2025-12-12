/**
 * Client HTTP centralisé pour tous les appels API
 * Gère automatiquement VITE_API_URL (vide = URLs relatives, non-vide = URLs absolues)
 */

// Obtenir et nettoyer VITE_API_URL une seule fois
let API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Nettoyer les guillemets et caractères invalides
if (API_BASE_URL) {
	API_BASE_URL = String(API_BASE_URL)
		.trim()
		.replace(/^["']|["']$/g, '') // Enlever guillemets au début/fin
		.replace(/[`'"]/g, '') // Enlever tous les guillemets restants
		.trim();
	
	// Si après nettoyage c'est vide ou invalide, forcer à vide
	if (
		API_BASE_URL === '' ||
		API_BASE_URL === 'undefined' ||
		API_BASE_URL === 'null' ||
		API_BASE_URL.includes('`') ||
		API_BASE_URL.includes('%60') ||
		API_BASE_URL.includes('""')
	) {
		API_BASE_URL = '';
	}
} else {
	API_BASE_URL = '';
}

// Log en mode développement
if (import.meta.env.MODE !== 'production') {
	console.log('[HTTP Client] API base URL:', API_BASE_URL || '(relative /api)');
}

/**
 * Construit une URL complète à partir d'un endpoint
 * @param endpoint - Le chemin API (ex: '/api/auth/login')
 * @returns URL complète (relative si base vide, absolue sinon)
 */
function buildUrl(endpoint: string): string {
	// Normaliser l'endpoint
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	
	// Si pas de base URL, retourner endpoint relatif
	if (!API_BASE_URL || API_BASE_URL === '') {
		return cleanEndpoint;
	}
	
	// Nettoyer la base URL (enlever slash final)
	const cleanBase = API_BASE_URL.trim().replace(/\/$/, '');
	
	// Retourner URL absolue
	return `${cleanBase}${cleanEndpoint}`;
}

/**
 * Client HTTP avec méthodes GET, POST, PUT, DELETE
 */
export const api = {
	/**
	 * GET request
	 */
	async get(endpoint: string, options?: RequestInit): Promise<Response> {
		const url = buildUrl(endpoint);
		return fetch(url, {
			...options,
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...options?.headers,
			},
		});
	},

	/**
	 * POST request
	 */
	async post(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
		const url = buildUrl(endpoint);
		return fetch(url, {
			...options,
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...options?.headers,
			},
			body: data ? JSON.stringify(data) : undefined,
		});
	},

	/**
	 * PUT request
	 */
	async put(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
		const url = buildUrl(endpoint);
		return fetch(url, {
			...options,
			method: 'PUT',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...options?.headers,
			},
			body: data ? JSON.stringify(data) : undefined,
		});
	},

	/**
	 * DELETE request
	 */
	async delete(endpoint: string, options?: RequestInit): Promise<Response> {
		const url = buildUrl(endpoint);
		return fetch(url, {
			...options,
			method: 'DELETE',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...options?.headers,
			},
		});
	},
};

// Export de la fonction buildUrl pour compatibilité (si nécessaire)
export { buildUrl };
