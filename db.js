require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');

let pool;
let isPostgres = false;

if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    isPostgres = true;
    console.log("Mode: PostgreSQL (Cloud)");
} else {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'club_tic.db');
    const sqliteDb = new sqlite3.Database(dbPath);
    
    // Simuler l'interface PG pour SQLite
    pool = {
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
                        else resolve({ rowCount: this.changes, lastID: this.lastID, rows: [] });
                    });
                }
            });
        }
    };
    console.log("Mode: SQLite (Local)");
}

const query = (text, params) => pool.query(text, params);

const ensureSchema = async () => {
    try {
        if (isPostgres) {
            await query(`CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY, 
                nom VARCHAR(50) DEFAULT 'Admin',
                prenom VARCHAR(50) DEFAULT 'User',
                email VARCHAR(100) UNIQUE, 
                mot_de_passe TEXT NOT NULL, 
                role TEXT DEFAULT 'admin'
            )`);
            try { await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS nom VARCHAR(50) DEFAULT 'Admin'"); } catch(e){}
            try { await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS prenom VARCHAR(50) DEFAULT 'User'"); } catch(e){}
            
            await query(`CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY, 
                nom VARCHAR(50) NOT NULL, 
                prenom VARCHAR(50) NOT NULL, 
                classe VARCHAR(10) NOT NULL, 
                filiere VARCHAR(50) DEFAULT 'N/A',
                telephone VARCHAR(20) DEFAULT 'N/A',
                nb_participation INTEGER DEFAULT 0, 
                date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            try { await query("ALTER TABLE members ADD COLUMN IF NOT EXISTS filiere VARCHAR(50) DEFAULT 'N/A'"); } catch(e){}
            try { await query("ALTER TABLE members ADD COLUMN IF NOT EXISTS telephone VARCHAR(20) DEFAULT 'N/A'"); } catch(e){}
            try { await query("ALTER TABLE members ADD COLUMN IF NOT EXISTS nb_participation INTEGER DEFAULT 0"); } catch(e){}
        } else {
            await query(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                nom TEXT DEFAULT 'Admin',
                prenom TEXT DEFAULT 'User',
                email TEXT UNIQUE, 
                mot_de_passe TEXT NOT NULL, 
                role TEXT DEFAULT 'admin'
            )`);
            await query(`CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                nom TEXT NOT NULL, 
                prenom TEXT NOT NULL, 
                classe TEXT NOT NULL, 
                filiere TEXT DEFAULT 'N/A',
                telephone TEXT DEFAULT 'N/A',
                nb_participation INTEGER DEFAULT 0, 
                date_inscription TEXT DEFAULT CURRENT_TIMESTAMP
            )`);
        }

        // Admin par défaut
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminCheck = await query("SELECT id FROM users WHERE email = $1", ['admin@clubtic.ci']);
        if (adminCheck.rows.length === 0) {
            await query("INSERT INTO users (nom, prenom, email, mot_de_passe, role) VALUES ($1, $2, $3, $4, $5)", 
                ['Admin', 'Club TIC', 'admin@clubtic.ci', adminPassword, 'admin']);
        }
    } catch (err) {
        console.error("Schema sync failed:", err.message);
    }
};

module.exports = {
    query,
    isPostgres,
    ensureSchema
};
