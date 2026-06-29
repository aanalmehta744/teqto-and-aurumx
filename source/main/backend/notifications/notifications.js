const express = require('express');
const router = express.Router();
const db = require('../connection');

// GET all notifications (admin), optionally only unread
router.get('/', async (req, res) => {
    const { unread } = req.query;
    try {
        let sql = `
            SELECT n.*, e.fullName AS bde_name, c.fullName AS client_name
            FROM notifications n
            LEFT JOIN employees e ON e.id = n.bde_id
            LEFT JOIN clients c ON c.id = n.client_id
        `;
        if (unread === '1') sql += ` WHERE n.is_read = 0`;
        sql += ` ORDER BY n.created_at DESC LIMIT 50`;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET unread count only
router.get('/count', async (req, res) => {
    try {
        const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM notifications WHERE is_read = 0`);
        res.json({ count: row.count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT mark single notification as read
router.put('/:id/read', async (req, res) => {
    try {
        await db.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT mark all notifications as read
router.put('/read-all', async (req, res) => {
    try {
        await db.query(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
