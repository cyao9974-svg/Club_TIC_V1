const express = require('express');
const router = express.Router();
const db = require('../db');
const ExcelJS = require('exceljs');

// Middleware pour vérifier si admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') next();
    else res.status(403).send("Accès refusé - Réservé aux administrateurs");
};

// Ajouter un membre (GET)
router.get('/add', isAdmin, (req, res) => {
    res.render('add-member', { title: 'Ajouter un membre', user: req.session.user });
});

// Ajouter un membre (POST)
router.post('/add', isAdmin, async (req, res) => {
    let { nom, prenom, classe, contact, participation, date_inscription } = req.body;
    
    // Valeurs par défaut selon consigne
    if (!participation) participation = 0;
    if (!date_inscription || date_inscription === "") {
        date_inscription = "2026-03-10 13:15:00";
    }

    try {
        await db.query("INSERT INTO members (nom, prenom, classe, contact, participation, date_inscription) VALUES ($1, $2, $3, $4, $5, $6)",
            [nom, prenom, classe, contact, participation, date_inscription]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send("Erreur lors de l'ajout");
    }
});

// Modifier un membre (GET)
router.get('/edit/:id', isAdmin, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM members WHERE id = $1", [req.params.id]);
        const member = result.rows[0];
        if (!member) return res.redirect('/dashboard');
        res.render('edit-member', { title: 'Modifier un membre', user: req.session.user, member });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// Modifier un membre (POST)
router.post('/edit/:id', isAdmin, async (req, res) => {
    const { nom, prenom, classe, contact, participation, date_inscription } = req.body;
    try {
        await db.query("UPDATE members SET nom=$1, prenom=$2, classe=$3, contact=$4, participation=$5, date_inscription=$6 WHERE id=$7",
            [nom, prenom, classe, contact, participation, date_inscription, req.params.id]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send("Erreur lors de la modification");
    }
});

// Supprimer un membre
router.post('/delete/:id', isAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM members WHERE id = $1", [req.params.id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur");
    }
});

// Incrémenter participation
router.post('/increment/:id', isAdmin, async (req, res) => {
    try {
        await db.query("UPDATE members SET participation = participation + 1 WHERE id = $1", [req.params.id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur");
    }
});

// Export Excel
router.get('/export', isAdmin, async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Membres Club TIC');

    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Nom', key: 'nom', width: 20 },
        { header: 'Prénom', key: 'prenom', width: 20 },
        { header: 'Classe', key: 'classe', width: 15 },
        { header: 'Contact', key: 'contact', width: 20 },
        { header: 'Participation', key: 'participation', width: 15 },
        { header: 'Date Inscription', key: 'date_inscription', width: 25 },
    ];

    try {
        const result = await db.query("SELECT * FROM members ORDER BY id ASC");
        const rows = result.rows;
        
        rows.forEach(row => worksheet.addRow(row));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Membres_ClubTIC.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.send("Erreur");
    }
});

module.exports = router;
