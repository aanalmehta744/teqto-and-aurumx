const express = require('express');
const router = express.Router();
const db = require('../connection');

// ─── CALLS (BDE only) ─────────────────────────────────────────────────────

router.get('/calls/:user_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM bde_calls WHERE user_id=? ORDER BY call_date DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching calls:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/calls', async (req, res) => {
  const { user_id, lead_id, customer_name, phone_number, call_date, call_duration, call_status, call_outcome, call_notes, next_action_date } = req.body;
  if (!user_id || !customer_name || !call_date || !call_status) {
    return res.status(400).json({ error: 'user_id, customer_name, call_date, call_status are required' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO bde_calls (user_id, lead_id, customer_name, phone_number, call_date, call_duration, call_status, call_outcome, call_notes, next_action_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, lead_id || null, customer_name, phone_number || null, call_date, call_duration || null, call_status, call_outcome || null, call_notes || null, next_action_date || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Call logged' });
  } catch (err) {
    console.error('Error logging call:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/calls/:id', async (req, res) => {
  const { customer_name, phone_number, call_date, call_duration, call_status, call_outcome, call_notes, next_action_date } = req.body;
  try {
    await db.query(
      `UPDATE bde_calls SET customer_name=?, phone_number=?, call_date=?, call_duration=?, call_status=?, call_outcome=?, call_notes=?, next_action_date=? WHERE call_id=?`,
      [customer_name, phone_number, call_date, call_duration, call_status, call_outcome, call_notes, next_action_date, req.params.id]
    );
    res.json({ message: 'Call updated' });
  } catch (err) {
    console.error('Error updating call:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/calls/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM bde_calls WHERE call_id=?`, [req.params.id]);
    res.json({ message: 'Call deleted' });
  } catch (err) {
    console.error('Error deleting call:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── MEETINGS (BDE only) ─────────────────────────────────────────────────

router.get('/meetings/:user_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM bde_meetings WHERE user_id=? ORDER BY meeting_date DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/meetings', async (req, res) => {
  const { user_id, lead_id, client_name, meeting_date, meeting_time, meeting_mode, meeting_status, meeting_outcome, meeting_notes, next_meeting_date } = req.body;
  if (!user_id || !client_name || !meeting_date || !meeting_status) {
    return res.status(400).json({ error: 'user_id, client_name, meeting_date, meeting_status are required' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO bde_meetings (user_id, lead_id, client_name, meeting_date, meeting_time, meeting_mode, meeting_status, meeting_outcome, meeting_notes, next_meeting_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, lead_id || null, client_name, meeting_date, meeting_time || null, meeting_mode || 'offline', meeting_status, meeting_outcome || null, meeting_notes || null, next_meeting_date || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Meeting logged' });
  } catch (err) {
    console.error('Error logging meeting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/meetings/:id', async (req, res) => {
  const { client_name, meeting_date, meeting_time, meeting_mode, meeting_status, meeting_outcome, meeting_notes, next_meeting_date } = req.body;
  try {
    await db.query(
      `UPDATE bde_meetings SET client_name=?, meeting_date=?, meeting_time=?, meeting_mode=?, meeting_status=?, meeting_outcome=?, meeting_notes=?, next_meeting_date=? WHERE meeting_id=?`,
      [client_name, meeting_date, meeting_time, meeting_mode, meeting_status, meeting_outcome, meeting_notes, next_meeting_date, req.params.id]
    );
    res.json({ message: 'Meeting updated' });
  } catch (err) {
    console.error('Error updating meeting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/meetings/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM bde_meetings WHERE meeting_id=?`, [req.params.id]);
    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CONVERSIONS / DEALS (BDE only) ──────────────────────────────────────

router.get('/deals/:user_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM bde_conversions WHERE user_id=? ORDER BY conversion_date DESC`,
      [req.params.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/deals', async (req, res) => {
  const { user_id, lead_id, client_name, deal_value, product_service, conversion_status, conversion_date, closing_notes, lost_reason } = req.body;
  if (!user_id || !client_name || !conversion_status || !conversion_date) {
    return res.status(400).json({ error: 'user_id, client_name, conversion_status, conversion_date are required' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO bde_conversions (user_id, lead_id, client_name, deal_value, product_service, conversion_status, conversion_date, closing_notes, lost_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, lead_id || null, client_name, deal_value || 0, product_service || null, conversion_status, conversion_date, closing_notes || null, lost_reason || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Deal logged' });
  } catch (err) {
    console.error('Error logging deal:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/deals/:id', async (req, res) => {
  const { client_name, deal_value, product_service, conversion_status, conversion_date, closing_notes, lost_reason } = req.body;
  try {
    await db.query(
      `UPDATE bde_conversions SET client_name=?, deal_value=?, product_service=?, conversion_status=?, conversion_date=?, closing_notes=?, lost_reason=? WHERE conversion_id=?`,
      [client_name, deal_value, product_service, conversion_status, conversion_date, closing_notes, lost_reason, req.params.id]
    );
    res.json({ message: 'Deal updated' });
  } catch (err) {
    console.error('Error updating deal:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/deals/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM bde_conversions WHERE conversion_id=?`, [req.params.id]);
    res.json({ message: 'Deal deleted' });
  } catch (err) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
