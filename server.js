require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');

const app = express();
const PORT = 3000;

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(require('express-ejs-layouts'));
app.set('layout', 'layout');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret_club_tic_2026',
    resave: false,
    saveUninitialized: true
}));

// Routes
app.use('/auth', authRoutes);
app.use('/members', memberRoutes);

// Middleware d'authentification global pour le dashboard
const isAuthenticated = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/auth/login');
};

app.get('/', (req, res) => {
    res.render('index', { title: 'Accueil', user: req.session.user || null });
});

app.get('/dashboard', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM members ORDER BY id ASC");
        const members = result.rows;
        
        // Calcul des stats
        const total = members.length;
        const participations = members.reduce((sum, m) => sum + m.participation, 0);
        const uniqueClasses = new Set(members.map(m => m.classe)).size;

        res.render('dashboard', { 
            title: 'Tableau de Bord', 
            user: req.session.user, 
            members,
            stats: { total, participations, classes: uniqueClasses }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur de base de données");
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
