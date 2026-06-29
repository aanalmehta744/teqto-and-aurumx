const express = require('express');
const router = express.Router();
const db = require('../connection');

// GET all clients for a BDE with their latest note + stats
router.get('/dashboard', async (req, res) => {
    const { bde_id, date, status, search } = req.query;
    if (!bde_id) return res.status(400).json({ error: 'bde_id required' });

    try {
        // Stats
        const [[stats]] = await db.query(`
            SELECT
                COUNT(*) AS total,
                SUM(client_type = 'Hot')   AS hot,
                SUM(client_type = 'Cold')  AS cold,
                SUM(client_type = 'Close') AS closed,
                ROUND(SUM(client_type = 'Close') * 100.0 / NULLIF(COUNT(*), 0), 1) AS close_rate
            FROM clients WHERE employee_id = ?
        `, [bde_id]);

        // Clients with latest note
        let sql = `
            SELECT c.id, c.fullName, c.email, c.mobile, c.client_type, c.prize_tag,
                   c.country, c.date, c.platform, c.technology,
                   n.note_text AS latest_note,
                   n.note_date AS latest_note_date,
                   n.mood AS latest_mood,
                   n.next_action
            FROM clients c
            LEFT JOIN client_daily_notes n ON n.id = (
                SELECT id FROM client_daily_notes
                WHERE client_id = c.id
                ORDER BY note_date DESC, id DESC LIMIT 1
            )
            WHERE c.employee_id = ?
        `;
        const params = [bde_id];

        if (status) { sql += ` AND c.client_type = ?`; params.push(status); }
        if (search) { sql += ` AND c.fullName LIKE ?`; params.push(`%${search}%`); }
        if (date) {
            sql += ` AND EXISTS (
                SELECT 1 FROM client_daily_notes
                WHERE client_id = c.id AND DATE(note_date) = ?
            )`;
            params.push(date);
        }
        sql += ` ORDER BY c.fullName`;

        const [clients] = await db.query(sql, params);
        res.json({ stats, clients });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all notes for a specific client
router.get('/notes/:clientId', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM client_daily_notes
            WHERE client_id = ?
            ORDER BY note_date DESC, id DESC
        `, [req.params.clientId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add a new note
router.post('/notes', async (req, res) => {
    const { client_id, bde_id, note_date, note_text, mood, next_action } = req.body;
    if (!client_id || !bde_id || !note_text) {
        return res.status(400).json({ error: 'client_id, bde_id and note_text are required' });
    }
    try {
        const date = note_date || new Date().toISOString().split('T')[0];
        const [result] = await db.query(`
            INSERT INTO client_daily_notes (client_id, bde_id, note_date, note_text, mood, next_action)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [client_id, bde_id, date, note_text, mood || 'neutral', next_action || null]);
        res.status(201).json({ id: result.insertId, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update a note
router.put('/notes/:id', async (req, res) => {
    const { note_text, mood, next_action } = req.body;
    try {
        await db.query(`
            UPDATE client_daily_notes
            SET note_text = ?, mood = ?, next_action = ?
            WHERE id = ?
        `, [note_text, mood || 'neutral', next_action || null, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a note
router.delete('/notes/:id', async (req, res) => {
    try {
        await db.query(`DELETE FROM client_daily_notes WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
