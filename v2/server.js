require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(require('express-ejs-layouts'));
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret_club_tic_v2_2026',
    resave: false,
    saveUninitialized: true
}));

app.use('/auth', authRoutes);
app.use('/members', memberRoutes);

const isAuthenticated = (req, res, next) => {
    if (req.session.user) next();
    else res.redirect('/auth/login');
};

app.get('/', (req, res) => {
    res.render('index', { title: 'Accueil - Inscription', user: req.session.user || null });
});

app.get('/dashboard', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM members ORDER BY id ASC");
        const members = result.rows;
        
        const total = members.length;
        const participations = members.reduce((sum, m) => sum + m.nb_participation, 0);
        const uniqueClasses = new Set(members.map(m => m.classe)).size;

        res.render('dashboard', { 
            title: 'Tableau de Bord', 
            user: req.session.user, 
            members,
            stats: { total, participations, classes: uniqueClasses }
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).send("Erreur de base de données");
    }
});

app.listen(PORT, () => {
    console.log(`V2 Serveur démarré sur http://localhost:${PORT}`);
});
