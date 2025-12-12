import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// Charger les variables d'environnement
	const env = loadEnv(mode, process.cwd(), '');
	
	// Pour Netlify (production), utiliser une chaîne vide pour forcer l'utilisation du proxy
	// Pour le développement, utiliser l'URL du backend
	// Si VITE_API_URL est définie explicitement, l'utiliser
	let apiUrl = env.VITE_API_URL;
	
	if (!apiUrl || apiUrl === 'undefined' || apiUrl === 'null') {
		// En production (Netlify), utiliser chaîne vide pour proxy
		// En développement, utiliser l'URL par défaut
		if (mode === 'production') {
			apiUrl = ''; // Chaîne vide = utiliser window.location.origin (proxy Netlify)
		} else {
			apiUrl = 'http://72.61.102.27:3002';
		}
	}
	
	return {
		server: {
			host: "0.0.0.0",
			port: 5174
		},
		define: {
			// Injecter la valeur dans le code au moment du build
			'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
		},
		envPrefix: 'VITE_',
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.png', 'icon-*.png'],
			manifest: {
				name: 'AprilFTD - Affiliate Management',
				short_name: 'AprilFTD',
				description: 'Plateforme de gestion d\'affiliation et de commissions',
				theme_color: '#3b82f6',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait-primary',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icon-72x72.png',
						sizes: '72x72',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-96x96.png',
						sizes: '96x96',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-128x128.png',
						sizes: '128x128',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-144x144.png',
						sizes: '144x144',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-152x152.png',
						sizes: '152x152',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-384x384.png',
						sizes: '384x384',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				],
				shortcuts: [
					{
						name: 'Dashboard',
						short_name: 'Dashboard',
						description: 'Accéder au tableau de bord',
						url: '/affiliate/dashboard',
						icons: [{ src: '/icon-96x96.png', sizes: '96x96' }]
					},
					{
						name: 'Paiements',
						short_name: 'Paiements',
						description: 'Voir mes paiements',
						url: '/affiliate/payments',
						icons: [{ src: '/icon-96x96.png', sizes: '96x96' }]
					}
				],
				categories: ['business', 'finance', 'productivity']
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'images-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
							}
						}
					},
					{
						urlPattern: /^https:\/\/.*\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 5 // 5 minutes
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				type: 'module'
			}
		})
	],
	optimizeDeps: {
		exclude: ['lucide-react'],
	},
	};
});
