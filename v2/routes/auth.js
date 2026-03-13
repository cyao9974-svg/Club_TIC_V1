const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login', { title: 'Connexion Admin', user: null, error: null });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) {
            return res.render('login', { title: 'Connexion', user: null, error: 'Utilisateur non trouvé' });
        }
        
        const match = await bcrypt.compare(password, user.mot_de_passe);
        if (match) {
            req.session.user = { id: user.id, nom: user.nom, email: user.email, role: user.role };
            res.redirect('/dashboard');
        } else {
            res.render('login', { title: 'Connexion', user: null, error: 'Mot de passe incorrect' });
        }
    } catch (err) {
        console.error("Erreur Auth:", err);
        res.render('login', { title: 'Connexion', user: null, error: 'Erreur serveur' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

module.exports = router;
