require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Fonction pour initialiser les tables (utile pour le premier déploiement)
const initDb = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Table Utilisateurs
        await client.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);

        // Table Membres
        await client.query(`CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            classe TEXT NOT NULL,
            contact TEXT NOT NULL,
            participation INTEGER DEFAULT 0,
            date_inscription TEXT DEFAULT '2026-03-10 13:15:00'
        )`);

        // Insertion des utilisateurs par défaut (admin123 / membre123)
        // Note: En production, il vaut mieux utiliser des migrations ou un script séparé
        const bcrypt = require('bcrypt');
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('membre123', 10);

        const adminExists = await client.query("SELECT id FROM users WHERE username = 'admin'");
        if (adminExists.rowCount === 0) {
            await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ['admin', adminPassword, 'admin']);
            console.log("Utilisateur Admin créé.");
        }

        const memberExists = await client.query("SELECT id FROM users WHERE username = 'membre'");
        if (memberExists.rowCount === 0) {
            await client.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", ['membre', userPassword, 'membre']);
            console.log("Utilisateur Membre créé.");
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Erreur d'initialisation DB:", e);
    } finally {
        client.release();
    }
};

// Initialisation au démarrage (Optionnel si géré par Vercel)
initDb();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
