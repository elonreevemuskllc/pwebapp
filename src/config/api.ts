// Configuration de l'API
// Utilise la variable d'environnement VITE_API_URL ou une valeur par défaut
// Gère le cas où la variable est undefined (problème Netlify)
// En production (Netlify), utilise le proxy pour éviter Mixed Content

// Fonction pour obtenir l'URL de l'API
// Cette fonction doit être utilisée partout au lieu de import.meta.env.VITE_API_URL
export const getApiBaseUrl = (): string => {
	// Récupérer la valeur injectée par Vite au build
	let envUrl = import.meta.env.VITE_API_URL;
	
	// Convertir en string et nettoyer immédiatement les backticks et autres caractères invalides
	if (typeof envUrl !== 'string') {
		envUrl = String(envUrl || '');
	}
	
	// Nettoyer les backticks, guillemets, et l'encodage %60
	let cleanEnvUrl = envUrl.replace(/[`'"]/g, '').replace(/%60/g, '').trim();
	
	// Si après nettoyage c'est vide ou contient encore des caractères invalides, considérer comme vide
	// Vérifier les backticks et l'encodage %60 (sans utiliser la chaîne littérale %60%60 pour éviter qu'elle soit dans le build)
	const hasBackticks = cleanEnvUrl.includes('`') || cleanEnvUrl.includes('%60');
	if (cleanEnvUrl === '' || cleanEnvUrl === '``' || hasBackticks) {
		cleanEnvUrl = '';
	}
	
	// Gérer tous les cas possibles : undefined, null, chaîne vide, ou la chaîne littérale "undefined"
	const urlValue = cleanEnvUrl === 'undefined' || cleanEnvUrl === 'null' || cleanEnvUrl === undefined || cleanEnvUrl === null || cleanEnvUrl === '' ? null : cleanEnvUrl;
	
	// Si pas d'URL définie (production Netlify), utiliser l'origine actuelle (proxy)
	if (!urlValue) {
		// En production (Netlify), utiliser l'origine actuelle (proxy)
		if (typeof window !== 'undefined') {
			const hostname = window.location.hostname;
			// Détecter Netlify ou tout autre domaine de production
			if (hostname.includes('netlify.app') || hostname.includes('netlify.com') || (hostname !== 'localhost' && hostname !== '127.0.0.1')) {
				return window.location.origin;
			}
		}
		// En développement, retourner chaîne vide (sera géré par buildApiUrl)
		return '';
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

