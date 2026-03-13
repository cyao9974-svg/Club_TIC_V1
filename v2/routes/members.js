const express = require('express');
const router = express.Router();
const db = require('../db');
const ExcelJS = require('exceljs');

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') next();
    else res.status(403).send("Accès refusé - Réservé aux administrateurs");
};

router.post('/public-join', async (req, res) => {
    const { nom, prenom, classe, filiere, telephone } = req.body;
    try {
        await db.query("INSERT INTO members (nom, prenom, classe, filiere, telephone, nb_participation) VALUES ($1, $2, $3, $4, $5, 0)",
            [nom, prenom, classe, filiere, telephone]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Erreur Adhésion:", err);
        res.send("Erreur lors de l'adhésion");
    }
});

router.post('/add', isAdmin, async (req, res) => {
    let { nom, prenom, classe, filiere, telephone, nb_participation, date_inscription } = req.body;
    if (!nb_participation) nb_participation = 0;
    if (!date_inscription || date_inscription === "") {
        date_inscription = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    try {
        await db.query("INSERT INTO members (nom, prenom, classe, filiere, telephone, nb_participation, date_inscription) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [nom, prenom, classe, filiere, telephone, nb_participation, date_inscription]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send("Erreur lors de l'ajout");
    }
});

router.post('/edit/:id', isAdmin, async (req, res) => {
    const { nom, prenom, classe, filiere, telephone, nb_participation, date_inscription } = req.body;
    try {
        await db.query("UPDATE members SET nom=$1, prenom=$2, classe=$3, filiere=$4, telephone=$5, nb_participation=$6, date_inscription=$7 WHERE id=$8",
            [nom, prenom, classe, filiere, telephone, nb_participation, date_inscription, req.params.id]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send("Erreur lors de la modification");
    }
});

router.post('/delete/:id', isAdmin, async (req, res) => {
    try {
        await db.query("DELETE FROM members WHERE id=$1", [req.params.id]);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.send("Erreur lors de la suppression");
    }
});

router.post('/increment/:id', isAdmin, async (req, res) => {
    try {
        await db.query("UPDATE members SET nb_participation = nb_participation + 1 WHERE id = $1", [req.params.id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur");
    }
});

router.get('/export', isAdmin, async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Membres Club TIC V2');
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 5 },
        { header: 'Nom', key: 'nom', width: 20 },
        { header: 'Prénom', key: 'prenom', width: 20 },
        { header: 'Classe', key: 'classe', width: 10 },
        { header: 'Filière', key: 'filiere', width: 15 },
        { header: 'Téléphone', key: 'telephone', width: 15 },
        { header: 'Participation', key: 'nb_participation', width: 15 },
        { header: 'Date', key: 'date_inscription', width: 20 }
    ];
    try {
        const result = await db.query("SELECT * FROM members ORDER BY id ASC");
        result.rows.forEach(row => worksheet.addRow(row));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Membres_ClubTIC_V2.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.send("Erreur Export");
    }
});

module.exports = router;
