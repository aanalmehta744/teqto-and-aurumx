const express = require('express');
const router = express.Router();
const db = require('../connection');

// Calculate and return performance for a BDE for a given month/year
async function calculatePerformance(bde_id, month, year) {
  const [targets] = await db.query(
    `SELECT t.*, k.kpi_name, k.unit, k.kpi_type
     FROM kpi_targets t
     LEFT JOIN kpi_master k ON k.kpi_id = t.kpi_id
     WHERE t.user_id=? AND t.month=? AND t.year=?`,
    [bde_id, month, year]
  );

  const snapshots = await Promise.all(targets.map(async (target) => {
    let achieved = 0;

    if (target.kpi_type === 'calls') {
      const [[{ cnt }]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM bde_calls
         WHERE user_id=? AND MONTH(call_date)=? AND YEAR(call_date)=?`,
        [bde_id, month, year]
      );
      achieved = cnt;
    } else if (target.kpi_type === 'meetings') {
      const [[{ cnt }]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM bde_meetings
         WHERE user_id=? AND MONTH(meeting_date)=? AND YEAR(meeting_date)=?`,
        [bde_id, month, year]
      );
      achieved = cnt;
    } else if (target.kpi_type === 'conversions_count') {
      const [[{ cnt }]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM bde_conversions
         WHERE user_id=? AND conversion_status='won' AND MONTH(conversion_date)=? AND YEAR(conversion_date)=?`,
        [bde_id, month, year]
      );
      achieved = cnt;
    } else if (target.kpi_type === 'conversions_revenue') {
      const [[{ total }]] = await db.query(
        `SELECT IFNULL(SUM(deal_value),0) AS total FROM bde_conversions
         WHERE user_id=? AND conversion_status='won' AND MONTH(conversion_date)=? AND YEAR(conversion_date)=?`,
        [bde_id, month, year]
      );
      achieved = total;
    }

    const pct = target.target_value > 0 ? Math.round((achieved / target.target_value) * 100) : 0;
    let status = 'red';
    if (pct >= 100) status = 'green';
    else if (pct >= 70) status = 'yellow';

    // Upsert snapshot
    await db.query(
      `INSERT INTO kpi_snapshots (user_id, kpi_id, month, year, target_value, achieved_value, achievement_percentage, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE achieved_value=VALUES(achieved_value), achievement_percentage=VALUES(achievement_percentage), status=VALUES(status), updated_at=NOW()`,
      [bde_id, target.kpi_id, month, year, target.target_value, achieved, pct, status]
    );

    return {
      kpi_id: target.kpi_id,
      kpi_name: target.kpi_name,
      unit: target.unit,
      kpi_type: target.kpi_type,
      target_value: target.target_value,
      achieved_value: achieved,
      achievement_percentage: pct,
      status,
    };
  }));

  return snapshots;
}

// GET performance for a specific BDE (current month by default)
router.get('/bde/:bde_id', async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();
  try {
    const snapshots = await calculatePerformance(req.params.bde_id, m, y);
    res.json({ bde_id: req.params.bde_id, month: m, year: y, kpis: snapshots });
  } catch (err) {
    console.error('Error calculating BDE performance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET performance summary for ALL BDEs (admin dashboard graph)
router.get('/all-bde', async (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = parseInt(month) || now.getMonth() + 1;
  const y = parseInt(year) || now.getFullYear();

  try {
    const [bdes] = await db.query(
      `SELECT id, fullName FROM employees WHERE role='BDE' AND status=1 ORDER BY fullName`
    );

    const results = await Promise.all(bdes.map(async (bde) => {
      const kpis = await calculatePerformance(bde.id, m, y);
      return { bde_id: bde.id, bde_name: bde.fullName, month: m, year: y, kpis };
    }));

    res.json(results);
  } catch (err) {
    console.error('Error fetching all BDE performance:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
