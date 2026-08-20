const express = require('express');
const router = express.Router();
const db = require('../connection');

// GET /api/kpi/bde-list — returns all active BDE employees
router.get('/bde-list', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, fullName, email FROM employees WHERE role = 'BDE' AND status = 1 ORDER BY fullName`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
