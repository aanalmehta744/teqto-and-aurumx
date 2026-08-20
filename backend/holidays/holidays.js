const express = require('express');
const router = express.Router();
const db = require('../connection'); // Ensure the path is correct

// 🔹 **Get All Holidays**
router.get('/', async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT id, hName, DATE_FORMAT(date, '%Y-%m-%d') AS date, details FROM holidays`
        );
        res.json(results);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 🔹 **Get Single Holiday**
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            `SELECT id, hName, DATE_FORMAT(date, '%Y-%m-%d') AS date, details FROM holidays WHERE id = ?`,
            [id]
        );
        if (result.length === 0) return res.status(404).json({ message: 'Holiday not found' });
        res.json(result[0]);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 🔹 **Add New Holiday**
router.post('/', async (req, res) => {
    try {
        const { hName, date, details } = req.body;
        const [result] = await db.query(
            'INSERT INTO holidays (hName, date, details) VALUES (?, ?, ?)',
            [hName, date, details]
        );
        res.json({ id: result.insertId, hName, date, details });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 🔹 **Update Holiday**
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hName, date, details } = req.body;
        const [result] = await db.query(
            'UPDATE holidays SET hName = ?, date = ?, details = ? WHERE id = ?',
            [hName, date, details, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Holiday not found' });
        }
        res.json({ message: 'Holiday updated successfully' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 🔹 **Delete Holiday**
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM holidays WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Holiday not found' });
        }
        res.json({ message: 'Holiday deleted successfully' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
