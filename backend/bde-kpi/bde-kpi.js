const express = require('express');
const router = express.Router();
const db = require('../connection');

// GET /api/kpi/bde-list — returns all active BDE employees.
// NOTE: BDEs are role = 'Employee' with department = 'BDE' (not role = 'BDE').
// Department match is case/space-insensitive, and rows with a NULL status
// (older records created before the status column) are still included.
router.get('/bde-list', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, fullName, email
             FROM employees
             WHERE LOWER(TRIM(department)) = 'bde'
               AND (status = 1 OR status IS NULL)
             ORDER BY fullName`
        );
        res.json(rows);
    } catch (err) {
        console.error('bde-list error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
