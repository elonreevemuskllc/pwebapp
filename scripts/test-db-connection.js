#!/usr/bin/env node
/**
 * Script pour tester la connexion à la base de données
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function testConnection() {
	console.log('🔍 Test de connexion à la base de données...\n');
	
	// Afficher les variables d'environnement (sans le mot de passe)
	console.log('Variables d\'environnement :');
	console.log(`  DB_HOST: ${process.env.DB_HOST || 'NON DÉFINI'}`);
	console.log(`  DB_USER: ${process.env.DB_USER || 'NON DÉFINI'}`);
	console.log(`  DB_NAME: ${process.env.DB_NAME || 'NON DÉFINI'}`);
	console.log(`  DB_PORT: ${process.env.DB_PORT || '3306'}`);
	console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'NON DÉFINI'}\n`);
	
	if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
		console.error('❌ Variables d\'environnement manquantes !');
		console.error('Configurez les variables DB_HOST, DB_USER, DB_PASSWORD, DB_NAME dans votre fichier .env');
		process.exit(1);
	}
	
	try {
		const connection = await mysql.createConnection({
			host: process.env.DB_HOST,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
			port: parseInt(process.env.DB_PORT || '3306')
		});
		
		console.log('✅ Connexion réussie !\n');
		
		// Tester une requête simple
		const [rows] = await connection.execute('SELECT 1 as test, DATABASE() as db, USER() as user');
		console.log('📊 Résultat de la requête test :');
		console.log(rows);
		console.log('');
		
		// Vérifier les tables
		const [tables] = await connection.execute('SHOW TABLES');
		console.log(`📋 Tables disponibles (${tables.length}) :`);
		tables.forEach((table, index) => {
			const tableName = Object.values(table)[0];
			console.log(`  ${index + 1}. ${tableName}`);
		});
		
		await connection.end();
		console.log('\n✅ Test terminé avec succès !');
	} catch (error) {
		console.error('\n❌ Erreur de connexion :');
		console.error(`  Message: ${error.message}`);
		console.error(`  Code: ${error.code}`);
		if (error.code === 'ECONNREFUSED') {
			console.error('\n💡 Le serveur MySQL n\'est pas accessible. Vérifiez :');
			console.error('  - Que MySQL est démarré');
			console.error('  - Que DB_HOST et DB_PORT sont corrects');
			console.error('  - Que le firewall autorise la connexion');
		} else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
			console.error('\n💡 Erreur d\'authentification. Vérifiez :');
			console.error('  - Que DB_USER et DB_PASSWORD sont corrects');
			console.error('  - Que l\'utilisateur a les permissions nécessaires');
		} else if (error.code === 'ER_BAD_DB_ERROR') {
			console.error('\n💡 La base de données n\'existe pas. Vérifiez :');
			console.error('  - Que DB_NAME est correct');
			console.error('  - Que la base de données existe');
		}
		process.exit(1);
	}
}

testConnection();
