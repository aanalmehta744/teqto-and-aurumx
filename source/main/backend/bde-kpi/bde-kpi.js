const express = require('express');
const router = express.Router();
const db = require('../connection');

// ─── KPI MASTER (Admin only) ───────────────────────────────────────────────

router.get('/master', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT k.*, e.fullName AS created_by_name
       FROM kpi_master k
       LEFT JOIN employees e ON e.id = k.created_by
       ORDER BY k.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching KPI master:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/master', async (req, res) => {
  const { kpi_name, kpi_description, unit, kpi_type, created_by } = req.body;
  if (!kpi_name || !unit) return res.status(400).json({ error: 'kpi_name and unit are required' });
  try {
    const [result] = await db.query(
      `INSERT INTO kpi_master (kpi_name, kpi_description, unit, kpi_type, is_active, created_by, created_at)
       VALUES (?, ?, ?, ?, 1, ?, NOW())`,
      [kpi_name, kpi_description || null, unit, kpi_type || null, created_by || null]
    );
    res.status(201).json({ id: result.insertId, message: 'KPI created' });
  } catch (err) {
    console.error('Error creating KPI:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/master/:id', async (req, res) => {
  const { kpi_name, kpi_description, unit, kpi_type, is_active } = req.body;
  try {
    await db.query(
      `UPDATE kpi_master SET kpi_name=?, kpi_description=?, unit=?, kpi_type=?, is_active=? WHERE kpi_id=?`,
      [kpi_name, kpi_description, unit, kpi_type, is_active, req.params.id]
    );
    res.json({ message: 'KPI updated' });
  } catch (err) {
    console.error('Error updating KPI:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/master/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM kpi_master WHERE kpi_id=?`, [req.params.id]);
    res.json({ message: 'KPI deleted' });
  } catch (err) {
    console.error('Error deleting KPI:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── KPI TARGETS (Admin only) ──────────────────────────────────────────────

router.get('/targets', async (req, res) => {
  const { bde_id } = req.query;
  try {
    let sql = `SELECT t.*, e.fullName AS bde_name, k.kpi_name, k.unit, k.kpi_type
               FROM kpi_targets t
               LEFT JOIN employees e ON e.id = t.user_id
               LEFT JOIN kpi_master k ON k.kpi_id = t.kpi_id
               WHERE 1=1`;
    const params = [];
    if (bde_id) { sql += ' AND t.user_id=?'; params.push(bde_id); }
    sql += ' ORDER BY t.year DESC, t.month DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching KPI targets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/targets/:bde_id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, k.kpi_name, k.unit, k.kpi_type
       FROM kpi_targets t
       LEFT JOIN kpi_master k ON k.kpi_id = t.kpi_id
       WHERE t.user_id=?
       ORDER BY t.year DESC, t.month DESC`,
      [req.params.bde_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching BDE targets:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/targets', async (req, res) => {
  const { user_id, kpi_id, target_value, month, year, weightage, created_by } = req.body;
  if (!user_id || !kpi_id || target_value == null || !month || !year) {
    return res.status(400).json({ error: 'user_id, kpi_id, target_value, month, year are required' });
  }
  try {
    const [result] = await db.query(
      `INSERT INTO kpi_targets (user_id, kpi_id, target_value, month, year, weightage, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id, kpi_id, target_value, month, year, weightage || null, created_by || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Target created' });
  } catch (err) {
    console.error('Error creating target:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/targets/:id', async (req, res) => {
  const { user_id, kpi_id, target_value, month, year, weightage } = req.body;
  try {
    await db.query(
      `UPDATE kpi_targets SET user_id=?, kpi_id=?, target_value=?, month=?, year=?, weightage=?, updated_at=NOW() WHERE target_id=?`,
      [user_id, kpi_id, target_value, month, year, weightage || null, req.params.id]
    );
    res.json({ message: 'Target updated' });
  } catch (err) {
    console.error('Error updating target:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/targets/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM kpi_targets WHERE target_id=?`, [req.params.id]);
    res.json({ message: 'Target deleted' });
  } catch (err) {
    console.error('Error deleting target:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all BDE employees (for target assignment)
router.get('/bde-list', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, fullName, email, department FROM employees WHERE role='BDE' AND status=1 ORDER BY fullName`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching BDE list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
