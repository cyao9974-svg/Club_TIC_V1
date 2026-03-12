const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// Page de login
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login', { title: 'Connexion', user: null, error: null });
});

// Traitement du login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];

        if (!user) {
            return res.render('login', { title: 'Connexion', user: null, error: 'Utilisateur non trouvé' });
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.redirect('/dashboard');
        } else {
            res.render('login', { title: 'Connexion', user: null, error: 'Mot de passe incorrect' });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { title: 'Connexion', user: null, error: 'Erreur serveur' });
    }
});

// Déconnexion
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

module.exports = router;
