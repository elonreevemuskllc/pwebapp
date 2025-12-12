import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
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
});
