require('dotenv').config();
const path = require('path');
const bcrypt = require('bcrypt');

let db;
let isPostgres = false;

if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    isPostgres = true;
    console.log("Utilisation de PostgreSQL (Cloud)");
} else {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'club_tic.db');
    const sqliteDb = new sqlite3.Database(dbPath);
    
    db = {
        query: (text, params = []) => {
            const sql = text.replace(/\$\d+/g, '?');
            return new Promise((resolve, reject) => {
                if (sql.trim().toLowerCase().startsWith('select')) {
                    sqliteDb.all(sql, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve({ rows });
                    });
                } else {
                    sqliteDb.run(sql, params, function(err) {
                        if (err) reject(err);
                        else resolve({ rowCount: this.changes, lastID: this.lastID });
                    });
                }
            });
        }
    };
    console.log("Utilisation de SQLite (Local)");
}

const initDb = async () => {
    try {
        // Table Utilisateurs (Admins)
        const usersTable = isPostgres 
            ? `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY, 
                nom VARCHAR(50) NOT NULL,
                prenom VARCHAR(50) NOT NULL,
                email VARCHAR(50) UNIQUE NOT NULL, 
                mot_de_passe TEXT NOT NULL, 
                role TEXT DEFAULT 'admin'
            )`
            : `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                nom TEXT NOT NULL,
                prenom TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL, 
                mot_de_passe TEXT NOT NULL, 
                role TEXT DEFAULT 'admin'
            )`;
        await db.query(usersTable);

        // Table Membres
        const membersTable = isPostgres
            ? `CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY, 
                nom VARCHAR(50) NOT NULL, 
                prenom VARCHAR(50) NOT NULL, 
                classe VARCHAR(10) NOT NULL, 
                filiere VARCHAR(50) NOT NULL,
                telephone VARCHAR(20) NOT NULL,
                nb_participation INTEGER DEFAULT 0, 
                date_inscription TIMESTAMP DEFAULT '2026-03-10 13:15:00'
            )`
            : `CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                nom TEXT NOT NULL, 
                prenom TEXT NOT NULL, 
                classe TEXT NOT NULL, 
                filiere TEXT NOT NULL,
                telephone TEXT NOT NULL,
                nb_participation INTEGER DEFAULT 0, 
                date_inscription TEXT DEFAULT '2026-03-10 13:15:00'
            )`;
        await db.query(membersTable);

        // Admin par défaut
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminCheck = await db.query("SELECT id FROM users WHERE email = $1", ['admin@clubtic.ci']);
        if (adminCheck.rows.length === 0) {
            await db.query("INSERT INTO users (nom, prenom, email, mot_de_passe, role) VALUES ($1, $2, $3, $4, $5)", 
                ['Admin', 'Club TIC', 'admin@clubtic.ci', adminPassword, 'admin']);
            console.log("Admin créé: admin@clubtic.ci / admin123");
        }

    } catch (err) {
        console.error("Erreur d'initialisation DB V2:", err);
    }
};

initDb();

module.exports = {
    query: (text, params) => db.query(text, params),
    isPostgres
};
