const express = require('express');
const router = express.Router();
const db = require('../connection');

// GET targets for one or all BDEs
router.get('/', async (req, res) => {
  const { bde_id, month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  try {
    let sql = `
      SELECT t.*, e.fullName AS bde_name
      FROM bde_targets t
      JOIN employees e ON e.id = t.bde_id
      WHERE t.month = ? AND t.year = ?
    `;
    const params = [m, y];
    if (bde_id) { sql += ` AND t.bde_id = ?`; params.push(bde_id); }
    sql += ` ORDER BY e.fullName`;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET achievement: targets + achieved counts from bde_conversions
// Starts from employees (all active BDEs), LEFT JOINs targets and conversions
// so achievements show even when no target is set yet
router.get('/achievement', async (req, res) => {
  const { bde_id, month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  try {
    let sql = `
      SELECT
        e.id AS bde_id,
        e.fullName AS bde_name,
        IFNULL(t.full_time, 0)    AS full_time,
        IFNULL(t.part_time, 0)    AS part_time,
        IFNULL(t.hourly, 0)       AS hourly,
        IFNULL(t.project_base, 0) AS project_base,
        IFNULL(t.amount, 0)       AS amount,
        t.month, t.year,
        SUM(CASE WHEN c.client_type = 'full_time'    AND c.conversion_status='won' THEN 1 ELSE 0 END) AS full_time_achieved,
        SUM(CASE WHEN c.client_type = 'part_time'    AND c.conversion_status='won' THEN 1 ELSE 0 END) AS part_time_achieved,
        SUM(CASE WHEN c.client_type = 'hourly'       AND c.conversion_status='won' THEN 1 ELSE 0 END) AS hourly_achieved,
        SUM(CASE WHEN c.client_type = 'project_base' AND c.conversion_status='won' THEN 1 ELSE 0 END) AS project_base_achieved,
        IFNULL(SUM(CASE WHEN c.conversion_status='won' THEN c.deal_value ELSE 0 END), 0) AS amount_achieved
      FROM employees e
      LEFT JOIN bde_targets t ON t.bde_id = e.id AND t.month = ? AND t.year = ?
      LEFT JOIN bde_conversions c ON
        c.user_id = e.id AND
        MONTH(c.conversion_date) = ? AND
        YEAR(c.conversion_date) = ?
      WHERE e.role = 'BDE' AND e.status = 1
    `;
    const params = [m, y, m, y];
    if (bde_id) { sql += ` AND e.id = ?`; params.push(bde_id); }
    sql += ` GROUP BY e.id, e.fullName, t.full_time, t.part_time, t.hourly, t.project_base, t.amount, t.month, t.year ORDER BY e.fullName`;

    const [rows] = await db.query(sql, params);

    const result = rows.map(r => {
      const ftPct  = r.full_time    > 0 ? Math.min(Math.round((r.full_time_achieved    / r.full_time)    * 100), 100) : 0;
      const ptPct  = r.part_time    > 0 ? Math.min(Math.round((r.part_time_achieved    / r.part_time)    * 100), 100) : 0;
      const hPct   = r.hourly       > 0 ? Math.min(Math.round((r.hourly_achieved       / r.hourly)       * 100), 100) : 0;
      const pbPct  = r.project_base > 0 ? Math.min(Math.round((r.project_base_achieved / r.project_base) * 100), 100) : 0;
      const amtPct = r.amount       > 0 ? Math.min(Math.round((r.amount_achieved       / r.amount)       * 100), 100) : 0;
      const overall = Math.round((ftPct + ptPct + hPct + pbPct + amtPct) / 5);
      return { ...r, ftPct, ptPct, hPct, pbPct, amtPct, overall };
    });
    res.json(result);
  } catch (err) {
    console.error('GET /achievement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST save targets for a SPECIFIC BDE
router.post('/save', async (req, res) => {
  const { bde_id, month, year, full_time, part_time, hourly, project_base, amount, created_by } = req.body;
  if (!bde_id || !month || !year) return res.status(400).json({ error: 'bde_id, month and year are required' });

  try {
  
await db.query(`
  INSERT INTO bde_targets
  (bde_id, month, year, full_time, part_time, hourly, project_base, amount)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    full_time = VALUES(full_time),
    part_time = VALUES(part_time),
    hourly = VALUES(hourly),
    project_base = VALUES(project_base),
    amount = VALUES(amount)
`, [
  bde_id,
  month,
  year,
  full_time || 0,
  part_time || 0,
  hourly || 0,
  project_base || 0,
  amount || 0
]);




    res.json({ success: true });
  } catch (err) {
    console.error('POST /save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST save same targets for ALL BDEs
router.post('/save-all', async (req, res) => {
  const { month, year, full_time, part_time, hourly, project_base, amount, created_by } = req.body;
  if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

  try {
    const [bdes] = await db.query(`SELECT id FROM employees WHERE role='BDE' AND status=1`);
    for (const bde of bdes) {
    

await db.query(`
  INSERT INTO bde_targets
  (bde_id, month, year, full_time, part_time, hourly, project_base, amount)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    full_time = VALUES(full_time),
    part_time = VALUES(part_time),
    hourly = VALUES(hourly),
    project_base = VALUES(project_base),
    amount = VALUES(amount)
`, [
  bde.id,
  month,
  year,
  full_time || 0,
  part_time || 0,
  hourly || 0,
  project_base || 0,
  amount || 0
]);

    }
    res.json({ success: true, saved_count: bdes.length });
  } catch (err) {
    console.error('POST /save-all error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
